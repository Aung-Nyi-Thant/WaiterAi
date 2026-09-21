import { ownerSession } from "@/lib/auth";
import { run, get } from "@/lib/db";
import { json, bad, body, unauthorized } from "@/lib/http";
import { itemColumns } from "../route";

type P = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: P) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const id = Number((await params).id);
  if (!get("SELECT 1 FROM menu_items WHERE id = ? AND restaurant_id = ?", id, s.restaurantId)) return bad("Dish not found.", 404);
  const cols = itemColumns(await body(req), true);
  if (typeof cols === "string") return bad(cols);
  const keys = Object.keys(cols);
  if (keys.length) run(`UPDATE menu_items SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ? AND restaurant_id = ?`, ...keys.map((k) => cols[k]), id, s.restaurantId);
  return json({ ok: true });
}
export async function DELETE(_: Request, { params }: P) {
  const s = await ownerSession(); if (!s) return unauthorized();
  run("DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?", Number((await params).id), s.restaurantId);
  return json({ ok: true });
}
