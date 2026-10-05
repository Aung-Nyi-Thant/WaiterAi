import type { Item } from "@/modules/platform/menu";

export type DinerFilters = { veg: boolean; noPeanut: boolean; u100: boolean; spicy: boolean; mine?: boolean };

// The allergens a dish lists that are in the diner's profile; "unknown" when the dish has no allergen data and a profile is set.
// (The same rule as the AI and the order use: a dish without data is never assumed to be fine.)
export const clash = (item: Item, profile: string[]): string[] | "unknown" | null =>
  !profile.length ? null : item.allergens === null ? "unknown" : item.allergens.filter((a) => profile.includes(a)).length ? item.allergens.filter((a) => profile.includes(a)) : null;

// Which dishes the diner's menu shows (category, search box, the four filters, and "fits my allergies" when the diner has a profile). Kept apart from the React page so it can be tested.
export function filterMenu(items: Item[], o: { cat: number | null | 0; q: string; f: DinerFilters; profile?: string[] }): Item[] {
  const needle = o.q.trim().toLowerCase();
  return items.filter((i) =>
    (!o.cat || i.category_id === o.cat) &&
    (!needle || Object.values(i.name).some((n) => n.toLowerCase().includes(needle))) &&
    (!o.f.veg || i.tags.includes("vegetarian") || i.tags.includes("vegan")) &&
    // "No peanuts" must not show a dish whose allergen data is missing (null = not provided), only dishes known to be peanut-free
    (!o.f.noPeanut || (i.allergens !== null && !i.allergens.includes("peanut"))) &&
    (!o.f.mine || clash(i, o.profile ?? []) === null) &&
    (!o.f.u100 || i.price < 100) && (!o.f.spicy || i.tags.includes("spicy")));
}
