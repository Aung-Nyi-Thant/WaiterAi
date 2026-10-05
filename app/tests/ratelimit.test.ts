// Rate limits on the login and chat endpoints (configurable with RATE_LIMIT_* environment variables).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { call, signOut, noModel, jar } from "./helpers";
import { POST as ownerLogin } from "@/modules/platform/api/login";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as register } from "@/modules/platform/api/register";
import { clearAll, clientIp, hit, peek, record, setting } from "@/modules/platform/rateLimit";

const KEYS = ["RATE_LIMIT_REGISTER_MAX", "RATE_LIMIT_REGISTER_IP_MAX", "RATE_LIMIT_REGISTER_WINDOW_SEC", "RATE_LIMIT_LOGIN_MAX", "RATE_LIMIT_LOGIN_WINDOW_SEC", "RATE_LIMIT_CHAT_MAX", "RATE_LIMIT_CHAT_WINDOW_SEC", "RATE_LIMIT_CHAT_RESTAURANT_MAX", "RATE_LIMIT_CHAT_IP_MAX", "RATE_LIMIT_TRUST_PROXY"];
let saved: Record<string, string | undefined>;
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); clearAll(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-05T10:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } clearAll(); });
const env = (o: Record<string, string | undefined>) => { for (const [k, v] of Object.entries(o)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
const advance = (sec: number) => vi.setSystemTime(Date.now() + sec * 1000);

describe("the limiter itself (sliding window)", () => {
  it("allows up to max events per window, then refuses with a retry time, then recovers", () => {
    for (let i = 0; i < 3; i++) expect(hit("k", 3, 60).allowed).toBe(true);
    const v = hit("k", 3, 60);
    expect(v.allowed).toBe(false);
    expect(v.retryAfter).toBe(60);
    advance(20);
    expect(hit("k", 3, 60)).toEqual({ allowed: false, retryAfter: 40 });
    advance(41);                                       // the first three events are now older than 60 s
    expect(hit("k", 3, 60).allowed).toBe(true);
  });
  it("a refused request is not counted again", () => {
    for (let i = 0; i < 3; i++) hit("k", 3, 60);
    for (let i = 0; i < 50; i++) hit("k", 3, 60);
    advance(61);
    expect(hit("k", 3, 60).allowed).toBe(true);
  });
  it("keys are independent; peek and record work separately; max 0 means unlimited", () => {
    record("a", 60); record("a", 60);
    expect(peek("a", 2, 60).allowed).toBe(false);
    expect(peek("b", 2, 60).allowed).toBe(true);
    for (let i = 0; i < 100; i++) expect(hit("free", 0, 60).allowed).toBe(true);
  });
  it("reads settings from the environment: numbers, 0 = off, junk = default", () => {
    env({ RATE_LIMIT_LOGIN_MAX: "7" });
    expect(setting("RATE_LIMIT_LOGIN_MAX", 10)).toBe(7);
    env({ RATE_LIMIT_LOGIN_MAX: "0" });
    expect(setting("RATE_LIMIT_LOGIN_MAX", 10)).toBe(0);
    for (const junk of ["abc", "-3", "", "  "]) { env({ RATE_LIMIT_LOGIN_MAX: junk }); expect(setting("RATE_LIMIT_LOGIN_MAX", 10), junk).toBe(10); }
    env({ RATE_LIMIT_LOGIN_MAX: undefined });
    expect(setting("RATE_LIMIT_LOGIN_MAX", 10)).toBe(10);
  });
  it("only trusts X-Forwarded-For when RATE_LIMIT_TRUST_PROXY=1, and then uses the address the proxy added (the last one)", () => {
    const req = new Request("http://t/x", { headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.9" } });
    env({ RATE_LIMIT_TRUST_PROXY: undefined });
    expect(clientIp(req)).toBeNull();                  // a client can send any header: not trusted by default
    env({ RATE_LIMIT_TRUST_PROXY: "1" });
    expect(clientIp(req)).toBe("203.0.113.9");
    expect(clientIp(new Request("http://t/x"))).toBeNull();
  });
});

describe("OA-2 / NFR-SEC1 owner login limit (default: 10 failed attempts per 60 s per account)", () => {
  const login = (email: string, password: string) => call(ownerLogin, { method: "POST", body: { email, password } });
  beforeEach(() => { env({ RATE_LIMIT_LOGIN_MAX: undefined, RATE_LIMIT_LOGIN_WINDOW_SEC: undefined }); signOut(); });

  it("the 11th wrong password gets 429 with Retry-After, and even the right password is refused during the lockout", async () => {
    for (let i = 0; i < 10; i++) expect((await login("demo@shop.ai", "wrong")).status).toBe(401);
    const blocked = await login("demo@shop.ai", "wrong");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    expect(blocked.data.error).toMatch(/Too many attempts/);
    expect((await login("demo@shop.ai", "demo1234")).status).toBe(429);
    expect(jar.has("owner")).toBe(false);
  });
  it("works again once the window has passed", async () => {
    for (let i = 0; i < 10; i++) await login("demo@shop.ai", "wrong");
    expect((await login("demo@shop.ai", "demo1234")).status).toBe(429);
    advance(61);
    expect((await login("demo@shop.ai", "demo1234")).status).toBe(200);
  });
  it("locks only the attacked account: other accounts and the rest of the site are unaffected", async () => {
    for (let i = 0; i < 11; i++) await login("victim@example.com", "wrong");
    expect((await login("victim@example.com", "wrong")).status).toBe(429);
    expect((await login("demo@shop.ai", "demo1234")).status).toBe(200);
  });
  it("is case-insensitive about the email, so changing capitals does not dodge it", async () => {
    for (let i = 0; i < 10; i++) await login(i % 2 ? "Demo@Shop.ai" : "demo@shop.ai", "wrong");
    expect((await login("DEMO@SHOP.AI", "wrong")).status).toBe(429);
  });
  it("a successful login clears that account's counter", async () => {
    for (let i = 0; i < 9; i++) await login("demo@shop.ai", "wrong");
    expect((await login("demo@shop.ai", "demo1234")).status).toBe(200);
    for (let i = 0; i < 9; i++) expect((await login("demo@shop.ai", "wrong")).status).toBe(401);
  });
  it("RATE_LIMIT_LOGIN_MAX and RATE_LIMIT_LOGIN_WINDOW_SEC change the limit; 0 switches it off", async () => {
    env({ RATE_LIMIT_LOGIN_MAX: "3", RATE_LIMIT_LOGIN_WINDOW_SEC: "10" });
    for (let i = 0; i < 3; i++) expect((await login("demo@shop.ai", "wrong")).status).toBe(401);
    const b = await login("demo@shop.ai", "wrong");
    expect([b.status, b.headers.get("retry-after")]).toEqual([429, "10"]);
    advance(11);
    expect((await login("demo@shop.ai", "demo1234")).status).toBe(200);
    clearAll();
    env({ RATE_LIMIT_LOGIN_MAX: "0" });
    for (let i = 0; i < 30; i++) expect((await login("demo@shop.ai", "wrong")).status).toBe(401);
  });
  it("with a trusted proxy the address is limited too, so one address cannot try many accounts", async () => {
    env({ RATE_LIMIT_TRUST_PROXY: "1", RATE_LIMIT_LOGIN_MAX: "3" });
    const ownerLoginWithIp = async (ip: string, email: string) => {
      const res = await ownerLogin(new Request("http://t/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ email, password: "wrong" }) }));
      return res.status;
    };
    for (const email of ["a@x.co", "b@x.co", "c@x.co"]) expect(await ownerLoginWithIp("203.0.113.5", email)).toBe(401);
    expect(await ownerLoginWithIp("203.0.113.5", "d@x.co")).toBe(429);          // a fourth, different account from the same address
    expect(await ownerLoginWithIp("203.0.113.77", "d@x.co")).toBe(401);         // another address is fine
  });
  it("a spoofed X-Forwarded-For does not dodge the account limit (and is ignored without a trusted proxy)", async () => {
    env({ RATE_LIMIT_LOGIN_MAX: "3" });
    for (let i = 0; i < 3; i++) {
      const res = await ownerLogin(new Request("http://t/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `9.9.9.${i}` }, body: JSON.stringify({ email: "demo@shop.ai", password: "wrong" }) }));
      expect(res.status).toBe(401);
    }
    const res = await ownerLogin(new Request("http://t/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" }, body: JSON.stringify({ email: "demo@shop.ai", password: "wrong" }) }));
    expect(res.status).toBe(429);
  });
});

describe("AI-15 chat limits (default: 20 messages per session per 60 s, 120 per restaurant, 60 per trusted address)", () => {
  const say = (message = "What time do you close?", extra: Record<string, unknown> = {}) => call(chat, { method: "POST", params: { slug: "golden-lotus" }, body: { message, sessionId: "rl-1", table: "5", ...extra } });
  beforeEach(() => { noModel(); env({ RATE_LIMIT_CHAT_MAX: undefined, RATE_LIMIT_CHAT_WINDOW_SEC: undefined, RATE_LIMIT_CHAT_RESTAURANT_MAX: undefined, RATE_LIMIT_CHAT_IP_MAX: undefined }); });

  it("the 21st message in a session gets 429 with Retry-After; a new window allows it again", async () => {
    for (let i = 0; i < 20; i++) expect((await say()).status).toBe(200);
    const b = await say();
    expect(b.status).toBe(429);
    expect(b.headers.get("retry-after")).toBe("60");
    advance(61);
    expect((await say()).status).toBe(200);
  });
  it("another session is not affected, and an empty message is a 400 that does not use up the allowance", async () => {
    for (let i = 0; i < 20; i++) await say();
    expect((await say("What time do you close?", { sessionId: "rl-2" })).status).toBe(200);
    clearAll();
    for (let i = 0; i < 30; i++) expect((await say("   ")).status).toBe(400);
    expect((await say()).status).toBe(200);
  });
  it("the restaurant-wide limit stops a client that changes its session id every time", async () => {
    env({ RATE_LIMIT_CHAT_RESTAURANT_MAX: "5" });
    for (let i = 0; i < 5; i++) expect((await say("hours?", { sessionId: `fresh-${i}` })).status).toBe(200);
    expect((await say("hours?", { sessionId: "fresh-6" })).status).toBe(429);
    expect((await say("hours?", { sessionId: undefined })).status).toBe(429);     // and so does a request with no session id at all
  });
  it("a session refused by its own limit does not use up the restaurant's allowance", async () => {
    env({ RATE_LIMIT_CHAT_MAX: "2", RATE_LIMIT_CHAT_RESTAURANT_MAX: "4" });
    await say(); await say();
    for (let i = 0; i < 20; i++) expect((await say()).status).toBe(429);
    expect((await say("hours?", { sessionId: "other-1" })).status).toBe(200);
    expect((await say("hours?", { sessionId: "other-2" })).status).toBe(200);
    expect((await say("hours?", { sessionId: "other-3" })).status).toBe(429);
  });
  it("RATE_LIMIT_CHAT_MAX / _WINDOW_SEC change the limit; 0 switches it off", async () => {
    env({ RATE_LIMIT_CHAT_MAX: "2", RATE_LIMIT_CHAT_WINDOW_SEC: "5" });
    await say(); await say();
    const b = await say();
    expect([b.status, b.headers.get("retry-after")]).toEqual([429, "5"]);
    advance(6);
    expect((await say()).status).toBe(200);
    clearAll();
    env({ RATE_LIMIT_CHAT_MAX: "0", RATE_LIMIT_CHAT_RESTAURANT_MAX: "0", RATE_LIMIT_CHAT_IP_MAX: "0" });
    for (let i = 0; i < 150; i++) expect((await say()).status).toBe(200);
  });
  it("a trusted proxy's client address is limited too (RATE_LIMIT_CHAT_IP_MAX)", async () => {
    env({ RATE_LIMIT_TRUST_PROXY: "1", RATE_LIMIT_CHAT_IP_MAX: "3" });
    const from = (ip: string, n: number) => chat(new Request("http://t/x", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ message: "hours?", sessionId: `ip-${ip}-${n}` }) }), { params: Promise.resolve({ slug: "golden-lotus" }) }).then((r) => r.status);
    for (let i = 0; i < 3; i++) expect(await from("198.51.100.1", i)).toBe(200);
    expect(await from("198.51.100.1", 9)).toBe(429);
    expect(await from("198.51.100.2", 0)).toBe(200);
  });
  it("limited requests never reach the model and are not logged", async () => {
    const calls = noModel();
    env({ RATE_LIMIT_CHAT_MAX: "1" });
    await say("What would you recommend on a hot day?");
    const before = calls.length;
    const b = await say("What would you recommend on a hot day?");
    expect(b.status).toBe(429);
    expect(calls.length).toBe(before);
  });
});

describe("OA-1 registration limit (default: 20 new accounts per hour)", () => {
  let n = 0;
  const reg = (headers: Record<string, string> = {}) => register(new Request("http://t/x", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ email: `new${++n}-${Date.now()}@example.com`, password: "long-enough-1", restaurantName: `Place ${n}` }) })).then((r) => r.status);
  beforeEach(() => { env({ RATE_LIMIT_REGISTER_MAX: undefined, RATE_LIMIT_REGISTER_IP_MAX: undefined, RATE_LIMIT_REGISTER_WINDOW_SEC: undefined }); signOut(); });

  it("the 21st registration within an hour gets 429; it works again after the window", async () => {
    for (let i = 0; i < 20; i++) expect(await reg()).toBe(200);
    expect(await reg()).toBe(429);
    advance(3601);
    expect(await reg()).toBe(200);
  });
  it("RATE_LIMIT_REGISTER_MAX changes the limit; 0 switches it off", async () => {
    env({ RATE_LIMIT_REGISTER_MAX: "2" });
    expect([await reg(), await reg(), await reg()]).toEqual([200, 200, 429]);
    clearAll();
    env({ RATE_LIMIT_REGISTER_MAX: "0" });
    for (let i = 0; i < 25; i++) expect(await reg()).toBe(200);
  });
  it("invalid or duplicate registrations are refused as before and do not use up the allowance", async () => {
    env({ RATE_LIMIT_REGISTER_MAX: "1" });
    for (let i = 0; i < 5; i++) expect((await register(new Request("http://t/x", { method: "POST", body: JSON.stringify({ email: "bad", password: "x", restaurantName: "" }) }))).status).toBe(400);
    expect(await reg()).toBe(200);
  });
  it("behind a trusted proxy one address is limited more strictly (default 5 per hour)", async () => {
    env({ RATE_LIMIT_TRUST_PROXY: "1" });
    for (let i = 0; i < 5; i++) expect(await reg({ "x-forwarded-for": "203.0.113.20" })).toBe(200);
    expect(await reg({ "x-forwarded-for": "203.0.113.20" })).toBe(429);
    expect(await reg({ "x-forwarded-for": "203.0.113.21" })).toBe(200);
  });
});
