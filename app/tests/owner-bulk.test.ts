// MM-6: "mark all dishes in a category sold out / on sale" (PATCH /api/owner/items/bulk). Owner only, one restaurant only.
import { describe, it, expect, beforeEach } from "vitest";
import { call, ownerLogin, signOut, staffLogin } from "./helpers";
import { PATCH as bulk } from "@/modules/owner/api/itemsBulk";
import { POST as register } from "@/modules/platform/api/register";
import { POST as addCategory } from "@/modules/owner/api/resource";
import { POST as addItem } from "@/modules/owner/api/items";
import { all, get } from "@/modules/platform/db";

const CURRIES = 3;                                       // Tom Yum Goong, Chicken Green Curry, Beef Massaman Curry
const availability = (ids: number[]) => ids.map((id) => get("SELECT available FROM menu_items WHERE id = ?", id)!.available);
const patch = (body: unknown) => call(bulk, { method: "PATCH", body });
beforeEach(async () => { await ownerLogin(); await patch({ category_id: CURRIES, available: true }); });

describe("who may use it", () => {
  it("needs an owner login (nobody, and a staff PIN, get 401)", async () => {
    signOut();
    expect((await patch({ category_id: CURRIES, available: false })).status).toBe(401);
    await staffLogin("1111");
    expect((await patch({ category_id: CURRIES, available: false })).status).toBe(401);
    expect(availability([2, 3, 7])).toEqual([1, 1, 1]);
  });
});

describe("what it changes", () => {
  it("marks every dish of that category sold out, and nothing else, and says how many", async () => {
    const r = await patch({ category_id: CURRIES, available: false });
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ ok: true, updated: 3 });
    expect(availability([2, 3, 7])).toEqual([0, 0, 0]);
    expect(availability([1, 4, 8, 10])).toEqual([1, 1, 1, 1]);      // other categories untouched
  });
  it("puts them back on sale, and doing it twice is harmless", async () => {
    await patch({ category_id: CURRIES, available: false });
    expect((await patch({ category_id: CURRIES, available: true })).data.updated).toBe(3);
    expect((await patch({ category_id: CURRIES, available: true })).data.updated).toBe(3);
    expect(availability([2, 3, 7])).toEqual([1, 1, 1]);
  });
  it("an empty category updates 0 dishes without an error", async () => {
    const c = await call(addCategory, { method: "POST", params: { resource: "categories" }, body: { name_en: "Empty shelf" } });
    const r = await patch({ category_id: c.data.id, available: false });
    expect(r.status).toBe(200);
    expect(r.data.updated).toBe(0);
  });
});

describe("what it refuses", () => {
  it.each([[{ available: false }], [{ category_id: 0, available: false }], [{ category_id: -3, available: false }], [{ category_id: "abc", available: false }], [{ category_id: 1.5, available: false }], [{ category_id: null, available: true }]])("a bad category %j is 400", async (b) => {
    const r = await patch(b);
    expect(r.status).toBe(400);
    expect(r.data.error).toBe("Please select a valid category.");
  });
  it.each([[{ category_id: CURRIES }], [{ category_id: CURRIES, available: "false" }], [{ category_id: CURRIES, available: 0 }]])("'available' must be true or false: %j", async (b) => {
    const r = await patch(b);
    expect(r.status).toBe(400);
    expect(r.data.error).toBe("Please choose whether the dishes are on sale.");
  });
  it("an unknown category is 404", async () => {
    expect((await patch({ category_id: 99999, available: false })).status).toBe(404);
  });
  it("another restaurant's category is 404 and its dishes are never touched", async () => {
    signOut();
    const reg = await call(register, { method: "POST", body: { email: "other-owner@example.com", password: "longenough1", restaurantName: "Other Place" } });
    expect(reg.status).toBe(200);
    const cat = await call(addCategory, { method: "POST", params: { resource: "categories" }, body: { name_en: "Their mains" } });
    const dish = await call(addItem, { method: "POST", body: { name: { en: "Their dish", th: "", my: "" }, price: 50, category_id: cat.data.id, allergens: null, tags: [], available: true } });
    expect(dish.status).toBe(200);
    await ownerLogin();                                             // back to Golden Lotus
    const r = await patch({ category_id: cat.data.id, available: false });
    expect(r.status).toBe(404);
    expect(get("SELECT available FROM menu_items WHERE name_en = 'Their dish'")!.available).toBe(1);
    expect(all("SELECT id FROM menu_items WHERE category_id = ?", cat.data.id)).toHaveLength(1);
  });
});
