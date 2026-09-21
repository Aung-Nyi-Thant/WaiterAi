import { restaurantBySlug, itemsOf, faqsOf, specialsOf } from "@/modules/platform/menu";
import { all, get, run } from "@/modules/platform/db";
import { json, bad, body } from "@/modules/platform/http";
import { answer, detectLang, limitReply } from "@/modules/ai/ai";
import type { Lang } from "@/modules/platform/menu";
import crypto from "node:crypto";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await body(req);
  const r = restaurantBySlug(slug);
  if (!r) return bad("Restaurant not found.", 404);
  const message = String(b.message || "").trim().slice(0, 500);
  if (!message) return bad("Please type a question.");
  const preview = !!b.preview;
  const sessionId = String(b.sessionId || "").slice(0, 60) || crypto.randomUUID();
  const table = String(b.table || "").slice(0, 10);
  const uiLang = (["en", "th", "my"].includes(b.lang) ? b.lang : "en") as Lang;
  const lang = detectLang(message, uiLang);
  const p = r.persona.gender === "female" ? "female" : "male";

  if (!preview) run("INSERT OR IGNORE INTO chat_sessions (id, restaurant_id, table_no, lang) VALUES (?,?,?,?)", sessionId, r.id, table, lang);
  const used = get("SELECT COUNT(*) AS n FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id WHERE m.restaurant_id = ? AND m.role = 'user' AND m.created_at >= date('now','start of month')", r.id)!.n;

  const items = itemsOf(r.id);
  let result;
  if (used >= r.chat_cap && !preview) {
    result = { reply: limitReply(lang, p === "female" ? "ค่ะ" : ""), action: { type: "show_menu" as const }, topic: "other", allergens: [], answered: false, usedModel: false };
  } else {
    const history = preview || !b.sessionId ? [] : all("SELECT role, text FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 8", sessionId).reverse();
    result = await answer(message, lang, { restaurant: r, items, faqs: faqsOf(r.id) as any, specials: specialsOf(r.id), history: history as any });
  }

  let messageId = 0;
  if (!preview) {
    run("INSERT INTO chat_messages (session_id, restaurant_id, role, text, lang, topic, allergens, answered) VALUES (?,?,?,?,?,?,?,?)",
      sessionId, r.id, "user", message, lang, result.topic, JSON.stringify(result.allergens), result.answered ? 1 : 0);
    messageId = run("INSERT INTO chat_messages (session_id, restaurant_id, role, text, lang, topic, action_json, answered) VALUES (?,?,?,?,?,?,?,?)",
      sessionId, r.id, "assistant", result.reply, lang, result.topic, JSON.stringify(result.action), result.answered ? 1 : 0).id;
    if (result.action.type === "call_staff") run("INSERT INTO calls (restaurant_id, table_no, kind) VALUES (?,?,?)", r.id, table, result.action.kind || "help");
  }
  const ids = result.action.ids || [];
  return json({ sessionId, messageId, reply: result.reply, action: result.action, dishes: items.filter((i) => ids.includes(i.id)), lang });
}
