import type { Item } from "@/modules/platform/menu";

export type DinerFilters = { veg: boolean; noPeanut: boolean; u100: boolean; spicy: boolean; mine?: boolean };

// A listed allergen takes precedence; an unchecked list cannot establish that the other allergens are absent.
export const clash = (item: Item, profile: string[]): string[] | "unknown" | "estimated" | null =>
  !profile.length ? null : item.allergens === null ? "unknown" : item.allergens.filter((a) => profile.includes(a)).length ? item.allergens.filter((a) => profile.includes(a)) : item.allergen_status === "verified" ? null : "estimated";

// Which dishes the diner's menu shows (category, search box, the four filters, and "fits my allergies" when the diner has a profile). Kept apart from the React page so it can be tested.
export function filterMenu(items: Item[], o: { cat: number | null | 0; q: string; f: DinerFilters; profile?: string[] }): Item[] {
  const needle = o.q.trim().toLowerCase();
  return items.filter((i) =>
    (!o.cat || i.category_id === o.cat) &&
    (!needle || Object.values(i.name).some((n) => n.toLowerCase().includes(needle))) &&
    (!o.f.veg || i.tags.includes("vegetarian") || i.tags.includes("vegan")) &&
    // An estimate cannot establish that peanuts are absent.
    (!o.f.noPeanut || (i.allergens !== null && i.allergen_status === "verified" && !i.allergens.includes("peanut"))) &&
    (!o.f.mine || clash(i, o.profile ?? []) === null) &&
    (!o.f.u100 || i.price < 100) && (!o.f.spicy || i.tags.includes("spicy")));
}
