import { ownerSession } from "@/modules/platform/auth";
import { itemsOf, ALLERGENS, TAGS } from "@/modules/platform/menu";
import { run, get } from "@/modules/platform/db";
import { json, bad, body, unauthorized } from "@/modules/platform/http";

export function itemColumns(b: any, partial: boolean): Record<string, any> | string {
  const out: Record<string, any> = {};
  const has = (k: string) => b[k] !== undefined;
  if (has("name")) { out.name_en = String(b.name.en || "").trim(); out.name_th = String(b.name.th || "").trim(); out.name_my = String(b.name.my || "").trim(); }
  if (has("desc")) { out.desc_en = String(b.desc.en || ""); out.desc_th = String(b.desc.th || ""); out.desc_my = String(b.desc.my || ""); }
  if (has("price")) { const p = Number(b.price); if (!(p >= 0 && p < 100000)) return "Please enter a valid price."; out.price = p; }
  if (has("ingredients")) out.ingredients = String(b.ingredients).slice(0, 500);
  if (has("allergens")) out.allergens_json = b.allergens === null ? null : JSON.stringify((b.allergens as string[]).filter((a) => (ALLERGENS as readonly string[]).includes(a)));
  if (has("tags")) out.tags_json = JSON.stringify((b.tags as string[]).filter((t) => (TAGS as readonly string[]).includes(t)));
  if (has("spice")) out.spice = Math.max(0, Math.min(3, Number(b.spice) || 0));
  if (has("available")) out.available = b.available ? 1 : 0;
  if (has("photo_url")) out.photo_url = String(b.photo_url);
  if (has("category_id")) out.category_id = b.category_id ? Number(b.category_id) : null;
  if (!partial && !out.name_en) return "Please enter the dish name.";
  if (partial && "name_en" in out && !out.name_en) return "Please enter the dish name.";
  return out;
}

export async function GET() {
  const s = await ownerSession(); if (!s) return unauthorized();
  return json(itemsOf(s.restaurantId));
}
export async function POST(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const b = await body(req);
  if (b.allergens === undefined) b.allergens = null;
  const cols = itemColumns(b, false);
  if (typeof cols === "string") return bad(cols);
  if (cols.category_id && !get("SELECT 1 FROM categories WHERE id = ? AND restaurant_id = ?", cols.category_id, s.restaurantId)) return bad("Unknown category.");
  const sort = (get("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM menu_items WHERE restaurant_id = ?", s.restaurantId)!.n) as number;
  const keys = Object.keys(cols);
  const id = run(`INSERT INTO menu_items (restaurant_id, sort${keys.map((k) => ", " + k).join("")}) VALUES (?, ?${keys.map(() => ",?").join("")})`, s.restaurantId, sort, ...keys.map((k) => cols[k])).id;
  return json({ ok: true, id });
}
