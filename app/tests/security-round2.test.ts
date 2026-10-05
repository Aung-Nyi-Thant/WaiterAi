// Second security round: PIN lockout that forged headers cannot dodge, chat preview only for the owner, cookie flags,
// login timing, the server-issued receipt code, and chat history scoped to its restaurant.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { vi } from "vitest";
import { call, jarOptions, mockModel, noModel, ownerLogin, signOut, staffLogin } from "./helpers";
import { clearPinLocks, hashPassword, checkPassword } from "@/modules/platform/auth";
import { POST as ownerLoginRoute } from "@/modules/platform/api/login";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as register } from "@/modules/platform/api/register";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { GET as dinerBill } from "@/modules/diner/api/bill";
import { itemsOf } from "@/modules/platform/menu";
import { get, run } from "@/modules/platform/db";

const saved: Record<string, string | undefined> = {};
const env = (o: Record<string, string | undefined>) => { for (const [k, v] of Object.entries(o)) { if (!(k in saved)) saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; delete saved[k]; } });

describe("NFR-SEC1 / SF-2 PIN guessing cannot be dodged by forging address headers", () => {
  beforeEach(() => { clearPinLocks(); signOut(); });
  const forged = (i: number) => ({ "x-forwarded-for": `198.51.100.${i}, 203.0.113.${i}`, "x-real-ip": `192.0.2.${i}` });

  it("without a trusted proxy: 20 wrong PINs, each with a different forged X-Forwarded-For, end in 429 (and the right PIN is refused)", async () => {
    const codes: number[] = [];
    for (let i = 1; i <= 20; i++) codes.push((await staffLogin("0000", "golden-lotus", undefined, forged(i))).status);
    expect(codes.at(-1)).toBe(429);
    expect(codes.indexOf(429)).toBe(5);                                           // the 6th: 5 wrong PINs lock the shared bucket
    expect((await staffLogin("1111", "golden-lotus", undefined, forged(99))).status).toBe(429);
  });

  it("behind a proxy whose address header can be changed anyway, the per-restaurant cap still locks after 20 wrong PINs", async () => {
    env({ RATE_LIMIT_TRUST_PROXY: "1" });
    const codes: number[] = [];
    for (let i = 1; i <= 25; i++) codes.push((await staffLogin("0000", "golden-lotus", undefined, forged(i))).status);
    expect(codes.slice(0, 20).every((c) => c === 401)).toBe(true);                // every address stays under its own limit of 5...
    expect(codes.slice(20).every((c) => c === 429)).toBe(true);                   // ...but the restaurant as a whole is locked from the 21st
    expect((await staffLogin("1111", "golden-lotus", undefined, forged(77))).status).toBe(429);
  });

  it("a correct PIN does not reset the restaurant's count (mixing in a known PIN does not give unlimited guesses)", async () => {
    env({ RATE_LIMIT_TRUST_PROXY: "1" });
    for (let i = 1; i <= 19; i++) await staffLogin("0000", "golden-lotus", undefined, forged(i));
    expect((await staffLogin("1111", "golden-lotus", undefined, forged(50))).status).toBe(200);
    expect((await staffLogin("0000", "golden-lotus", undefined, forged(51))).status).toBe(401);     // the 20th wrong PIN
    expect((await staffLogin("1111", "golden-lotus", undefined, forged(52))).status).toBe(429);
  });

  it("one address cannot lock the others out of a restaurant it has not reached 20 wrong PINs on, and the cap is configurable", async () => {
    env({ RATE_LIMIT_TRUST_PROXY: "1", RATE_LIMIT_PIN_RESTAURANT_MAX: "3" });
    for (let i = 1; i <= 3; i++) expect((await staffLogin("0000", "golden-lotus", undefined, forged(i))).status).toBe(401);
    expect((await staffLogin("1111", "golden-lotus", undefined, forged(9))).status).toBe(429);
    clearPinLocks();
    env({ RATE_LIMIT_PIN_RESTAURANT_MAX: "0" });                                  // 0 switches the restaurant cap off; per-address (5) still applies
    for (let i = 1; i <= 8; i++) expect((await staffLogin("0000", "golden-lotus", undefined, forged(i))).status).toBe(401);
  });
});

