import { describe, it, expect, afterEach, vi } from "vitest";
import { call, mockModel, noModel, ownerLogin, signOut } from "./helpers";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as feedback } from "@/modules/diner/api/feedback";
import { GET as insights } from "@/modules/platform/api/insights";
import { all, get, run } from "@/modules/platform/db";

afterEach(() => { vi.unstubAllGlobals(); });
const slug = "golden-lotus";
const say = (message: string, o: Record<string, unknown> = {}) => call(chat, { method: "POST", params: { slug }, body: { message, sessionId: "t-" + Math.random().toString(36).slice(2), table: "5", lang: "en", ...o } });
const count = (table: string) => get(`SELECT COUNT(*) AS n FROM ${table}`)!.n as number;

describe("chat endpoint basics", () => {
  it("unknown restaurant is 404; an empty message is 400", async () => {
    noModel();
    expect((await call(chat, { method: "POST", params: { slug: "nope" }, body: { message: "hi" } })).status).toBe(404);
    expect((await say("   ")).status).toBe(400);
  });
  it("AI-1 answers in the language of the question, whatever the interface language is", async () => {
    noModel();
    const r = await say("ร้านปิดกี่โมง", { lang: "en" });
    expect(r.data.lang).toBe("th");
    expect(r.data.reply).toContain("10:00-22:00");
  });
  it("NFR-SEC4 cuts a message to 500 characters", async () => {
    noModel();
    await say("price " + "x".repeat(1000), { sessionId: "long" });
    expect(get("SELECT text FROM chat_messages WHERE session_id = 'long' AND role = 'user'")!.text.length).toBe(500);
  });
  it("AI-13 returns the dish cards the AI refers to (real dishes only)", async () => {
    noModel();
    const r = await say("How much is the Massaman curry?");
    expect(r.data.dishes.map((d: any) => d.name.en)).toEqual(["Beef Massaman Curry"]);
    expect(r.data.action.type).toBe("show_dishes");
  });
});

describe("AI-16 / NFR-PR1 every question is stored with its language, topic and whether it was answered, without personal data", () => {
  it("logs the question and the reply, without any personal data", async () => {
    noModel();
    const r = await say("I'm allergic to peanuts", { sessionId: "log-1", table: "11" });
    const rows = all("SELECT role, text, lang, topic, allergens, answered FROM chat_messages WHERE session_id = 'log-1' ORDER BY id");
    expect(rows.map((x: any) => x.role)).toEqual(["user", "assistant"]);
    expect(rows[0]).toMatchObject({ text: "I'm allergic to peanuts", lang: "en", topic: "allergens", answered: 1 });
    expect(JSON.parse(rows[0].allergens)).toEqual(["peanut"]);
    expect(get("SELECT table_no FROM chat_sessions WHERE id = 'log-1'")!.table_no).toBe("11");
    expect(r.data.messageId).toBeGreaterThan(0);
    expect(Object.keys(get("SELECT * FROM chat_sessions WHERE id = 'log-1'")!).sort()).toEqual(["id", "lang", "restaurant_id", "started_at", "table_no"]);
  });
  it("ST-5 test chats from the owner dashboard (preview) are not stored", async () => {
    noModel();
    const before = [count("chat_messages"), count("chat_sessions")];
    const r = await say("How much is the Massaman curry?", { preview: true });
    expect(r.status).toBe(200);
    expect([count("chat_messages"), count("chat_sessions")]).toEqual(before);
  });
});

describe("AI-7 asking for the bill or staff creates a call for that table", () => {
  it("asking twice reuses the open call, like the call button (PC-3)", async () => {
    noModel();
    await say("Can I get the bill?", { table: "17" });
    await say("bill please", { table: "17" });
    await say("I need help, call the staff", { table: "17" });
    expect(all("SELECT kind FROM calls WHERE table_no = '17' AND status = 'open' ORDER BY id").map((c: any) => c.kind)).toEqual(["bill", "help"]);
  });
  it("creates the call and not an order", async () => {
    noModel();
    const orders = count("orders");
    await say("Can I get the bill?", { table: "15" });
    expect(get("SELECT kind, status FROM calls WHERE table_no = '15'")).toEqual({ kind: "bill", status: "open" });
    expect(count("orders")).toBe(orders);
  });
});

describe("AI-6 / AI-10 AI safety: the chat can never place an order by itself", () => {
  it("'I'll have 2 ...' only returns an add_to_picks action; no order row is created", async () => {
    noModel();
    const orders = count("orders"), items = count("order_items");
    const r = await say("I'll have 2 chicken fried rice and a thai iced tea", { table: "16" });
    expect(r.data.action.type).toBe("add_to_picks");
    expect(count("orders")).toBe(orders);
    expect(count("order_items")).toBe(items);
  });
  it("a model reply can never create orders or calls either", async () => {
    mockModel('Sure, ordered!\nACTION: {"type":"add_to_picks","ids":[1]}');
    const orders = count("orders"), calls = count("calls");
    const r = await say("What would you recommend on a hot day?");
    expect(r.data.action.type).toBe("none");
    expect([count("orders"), count("calls")]).toEqual([orders, calls]);
  });
});

