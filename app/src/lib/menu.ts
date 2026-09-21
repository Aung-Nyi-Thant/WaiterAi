import { all, get } from "./db";

export { ALLERGENS, TAGS } from "./constants";

export type Lang = "en" | "th" | "my";
export type Item = {
  id: number; category_id: number | null;
  name: Record<Lang, string>; desc: Record<Lang, string>;
  price: number; ingredients: string;
  allergens: string[] | null; tags: string[]; spice: number; available: boolean; photo_url: string;
};
export type Category = { id: number; name: Record<Lang, string>; sort: number };
export type Restaurant = {
  id: number; slug: string; name: string; city: string; currency: string;
  hours: { open: string; close: string; lastOrder: string; closedDays: string[] };
  persona: { name: string; gender: "male" | "female"; tone: string; greeting: string; upsell: boolean; rules: string };
  chat_cap: number;
};

export function rowToItem(r: any): Item {
  return {
    id: r.id, category_id: r.category_id,
    name: { en: r.name_en, th: r.name_th || r.name_en, my: r.name_my || r.name_en },
    desc: { en: r.desc_en, th: r.desc_th || r.desc_en, my: r.desc_my || r.desc_en },
    price: r.price, ingredients: r.ingredients,
    allergens: r.allergens_json === null ? null : JSON.parse(r.allergens_json),
    tags: JSON.parse(r.tags_json || "[]"), spice: r.spice, available: !!r.available, photo_url: r.photo_url,
  };
}
export function rowToRestaurant(r: any): Restaurant {
  return {
    id: r.id, slug: r.slug, name: r.name, city: r.city, currency: r.currency,
    hours: JSON.parse(r.hours_json), persona: JSON.parse(r.persona_json), chat_cap: r.chat_cap,
  };
}
export const restaurantBySlug = (slug: string) => {
  const r = get("SELECT * FROM restaurants WHERE slug = ?", slug);
  return r ? rowToRestaurant(r) : null;
};
export const restaurantById = (id: number) => {
  const r = get("SELECT * FROM restaurants WHERE id = ?", id);
  return r ? rowToRestaurant(r) : null;
};
export const itemsOf = (rid: number): Item[] =>
  all("SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY sort, id", rid).map(rowToItem);
export const categoriesOf = (rid: number): Category[] =>
  all("SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort, id", rid).map((c: any) => ({
    id: c.id, sort: c.sort, name: { en: c.name_en, th: c.name_th || c.name_en, my: c.name_my || c.name_en },
  }));
export const faqsOf = (rid: number) => all("SELECT id, q, a FROM faqs WHERE restaurant_id = ? ORDER BY sort, id", rid);
export const specialsOf = (rid: number) => {
  const today = new Date().toISOString().slice(0, 10);
  return all("SELECT * FROM specials WHERE restaurant_id = ? AND active = 1 AND (starts_on = '' OR starts_on <= ?) AND (ends_on = '' OR ends_on >= ?)", rid, today, today);
};

export function slugify(s: string): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return base || "restaurant";
}
export function uniqueSlug(name: string): string {
  const base = slugify(name);
  let slug = base, n = 2;
  while (get("SELECT 1 FROM restaurants WHERE slug = ?", slug)) slug = `${base}-${n++}`;
  return slug;
}
