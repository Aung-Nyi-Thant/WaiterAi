import { ownerSession } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { itemsOf } from "@/lib/menu";
import { json, unauthorized } from "@/lib/http";

const LABEL: Record<string, string> = { allergens: "Allergens", vegetarian: "Vegetarian options", prices: "Prices", hours: "Opening hours", spicy: "How spicy is it?", staff: "Calling the staff", other: "Other questions" };

export async function GET(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const rid = s.restaurantId;
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 7));
  const since = `datetime('now','-${days} day')`;
  const q = (sql: string, ...a: any[]) => get(sql, ...a)!.n as number;
  const questions = q(`SELECT COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND created_at >= ${since}`, rid);
  const sessions = q(`SELECT COUNT(DISTINCT session_id) AS n FROM chat_messages WHERE restaurant_id = ? AND created_at >= ${since}`, rid);
  const tables = q(`SELECT COUNT(DISTINCT s.table_no) AS n FROM chat_sessions s WHERE s.restaurant_id = ? AND s.table_no != '' AND s.started_at >= ${since}`, rid);
  const unanswered = q(`SELECT COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND answered = 0 AND created_at >= ${since}`, rid);
  const opens = q(`SELECT COUNT(*) AS n FROM events WHERE restaurant_id = ? AND kind = 'menu_open' AND created_at >= ${since}`, rid);
  const topics = all(`SELECT topic, COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND created_at >= ${since} GROUP BY topic ORDER BY n DESC`, rid)
    .map((t: any) => ({ topic: t.topic, label: LABEL[t.topic] || t.topic, n: t.n }));
  const langs = all(`SELECT lang, COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND created_at >= ${since} GROUP BY lang`, rid);
  const cannot = all(`SELECT text, COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND answered = 0 AND created_at >= ${since} GROUP BY lower(text) ORDER BY n DESC, MAX(id) DESC LIMIT 6`, rid);
  const flagged = all(`SELECT a.id, a.text AS answer FROM chat_messages a WHERE a.restaurant_id = ? AND a.flagged = 1 AND a.created_at >= ${since} ORDER BY a.id DESC LIMIT 5`, rid);
  const items = itemsOf(rid);
  const veg = items.filter((i) => i.tags.includes("vegetarian") || i.tags.includes("vegan")).length;
  const vegAsked = topics.find((t: any) => t.topic === "vegetarian")?.n || 0;
  return json({
    days, questions, sessions, tables, unanswered, opens,
    answeredPct: questions ? Math.round(((questions - unanswered) / questions) * 100) : null,
    topics, langs, cannot, flagged,
    unmet: vegAsked ? { asked: vegAsked, listed: veg } : null,
  });
}
