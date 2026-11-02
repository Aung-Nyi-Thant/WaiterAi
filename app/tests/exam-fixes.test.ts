// Regression tests for the defects in reports/repository-analysis-2026-10-22.md (findings 1-8, 10): each one failed before its fix.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { call, mockModel, noModel, ownerLogin, signOut, staffLogin } from "./helpers";
import { clearPinLocks } from "@/modules/platform/auth";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as feedback } from "@/modules/diner/api/feedback";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { GET as dinerBill } from "@/modules/diner/api/bill";
import { POST as register } from "@/modules/platform/api/register";
import { PUT as updateItem } from "@/modules/owner/api/itemsById";
import { itemsOf } from "@/modules/platform/menu";
import { get, run } from "@/modules/platform/db";

afterEach(() => { vi.unstubAllGlobals(); });
const slug = "golden-lotus";
const say = (message: string, o: Record<string, unknown> = {}) => call(chat, { method: "POST", params: { slug }, body: { message, sessionId: "x-" + Math.random().toString(36).slice(2), table: "5", lang: "en", ...o } });
const dish = () => itemsOf(1).find((i) => i.available)!;
const order = (table: string, receipt?: string) => call(placeOrder, { method: "POST", params: { slug }, body: { table, receipt, items: [{ id: dish().id, qty: 1 }] } });
const bill = (table: string, code: string) => call(dinerBill, { params: { slug }, url: `http://t/api/bill?t=${table}&r=${code}` });

describe("finding 1: the model cannot call a dish safe with an adjective in between", () => {
  it.each(["Mango Sticky Rice is perfectly safe.", "It is totally safe for everyone.", "Don't worry, it is harmless.", "There is no risk with this dish.", "You can relax, it looks completely safe."])("replaces: %s", async (said) => {
    mockModel(said);
    const r = await say("Tell me something about this place");
    expect(r.data.reply).not.toMatch(/safe|harmless|no risk/i);
  });
  it("still lets an ordinary open answer through", async () => {
    mockModel("We are a friendly Thai restaurant.");
    expect((await say("Tell me about this place")).data.reply).toBe("We are a friendly Thai restaurant.");
  });
});

describe("finding 2: a receipt from an unaccepted pick does not open another table's bill", () => {
  it("shows only the caller's own pick until staff accept an order of that table", async () => {
    const victim = await order("72");
    run("UPDATE orders SET status = 'served' WHERE id = ?", victim.data.id);        // the other table's meal, accepted and served
    const attacker = await order("72");                                              // a stranger sends one pick for table 72
    const r = await bill("72", attacker.data.receipt);
    expect(r.data.lines).toEqual([]);
    expect(r.data.total).toBe(0);
    expect(r.data.pending.length).toBe(1);                                           // only its own pick
    expect((await bill("72", victim.data.receipt)).data.total).toBeGreaterThan(0);   // the real diner still sees the bill
  });
  it("a code from a paid visit is not reused for the next visit", async () => {
    const first = await order("73");
    run("UPDATE orders SET paid_at = datetime('now') WHERE id = ?", first.data.id);
    const second = await order("73", first.data.receipt);
    expect(second.data.receipt).not.toBe(first.data.receipt);
  });
});

describe("finding 3: parallel wrong PINs cannot all pass the attempt ceiling", () => {
  beforeEach(() => { clearPinLocks(); signOut(); });
  it("21 at once: the first 5 are checked (401), the rest are refused (429)", async () => {
    const codes = (await Promise.all(Array.from({ length: 21 }, () => staffLogin("0000")))).map((r) => r.status);
    expect(codes.filter((c) => c === 401).length).toBe(5);
    expect(codes.filter((c) => c === 429).length).toBe(16);
    clearPinLocks();
  });
});

describe("finding 4: a dish cannot be moved into another restaurant's category", () => {
  it("is refused on update, and null fields are a 400 rather than a crash", async () => {
    const rival = await call(register, { method: "POST", body: { email: "exam-rival@example.com", password: "exam-rival-1", restaurantName: "Exam Rival" } });
    const rid = get("SELECT id FROM restaurants WHERE slug = ?", rival.data.slug)!.id;
    const cat = run("INSERT INTO categories (restaurant_id, name_en, name_th, name_my, sort) VALUES (?,?,?,?,?)", rid, "Other", "x", "x", 0).id;
    signOut(); await ownerLogin();
    const id = String(dish().id);
    expect((await call(updateItem, { method: "PUT", params: { id }, body: { category_id: cat } })).status).toBe(400);
    expect((await call(updateItem, { method: "PUT", params: { id }, body: { name: null } })).status).toBe(400);
    expect((await call(updateItem, { method: "PUT", params: { id }, body: { tags: "vegan" } })).status).toBe(400);
    signOut();
  });
});

describe("finding 6: a chat session id belongs to one restaurant", () => {
  it("a second restaurant using the same id gets its own session", async () => {
    const rival = await call(register, { method: "POST", body: { email: "exam-rival2@example.com", password: "exam-rival-2", restaurantName: "Exam Rival Two" } });
    signOut(); noModel();
    await say("What time do you close?", { sessionId: "shared-id" });
    const r = await call(chat, { method: "POST", params: { slug: rival.data.slug }, body: { message: "hello", sessionId: "shared-id", table: "1", lang: "en" } });
    expect(r.data.sessionId).not.toBe("shared-id");
    expect(get("SELECT COUNT(DISTINCT restaurant_id) AS n FROM chat_messages WHERE session_id = 'shared-id'")!.n).toBe(1);
  });
});

describe("finding 7: past the monthly limit the rules still answer", () => {
  it("an allergen/price question is answered from the menu, only the model is off", async () => {
    const calls = mockModel("model answer");
    const used = get("SELECT COUNT(*) AS n FROM chat_messages WHERE role = 'user' AND created_at >= date('now','start of month')")!.n;
    run("UPDATE restaurants SET chat_cap = ? WHERE slug = ?", used, slug);
    const r = await say(`How much is the ${dish().name.en}?`);
    expect(r.data.reply).toMatch(/\d/);
    expect(r.data.reply).not.toMatch(/chat limit/);
    const open = await say("Tell me about this place");
    expect(open.data.reply).toMatch(/reached its chat limit/);
    expect(calls.length).toBe(0);
    run("UPDATE restaurants SET chat_cap = 300 WHERE slug = ?", slug);
  });
});

describe("finding 8: feedback needs the chat session the message belongs to", () => {
  it("is ignored without it", async () => {
    noModel();
    const m = (await say("What time do you close?", { sessionId: "own-chat" })).data.messageId;
    await call(feedback, { method: "POST", params: { slug }, body: { messageId: m, value: -1 } });
    expect(get("SELECT flagged FROM chat_messages WHERE id = ?", m)!.flagged).toBe(0);
    await call(feedback, { method: "POST", params: { slug }, body: { messageId: m, sessionId: "own-chat", value: -1 } });
    expect(get("SELECT flagged FROM chat_messages WHERE id = ?", m)!.flagged).toBe(1);
  });
});
