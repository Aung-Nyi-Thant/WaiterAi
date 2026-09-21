import { restaurantBySlug, itemsOf } from "@/lib/menu";
import { run, all, db } from "@/lib/db";
import { json, bad, body } from "@/lib/http";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await body(req);
  const r = restaurantBySlug(slug);
  if (!r) return bad("Restaurant not found.", 404);
  const menu = itemsOf(r.id);
  const lines: { it: any; qty: number }[] = [];
  for (const l of Array.isArray(b.items) ? b.items : []) {
    const it = menu.find((m) => m.id === Number(l.id));
    if (it && it.available) lines.push({ it, qty: Math.max(1, Math.min(20, Number(l.qty) || 1)) });
  }
  if (!lines.length) return bad("No available dishes were picked.");
  // allergies the diner asked about in this chat session
  const said = new Set<string>();
  if (b.sessionId) for (const m of all("SELECT allergens FROM chat_messages WHERE session_id = ? AND role = 'user'", String(b.sessionId))) JSON.parse(m.allergens || "[]").forEach((a: string) => said.add(a));
  const lang = ["en", "th", "my"].includes(b.lang) ? b.lang : "en";
  db.exec("BEGIN");
  try {
    const id = run("INSERT INTO orders (restaurant_id, table_no, status, lang, allergy_note) VALUES (?,?,?,?,?)", r.id, String(b.table || "").slice(0, 10), "picked", lang, [...said].join(", ")).id;
    for (const { it, qty } of lines) run("INSERT INTO order_items (order_id, item_id, name, qty, price) VALUES (?,?,?,?,?)", id, it.id, it.name.en, qty, it.price);
    db.exec("COMMIT");
    return json({ ok: true, id });
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