describe("AI-15 / ST-5 the chat 'preview' flag is only honoured for the signed-in owner of that restaurant", () => {
  const slug = "golden-lotus";
  const say = (message: string, o: Record<string, unknown> = {}) => call(chat, { method: "POST", params: { slug }, body: { message, sessionId: "prev-" + Math.random().toString(36).slice(2), table: "5", lang: "en", ...o } });
  const used = () => get("SELECT COUNT(*) AS n FROM chat_messages WHERE role = 'user'")!.n as number;
  afterEach(() => { run("UPDATE restaurants SET chat_cap = 300 WHERE slug = ?", slug); signOut(); });

  it("a diner who sends preview:true is treated as a normal diner: the monthly limit applies and the message is stored", async () => {
    const calls = mockModel("model answer");
    run("UPDATE restaurants SET chat_cap = ? WHERE slug = ?", used(), slug);       // the limit is already reached
    signOut();
    const r = await say("What would you recommend?", { preview: true });
    expect(r.data.reply).toMatch(/reached its chat limit/);
    expect(calls.length).toBe(0);                                                   // no model call, so no free use of the shop's computer
    run("UPDATE restaurants SET chat_cap = 300 WHERE slug = ?", slug);
    const before = used();
    expect((await say("hello there", { preview: true })).status).toBe(200);
    expect(used()).toBe(before + 1);                                                // it is stored (and counted), not hidden
  });

  it("the owner of another restaurant does not get a preview here either", async () => {
    noModel();
    const other = await call(register, { method: "POST", body: { email: "previewrival@example.com", password: "previewrival-1", restaurantName: "Preview Rival" } });
    expect(other.status).toBe(200);                                                 // register signs the new owner in
    run("UPDATE restaurants SET chat_cap = ? WHERE slug = ?", used(), slug);
    const r = await say("What would you recommend?", { preview: true });
    expect(r.data.reply).toMatch(/reached its chat limit/);
  });

  it("the signed-in owner of this restaurant still gets it: no limit, nothing stored", async () => {
    mockModel("model answer");
    run("UPDATE restaurants SET chat_cap = ? WHERE slug = ?", used(), slug);
    await ownerLogin();
    const before = used();
    expect((await say("What would you recommend?", { preview: true })).data.reply).toBe("model answer");
    expect(used()).toBe(before);
  });
});

describe("NFR-SEC1 session cookies are HttpOnly, SameSite=Lax and Secure in production", () => {
  const flags = async (login: () => Promise<unknown>, name: string) => { signOut(); jarOptions.clear(); await login(); return jarOptions.get(name); };
  it("owner and staff cookies carry httpOnly, sameSite lax and secure when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const [name, login] of [["owner", () => ownerLogin()], ["staff", () => staffLogin("1111")]] as const) {
      const o = await flags(login, name);
      expect(o, name).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    }
  });
  it("outside production (tests, local development) they are not Secure, so http://localhost sign-in keeps working", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await flags(() => ownerLogin(), "owner")).secure).toBe(false);
  });
  it("COOKIE_SECURE=0 switches Secure off for an http-only LAN demo, COOKIE_SECURE=1 forces it on", async () => {
    vi.stubEnv("NODE_ENV", "production");
    env({ COOKIE_SECURE: "0" });
    expect((await flags(() => staffLogin("1111"), "staff")).secure).toBe(false);
    env({ COOKIE_SECURE: "1" });
    vi.stubEnv("NODE_ENV", "development");
    expect((await flags(() => staffLogin("1111"), "staff")).secure).toBe(true);
  });
});

describe("NFR-SEC1 owner login takes one bcrypt compare whether or not the email exists, and bcrypt is asynchronous", () => {
  const login = (email: string, password: string) => call(ownerLoginRoute, { method: "POST", body: { email, password } });
  it("an unknown email still costs a compare (same work as a wrong password), and both answer with the same message", async () => {
    signOut();
    const spy = vi.spyOn(bcrypt, "compare");
    const unknown = await login("nobody-here@example.com", "whatever-123");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    const wrong = await login("demo@shop.ai", "whatever-123");
    expect(spy).toHaveBeenCalledTimes(1);
    expect([unknown.status, wrong.status]).toEqual([401, 401]);
    expect(unknown.data).toEqual(wrong.data);
  });
  it("hashing and checking are asynchronous (they do not block the server's single thread)", async () => {
    const h = hashPassword("a-password");
    expect(h).toBeInstanceOf(Promise);
    const hash = await h;
    const c = checkPassword("a-password", hash);
    expect(c).toBeInstanceOf(Promise);
    expect(await c).toBe(true);
    expect(await checkPassword("other", hash)).toBe(false);
  });
  it("no request path uses the synchronous bcrypt calls (only the first-start demo seed and the seed script do)", () => {
    const root = path.resolve(__dirname, "../src");
    const hits: string[] = [];
    const walk = (d: string) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.tsx?$/.test(f.name) && /(hash|compare|genSalt)Sync/.test(fs.readFileSync(p, "utf8"))) hits.push(path.relative(root, p)); } };
    walk(root);
    expect(hits).toEqual(["modules/platform/db.ts"]);          // the development demo seed, run once at start-up and never in production
  });
});

