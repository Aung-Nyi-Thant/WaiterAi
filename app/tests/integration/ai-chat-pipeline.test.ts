import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call, mockModel, ownerLogin, signOut } from "../helpers";
import { POST as chat } from "@/modules/ai/api/chat";
import { PUT as updateItem } from "@/modules/owner/api/itemsById";
import { all, get, run } from "@/modules/platform/db";
import { itemsOf, restaurantBySlug } from "@/modules/platform/menu";
import { pruneExpiredChatsIfDue } from "@/modules/platform/chatRetention";

const slug = "golden-lotus";
const restaurant = restaurantBySlug(slug)!;
const say = (message: string, extra: Record<string, unknown> = {}) => call(chat, {
  method: "POST", params: { slug }, body: { message, lang: "en", table: "pipeline", ...extra },
});
const dish = (name: string) => itemsOf(restaurant.id).find(item => item.name.en === name)!;
const sideEffects = () => ["orders", "order_items", "calls"].map(table => get(`SELECT COUNT(*) AS n FROM ${table}`)!.n);
let beforeEffects: unknown[];

beforeEach(() => {
  // Retention opens its own transaction; run the due maintenance before the test savepoint.
  pruneExpiredChatsIfDue();
  run("SAVEPOINT chat_pipeline");
  signOut();
  beforeEffects = sideEffects();
});

afterEach(async () => {
  try {
    // Runtime failures also rewarm the real provider; let that finish against the same fake Ollama.
    await vi.waitFor(() => expect((globalThis as any).__aiRewarming).toBeUndefined());
    expect(sideEffects()).toEqual(beforeEffects);
  } finally {
    run("ROLLBACK TO chat_pipeline");
    run("RELEASE chat_pipeline");
    signOut();
    vi.unstubAllGlobals();
  }
});

describe("chat API through the model boundary and SQLite", () => {
  it("persists a model answer, detected language and sanitized action, then sends the previous turn on the same session", async () => {
    const tea = dish("Thai Iced Tea");
    const text = "You could try the Thai Iced Tea.";
    const calls = mockModel(`${text}\nACTION: ${JSON.stringify({ type: "show_dishes", ids: [tea.id] })}`);
    const first = await say("Tell me about this place", { lang: "th" });

    expect(first.status).toBe(200);
    expect(first.data).toMatchObject({ reply: text, lang: "en", answered: true, action: { type: "show_dishes", ids: [tea.id] }, dishes: [tea] });
    expect(first.data.sessionId).toEqual(expect.any(String));
    expect(first.data.sessionId.length).toBeGreaterThan(0);
    expect(first.data).not.toHaveProperty("usedModel");
    expect(get("SELECT restaurant_id, table_no, lang FROM chat_sessions WHERE id = ?", first.data.sessionId))
      .toMatchObject({ restaurant_id: restaurant.id, table_no: "pipeline", lang: "en" });
    const rows = all("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id", first.data.sessionId);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ role: "user", text: "Tell me about this place", lang: "en", source: "model", answered: 1 });
    expect(rows[1]).toMatchObject({ id: first.data.messageId, role: "assistant", text, lang: "en", answered: 1 });
    expect(JSON.parse(rows[1].action_json)).toEqual(first.data.action);

    const nextText = "What else would you say about it?";
    const next = await say(nextText, { sessionId: first.data.sessionId });
    expect(next.status).toBe(200);
    expect(next.data.sessionId).toBe(first.data.sessionId);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("http://ollama.invalid/api/chat");
    expect(calls[1].body.messages.slice(1)).toEqual([
      { role: "user", content: "Tell me about this place" },
      { role: "assistant", content: text },
      { role: "user", content: nextText },
    ]);
    expect(all("SELECT role FROM chat_messages WHERE session_id = ? ORDER BY id", first.data.sessionId).map(row => row.role))
      .toEqual(["user", "assistant", "user", "assistant"]);
  });

  describe.each([
    ["en", "Tell me about this place", "The AI waiter is unavailable right now."],
    ["th", "สวัสดี", "ผู้ช่วย AI ใช้งานไม่ได้ในขณะนี้"],
    ["my", "မင်္ဂလာပါ", "AI စားပွဲထိုး ခဏမရနိုင်ပါဘူး"],
  ] as const)("localized %s runtime fallback", (lang, question, fallback) => {
    it.each(["network error", "abort", "malformed JSON"] as const)("returns and logs a safe answer for %s", async failure => {
      const calls = failure === "malformed JSON" ? undefined : mockModel(
        failure === "abort" ? new DOMException("Transport aborted", "AbortError") : new TypeError("Ollama offline"),
      );
      if (failure === "malformed JSON") {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("{invalid Ollama JSON", { status: 200 })));
      }
      const result = await say(question, { lang: lang === "en" ? "th" : "en" });
      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({ lang, answered: false, action: { type: "show_menu" }, dishes: [] });
      expect(result.data.reply).toContain(fallback);
      expect(result.data.reply).not.toMatch(/Transport aborted|Ollama offline|SyntaxError|invalid Ollama JSON/);
      const rows = all("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id", result.data.sessionId);
      expect(rows).toHaveLength(2);
      // A failed attempt is logged as rules, because no model answer was delivered.
      expect(rows[0]).toMatchObject({ role: "user", text: question, lang, source: "rules", answered: 0 });
      expect(rows[1]).toMatchObject({ id: result.data.messageId, role: "assistant", text: result.data.reply, lang, answered: 0 });
      expect(JSON.parse(rows[1].action_json)).toEqual({ type: "show_menu" });
      if (calls) expect(calls.length).toBeGreaterThan(0);
      else expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
  });

  it("filters untrusted IDs against this restaurant's current availability before limiting response cards to four", async () => {
    const own = itemsOf(restaurant.id).filter(item => item.available).slice(0, 6);
    expect(own).toHaveLength(6);
    const sold = own[0];
    run("UPDATE menu_items SET available = 0 WHERE id = ?", sold.id);
    const rival = run("INSERT INTO restaurants (owner_id, slug, name) SELECT owner_id, ?, ? FROM restaurants WHERE id = ?", "pipeline-rival", "Pipeline Rival", restaurant.id).id;
    const foreign = run("INSERT INTO menu_items (restaurant_id, name_en, price) VALUES (?,?,?)", rival, "Foreign dish", 10).id;
    const missing = Number(get("SELECT MAX(id) AS id FROM menu_items")!.id) + 1;
    const permitted = own.slice(1);
    const ids = [sold.id, foreign, "not-a-number", missing, null, ...permitted.map(item => item.id)];
    const calls = mockModel(`Here are some dishes to consider.\nACTION: ${JSON.stringify({ type: "show_dishes", ids })}`);
    const result = await say("Tell me about this place");
    expect(calls).toHaveLength(1);
    expect(result.status).toBe(200);
    expect(result.data.action).toEqual({ type: "show_dishes", ids: permitted.slice(0, 4).map(item => item.id) });
    expect(result.data.dishes).toEqual(permitted.slice(0, 4));
    expect(JSON.parse(get("SELECT action_json FROM chat_messages WHERE id = ?", result.data.messageId)!.action_json)).toEqual(result.data.action);
  });

  it.each(["call_staff", "place_order"])("rejects a model's %s action without side effects", async type => {
    const calls = mockModel(`Here are some dishes to consider.\nACTION: ${JSON.stringify({ type, ids: [dish("Thai Iced Tea").id], kind: "help" })}`);
    const result = await say("Tell me about this place");
    expect(calls).toHaveLength(1);
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ answered: true, action: { type: "none" }, dishes: [] });
  });
});