describe("AI-15 / BR-3 monthly chat limit", () => {
  it("is 300 chats per month by default", () => {
    expect(get("SELECT chat_cap FROM restaurants WHERE slug = 'golden-lotus'")!.chat_cap).toBe(300);
    expect(get("SELECT chat_cap FROM restaurants ORDER BY id DESC LIMIT 1")!.chat_cap).toBe(300);
  });
  it("shows a fixed message and the menu once the limit is reached, and does not call the model", async () => {
    const calls = mockModel("model answer");
    run("UPDATE restaurants SET chat_cap = 2 WHERE slug = ?", slug);
    const used = get("SELECT COUNT(*) AS n FROM chat_messages WHERE role = 'user' AND created_at >= date('now','start of month')")!.n;
    run("UPDATE restaurants SET chat_cap = ? WHERE slug = ?", used + 1, slug);
    expect((await say("What would you recommend?")).data.reply).toBe("model answer");
    const r = await say("What would you recommend?");
    expect(r.data.reply).toMatch(/reached its chat limit/);
    expect(r.data.action.type).toBe("show_menu");
    expect(calls.length).toBe(1);
    expect((await say("What would you recommend?", { preview: true })).data.reply).toBe("model answer");   // the owner's test chat is not limited
    run("UPDATE restaurants SET chat_cap = 300 WHERE slug = ?", slug);
  });
});

describe("AI-14 feedback on an answer", () => {
  it("a thumbs-down flags the answer for the owner with a reason; unknown reasons are dropped", async () => {
    noModel();
    const m = (await say("How much is the Massaman curry?", { sessionId: "fb" })).data.messageId;
    const send = (b: object) => call(feedback, { method: "POST", params: { slug }, body: { messageId: m, ...b } });
    await send({ value: -1, reason: "wrong" });
    expect(get("SELECT feedback, flagged, feedback_reason FROM chat_messages WHERE id = ?", m)).toEqual({ feedback: -1, flagged: 1, feedback_reason: "wrong" });
    await send({ value: -1, reason: "<script>" });
    expect(get("SELECT feedback_reason FROM chat_messages WHERE id = ?", m)!.feedback_reason).toBe("");
    await send({ value: 1 });
    expect(get("SELECT feedback, flagged FROM chat_messages WHERE id = ?", m)).toEqual({ feedback: 1, flagged: 0 });
  });
  it("cannot flag a diner's own message", async () => {
    noModel();
    await say("hello", { sessionId: "fb2" });
    const userMsg = get("SELECT id FROM chat_messages WHERE session_id = 'fb2' AND role = 'user'")!.id;
    await call(feedback, { method: "POST", params: { slug }, body: { messageId: userMsg, value: -1 } });
    expect(get("SELECT flagged FROM chat_messages WHERE id = ?", userMsg)!.flagged).toBe(0);
  });
});

describe("IN-1 / IN-2 / IN-3 / UC-11 insights", () => {
  it("counts questions, the share answered, topics, languages and what could not be answered", async () => {
    noModel();
    run("DELETE FROM chat_messages"); run("DELETE FROM chat_sessions");
    await say("How much is the Massaman curry?", { sessionId: "i1" });
    await say("vegetarian under 100 baht", { sessionId: "i1" });
    await say("ร้านปิดกี่โมง", { sessionId: "i2" });
    await say("Does that dish contain any allergens?", { sessionId: "i2" });      // cannot be answered from the data
    await ownerLogin();
    const r = (await call(insights, { url: "http://t/api/owner/insights?days=7" })).data;
    expect(r).toMatchObject({ days: 7, questions: 4, sessions: 2, unanswered: 1, answeredPct: 75 });
    expect(r.topics.map((t: any) => t.topic).sort()).toEqual(["allergens", "hours", "prices", "vegetarian"]);
    expect(r.langs.map((l: any) => l.lang).sort()).toEqual(["en", "th"]);
    expect(r.cannot.map((c: any) => c.text)).toEqual(["Does that dish contain any allergens?"]);
    expect(r.unmet).toEqual({ asked: 1, listed: 4 });
    expect((await call(insights, { url: "http://t/api/owner/insights?days=1" })).data.days).toBe(1);
    expect((await call(insights, { url: "http://t/api/owner/insights?days=9999" })).data.days).toBe(90);
    expect((await call(insights, { url: "http://t/api/owner/insights?days=abc" })).data.days).toBe(7);
    signOut();
    expect((await call(insights)).status).toBe(401);
  });
});
