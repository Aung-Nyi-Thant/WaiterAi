import { ownerSession } from "@/modules/platform/auth";
import { all, get } from "@/modules/platform/db";
import { itemsOf } from "@/modules/platform/menu";
import { ALLERGEN_LABEL } from "@/modules/platform/constants";
import { json, unauthorized } from "@/modules/platform/http";

const LABEL: Record<string, string> = { allergens: "Allergens", vegetarian: "Vegetarian options", prices: "Prices", hours: "Opening hours", spicy: "How spicy is it?", recommend: "Recommendations", staff: "Calling the staff", other: "Other questions" };

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
  // Allergies the diners chose (one count per chat session; no name or contact data is stored) and allergens they asked about,
  // with how many dishes on sale serve each of them: a dish serves a diner who avoids X only if it has allergen data and does not list X.
  const tally = (rows: any[]) => { const m = new Map<string, number>(); for (const r of rows) for (const a of JSON.parse(r.v || "[]") as string[]) m.set(a, (m.get(a) || 0) + 1); return [...m].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])); };
  const label = (a: string) => ALLERGEN_LABEL[a] || a;
  const dishesFor = (a: string) => items.filter((i) => i.available && i.allergens !== null && !i.allergens.includes(a)).length;
  const allergyProfiles = tally(all(`SELECT profile AS v FROM chat_sessions WHERE restaurant_id = ? AND profile != '[]' AND started_at >= ${since}`, rid)).slice(0, 8)
    .map(([allergen, diners]) => ({ allergen, label: label(allergen), diners, dishes: dishesFor(allergen) }));
  const allergensAsked = tally(all(`SELECT allergens AS v FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND allergens != '[]' AND created_at >= ${since}`, rid)).slice(0, 8)
    .map(([allergen, n]) => ({ allergen, label: label(allergen), n, dishes: dishesFor(allergen) }));
  // dishes with no allergen data are never suggested to a diner with an allergy profile, so the owner should fill them in
  const noAllergenData = items.filter((i) => i.available && i.allergens === null).map((i) => i.name.en);
  const topDishes = all(`SELECT i.name AS name, SUM(i.qty) AS n FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.restaurant_id = ? AND o.status != 'cancelled' AND o.created_at >= ${since} GROUP BY i.item_id, i.name ORDER BY n DESC, i.name LIMIT 5`, rid).map((r: any) => ({ name: r.name, n: Number(r.n) }));
  const topQuestions = all(`SELECT text, COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND created_at >= ${since} GROUP BY lower(text) HAVING n > 1 ORDER BY n DESC, MAX(id) DESC LIMIT 5`, rid);
  const vegAsked = topics.find((t: any) => t.topic === "vegetarian")?.n || 0;
  return json({
    days, questions, sessions, tables, unanswered, opens,
    answeredPct: questions ? Math.round(((questions - unanswered) / questions) * 100) : null,
    topics, langs, cannot, flagged,
    // SRS FR-10: the "unmet demand" card appears only when diners asked more vegetarian questions than the menu has vegetarian dishes
    unmet: vegAsked > veg ? { asked: vegAsked, listed: veg } : null,
    allergyProfiles, allergensAsked, noAllergenData, topDishes, topQuestions,
  });
}
