// DM-3 / DM-4: the diner's search box and filters (the logic behind the menu page).
import { describe, it, expect } from "vitest";
import { filterMenu, type DinerFilters } from "@/modules/diner/filters";
import { itemsOf } from "@/modules/platform/menu";

const none: DinerFilters = { veg: false, noPeanut: false, u100: false, spicy: false };
const menu = () => itemsOf(1);
const names = (f: Partial<DinerFilters>, o: { cat?: number | null; q?: string } = {}) => filterMenu(menu(), { cat: o.cat ?? null, q: o.q ?? "", f: { ...none, ...f } }).map((i) => i.name.en);

describe("DM-4 the 'No peanuts' filter never shows a dish with missing allergen data", () => {
  it("shows only dishes that are known to be peanut-free", () => {
    const shown = names({ noPeanut: true });
    expect(shown).not.toContain("Fresh Spring Rolls");                    // allergens = null (not provided): NOT 'no peanuts'
    for (const n of ["Shrimp Pad Thai", "Beef Massaman Curry", "Papaya Salad"]) expect(shown).not.toContain(n);
    for (const n of ["Tom Yum Goong", "Mango Sticky Rice", "Thai Iced Tea"]) expect(shown).toContain(n);
    for (const i of filterMenu(menu(), { cat: null, q: "", f: { ...none, noPeanut: true } })) {
      expect(i.allergens, i.name.en).not.toBeNull();
      expect(i.allergens).not.toContain("peanut");
    }
  });
  it("a dish with an empty allergen list ('none listed') is shown, 'not provided' (null) is not", () => {
    const [first] = menu();
    const items = [{ ...first, id: 1, allergens: [] as string[] }, { ...first, id: 2, allergens: null }, { ...first, id: 3, allergens: ["peanut"] }, { ...first, id: 4, allergens: ["soy"] }];
    expect(filterMenu(items, { cat: null, q: "", f: { ...none, noPeanut: true } }).map((i) => i.id)).toEqual([1, 4]);
  });
});

describe("DM-4 the other filters", () => {
  it("vegetarian shows vegetarian and vegan dishes only", () => {
    const shown = names({ veg: true });
    expect(shown).toEqual(expect.arrayContaining(["Vegetable Tofu Stir-fry", "Mango Sticky Rice", "Thai Iced Tea"]));
    for (const n of ["Shrimp Pad Thai", "Grilled Pork Skewers", "Fresh Spring Rolls"]) expect(shown).not.toContain(n);   // no tag = not shown
  });
  it("'under 100' means strictly below 100 baht", () => {
    const shown = filterMenu(menu(), { cat: null, q: "", f: { ...none, u100: true } });
    expect(shown.every((i) => i.price < 100)).toBe(true);
    expect(shown.map((i) => i.name.en)).not.toContain("Mango Sticky Rice");   // exactly 100
    expect(shown.map((i) => i.name.en)).toContain("Vegetable Tofu Stir-fry");  // 90
  });
  it("spicy shows only dishes tagged spicy", () => {
    expect(names({ spicy: true }).sort()).toEqual(["Chicken Green Curry", "Papaya Salad", "Steamed Fish with Lime", "Tom Yum Goong"]);
  });
  it("filters combine (all must hold)", () => {
    expect(names({ veg: true, noPeanut: true, u100: true })).toEqual(["Vegetable Tofu Stir-fry", "Thai Iced Tea", "Coconut Ice Cream"]);
    expect(names({ veg: true, spicy: true })).toEqual([]);
  });
});

describe("DM-3 search and category", () => {
  it("search matches a dish name in any language, ignoring case and spaces at the ends", () => {
    expect(names({}, { q: "  PAD thai " })).toEqual(["Shrimp Pad Thai"]);
    expect(names({}, { q: "ผัดไทย" })).toEqual(["Shrimp Pad Thai"]);
    expect(names({}, { q: "ပတ်ထိုင်း" })).toEqual(["Shrimp Pad Thai"]);
    expect(names({}, { q: "zzz" })).toEqual([]);
  });
  it("a category shows only its dishes; 'all' (null or 0) shows everything", () => {
    const m = menu();
    const cat = m.find((i) => i.name.en === "Tom Yum Goong")!.category_id;
    expect(names({}, { cat })).toEqual(expect.arrayContaining(["Tom Yum Goong", "Chicken Green Curry", "Beef Massaman Curry"]));
    expect(names({}, { cat }).length).toBeLessThan(m.length);
    expect(names({}, { cat: null }).length).toBe(m.length);
    expect(filterMenu(m, { cat: 0, q: "", f: none }).length).toBe(m.length);
  });
  it("search, category and filters work together", () => {
    expect(names({ noPeanut: true }, { q: "tom" })).toEqual(["Tom Yum Goong"]);
    expect(names({ noPeanut: true }, { q: "pad" })).toEqual([]);              // Pad Thai has peanuts
  });
});
