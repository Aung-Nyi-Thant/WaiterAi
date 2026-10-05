import { describe, it, expect, beforeEach } from "vitest";
import { call, jar, ownerLogin, staffLogin, signOut } from "./helpers";
import { GET as ownerItems, POST as createItem } from "@/modules/owner/api/items";
import { PUT as updateItem, DELETE as deleteItem } from "@/modules/owner/api/itemsById";
import { GET as listResource, POST as createResource } from "@/modules/owner/api/resource";
import { PUT as updateResource, DELETE as deleteResource } from "@/modules/owner/api/resourceItem";
import { GET as getSettings, PUT as saveSettings } from "@/modules/owner/api/settings";
import { GET as publicMenu } from "@/modules/diner/api/menu";
import { POST as staffSoldOut } from "@/modules/staff/api/items";
import { GET as qr } from "@/modules/platform/api/qr";
import { POST as upload } from "@/modules/platform/api/upload";
import { GET as serveUpload } from "@/modules/platform/api/uploadsServe";
import { all, get } from "@/modules/platform/db";
import { specialsOf } from "@/modules/platform/menu";

const create = (b: object) => call(createItem, { method: "POST", body: b });
const dish = (id: number) => get("SELECT * FROM menu_items WHERE id = ?", id)!;
const menu = async () => (await call(publicMenu, { params: { slug: "golden-lotus" } })).data;
beforeEach(async () => { await ownerLogin(); });

describe("MM-1 / MM-7 dish create, edit, delete and validation", () => {
  it("creates a dish with names in three languages", async () => {
    const r = await create({ name: { en: "Test Noodles", th: "ก๋วยเตี๋ยว", my: "ခေါက်ဆွဲ" }, desc: { en: "d", th: "", my: "" }, price: 75, ingredients: "noodles", spice: 2, tags: ["vegetarian"], allergens: ["egg"] });
    expect(r.status).toBe(200);
    const d = dish(r.data.id);
    expect([d.name_en, d.name_th, d.name_my, d.price, d.spice]).toEqual(["Test Noodles", "ก๋วยเตี๋ยว", "ခေါက်ဆွဲ", 75, 2]);
  });
  it("rejects a blank or missing name", async () => {
    expect((await create({ name: { en: "  " }, price: 5 })).status).toBe(400);
    expect((await create({ price: 5 })).status).toBe(400);
  });
  it("rejects a negative, non-numeric or absurd price, and accepts 0", async () => {
    for (const price of [-5, "abc", 100000]) expect((await create({ name: { en: "X" }, price })).status, String(price)).toBe(400);
    expect((await create({ name: { en: "Free sample" }, price: 0 })).status).toBe(200);
  });
  it("clamps spice to 0-3 and drops unknown tags and allergens", async () => {
    const r = await create({ name: { en: "Odd" }, price: 10, spice: 9, tags: ["vegan", "invented"], allergens: ["egg", "unicorn"] });
    const d = dish(r.data.id);
    expect(d.spice).toBe(3);
    expect(JSON.parse(d.tags_json)).toEqual(["vegan"]);
    expect(JSON.parse(d.allergens_json)).toEqual(["egg"]);
  });
  it("updates only the given fields; unknown dish is 404; blank name on update is rejected", async () => {
    const id = (await create({ name: { en: "Edit me" }, price: 10 })).data.id;
    expect((await call(updateItem, { method: "PUT", params: { id: String(id) }, body: { price: 20 } })).status).toBe(200);
    expect(dish(id).name_en).toBe("Edit me");
    expect(dish(id).price).toBe(20);
    expect((await call(updateItem, { method: "PUT", params: { id: String(id) }, body: { name: { en: "" } } })).status).toBe(400);
    expect((await call(updateItem, { method: "PUT", params: { id: "99999" }, body: { price: 1 } })).status).toBe(404);
  });
  it("deletes a dish", async () => {
    const id = (await create({ name: { en: "Delete me" }, price: 10 })).data.id;
    await call(deleteItem, { method: "DELETE", params: { id: String(id) } });
    expect(get("SELECT 1 FROM menu_items WHERE id = ?", id)).toBeUndefined();
  });
});

describe("MM-2 unknown allergens are stored as unknown, not as none", () => {
  it("a dish created without allergen data has NULL allergens", async () => {
    const id = (await create({ name: { en: "No data" }, price: 10 })).data.id;
    expect(dish(id).allergens_json).toBeNull();
    const shown = (await call(ownerItems)).data.find((i: any) => i.id === id);
    expect(shown.allergens).toBeNull();
  });
  it("'no allergens' (an empty list) is different from 'not provided' (null)", async () => {
    const id = (await create({ name: { en: "Plain rice" }, price: 10, allergens: [] })).data.id;
    expect(dish(id).allergens_json).toBe("[]");
    await call(updateItem, { method: "PUT", params: { id: String(id) }, body: { allergens: null } });
    expect(dish(id).allergens_json).toBeNull();
  });
});

