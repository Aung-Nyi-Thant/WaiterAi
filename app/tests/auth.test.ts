import crypto from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";
import { call, jar, signOut, ownerLogin, staffLogin } from "./helpers";
import { POST as register } from "@/modules/platform/api/register";
import { POST as login } from "@/modules/platform/api/login";
import { POST as logout } from "@/modules/platform/api/logout";
import { GET as ownerMe } from "@/modules/platform/api/ownerMe";
import { GET as ownerItems, POST as createItem } from "@/modules/owner/api/items";
import { PUT as updateItem, DELETE as deleteItem } from "@/modules/owner/api/itemsById";
import { GET as listResource, POST as createResource } from "@/modules/owner/api/resource";
import { PUT as updateResource, DELETE as deleteResource } from "@/modules/owner/api/resourceItem";
import { GET as settings, PUT as saveSettings } from "@/modules/owner/api/settings";
import { GET as insights } from "@/modules/platform/api/insights";
import { GET as qr } from "@/modules/platform/api/qr";
import { GET as floor } from "@/modules/staff/api/floor";
import { GET as kitchen } from "@/modules/staff/api/kitchen";
import { POST as takeOrder } from "@/modules/staff/api/orders";
import { all, get } from "@/modules/platform/db";

const reg = (b: object) => call(register, { method: "POST", body: b });

describe("OA-1 owner registration", () => {
  it("rejects a bad email, a short password and a missing restaurant name", async () => {
    expect((await reg({ email: "nope", password: "longenough1", restaurantName: "X" })).status).toBe(400);
    expect((await reg({ email: "a@b.co", password: "short", restaurantName: "X" })).status).toBe(400);
    expect((await reg({ email: "a@b.co", password: "longenough1", restaurantName: "  " })).status).toBe(400);
  });
  it("creates the restaurant, a unique slug, 4 default categories and a session", async () => {
    signOut();
    const r = await reg({ email: "Owner1@Example.com", password: "password-one", restaurantName: "My Café!" });
    expect(r.status).toBe(200);
    expect(r.data.slug).toBe("my-caf");
    expect(jar.has("owner")).toBe(true);
    const rid = get("SELECT id FROM restaurants WHERE slug = 'my-caf'")!.id;
    expect(all("SELECT name_en FROM categories WHERE restaurant_id = ? ORDER BY sort", rid).map((c: any) => c.name_en)).toEqual(["Starters", "Mains", "Desserts", "Drinks"]);
    expect((await call(ownerMe)).data.restaurant.slug).toBe("my-caf");
  });
  it("lower-cases the email and rejects a duplicate (409)", async () => {
    expect(get("SELECT email FROM users WHERE email = 'owner1@example.com'")).toBeTruthy();
    expect((await reg({ email: "OWNER1@example.com", password: "password-one", restaurantName: "Other" })).status).toBe(409);
  });
  it("gives a second restaurant with the same name a different slug", async () => {
    const r = await reg({ email: "owner2@example.com", password: "password-two", restaurantName: "My Café" });
    expect(r.data.slug).toBe("my-caf-2");
  });
});

describe("OA-2 / NFR-SEC1 login and password storage", () => {
  it("stores passwords and PINs as bcrypt hashes, never in clear", () => {
    const u = get("SELECT password_hash FROM users WHERE email = 'demo@shop.ai'")!;
    expect(u.password_hash).toMatch(/^\$2[aby]\$/);
    expect(u.password_hash).not.toContain("demo1234");
    for (const s of all("SELECT pin_hash FROM staff")) expect(s.pin_hash).toMatch(/^\$2[aby]\$/);
  });
  it("rejects a wrong password and an unknown email with the same 401", async () => {
    signOut();
    expect((await call(login, { method: "POST", body: { email: "demo@shop.ai", password: "wrong" } })).status).toBe(401);
    expect((await call(login, { method: "POST", body: { email: "nobody@shop.ai", password: "demo1234" } })).status).toBe(401);
    expect(jar.has("owner")).toBe(false);
  });
  it("signs the owner in and out", async () => {
    const r = await ownerLogin();
    expect(r.status).toBe(200);
    expect(r.data.slug).toBe("golden-lotus");
    expect((await call(ownerMe)).status).toBe(200);
    await call(logout, { method: "POST" });
    expect((await call(ownerMe)).status).toBe(401);
  });
});

