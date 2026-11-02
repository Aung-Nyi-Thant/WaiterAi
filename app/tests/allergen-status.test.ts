// Allergen data is "unknown" (no list), "estimated" (a list nobody at the restaurant checked) or "verified" (the owner compared recipe and
// supplier labels). Verification is explicit, needs a list, ends when the list or ingredients change, and expires after 180 days.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { call, mockModel, noModel, ownerLogin, signOut } from "./helpers";
import { PUT as updateItem } from "@/modules/owner/api/itemsById";
import { POST as addItem } from "@/modules/owner/api/items";
import { GET as ownerItems } from "@/modules/owner/api/items";
import { GET as publicMenu } from "@/modules/diner/api/menu";
import { GET as insights } from "@/modules/platform/api/insights";
import { POST as chat } from "@/modules/ai/api/chat";
import { itemsOf } from "@/modules/platform/menu";
import { ordersWith } from "@/modules/staff/orders";
import { get, run } from "@/modules/platform/db";
import { restoreDemoMenu } from "@/modules/platform/db";

const slug = "golden-lotus";
const put = (id: number, body: any) => call(updateItem, { method: "PUT", params: { id: String(id) }, body: { ...body, ...(body.allergen_status === "verified" ? { allergen_check_note: "Recipe v1, supplier label 2026-10-29, separate utensils checked" } : {}) } });
const status = (id: number) => itemsOf(1).find((i) => i.id === id)!.allergen_status;
let id = 0;
beforeAll(async () => {
  await ownerLogin();
  id = (await call(addItem, { method: "POST", body: { name: { en: "Status Test Dish", th: "", my: "" }, price: 50, ingredients: "rice, egg", allergens: ["egg"], tags: [], available: true } })).data.id;
});
afterAll(() => { signOut(); vi.unstubAllGlobals(); });

describe("allergen status", () => {
  it("a new list is only an estimate; no list is unknown", async () => {
    expect(status(id)).toBe("estimated");
    await put(id, { allergens: null });
    expect(status(id)).toBe("unknown");
    await put(id, { allergens: ["egg"] });
  });
  it("is verified only when the owner says so, and a missing list cannot be verified", async () => {
    expect((await call(updateItem, { method: "PUT", params: { id: String(id) }, body: { allergen_status: "verified" } })).status).toBe(400);
    expect((await put(id, { allergen_status: "verified" })).status).toBe(200);
    expect(status(id)).toBe("verified");
    expect(get("SELECT allergens_checked_by AS by FROM menu_items WHERE id = ?", id)!.by).toBe("demo@shop.ai");    // who checked is kept for the record
    expect(get("SELECT allergen_check_note AS note FROM menu_items WHERE id = ?", id)!.note).toContain("supplier label");
    await put(id, { allergens: null });
    expect((await put(id, { allergen_status: "verified" })).status).toBe(400);
    await put(id, { allergens: ["egg"] });
  });
  it("stays verified when other fields change or the same list is saved again", async () => {
    await put(id, { allergens: ["egg"], allergen_status: "verified" });
    await put(id, { price: 60, ingredients: "rice, egg", allergens: ["egg"] });
    expect(status(id)).toBe("verified");
  });
  it("ends when the allergens or the ingredients change", async () => {
    await put(id, { allergens: ["egg"], allergen_status: "verified" });
    await put(id, { allergens: ["egg", "soy"] });
    expect(status(id)).toBe("estimated");
    await put(id, { allergens: ["egg", "soy"], allergen_status: "verified" });
    await put(id, { ingredients: "rice, egg, soy sauce" });
    expect(status(id)).toBe("estimated");
  });
  it("expires after 180 days", async () => {
    await put(id, { allergens: ["egg", "soy"], allergen_status: "verified" });
    run("UPDATE menu_items SET allergens_checked_at = datetime('now','-181 day') WHERE id = ?", id);
    expect(status(id)).toBe("estimated");
    expect(itemsOf(1).find((i) => i.id === id)!.allergens_checked_at).not.toBeNull();     // the owner can still see when it was last checked
  });
  it("the public menu shows the status but never the owner's e-mail", async () => {
    await put(id, { allergens: ["egg", "soy"], allergen_status: "verified" });
    const m = await call(publicMenu, { params: { slug } });
    expect(m.data.items.find((i: any) => i.id === id).allergen_status).toBe("verified");
    expect(JSON.stringify(m.data)).not.toContain("Recipe v1");
    expect(JSON.stringify(m.data)).not.toContain("demo@shop.ai");
    expect((await call(ownerItems)).data.find((i: any) => i.id === id).allergen_check_note).toContain("Recipe v1");
  });
  it("staff tickets track the current verification state of each dish", async () => {
    await put(id, { allergens: ["egg"], allergen_status: "verified" });
    const orderId = run("INSERT INTO orders (restaurant_id, table_no, status, lang, allergy_note) VALUES (?,?,?,?,?)", 1, "status-test", "picked", "en", "egg").id;
    run("INSERT INTO order_items (order_id, item_id, name, qty, price, flag) VALUES (?,?,?,?,?,?)", orderId, id, "Status Test Dish", 1, 60, "egg");
    const ticket = () => ordersWith(1, ["picked"]).find((order) => order.id === orderId)!.items[0].allergenStatus;
    expect(ticket()).toBe("verified");
    await put(id, { ingredients: "rice, egg, new sauce" });
    expect(ticket()).toBe("estimated");
    await put(id, { allergens: ["egg"], allergen_status: "verified" });
  });
});

describe("insights", () => {
  it("count allergen data by status, and tell rule answers from model answers", async () => {
    noModel();
    await call(chat, { method: "POST", params: { slug }, body: { message: "What time do you close?", sessionId: "ins-1", table: "1", lang: "en" } });
    mockModel("We are a friendly Thai restaurant.");
    await call(chat, { method: "POST", params: { slug }, body: { message: "Tell me about this place", sessionId: "ins-2", table: "1", lang: "en" } });
    const d = (await call(insights, { url: "http://t/api/owner/insights?days=1" })).data;
    expect(d.answeredByRules).toBeGreaterThanOrEqual(1);
    expect(d.answeredByModel).toBeGreaterThanOrEqual(1);
    const q = d.allergenQuality;
    expect(q.verified).toBeGreaterThanOrEqual(1);
    expect(q.verified + q.estimated + q.unknown).toBe(itemsOf(1).filter((i) => i.available).length);
  });
});

describe("restoring the demo menu", () => {
  it("replaces the dishes of golden-lotus with the original demo menu and leaves other restaurants alone", () => {
    run("INSERT INTO restaurants (owner_id, slug, name) VALUES (1, 'other-shop', 'Other')");
    const other = get("SELECT id FROM restaurants WHERE slug = 'other-shop'")!.id;
    run("INSERT INTO menu_items (restaurant_id, name_en, price) VALUES (?, 'Keep me', 10)", other);
    const n = restoreDemoMenu();
    const names = itemsOf(1).map((i) => i.name.en);
    expect(names.length).toBe(n);
    expect(names).toContain("Shrimp Pad Thai");
    expect(names).not.toContain("Status Test Dish");
    expect(itemsOf(other).map((i) => i.name.en)).toEqual(["Keep me"]);
    expect(itemsOf(1).every((i) => i.allergen_status !== "verified")).toBe(true);        // demo data is never "checked"
  });
});