describe("MM-3 categories", () => {
  it("creates, renames and deletes; deleting keeps the dishes", async () => {
    const c = await call(createResource, { method: "POST", params: { resource: "categories" }, body: { name_en: "Soups", name_th: "ซุป", name_my: "" } });
    expect(c.status).toBe(200);
    expect((await call(createResource, { method: "POST", params: { resource: "categories" }, body: { name_en: " " } })).status).toBe(400);
    expect((await call(updateResource, { method: "PUT", params: { resource: "categories", id: String(c.data.id) }, body: { name_en: "Broths" } })).status).toBe(200);
    expect(get("SELECT name_en FROM categories WHERE id = ?", c.data.id)!.name_en).toBe("Broths");
    const id = (await create({ name: { en: "Kept dish" }, price: 10, category_id: c.data.id })).data.id;
    await call(deleteResource, { method: "DELETE", params: { resource: "categories", id: String(c.data.id) } });
    expect(dish(id).category_id).toBeNull();
    expect(get("SELECT 1 FROM menu_items WHERE id = ?", id)).toBeTruthy();
  });
  it("an unknown resource is 404", async () => {
    expect((await call(listResource, { params: { resource: "nothing" } })).status).toBe(404);
  });
});

describe("MM-4 / UC-10 sold-out switch applies at once, from owner and from staff", () => {
  it("the owner can switch a dish off and on", async () => {
    const id = (await create({ name: { en: "Toggle" }, price: 10 })).data.id;
    await call(updateItem, { method: "PUT", params: { id: String(id) }, body: { available: false } });
    expect((await menu()).items.find((i: any) => i.id === id).available).toBe(false);
    await call(updateItem, { method: "PUT", params: { id: String(id) }, body: { available: true } });
    expect((await menu()).items.find((i: any) => i.id === id).available).toBe(true);
  });
  it("a chef or waiter can switch a dish off; a diner cannot", async () => {
    const id = get("SELECT id FROM menu_items WHERE name_en = 'Mango Sticky Rice'")!.id;
    signOut();
    expect((await call(staffSoldOut, { method: "POST", params: { id: String(id) }, body: { available: false } })).status).toBe(401);
    await staffLogin("2222");
    expect((await call(staffSoldOut, { method: "POST", params: { id: String(id) }, body: { available: false } })).status).toBe(200);
    expect((await menu()).items.find((i: any) => i.id === id).available).toBe(false);
    await call(staffSoldOut, { method: "POST", params: { id: String(id) }, body: { available: true } });
    expect((await menu()).items.find((i: any) => i.id === id).available).toBe(true);
  });
});

describe("ST-1 / ST-4 hours and assistant settings", () => {
  const hours = (h: object) => call(saveSettings, { method: "PUT", body: { hours: h } });
  it("accepts valid times and rejects invalid ones", async () => {
    expect((await hours({ open: "09:00", close: "23:00", lastOrder: "22:30", closedDays: ["Monday"] })).status).toBe(200);
    expect((await call(getSettings)).data.hours).toEqual({ open: "09:00", close: "23:00", lastOrder: "22:30", closedDays: ["Monday"] });
    for (const bad of ["9am", "25:00", "10:60", "", "10:0"]) expect((await hours({ open: bad, close: "22:00", lastOrder: "21:30" })).status, bad).toBe(400);
    await hours({ open: "10:00", close: "22:00", lastOrder: "21:30", closedDays: [] });
  });
  it("normalises the assistant persona and limits its length", async () => {
    await call(saveSettings, { method: "PUT", body: { persona: { name: "N".repeat(80), gender: "robot", tone: "angry", greeting: "g".repeat(500), upsell: 1, rules: "r".repeat(900) } } });
    const p = (await call(getSettings)).data.persona;
    expect(p.name.length).toBe(40);
    expect(p.gender).toBe("male");
    expect(p.tone).toBe("friendly");
    expect(p.greeting.length).toBe(200);
    expect(p.rules.length).toBe(600);
    expect(p.upsell).toBe(true);
    await call(saveSettings, { method: "PUT", body: { persona: { name: "The Waiter", gender: "male", tone: "friendly", greeting: "", upsell: true, rules: "" } } });
  });
  it("requires a restaurant name when it is changed", async () => {
    expect((await call(saveSettings, { method: "PUT", body: { name: " " } })).status).toBe(400);
  });
});

