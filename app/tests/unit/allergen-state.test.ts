import { describe, expect, it } from "vitest";
import { clash } from "@/modules/diner/filters";
import type { Item } from "@/modules/platform/menu";

const dish = (allergens: string[] | null, allergen_status: "verified" | "estimated" = "verified") => ({ allergens, allergen_status }) as Item;

describe("diner allergen state", () => {
  it("distinguishes unknown data, an empty list, and a listed allergy", () => {
    const profile = ["peanut", "shellfish"];
    expect(clash(dish(null), profile)).toBe("unknown");
    expect(clash(dish([]), profile)).toBeNull();
    expect(clash(dish(["fish", "shellfish", "peanut"]), profile)).toEqual(["shellfish", "peanut"]);
    expect(clash(dish(["fish"]), profile)).toBeNull();
    expect(clash(dish(["fish"], "estimated"), profile)).toBe("estimated");
    expect(clash(dish(null), [])).toBeNull();
  });
});