describe("model suggestions with a saved allergy profile and real owner checks", () => {
  let sessionId: string;

  beforeEach(async () => {
    expect((await ownerLogin()).status).toBe(200);
    for (const name of ["Mango Sticky Rice", "Beef Massaman Curry"]) {
      const result = await call(updateItem, {
        method: "PUT", params: { id: String(dish(name).id) },
        body: { allergen_status: "verified", allergen_check_note: "Recipe v1 and supplier labels compared; cross-contact checked." },
      });
      expect(result.status).toBe(200);
      expect(dish(name).allergen_status).toBe("verified");
    }
    signOut();
    mockModel("Hello, what would you like to eat?\nACTION: none");
    const saved = await say("Hello", { profile: ["peanut"] });
    expect(saved.status).toBe(200);
    sessionId = saved.data.sessionId;
    expect(JSON.parse(get("SELECT profile FROM chat_sessions WHERE id = ?", sessionId)!.profile)).toEqual(["peanut"]);
  });

  it("keeps only currently verified non-conflicting cards when the model suggests a fitting dish", async () => {
    const rice = dish("Mango Sticky Rice"), tea = dish("Thai Iced Tea"), rolls = dish("Fresh Spring Rolls"), curry = dish("Beef Massaman Curry");
    expect([rice, tea, rolls, curry].map(item => item.allergen_status)).toEqual(["verified", "estimated", "unknown", "verified"]);
    expect(curry.allergens).toContain("peanut");
    const calls = mockModel(`Try the Mango Sticky Rice.\nACTION: ${JSON.stringify({ type: "show_dishes", ids: [tea.id, rolls.id, curry.id, rice.id] })}`);
    const result = await say("What is a light dish for lunch?", { sessionId, profile: ["peanut"] });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.messages[0].content).toContain("The customer has told us their allergies: peanut");
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ sessionId, answered: true, reply: "Try the Mango Sticky Rice.", action: { type: "show_dishes", ids: [rice.id] }, dishes: [rice] });
    expect(get("SELECT source FROM chat_messages WHERE session_id = ? AND role = 'user' ORDER BY id DESC LIMIT 1", sessionId)!.source).toBe("model");
  });

  it.each([
    ["Thai Iced Tea", "has an estimated allergen list", "estimated"],
    ["Fresh Spring Rolls", "Allergen information is not provided", "unknown"],
    ["Beef Massaman Curry", "lists peanut, which is in your allergy profile", "verified"],
  ])("replaces a model suggestion of %s with the database warning and staff confirmation", async (name, warning, status) => {
    const item = dish(name), rice = dish("Mango Sticky Rice");
    const modelText = `Try the ${name}.`;
    const calls = mockModel(`${modelText}\nACTION: ${JSON.stringify({ type: "show_dishes", ids: [rice.id, item.id] })}`);
    const result = await say("What is a light dish for lunch?", { sessionId, profile: ["peanut"] });
    expect(calls).toHaveLength(1);
    expect(result.status).toBe(200);
    expect(result.data.reply).toContain(name);
    expect(result.data.reply).toContain(warning);
    expect(result.data.reply).toContain("Please confirm with the staff before ordering.");
    expect(result.data.reply).not.toContain(modelText);
    expect(result.data.reply).not.toMatch(/\bsafe\b|allergy-free|guarantee/i);
    // A conflict warning intentionally retains that dish's card for inspection, replacing the model's list.
    expect(result.data.action).toEqual({ type: "show_dishes", ids: [item.id] });
    expect(result.data.dishes).toEqual([expect.objectContaining({ id: item.id, allergen_status: status, allergens: item.allergens })]);
    const stored = get("SELECT text, action_json, answered FROM chat_messages WHERE id = ?", result.data.messageId)!;
    expect(stored).toMatchObject({ text: result.data.reply, answered: 1 });
    expect(JSON.parse(stored.action_json)).toEqual(result.data.action);
  });
});
