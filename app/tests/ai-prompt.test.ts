// The text the language model reads. A small menu is sent as keyed JSON, as always; a big one (more than BIG_MENU dishes) in a compact form,
// because the model re-reads the whole prompt after every menu change and a 145-dish menu as keyed JSON was over 8,000 tokens.
import { describe, expect, it } from "vitest";
import { aiCtx } from "./helpers";
import { BIG_MENU, systemPrompt } from "@/modules/ai/ai";

const dataOf = (prompt: string) => JSON.parse(prompt.slice(prompt.lastIndexOf("\n{") + 1));
const bigItems = async (n: number, base: any[]) => Array.from({ length: n }, (_, k) => ({ ...base[k % base.length], id: 1000 + k, name: { en: `Dish ${k}`, th: `จาน ${k}`, my: `Dish ${k}` }, available: k % 7 !== 0 }));

describe("a small menu (the demo)", () => {
  it("stays keyed JSON with an 'available' flag on every dish, and has no legend", async () => {
    const ctx = await aiCtx();
    expect(ctx.items.length).toBeLessThanOrEqual(BIG_MENU);
    const p = systemPrompt(ctx);
    const d = dataOf(p);
    expect(d.items[0]).toMatchObject({ id: expect.any(Number), name: { en: expect.any(String) }, price: expect.any(Number), available: expect.any(Boolean) });
    expect(d.soldOut).toBeUndefined();
    expect(p).toContain('Dishes with "available": false are sold out today');
    expect(p).not.toContain("Each entry of");
  });
});

describe("a big menu", () => {
  it("is sent as one short array per dish, with a legend, and the sold-out dishes as a list of ids", async () => {
    const base = (await aiCtx()).items;
    const ctx = await aiCtx({ items: await bigItems(BIG_MENU + 5, base) });
    const p = systemPrompt(ctx);
    const d = dataOf(p);
    expect(d.items).toHaveLength(BIG_MENU + 5);
    expect(d.items[1]).toEqual([1001, "Dish 1", "จาน 1", "", ctx.items[1].price, ctx.items[1].allergens, ctx.items[1].tags]);   // the Burmese name equals the English: left empty
    expect(d.soldOut).toEqual(ctx.items.filter((i: any) => !i.available).map((i: any) => i.id));
    expect(d.soldOut.length).toBeGreaterThan(3);
    expect(p).toContain('Dishes whose id is in "soldOut" are sold out today');
    expect(p).toContain("Each entry of \"items\" is [id, English name, Thai name, Burmese name, price, allergens, tags]");
    expect(p).toContain('"allergens": null means the allergen information was not provided');
  });
  it("is much shorter than the keyed form of the same dishes", async () => {
    const base = (await aiCtx()).items;
    const many = await bigItems(145, base);
    const compact = systemPrompt(await aiCtx({ items: many })).length;
    const keyed = JSON.stringify(many.map((i: any) => ({ id: i.id, name: i.name, price: i.price, allergens: i.allergens, tags: i.tags, available: i.available }))).length;
    expect(compact - 2500).toBeLessThan(keyed * 0.7);                                           // the rules and FAQ are about 2,500 characters of the prompt
  });
  it("keeps a dish name in a language that differs, and drops one that repeats the English name", async () => {
    const base = (await aiCtx()).items;
    const items = (await bigItems(BIG_MENU + 1, base)).map((i: any, k: number) => (k === 0 ? { ...i, name: { en: "Salmon Sashimi", th: "แซลม่อนซาชิมิ", my: "ဆော်လမွန်" } } : i));
    const d = dataOf(systemPrompt(await aiCtx({ items })));
    expect(d.items[0].slice(1, 4)).toEqual(["Salmon Sashimi", "แซลม่อนซาชิมิ", "ဆော်လမွန်"]);
  });
  it("the threshold is exactly BIG_MENU dishes: that many are still keyed", async () => {
    const base = (await aiCtx()).items;
    const keyed = dataOf(systemPrompt(await aiCtx({ items: await bigItems(BIG_MENU, base) })));
    expect(keyed.items[0]).toHaveProperty("name");
    const compact = dataOf(systemPrompt(await aiCtx({ items: await bigItems(BIG_MENU + 1, base) })));
    expect(Array.isArray(compact.items[0])).toBe(true);
  });
});
