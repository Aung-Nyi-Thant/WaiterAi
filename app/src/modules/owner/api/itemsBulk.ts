import { ownerSession } from "@/modules/platform/auth";
import { run, get } from "@/modules/platform/db";
import { json, bad, body, unauthorized } from "@/modules/platform/http";

export async function PATCH(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const b = await body(req);
  const categoryId = Number(b.category_id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) return bad("Please select a valid category.");
  if (typeof b.available !== "boolean") return bad("Please choose whether the dishes are on sale.");
  if (!get("SELECT 1 FROM categories WHERE id = ? AND restaurant_id = ?", categoryId, s.restaurantId)) return bad("Category not found.", 404);
  const updated = run(
    "UPDATE menu_items SET available = ? WHERE category_id = ? AND restaurant_id = ?",
    b.available ? 1 : 0, categoryId, s.restaurantId,
  ).changes;
  return json({ ok: true, updated });
}
