// The diner's ingredient list: cutting the owner's one-line text into ingredients, and pointing at the ingredient behind an allergen.
import { describe, it, expect } from "vitest";
import { allergensIn, ingredientList, splitIngredients, translationParts } from "@/modules/platform/ingredients";

describe("splitIngredients", () => {
  it("cuts a comma line into ingredients and trims them", () => {
    expect(splitIngredients("rice noodles, shrimp ,  egg,tamarind")).toEqual(["rice noodles", "shrimp", "egg", "tamarind"]);
  });
  it("also cuts at semicolons, middle dots, line breaks and Thai/Chinese commas", () => {
    expect(splitIngredients("rice; beef · egg\nonion、garlic，chilli")).toEqual(["rice", "beef", "egg", "onion", "garlic", "chilli"]);
  });
  it("keeps a slash, and a bracket note, inside one ingredient", () => {
    expect(splitIngredients("Batter / flour coating, and/or oil, rice (jasmine)")).toEqual(["Batter / flour coating", "and/or oil", "rice (jasmine)"]);
  });
  it("drops blanks and repeats (ignoring case), keeping the first spelling and the order", () => {
    expect(splitIngredients("Egg, , egg,  EGG , rice,")).toEqual(["Egg", "rice"]);
  });
  it("collapses inner spaces and a leading dash", () => {
    expect(splitIngredients("- sea   bass, -lime")).toEqual(["sea bass", "lime"]);
  });
  it("gives an empty list for nothing", () => {
    expect(splitIngredients("")).toEqual([]);
    expect(splitIngredients("  ,  ; ")).toEqual([]);
    expect(splitIngredients(undefined as unknown as string)).toEqual([]);
  });
  it("keeps Thai and Burmese ingredient names", () => {
    expect(splitIngredients("กุ้ง, ไข่, ငါးဟင်း")).toEqual(["กุ้ง", "ไข่", "ငါးဟင်း"]);
  });
});

describe("allergensIn: the allergen an ingredient's name points at", () => {
  it("finds the obvious ones, also in the plural and inside a longer name", () => {
    expect(allergensIn("crushed peanuts")).toEqual(["peanut"]);
    expect(allergensIn("Egg")).toEqual(["egg"]);
    expect(allergensIn("fish sauce")).toEqual(["fish"]);
    expect(allergensIn("tiger prawns")).toEqual(["shellfish"]);
    expect(allergensIn("tofu")).toEqual(["soy"]);
    expect(allergensIn("squid")).toEqual(["molluscs"]);
  });
  it("can find more than one in one name", () => {
    expect(allergensIn("shrimp and egg paste").sort()).toEqual(["egg", "shellfish"]);
  });
  it("finds Thai names", () => {
    expect(allergensIn("กุ้ง")).toEqual(["shellfish"]);
    expect(allergensIn("ไข่ดาว")).toEqual(["egg"]);
  });
  it("does not match a word inside another word", () => {
    expect(allergensIn("buttercup squash")).toEqual([]);
    expect(allergensIn("eggplant")).toEqual([]);
    expect(allergensIn("coconut")).toEqual([]);                    // a coconut is not a tree nut here: the owner lists it if it matters
    expect(allergensIn("rice noodles")).toEqual([]);               // rice noodles contain no gluten: no false warning
  });
  it("returns nothing for an ordinary ingredient", () => {
    for (const i of ["rice", "lime", "garlic", "chilli", "cola", "Japanese rice"]) expect(allergensIn(i), i).toEqual([]);
  });
});

describe("translationParts keeps every position", () => {
  it("keeps an empty part as an empty part, and repeats", () => {
    expect(translationParts("ข้าว, , กุ้ง")).toEqual(["ข้าว", "", "กุ้ง"]);
    expect(translationParts("ไข่, ไข่")).toEqual(["ไข่", "ไข่"]);
  });
  it("cuts at the same separators as the English line, and trims", () => {
    expect(translationParts(" a ，b、c;d·e\nf ")).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("gives one empty part for an empty line", () => {
    expect(translationParts("")).toEqual([""]);
    expect(translationParts(undefined as unknown as string)).toEqual([""]);
  });
});

describe("ingredientList: the ingredients in the diner's language", () => {
  const dish = { ingredients: "rice, shrimp, egg", ingredients_tr: { th: "ข้าว, กุ้ง, ไข่", my: "ထမင်း, , ဥ" } };
  it("English is the English line", () => {
    expect(ingredientList(dish, "en")).toEqual(["rice", "shrimp", "egg"]);
  });
  it("Thai is the Thai names, when they line up one for one", () => {
    expect(ingredientList(dish, "th")).toEqual(["ข้าว", "กุ้ง", "ไข่"]);
  });
  it("an empty part falls back to that ingredient's English name, the others stay translated", () => {
    expect(ingredientList(dish, "my")).toEqual(["ထမင်း", "shrimp", "ဥ"]);
  });
  it("a line with the wrong number of parts is not used at all (nothing can shift against its English name)", () => {
    expect(ingredientList({ ...dish, ingredients_tr: { th: "ข้าว, กุ้ง", my: "" } }, "th")).toEqual(["rice", "shrimp", "egg"]);
    expect(ingredientList({ ...dish, ingredients_tr: { th: "ข้าว, ผัก, กุ้ง, ไข่", my: "" } }, "th")).toEqual(["rice", "shrimp", "egg"]);
  });
  it("a trailing comma is not another ingredient, but a trailing empty part for a real ingredient is", () => {
    expect(ingredientList({ ingredients: "rice, egg", ingredients_tr: { th: "ข้าว, ไข่,", my: "" } }, "th")).toEqual(["ข้าว", "ไข่"]);
    expect(ingredientList({ ingredients: "rice, egg", ingredients_tr: { th: "", my: "ထမင်း, " } }, "my")).toEqual(["ထမင်း", "egg"]);
  });
  it("an item with no translations (an older record, or none written) gives the English names in every language", () => {
    expect(ingredientList({ ingredients: "rice, egg" }, "th")).toEqual(["rice", "egg"]);
    expect(ingredientList({ ingredients: "rice, egg", ingredients_tr: { th: "", my: "" } }, "my")).toEqual(["rice", "egg"]);
  });
  it("no ingredients at all is an empty list", () => {
    expect(ingredientList({ ingredients: "", ingredients_tr: { th: "", my: "" } }, "th")).toEqual([]);
  });
});
