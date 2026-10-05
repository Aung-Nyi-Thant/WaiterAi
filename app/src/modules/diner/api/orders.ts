import crypto from "node:crypto";
import { restaurantBySlug, itemsOf } from "@/modules/platform/menu";
import { run, all, get, db } from "@/modules/platform/db";
import { json, bad, body } from "@/modules/platform/http";
import { cleanProfile } from "@/modules/platform/constants";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await body(req);
  const r = restaurantBySlug(slug);
  if (!r) return bad("Restaurant not found.", 404);
  const menu = itemsOf(r.id);
  const lines: { it: any; qty: number }[] = [];
  for (const l of Array.isArray(b.items) ? b.items : []) {
    const it = menu.find((m) => m.id === Number(l.id));
    if (it?.available) lines.push({ it, qty: Math.max(1, Math.min(20, Number(l.qty) || 1)) });
  }
  if (!lines.length) return bad("No available dishes were picked.");
  // allergies the diner chose in their profile, and the ones they asked about in this chat session: both go to the staff
  const profile = cleanProfile(b.profile);
  const said = new Set<string>(profile);
  if (b.sessionId) for (const m of all("SELECT allergens FROM chat_messages WHERE session_id = ? AND restaurant_id = ? AND role = 'user'", String(b.sessionId), r.id)) for (const a of JSON.parse(m.allergens || "[]") as string[]) said.add(a);
  const lang = ["en", "th", "my"].includes(b.lang) ? b.lang : "en";
  db.exec("BEGIN");
  try {
    // The receipt code is issued HERE, never chosen by the phone (see diner/api/bill.ts): 192 random bits, returned with the order.
    // A phone that already holds a code for this table sends it back and keeps it; anything the server did not issue is ignored.
    const table = String(b.table || "").slice(0, 10);
    const sent = String(b.receipt || "");
    const issued = /^[a-f0-9]{48}$/.test(sent) && get("SELECT 1 AS ok FROM orders WHERE restaurant_id = ? AND table_no = ? AND receipt = ?", r.id, table, sent);
    const receipt = issued ? sent : crypto.randomBytes(24).toString("hex");
    const id = run("INSERT INTO orders (restaurant_id, table_no, status, lang, allergy_note, receipt) VALUES (?,?,?,?,?,?)", r.id, table, "picked", lang, [...said].join(", "), receipt).id;
    for (const { it, qty } of lines) {
      // flag the dish lines that clash with the diner's profile: the allergens the dish lists, or "unknown" when it has no allergen data
      const flag = !profile.length ? "" : it.allergens === null ? "unknown" : it.allergens.filter((a: string) => profile.includes(a)).join(",");
      run("INSERT INTO order_items (order_id, item_id, name, qty, price, flag) VALUES (?,?,?,?,?,?)", id, it.id, it.name.en, qty, it.price, flag);
    }
    db.exec("COMMIT");
    return json({ ok: true, id, receipt });
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