describe("PC-6 the receipt code that opens a table's bill is issued by the server, not chosen by the phone", () => {
  const slug = "golden-lotus";
  const dish = () => itemsOf(1).find((i) => i.available)!.id;
  const order = (table: string, receipt?: string) => call(placeOrder, { method: "POST", params: { slug }, body: { table, receipt, items: [{ id: dish(), qty: 1 }] } });
  const bill = (table: string, code: string) => call(dinerBill, { params: { slug }, url: `http://t/api/bill?t=${table}&r=${code}` });

  it("returns a random 48-character code with the order, and stores that, not whatever the phone sent", async () => {
    const chosen = "A".repeat(32);                                                  // a weak code a phone might try to pick
    const o = await order("61", chosen);
    expect(o.data.receipt).toMatch(/^[a-f0-9]{48}$/);
    expect(o.data.receipt).not.toBe(chosen);
    expect(get("SELECT receipt FROM orders WHERE id = ?", o.data.id)!.receipt).toBe(o.data.receipt);
    expect((await order("62")).data.receipt).not.toBe(o.data.receipt);              // every new phone gets its own code
  });
  it("a code the phone made up opens nothing, even after it has sent picks with it", async () => {
    const chosen = "b".repeat(48);                                                  // well-formed, but not issued by the server
    const o = await order("63", chosen);
    expect((await bill("63", chosen)).data.total).toBe(0);
    expect((await bill("63", chosen)).data.lines).toEqual([]);
    expect((await bill("63", o.data.receipt)).data.pending.length).toBe(1);          // the issued code works
  });
  it("a phone that sends its issued code back keeps it, for the same table only", async () => {
    const first = (await order("64")).data.receipt;
    expect((await order("64", first)).data.receipt).toBe(first);
    const other = (await order("65", first)).data.receipt;                          // a different table gets a new code, the old one is not reused
    expect(other).not.toBe(first);
    expect((await bill("65", first)).data.pending).toEqual([]);                     // the code for table 64 shows nothing of table 65
  });
  it("codes cannot be guessed from other restaurants' orders: a code issued by one restaurant opens nothing in another", async () => {
    signOut();
    const rival = await call(register, { method: "POST", body: { email: "receiptrival@example.com", password: "receiptrival-1", restaurantName: "Receipt Rival" } });
    const rslug = rival.data.slug;
    const code = (await order("66")).data.receipt;
    const r = await call(dinerBill, { params: { slug: rslug }, url: `http://t/api/bill?t=66&r=${code}` });
    expect(r.data).toEqual({ table: "66", lines: [], total: 0, pending: [], asked: false });
  });
});

describe("NFR-SEC2 chat history is read only from the restaurant's own session", () => {
  const say = (slug: string, message: string, sessionId: string) => call(chat, { method: "POST", params: { slug }, body: { message, sessionId, table: "5", lang: "en" } });
  it("a session id used at another restaurant does not pull that restaurant's messages into the prompt", async () => {
    signOut();
    const rival = await call(register, { method: "POST", body: { email: "historyrival@example.com", password: "historyrival-1", restaurantName: "History Rival" } });
    const rslug = rival.data.slug;
    const calls = mockModel("some answer");
    await say("golden-lotus", "Tell me a story about the zanzibar-quokka", "shared-session-1");   // an open question, stored with its restaurant
    expect(JSON.stringify(calls[0].body)).toContain("zanzibar-quokka");
    calls.length = 0;
    await say(rslug, "And what else would you say about it?", "shared-session-1");                  // the other restaurant, same session id: must not see it
    expect(calls.length).toBeGreaterThan(0);
    expect(JSON.stringify(calls[0].body)).not.toContain("zanzibar-quokka");
    calls.length = 0;
    await say("golden-lotus", "And what else would you say about it?", "shared-session-1");        // control: the same restaurant does see its own history
    expect(JSON.stringify(calls[0]?.body)).toContain("zanzibar-quokka");
  });
  it("picks sent from another restaurant with someone's session id do not inherit that session's allergies", async () => {
    signOut();
    const rival = await call(register, { method: "POST", body: { email: "historyrival2@example.com", password: "historyrival-2", restaurantName: "History Rival Two" } });
    noModel();
    await say("golden-lotus", "I am allergic to peanuts", "allergy-session-1");
    expect(get("SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = 'allergy-session-1' AND restaurant_id = 1")!.n).toBeGreaterThan(0);
    const rslug = rival.data.slug;
    const { POST: placeOrderRival } = await import("@/modules/diner/api/orders");
    // the rival restaurant has no dishes yet; give it one so an order can be placed
    const rid = get("SELECT id FROM restaurants WHERE slug = ?", rslug)!.id;
    const itemId = run("INSERT INTO menu_items (restaurant_id, name_en, price, available) VALUES (?,?,?,1)", rid, "Rival Dish", 10).id;
    const o = await call(placeOrderRival, { method: "POST", params: { slug: rslug }, body: { table: "1", sessionId: "allergy-session-1", items: [{ id: itemId, qty: 1 }] } });
    expect(o.status).toBe(200);
    expect(get("SELECT allergy_note FROM orders WHERE id = ?", o.data.id)!.allergy_note).toBe("");
  });
});