describe("ST-2 / ST-3 specials and FAQs", () => {
  it("only specials that are active and within their dates are live", async () => {
    const rid = get("SELECT id FROM restaurants WHERE slug = 'golden-lotus'")!.id;
    const add = (b: object) => call(createResource, { method: "POST", params: { resource: "specials" }, body: b });
    await add({ title: "Always", text: "", active: 1 });
    await add({ title: "Future", text: "", starts_on: "2999-01-01", active: 1 });
    await add({ title: "Past", text: "", ends_on: "2000-01-01", active: 1 });
    await add({ title: "Off", text: "", active: 0 });
    const live = specialsOf(rid).map((s: any) => s.title);
    expect(live).toContain("Always");
    for (const t of ["Future", "Past", "Off"]) expect(live).not.toContain(t);
    expect((await add({ title: "  " })).status).toBe(400);
  });
  it("needs both a question and an answer", async () => {
    const add = (b: object) => call(createResource, { method: "POST", params: { resource: "faqs" }, body: b });
    expect((await add({ q: "Kids menu?", a: "" })).status).toBe(400);
    expect((await add({ q: "", a: "Yes" })).status).toBe(400);
    expect((await add({ q: "Kids menu?", a: "Yes, ask staff." })).status).toBe(200);
  });
});

describe("DM-1 / DM-10 public menu", () => {
  it("is public, unknown restaurant is 404", async () => {
    signOut();
    expect((await call(publicMenu, { params: { slug: "golden-lotus" } })).status).toBe(200);
    expect((await call(publicMenu, { params: { slug: "nope" } })).status).toBe(404);
  });
  it("does not leak owner-only data", async () => {
    const r = (await menu());
    expect(JSON.stringify(r)).not.toMatch(/password|pin_hash|owner_id|chat_cap/);
  });
  it("records a menu open only when asked (open=1)", async () => {
    const n = () => get("SELECT COUNT(*) AS n FROM events WHERE kind = 'menu_open'")!.n;
    const before = n();
    await call(publicMenu, { params: { slug: "golden-lotus" } });
    expect(n()).toBe(before);
    await call(publicMenu, { params: { slug: "golden-lotus" }, url: "http://t/api?open=1" });
    expect(n()).toBe(before + 1);
  });
});

describe("QR-1 QR codes", () => {
  it("returns an SVG that points at the menu address, per table", async () => {
    const r = await call(qr, { url: "http://t/api/owner/qr?table=4&base=http://192.168.1.5:3000/" });
    expect(r.status).toBe(200);
    expect(r.headers.get("x-qr-url")).toBe("http://192.168.1.5:3000/r/golden-lotus?t=4");
    expect(String(r.data)).toContain("<svg");
  });
});

describe("MM-6 photo upload", () => {
  // the first bytes of a real PNG; the rest of the file does not matter for the type check
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const form = (type: string, size = 10, name = "a.png", head: number[] = PNG) => { const b = new Uint8Array(Math.max(size, 12)); b.set(head); const f = new FormData(); f.append("file", new File([b], name, { type })); return f; };
  it("checks what the file really is, not the type the browser claims", async () => {
    const JPG = [0xff, 0xd8, 0xff, 0xe0], WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
    expect((await call(upload, { method: "POST", form: form("image/jpeg", 20, "a.jpg", JPG) })).data.url).toMatch(/\.jpg$/);
    expect((await call(upload, { method: "POST", form: form("image/webp", 20, "a.webp", WEBP) })).data.url).toMatch(/\.webp$/);
    const text = Array.from(new TextEncoder().encode("<script>alert(1)</script>"));
    expect((await call(upload, { method: "POST", form: form("image/png", 30, "evil.png", text) })).status).toBe(400);      // a script renamed to .png
    expect((await call(upload, { method: "POST", form: form("image/png", 30, "a.png", JPG) })).status).toBe(400);         // a JPEG claiming to be a PNG
    expect((await call(upload, { method: "POST", form: form("image/jpeg", 30, "a.jpg", [0, 0, 0, 0]) })).status).toBe(400);
  });
  it("accepts JPG/PNG/WebP, serves them by generated name, and rejects other types and files over 8 MB", async () => {
    const ok = await call(upload, { method: "POST", form: form("image/png") });
    expect(ok.status).toBe(200);
    expect(ok.data.url).toMatch(/^\/api\/uploads\/[a-f0-9]{16}\.png$/);
    const served = await call(serveUpload, { params: { name: ok.data.url.split("/").pop()! } });
    expect(served.status).toBe(200);
    expect((await call(upload, { method: "POST", form: form("application/pdf") })).status).toBe(400);
    expect((await call(upload, { method: "POST", form: form("text/html", 10, "x.html") })).status).toBe(400);
    expect((await call(upload, { method: "POST", form: form("image/png", 8 * 1024 * 1024 + 1) })).status).toBe(400);
    expect((await call(upload, { method: "POST", form: new FormData() })).status).toBe(400);
  });
  it("needs an owner login, and the serving route refuses anything but generated names", async () => {
    signOut();
    expect((await call(upload, { method: "POST", form: form("image/png") })).status).toBe(401);
    for (const name of ["../secret", "shop.db", "..%2Fsecret", "AAAAAAAAAAAAAAAA.png", "0123456789abcdef.exe"]) expect((await call(serveUpload, { params: { name } })).status, name).toBe(404);
  });
});
