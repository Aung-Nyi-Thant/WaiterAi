import type { Item } from "@/modules/platform/menu";

export type DinerFilters = { veg: boolean; noPeanut: boolean; u100: boolean; spicy: boolean };

// Which dishes the diner's menu shows (category, search box, and the four filters). Kept apart from the React page so it can be tested.
export function filterMenu(items: Item[], o: { cat: number | null | 0; q: string; f: DinerFilters }): Item[] {
  const needle = o.q.trim().toLowerCase();
  return items.filter((i) =>
    (!o.cat || i.category_id === o.cat) &&
    (!needle || Object.values(i.name).some((n) => n.toLowerCase().includes(needle))) &&
    (!o.f.veg || i.tags.includes("vegetarian") || i.tags.includes("vegan")) &&
    // "No peanuts" must not show a dish whose allergen data is missing (null = not provided), only dishes known to be peanut-free
    (!o.f.noPeanut || (i.allergens !== null && !i.allergens.includes("peanut"))) &&
    (!o.f.u100 || i.price < 100) && (!o.f.spicy || i.tags.includes("spicy")));
}
