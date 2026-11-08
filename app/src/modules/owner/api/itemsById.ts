import { ownerSession } from "@/modules/platform/auth";
import { run, get } from "@/modules/platform/db";
import { json, bad, body, unauthorized } from "@/modules/platform/http";
import { itemColumns, allergenCheck } from "@/modules/owner/api/items";

type P = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: P) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const id = Number((await params).id);
  const prev = get("SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?", id, s.restaurantId);
  if (!prev) return bad("Dish not found.", 404);
  const b = await body(req);
  const cols = itemColumns(b, true);
  if (typeof cols === "string") return bad(cols);
  if (cols.category_id && !get("SELECT 1 FROM categories WHERE id = ? AND restaurant_id = ?", cols.category_id, s.restaurantId)) return bad("Unknown category.");
  const check = allergenCheck(cols, prev, b.allergen_status === "verified", get("SELECT email FROM users WHERE id = ?", s.userId)?.email || "", b.allergen_check_note);
  if (typeof check === "string") return bad(check);
  Object.assign(cols, check);
  const keys = Object.keys(cols);
  if (keys.length) run(`UPDATE menu_items SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ? AND restaurant_id = ?`, ...keys.map((k) => cols[k]), id, s.restaurantId);
  return json({ ok: true });
}
export async function DELETE(_: Request, { params }: P) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const gone = run("DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?", Number((await params).id), s.restaurantId).changes;
  return gone ? json({ ok: true }) : bad("Dish not found.", 404);
}
