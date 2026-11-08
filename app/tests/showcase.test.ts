// The dishes the home page shows for a restaurant: a spread over its categories, available dishes only, photos first inside a category.
import { describe, expect, it } from "vitest";
import { run } from "@/modules/platform/db";
import { showcaseDishes } from "@/modules/platform/showcase";

describe("showcaseDishes", () => {
  it("takes one dish from each category before a second from any, in category order", () => {
    const d = showcaseDishes(1, 12);
    expect(d.map((x) => x.category).slice(0, 6)).toEqual(["Starters", "Mains", "Curries", "Salads", "Desserts", "Drinks"]);
    expect(d.length).toBe(12);
    expect(new Set(d.map((x) => x.id)).size).toBe(12);                         // no dish twice
  });
  it("never shows a dish that is sold out", () => {
    const d = showcaseDishes(1, 20);
    expect(d.map((x) => x.name)).not.toContain("Coconut Ice Cream");
    expect(d.length).toBe(12);                                                   // 13 dishes, one sold out
  });
  it("stops at the limit, and at the number of dishes there are", () => {
    expect(showcaseDishes(1, 3)).toHaveLength(3);
    expect(showcaseDishes(1, 500)).toHaveLength(12);
    expect(showcaseDishes(999, 12)).toEqual([]);                                 // no such restaurant
  });
  it("inside a category a dish with a photo comes first", () => {
    run("UPDATE menu_items SET photo_url = 'https://example.com/tea.jpg' WHERE name_en = 'Thai Iced Tea'");
    run("INSERT INTO menu_items (restaurant_id, category_id, name_en, price, sort) VALUES (1, (SELECT id FROM categories WHERE name_en = 'Drinks'), 'Aaa Plain Water', 10, -5)");
    const drinks = showcaseDishes(1, 50).find((x) => x.category === "Drinks")!;
    expect(drinks.name).toBe("Thai Iced Tea");                                   // the water is first by sort order but has no photo
    run("DELETE FROM menu_items WHERE name_en = 'Aaa Plain Water'");
    run("UPDATE menu_items SET photo_url = '' WHERE name_en = 'Thai Iced Tea'");
  });
  it("carries what the home page needs: name, Thai name, price and photo link", () => {
    const first = showcaseDishes(1, 1)[0];
    expect(first).toMatchObject({ category: "Starters" });
    expect(Object.keys(first).sort()).toEqual(["category", "id", "name", "name_th", "photo_url", "price"]);
  });
});
