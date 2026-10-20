// End-to-end for the second sample restaurant: real HTTP against the built server, the way a deployment with two restaurants runs.
import { describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL!;
const slug = "hachi-kyu";
const PICTO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|️/u;

const person = () => {
  const jar = new Map<string, string>();
  return async (path: string, body?: unknown, method = body === undefined ? "GET" : "POST") => {
    const res = await fetch(BASE + path, { method, redirect: "manual", headers: { "content-type": "application/json", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") }, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    const text = await res.text();
    let data: any = text; try { data = JSON.parse(text); } catch {}
    return { status: res.status, data };
  };
};

describe("HaChi Kyu on the running server", () => {
  const diner = person(), waiter = person(), chef = person();
  let items: any[];
  const dish = (n: string) => items.find((d) => d.name.en === n);
  let pickId: number;

  it("serves the diner page and a 132-dish menu in 9 categories; the first restaurant is unchanged", async () => {
    const page = await fetch(`${BASE}/r/${slug}?t=7`);
    expect(page.status).toBe(200);
    const menu = await diner(`/api/public/${slug}/menu?open=1`);
    expect(menu.status).toBe(200);
    items = menu.data.items;
    expect(items).toHaveLength(132);
    expect(menu.data.categories).toHaveLength(9);
    expect(menu.data.restaurant.name).toBe("HaChi Kyu");
    expect((await diner("/api/public/golden-lotus/menu")).data.items).toHaveLength(13);
    expect((await diner("/api/public/no-such-restaurant/menu")).status).toBe(404);
  });
  it("no dish links to another website (a diner's phone would fetch it from there)", () => {
    expect(items.filter((i) => i.photo_url)).toEqual([]);
  });
  it("an allergy question is answered from the database: the dish named, 'confirm with the staff', no claim of safety", async () => {
    const r = await diner(`/api/public/${slug}/chat`, { message: "I'm allergic to fish. Can I eat the Squid Sushi?", sessionId: "hk-e2e-1", table: "7", lang: "en" });
    expect(r.status).toBe(200);
    expect(r.data.reply).toContain("Squid Sushi");
    expect(r.data.reply).toMatch(/confirm with the staff/);
    expect(r.data.reply).not.toMatch(/\bsafe\b/i);
    expect(r.data.reply).not.toContain("Salmon Sushi");               // one typed dish is one dish
  });
  it("a dish with no allergen estimate is reported as 'not provided', never as free of the allergen", async () => {
    const r = await diner(`/api/public/${slug}/chat`, { message: "I'm allergic to peanuts. Can I eat the Garlic Skewer?", sessionId: "hk-e2e-1", table: "7", lang: "en" });
    expect(r.data.reply).toMatch(/not provided/i);
    expect(r.data.reply).not.toMatch(/\bno peanuts?\b|free of peanut/i);
  });
  it("ordering one dish puts exactly that dish in the picks", async () => {
    const r = await diner(`/api/public/${slug}/chat`, { message: "I'll have 2 Squid Sushi", sessionId: "hk-e2e-1", table: "7" });
    expect(r.data.action.type).toBe("add_to_picks");
    expect(r.data.action.ids).toEqual([dish("Squid Sushi").id]);
    expect(r.data.action.qty[dish("Squid Sushi").id]).toBe(2);
  });
  it("sends picks; only this restaurant's waiter sees them; the kitchen cooks; the waiter serves", async () => {
    const sent = await diner(`/api/public/${slug}/orders`, { table: "7", lang: "en", sessionId: "hk-e2e-1", items: [{ id: dish("Squid Sushi").id, qty: 2 }, { id: dish("Salmon Sashimi").id, qty: 1 }] });
    expect(sent.status).toBe(200);
    pickId = sent.data.id;

    expect((await waiter("/api/staff/login", { slug, pin: process.env.E2E_HACHI_WAITER_PIN })).status).toBe(200);
    const floor = await waiter("/api/staff/floor");
    const pick = floor.data.picks.find((p: any) => p.id === pickId);
    expect(pick).toMatchObject({ table: "7", status: "picked" });
    expect(pick.items.reduce((s: number, i: any) => s + i.qty, 0)).toBe(3);
    expect(floor.data.dishes).toHaveLength(132);                                   // only this restaurant's dishes on the waiter's sold-out list
    expect(JSON.stringify(floor.data)).not.toContain("Shrimp Pad Thai");
    // (the other restaurant's staff account is locked for a minute by diner-flow.e2e.test.ts, so isolation from its side is in tests/hachi-kyu.test.ts)
    const act = (who: ReturnType<typeof person>, action: string) => who(`/api/staff/orders/${pickId}`, { action });
    expect((await act(waiter, "take")).status).toBe(200);

    expect((await chef("/api/staff/login", { slug, pin: process.env.E2E_HACHI_CHEF_PIN, role: "chef" })).status).toBe(200);
    expect((await chef("/api/staff/kitchen")).data.tickets.new.some((t: any) => t.id === pickId)).toBe(true);
    expect((await act(chef, "cooking")).status).toBe(200);
    expect((await act(chef, "ready")).status).toBe(200);
    expect((await act(waiter, "served")).status).toBe(200);
  });
  it("the first restaurant's PIN does not open this one, and this one's owner cannot read the other's data", async () => {
    expect((await person()("/api/staff/login", { slug, pin: process.env.E2E_WAITER_PIN })).status).toBeGreaterThanOrEqual(400);
    const owner = person();
    expect((await owner("/api/auth/login", { email: process.env.E2E_HACHI_OWNER_EMAIL, password: process.env.E2E_HACHI_OWNER_PASSWORD })).status).toBe(200);
    const mine = JSON.stringify((await owner("/api/owner/items")).data);
    expect(mine).toContain("Salmon Sashimi");
    expect(mine).not.toContain("Shrimp Pad Thai");
  });
  it("the built pages and styles ship no emoji, and the stylesheet carries the motion and touch rules", async () => {
    for (const p of ["/login", "/staff", "/owner/menu", `/r/${slug}`]) { const html = await (await fetch(BASE + p)).text(); expect(PICTO.test(html), p).toBe(false); }
    const home = await (await fetch(`${BASE}/login`)).text();
    const href = home.match(/\/_next\/static\/[^"']+\.css/)?.[0];
    expect(href, "the page links a stylesheet").toBeTruthy();
    const css = await (await fetch(BASE + href!)).text();
    for (const rule of ["sa-sheet-in", "sa-page-in", "sa-fresh", "prefers-reduced-motion", "-webkit-tap-highlight-color", "hover:hover"]) expect(css, rule).toContain(rule);
    expect(PICTO.test(css)).toBe(false);
  });
});
