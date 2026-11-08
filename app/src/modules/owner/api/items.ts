import { ownerSession } from "@/modules/platform/auth";
import { itemsOf, ALLERGENS, TAGS } from "@/modules/platform/menu";
import { all, run, get } from "@/modules/platform/db";
import { json, bad, body, unauthorized } from "@/modules/platform/http";

export function itemColumns(b: any, partial: boolean): Record<string, any> | string {
  const out: Record<string, any> = {};
  const has = (k: string) => b[k] !== undefined;
  if ((has("name") && typeof b.name !== "object") || (has("desc") && typeof b.desc !== "object") || (b.name === null) || (b.desc === null)) return "Name and description must be objects with en, th and my.";
  if ((has("tags") && !Array.isArray(b.tags)) || (has("allergens") && b.allergens !== null && !Array.isArray(b.allergens))) return "Tags and allergens must be lists.";
  if (has("name")) { out.name_en = String(b.name.en || "").trim(); out.name_th = String(b.name.th || "").trim(); out.name_my = String(b.name.my || "").trim(); }
  if (has("desc")) { out.desc_en = String(b.desc.en || ""); out.desc_th = String(b.desc.th || ""); out.desc_my = String(b.desc.my || ""); }
  if (has("price")) { const p = Number(b.price); if (!(p >= 0 && p < 100000)) return "Please enter a valid price."; out.price = p; }
  if (has("ingredients")) out.ingredients = String(b.ingredients).slice(0, 500);
  if (has("ingredients_tr")) { out.ingredients_th = String(b.ingredients_tr?.th ?? "").slice(0, 700); out.ingredients_my = String(b.ingredients_tr?.my ?? "").slice(0, 900); }
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

// An allergen list counts as "verified" only when the owner says so (the "I compared the recipe and supplier labels" box), and only until the
// list or the ingredients change: a check of an old recipe says nothing about the new one. No list at all is never verified.
// Returns the extra columns to write (an empty object = leave the stored status alone).
const sameList = (a: string | null, b: string | null) => (a === null || b === null ? a === b : JSON.stringify([...JSON.parse(a)].sort()) === JSON.stringify([...JSON.parse(b)].sort()));
export function allergenCheck(cols: Record<string, any>, prev: any | null, wantsVerified: boolean, by: string, evidence = ""): Record<string, any> | string {
  const list = "allergens_json" in cols ? cols.allergens_json : prev ? prev.allergens_json : null;
  if (list === null) return wantsVerified ? "Record the allergens before marking them as checked." : { allergen_status: "estimated", allergens_checked_at: null, allergens_checked_by: "" };
  if (wantsVerified) {
    const note = typeof evidence === "string" ? evidence.trim().slice(0, 500) : "";
    if (!note) return "Record the recipe version, supplier labels and cross-contact check before verifying.";
    return { allergen_status: "verified", allergens_checked_at: new Date().toISOString().slice(0, 19).replace("T", " "), allergens_checked_by: by, allergen_check_note: note };
  }
  const changed = !prev || ("allergens_json" in cols && !sameList(cols.allergens_json, prev.allergens_json))
    || ["ingredients", "ingredients_th", "ingredients_my"].some((k) => k in cols && cols[k] !== prev[k]);
  return changed ? { allergen_status: "estimated", allergens_checked_at: null, allergens_checked_by: "" } : {};
}

export async function GET() {
  const s = await ownerSession(); if (!s) return unauthorized();
  const notes = new Map(all("SELECT id, allergen_check_note FROM menu_items WHERE restaurant_id = ?", s.restaurantId).map((r: any) => [r.id, r.allergen_check_note]));
  return json(itemsOf(s.restaurantId).map((i) => ({ ...i, allergen_check_note: notes.get(i.id) || "" })));
}
export async function POST(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const b = await body(req);
  if (b.allergens === undefined) b.allergens = null;
  const cols = itemColumns(b, false);
  if (typeof cols === "string") return bad(cols);
  if (cols.category_id && !get("SELECT 1 FROM categories WHERE id = ? AND restaurant_id = ?", cols.category_id, s.restaurantId)) return bad("Unknown category.");
  const check = allergenCheck(cols, null, b.allergen_status === "verified", get("SELECT email FROM users WHERE id = ?", s.userId)?.email || "", b.allergen_check_note);
  if (typeof check === "string") return bad(check);
  Object.assign(cols, check);
  const sort = (get("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM menu_items WHERE restaurant_id = ?", s.restaurantId)!.n) as number;
  const keys = Object.keys(cols);
  const id = run(`INSERT INTO menu_items (restaurant_id, sort${keys.map((k) => ", " + k).join("")}) VALUES (?, ?${keys.map(() => ",?").join("")})`, s.restaurantId, sort, ...keys.map((k) => cols[k])).id;
  return json({ ok: true, id });
}
