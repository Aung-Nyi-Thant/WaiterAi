import { all } from "@/modules/platform/db";

export type ShowcaseDish = { id: number; name: string; name_th: string; price: number; photo_url: string; category: string };

/** A few dishes of a restaurant for the home page: the first available dish of each category (one with a photo if the category has one),
 *  then the second of each, and so on, so a 132-dish sushi menu shows sashimi, sushi, grill and drinks, not only its first ten sets. */
export function showcaseDishes(restaurantId: number, limit = 12): ShowcaseDish[] {
  const rows = all(
    `SELECT m.id, m.name_en, m.name_th, m.price, m.photo_url, COALESCE(c.name_en, '') AS category, COALESCE(c.sort, 9999) AS csort
       FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
      WHERE m.restaurant_id = ? AND m.available = 1
      ORDER BY csort, c.id, (m.photo_url = '') , m.sort, m.id`, restaurantId) as any[];
  const byCategory = new Map<string, any[]>();
  for (const r of rows) { const k = `${r.csort}|${r.category}`; if (!byCategory.has(k)) byCategory.set(k, []); byCategory.get(k)!.push(r); }
  const lists = [...byCategory.values()];
  const out: ShowcaseDish[] = [];
  for (let round = 0; out.length < limit; round++) {
    let any = false;
    for (const list of lists) {
      if (round < list.length && out.length < limit) { const r = list[round]; out.push({ id: r.id, name: r.name_en, name_th: r.name_th, price: r.price, photo_url: r.photo_url, category: r.category }); any = true; }
    }
    if (!any) break;
  }
  return out;
}
