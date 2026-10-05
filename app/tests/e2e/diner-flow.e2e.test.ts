// End-to-end: real HTTP requests to the real server (see globalSetup.ts). Run with `npm run test:e2e`.
import { describe, it, expect } from "vitest";

const BASE = process.env.E2E_BASE_URL!;
const slug = "golden-lotus";

// a tiny browser: remembers cookies per "person"
const person = () => {
  const jar = new Map<string, string>();
  return async (path: string, body?: unknown, method = body === undefined ? "GET" : "POST") => {
    const res = await fetch(BASE + path, {
      method, redirect: "manual",
      headers: { "content-type": "application/json", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    const text = await res.text();
    let data: any = text; try { data = JSON.parse(text); } catch {}
    return { status: res.status, data, type: res.headers.get("content-type") || "", retryAfter: res.headers.get("retry-after") };
  };
};

describe("UC-1 / UC-2 / UC-3 / UC-8 / UC-9 / PC-2 / SF-2 / SF-3 / SF-5 diner flow against the running server", () => {
  const diner = person();
  let dishes: any[];
  const dish = (n: string) => dishes.find((d) => d.name.en === n);
  let orderId: number;
  let receipt: string;

  it("DM-1 serves the diner page and the menu without any login", async () => {
    const page = await fetch(`${BASE}/r/${slug}?t=5`);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    const menu = await diner(`/api/public/${slug}/menu?open=1`);
    expect(menu.status).toBe(200);
    dishes = menu.data.items;
    expect(dishes).toHaveLength(13);
    expect(menu.data.categories.length).toBeGreaterThan(0);
  });

  it("answers an allergy question from the database and asks to confirm with the staff", async () => {
    const r = await diner(`/api/public/${slug}/chat`, { message: "I'm allergic to peanuts", sessionId: "e2e-1", table: "5", lang: "en" });
    expect(r.status).toBe(200);
    expect(r.data.reply).toMatch(/Shrimp Pad Thai/);
    expect(r.data.reply).toMatch(/confirm with the staff/);
    expect(r.data.reply).not.toMatch(/\bsafe\b/i);
  });

  it("does not call the waiter when the dish name contains 'pay' (papaya)", async () => {
    const r = await diner(`/api/public/${slug}/chat`, { message: "how much is the papaya salad", sessionId: "e2e-1", table: "5" });
    expect(r.data.reply).toBe("Papaya Salad is ฿70.");
    expect(r.data.action.type).toBe("show_dishes");
  });

  it("turns an order sentence into picks, in Thai too", async () => {
    const r = await diner(`/api/public/${slug}/chat`, { message: "2 x mango sticky rice please", sessionId: "e2e-1", table: "5" });
    expect(r.data.action.type).toBe("add_to_picks");
    expect(r.data.action.qty[dish("Mango Sticky Rice").id]).toBe(2);
    const th = await diner(`/api/public/${slug}/chat`, { message: "ร้านปิดกี่โมง", sessionId: "e2e-1", table: "5" });
    expect(th.data.reply).toContain("10:00-22:00");
  });

  it("AI-11 / NFR-R1 falls back safely when the language model is unreachable", async () => {
    const t0 = Date.now();
    const r = await diner(`/api/public/${slug}/chat`, { message: "What would you recommend on a hot day?", sessionId: "e2e-1", table: "5" });
    expect(Date.now() - t0, "the fallback message must appear within 5 seconds").toBeLessThan(5000);
    expect(r.status).toBe(200);
    expect(r.data.reply).toMatch(/unavailable/);
    expect(r.data.action.type).toBe("show_menu");
    expect(r.data.answered).toBe(false);
  });

  it("sends the picks to the staff; a sold-out dish is ignored", async () => {
    const o = await diner(`/api/public/${slug}/orders`, { table: "5", lang: "en", sessionId: "e2e-1", receipt: "e2e-phone-0123456789abcdef", items: [{ id: dish("Mango Sticky Rice").id, qty: 2 }, { id: dish("Coconut Ice Cream").id, qty: 1 }] });
    expect(o.status).toBe(200);
    orderId = o.data.id;
    receipt = o.data.receipt;                                                       // issued by the server (the made-up one above is ignored)
    expect(receipt).toMatch(/^[a-f0-9]{48}$/);
    expect((await diner(`/api/public/${slug}/orders`, { table: "5", items: [{ id: dish("Coconut Ice Cream").id, qty: 1 }] })).status).toBe(400);
  });

  it("the waiter signs in, sees the pick with the allergy note, and takes it; the chef cooks; the waiter serves", async () => {
    const waiter = person(), chef = person();
    expect((await waiter("/api/staff/floor")).status).toBe(401);
    expect((await waiter("/api/staff/login", { slug, pin: process.env.E2E_WAITER_PIN })).data.role).toBe("waiter");
    expect((await chef("/api/staff/login", { slug, pin: process.env.E2E_CHEF_PIN })).data.role).toBe("chef");
    const pick = (await waiter("/api/staff/floor")).data.picks.find((p: any) => p.id === orderId);
    expect(pick).toMatchObject({ table: "5", allergy: "peanut" });
    expect((await chef(`/api/staff/orders/${orderId}`, { action: "take" })).status).toBe(403);
    expect((await waiter(`/api/staff/orders/${orderId}`, { action: "take" })).status).toBe(200);
    expect((await chef(`/api/staff/orders/${orderId}`, { action: "cooking" })).status).toBe(200);
    expect((await chef(`/api/staff/orders/${orderId}`, { action: "ready" })).status).toBe(200);
    expect((await waiter(`/api/staff/orders/${orderId}`, { action: "served" })).status).toBe(200);
    const bill = await diner(`/api/public/${slug}/bill?t=5&r=${receipt}`);
    expect(bill.data.total).toBe(200);
    expect((await diner(`/api/public/${slug}/bill?t=5`)).data.total).toBe(0);                        // no receipt code: nothing is shown
    expect((await diner(`/api/public/${slug}/bill?t=5&r=e2e-phone-0123456789abcdef`)).data.total).toBe(0);
  });
});

describe("NFR-SEC1 / NFR-SEC2 / NFR-SEC3 / NFR-R1 security of the running server (demo logins are development-only)", () => {
  it("owner and staff APIs refuse anonymous callers", async () => {
    const anon = person();
    for (const p of ["/api/owner/items", "/api/owner/me", "/api/owner/insights", "/api/staff/floor", "/api/staff/kitchen"]) expect((await anon(p)).status, p).toBe(401);
  });
  it("the public demo logins do NOT work in production", async () => {
    const anon = person();
    expect((await anon("/api/auth/login", { email: "demo@shop.ai", password: "demo1234" })).status).toBe(401);
    expect((await anon("/api/staff/login", { slug, pin: "1111" })).status).toBe(401);
    expect((await anon("/api/staff/login", { slug, pin: "2222" })).status).toBe(401);
  });
  it("the credentials given to the seed script do work", async () => {
    const owner = person();
    expect((await owner("/api/auth/login", { email: process.env.E2E_OWNER_EMAIL, password: process.env.E2E_OWNER_PASSWORD })).status).toBe(200);
    expect((await owner("/api/owner/items")).data).toHaveLength(13);
  });
  it("only generated upload names are served", async () => {
    const r = await fetch(`${BASE}/api/uploads/..%2F..%2Fsecret`);
    expect(r.status).toBe(404);
  });
});

// Kept last: it locks accounts for a minute. The server was started with RATE_LIMIT_LOGIN_MAX=5 and RATE_LIMIT_CHAT_MAX=10.
describe("rate limits on the running server", () => {
  it("chat: the 11th message of a session is refused with 429 and Retry-After; another session still works", async () => {
    const diner = person();
    for (let i = 0; i < 10; i++) expect((await diner(`/api/public/${slug}/chat`, { message: "hours?", sessionId: "e2e-rate", table: "5" })).status).toBe(200);
    const blocked = await diner(`/api/public/${slug}/chat`, { message: "hours?", sessionId: "e2e-rate", table: "5" });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.retryAfter)).toBeGreaterThan(0);
    expect(blocked.data.error).toMatch(/Too many attempts/);
    expect((await diner(`/api/public/${slug}/chat`, { message: "hours?", sessionId: "e2e-rate-2", table: "5" })).status).toBe(200);
  });
  it("owner login: after 5 wrong passwords the account is locked for a minute (429), other accounts are not", async () => {
    const attacker = person();
    for (let i = 0; i < 5; i++) expect((await attacker("/api/auth/login", { email: "lockout@test.local", password: "wrong" })).status).toBe(401);
    const blocked = await attacker("/api/auth/login", { email: "lockout@test.local", password: "wrong" });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.retryAfter)).toBeGreaterThan(0);
    const owner = person();
    expect((await owner("/api/auth/login", { email: process.env.E2E_OWNER_EMAIL, password: process.env.E2E_OWNER_PASSWORD })).status).toBe(200);
  });
  it("staff login: repeated wrong PINs lock PIN sign-in for the restaurant, even for the right PIN", async () => {
    const attacker = person();
    let blocked = 0;
    for (let i = 0; i < 8 && !blocked; i++) { const r = await attacker("/api/staff/login", { slug, pin: String(6000 + i) }); if (r.status === 429) blocked = i + 1; else expect(r.status).toBe(401); }
    expect(blocked, "no 429 after 8 wrong PINs").toBeGreaterThan(0);
    expect(blocked).toBeLessThanOrEqual(6);
    expect((await person()("/api/staff/login", { slug, pin: process.env.E2E_WAITER_PIN })).status).toBe(429);
  });
});