describe("NFR-SEC1 session cookies are signed and expire", () => {
  const secret = "test-secret-not-for-production";
  const forge = (payload: object, key = secret) => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${body}.${crypto.createHmac("sha256", key).update(body).digest("base64url")}`;
  };
  const rid = () => get("SELECT id, owner_id FROM restaurants WHERE slug = 'golden-lotus'")!;
  it("accepts a correctly signed cookie", async () => {
    signOut();
    jar.set("owner", forge({ userId: rid().owner_id, restaurantId: rid().id, slug: "golden-lotus", exp: Date.now() + 60_000 }));
    expect((await call(ownerMe)).status).toBe(200);
  });
  it("rejects an expired cookie", async () => {
    signOut();
    jar.set("owner", forge({ userId: rid().owner_id, restaurantId: rid().id, slug: "golden-lotus", exp: Date.now() - 1 }));
    expect((await call(ownerMe)).status).toBe(401);
  });
  it("rejects a cookie signed with another secret and a tampered payload", async () => {
    signOut();
    jar.set("owner", forge({ userId: rid().owner_id, restaurantId: rid().id, slug: "golden-lotus", exp: Date.now() + 60_000 }, "wrong-secret"));
    expect((await call(ownerMe)).status).toBe(401);
    await ownerLogin();
    const [body, sig] = jar.get("owner")!.split(".");
    const evil = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), restaurantId: 999 })).toString("base64url");
    jar.set("owner", `${evil}.${sig}`);
    expect((await call(ownerMe)).status).toBe(401);
  });
  it("rejects a valid signature for a restaurant the user does not own", async () => {
    signOut();
    const other = get("SELECT id FROM restaurants WHERE slug = 'my-caf'")!.id;
    jar.set("owner", forge({ userId: rid().owner_id, restaurantId: other, slug: "my-caf", exp: Date.now() + 60_000 }));
    expect((await call(ownerMe)).status).toBe(401);
  });
});

describe("OA-3 role permissions: diner / owner / staff", () => {
  const ownerRoutes: [string, () => Promise<{ status: number }>][] = [
    ["GET owner items", () => call(ownerItems)],
    ["POST owner item", () => call(createItem, { method: "POST", body: { name: { en: "X" }, price: 1 } })],
    ["PUT owner item", () => call(updateItem, { method: "PUT", params: { id: "1" }, body: { price: 1 } })],
    ["DELETE owner item", () => call(deleteItem, { method: "DELETE", params: { id: "1" } })],
    ["GET faqs", () => call(listResource, { params: { resource: "faqs" } })],
    ["POST staff", () => call(createResource, { method: "POST", params: { resource: "staff" }, body: { name: "x", role: "chef", pin: "1234" } })],
    ["PUT category", () => call(updateResource, { method: "PUT", params: { resource: "categories", id: "1" }, body: { name_en: "x" } })],
    ["DELETE category", () => call(deleteResource, { method: "DELETE", params: { resource: "categories", id: "1" } })],
    ["GET settings", () => call(settings)],
    ["PUT settings", () => call(saveSettings, { method: "PUT", body: { name: "Hacked" } })],
    ["GET insights", () => call(insights)],
    ["GET qr", () => call(qr)],
  ];
  const staffRoutes: [string, () => Promise<{ status: number }>][] = [
    ["floor", () => call(floor)],
    ["kitchen", () => call(kitchen)],
    ["take order", () => call(takeOrder, { method: "POST", params: { id: "1" }, body: { action: "take" } })],
  ];
  it("a diner (no cookie) cannot use any owner or staff API", async () => {
    signOut();
    for (const [name, f] of [...ownerRoutes, ...staffRoutes]) expect((await f()).status, name).toBe(401);
  });
  it("a staff cookie cannot use any owner API", async () => {
    expect((await staffLogin("1111")).status).toBe(200);
    for (const [name, f] of ownerRoutes) expect((await f()).status, name).toBe(401);
  });
  it("an owner cookie cannot use any staff API", async () => {
    await ownerLogin();
    for (const [name, f] of staffRoutes) expect((await f()).status, name).toBe(401);
  });
  it("the owner cannot do anything to the staff API even with a valid owner session", async () => {
    expect((await call(floor)).status).toBe(401);
  });
});

describe("NFR-SEC2 one restaurant cannot touch another's data", () => {
  let itemId: number;
  beforeAll(async () => {
    await ownerLogin();
    itemId = (await call(ownerItems)).data[0].id;
  });
  it("another owner cannot read, edit or delete the first owner's dishes and categories", async () => {
    signOut();
    await call(login, { method: "POST", body: { email: "owner1@example.com", password: "password-one" } });
    expect((await call(ownerItems)).data).toEqual([]);                       // sees only its own (empty) menu
    expect((await call(updateItem, { method: "PUT", params: { id: String(itemId) }, body: { price: 1 } })).status).toBe(404);
    await call(deleteItem, { method: "DELETE", params: { id: String(itemId) } });
    expect(get("SELECT price FROM menu_items WHERE id = ?", itemId)!.price).toBeGreaterThan(1);   // untouched
    const demoCat = get("SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'golden-lotus') LIMIT 1")!.id;
    expect((await call(updateResource, { method: "PUT", params: { resource: "categories", id: String(demoCat) }, body: { name_en: "Hacked" } })).status).toBe(404);
    await call(deleteResource, { method: "DELETE", params: { resource: "categories", id: String(demoCat) } });
    expect(get("SELECT name_en FROM categories WHERE id = ?", demoCat)!.name_en).not.toBe("Hacked");
    expect(get("SELECT 1 FROM categories WHERE id = ?", demoCat)).toBeTruthy();
  });
  it("cannot put a dish into another restaurant's category", async () => {
    const demoCat = get("SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'golden-lotus') LIMIT 1")!.id;
    const r = await call(createItem, { method: "POST", body: { name: { en: "Sneaky" }, price: 5, category_id: demoCat } });
    expect(r.status).toBe(400);
  });
  it("a staff member only sees their own restaurant's orders and dishes", async () => {
    await staffLogin("1111");
    const f = (await call(floor)).data;
    expect(f.dishes.length).toBe(13);
    expect(f.me.slug).toBe("golden-lotus");
  });
});

describe("SF-1 / SF-2 staff accounts and PIN sign-in", () => {
  it("rejects an unknown restaurant (404) and a wrong PIN (401)", async () => {
    expect((await staffLogin("1111", "no-such-place")).status).toBe(404);
    expect((await staffLogin("9999")).status).toBe(401);
  });
  it("signs a waiter and a chef in and returns their role", async () => {
    expect((await staffLogin("1111")).data.role).toBe("waiter");
    expect((await staffLogin("2222")).data.role).toBe("chef");
  });
  it("lets the owner create, change and remove staff, validates input and hides PIN hashes", async () => {
    await ownerLogin();
    const create = (b: object) => call(createResource, { method: "POST", params: { resource: "staff" }, body: b });
    expect((await create({ name: "Bad", role: "manager", pin: "1234" })).status).toBe(400);
    expect((await create({ name: "Bad", role: "chef", pin: "12" })).status).toBe(400);
    expect((await create({ name: "Bad", role: "chef", pin: "12ab" })).status).toBe(400);
    expect((await create({ name: " ", role: "chef", pin: "1234" })).status).toBe(400);
    const ok = await create({ name: "Nok", role: "waiter", pin: "4321" });
    expect(ok.status).toBe(200);
    const list = (await call(listResource, { params: { resource: "staff" } })).data;
    expect(list.find((s: any) => s.name === "Nok")).toBeTruthy();
    expect(JSON.stringify(list)).not.toContain("pin");
    const upd = (id: string, b: object) => call(updateResource, { method: "PUT", params: { resource: "staff", id }, body: b });
    expect((await upd(String(ok.data.id), { pin: "1" })).status).toBe(400);            // invalid input is a 400, not a 404
    expect((await upd(String(ok.data.id), { role: "manager" })).status).toBe(400);    // used to crash on the database CHECK
    expect((await upd("99999", { pin: "8765" })).status).toBe(404);
    expect((await call(updateResource, { method: "PUT", params: { resource: "staff", id: String(ok.data.id) }, body: { pin: "8765" } })).status).toBe(200);
    expect((await staffLogin("4321")).status).toBe(401);
    expect((await staffLogin("8765")).status).toBe(200);
    await ownerLogin();
    await call(deleteResource, { method: "DELETE", params: { resource: "staff", id: String(ok.data.id) } });
    expect((await staffLogin("8765")).status).toBe(401);
  });
});
