import { ownerSession } from "@/lib/auth";
import { all, get, run, db } from "@/lib/db";
import { json, bad, body, unauthorized } from "@/lib/http";

export async function POST(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const b = await body(req);
  const items = (Array.isArray(b.items) ? b.items : []).filter((i: any) => String(i.name || "").trim());
  if (!items.length) return bad("There are no dishes to publish.");
  const rid = s.restaurantId;
  db.exec("BEGIN");
  try {
    const cats = new Map<string, number>(all("SELECT id, name_en FROM categories WHERE restaurant_id = ?", rid).map((c: any) => [c.name_en.toLowerCase(), c.id]));
    let sort = get("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM menu_items WHERE restaurant_id = ?", rid)!.n as number;
    let added = 0;
    for (const i of items) {
      const cn = String(i.category || "Mains").trim().slice(0, 40) || "Mains";
      let cid = cats.get(cn.toLowerCase());
      if (!cid) { cid = run("INSERT INTO categories (restaurant_id, name_en, sort) VALUES (?,?,?)", rid, cn, cats.size).id; cats.set(cn.toLowerCase(), cid); }
      const price = Math.max(0, Number(i.price) || 0);
      run(`INSERT INTO menu_items (restaurant_id, category_id, name_en, name_th, name_my, desc_en, price, allergens_json, tags_json, sort) VALUES (?,?,?,?,?,?,?,NULL,'[]',?)`,
        rid, cid, String(i.name).trim().slice(0, 80), String(i.name_th || "").trim(), String(i.name_my || "").trim(), String(i.description || "").slice(0, 200), price, sort++);
      added++;
    }
    if (b.importId) run("UPDATE imports SET status = 'confirmed' WHERE id = ? AND restaurant_id = ?", Number(b.importId), rid);
    db.exec("COMMIT");
    return json({ ok: true, added });
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
