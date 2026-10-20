// The AI against the sushi menu the owner really has (132 dishes: Sets & Combos, Sashimi, Sushi, Appetizers, Grilled Skewers, Rice & Don, Noodles,
// Soup, Drinks), with the language model switched off: everything here is answered from the data by the rules, so it is fast and exact.
// Every dish is asked about by name in English, Thai and Burmese; then the combos and sets, the categories, and the dishes that list allergens.
import { beforeAll, describe, expect, it } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { allergenName } from "@/modules/platform/constants";
import { seedSushiMenu } from "./sushiMenu";

type Lang = "en" | "th" | "my";
let ctx: any;
const ask = (q: string, lang: Lang = "en") => answer(q, lang, ctx);
const shown = (r: any) => ((r.action as any).ids ?? []).map((id: number) => ctx.items.find((i: any) => i.id === id)?.name.en);
const dish = (en: string) => ctx.items.find((i: any) => i.name.en === en);
const digits = (n: number) => String(n).replace(/\d/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[+d]);

beforeAll(async () => {
  seedSushiMenu();
  noModel();                                                       // a question that reaches the model fails the test
  const { categoriesOf } = await import("@/modules/platform/menu");
  ctx = { ...(await aiCtx()), categories: categoriesOf(1) };
}, 60_000);

describe("the menu is the sushi menu", () => {
  it("has 132 dishes in nine categories", () => {
    expect(ctx.items).toHaveLength(132);
    expect(ctx.categories.map((c: any) => c.name.en)).toEqual(["Sets & Combos", "Sashimi", "Sushi", "Appetizers", "Grilled Skewers", "Rice & Don", "Noodles", "Soup", "Drinks"]);
  });
});

describe("every dish, asked about by name", () => {
  it("answers the price of each dish with that dish and its price, in English, Thai and Burmese", async () => {
    const failed: string[] = [];
    for (const d of ctx.items) {
      for (const [lang, q, price] of [["en", `How much is the ${d.name.en}?`, `฿${d.price}`], ["th", `${d.name.th} ราคาเท่าไหร่`, `${d.price} บาท`], ["my", `${d.name.my} ဘယ်လောက်လဲ`, `${digits(d.price)} ဘတ်`]] as [Lang, string, string][]) {
        const r = await ask(q, lang);
        if (r.usedModel || shown(r)[0] !== d.name.en || !r.reply.includes(price)) failed.push(`${lang} "${q}" -> ${shown(r).join("|") || r.action.type}: ${r.reply.slice(0, 80)}`);
      }
    }
    expect(failed, failed.join("\n")).toEqual([]);
  }, 120_000);

  it("answers the ingredients of each dish from its own data, or says there are none (never 'is made with: .')", async () => {
    const failed: string[] = [];
    for (const d of ctx.items) {
      const r = await ask(`What is in the ${d.name.en}?`);
      const has = d.ingredients.trim().length > 0;
      const first = d.ingredients.split(",")[0].trim();
      if (r.usedModel || shown(r)[0] !== d.name.en || (has ? !r.reply.includes(first) : !/don't have the ingredients/.test(r.reply)) || /: \./.test(r.reply)) failed.push(`${d.name.en}: ${r.reply.slice(0, 100)}`);
    }
    expect(failed, failed.join("\n")).toEqual([]);
  }, 120_000);

  it("lists the allergens of each dish exactly as the data has them, and says 'not provided' where the data is empty", async () => {
    const failed: string[] = [];
    for (const d of ctx.items) {
      const r = await ask(`What allergens are in the ${d.name.en}?`);
      const ok = d.allergens === null ? /not provided/.test(r.reply) : d.allergens.length === 0 ? /no allergens listed/.test(r.reply) : d.allergens.every((k: string) => r.reply.includes(allergenName(k, "en")));
      if (r.usedModel || shown(r)[0] !== d.name.en || !ok || !/confirm with the staff/.test(r.reply)) failed.push(`${d.name.en}: ${r.reply.slice(0, 120)}`);
    }
    expect(failed, failed.join("\n")).toEqual([]);
  }, 120_000);

  it("finds a dish typed without its bracketed tag ('Yakisoba with Coke' is the combo, not plain Yakisoba)", async () => {
    for (const name of ["Yakisoba with Coke", "Garlic Fried Rice with Coke", "Fatty Beef Don with Coke"]) {
      const r = await ask(`How much is ${name}?`);
      expect(shown(r), name).toEqual([`[Coke Combo] ${name}`]);
    }
    expect(shown(await ask("How much is the Yakisoba?"))).toEqual(["Yakisoba"]);
  });
});

describe("combos and sets", () => {
  it.each(["What combos do you have?", "Do you have a set menu?", "Any promotion?", "Show me the sets", "Which combo is the cheapest?"])("'%s' lists the six sets and combos", async (q) => {
    const r = await ask(q);
    expect(r.usedModel).toBe(false);
    if (/cheapest/.test(q)) return;                                // the cheapest rule has its own test below
    expect(r.reply).toMatch(/^Sets & Combos \(6\)/);
    for (const n of ["[Coke Combo] Yakisoba with Coke", "Tontoro Happy Set", "Buta Set", "Omori Set"]) expect(r.reply).toContain(n);
    expect(shown(r)).toHaveLength(6);
  });
  it("says that it does not know what a big set comes with, and names those sets", async () => {
    const r = await ask("What combos do you have?");
    expect(r.reply).toMatch(/don't have a list of what comes with Tontoro Happy Set, Buta Set, Omori Set/);
    expect(r.reply).not.toMatch(/don't have a list of what comes with[^.]*Coke Combo/);          // the Coke combos list their ingredients
  });
  it.each(["What is in the Tontoro Happy Set?", "What comes with the Omori Set?", "What's included in the Buta Set?"])("'%s' does not make up contents", async (q) => {
    const r = await ask(q);
    expect(r.usedModel).toBe(false);
    expect(r.answered).toBe(false);
    expect(r.reply).toMatch(/don't have the ingredients or what comes with/);
    expect(r.reply).toMatch(/confirm with the staff/);
  });
  it("answers the price of a set, and its allergens as 'not provided'", async () => {
    expect((await ask("How much is the Buta Set?")).reply).toContain("฿499");
    expect((await ask("How much is the Omori Set?")).reply).toContain("฿1200");
    expect((await ask("Is the Omori Set allergen free?")).reply).toMatch(/not provided/);
  });
  it("what is inside a Coke Combo comes from the data, with the cola", async () => {
    const r = await ask("What is in the Garlic Fried Rice with Coke?");
    expect(shown(r)).toEqual(["[Coke Combo] Garlic Fried Rice with Coke"]);
    expect(r.reply).toMatch(/Cola/);
  });
  it("'add yakisoba with coke' and 'I want garlic fried rice with coke' add the combo to the picks", async () => {
    for (const [q, name] of [["Add yakisoba with coke", "[Coke Combo] Yakisoba with Coke"], ["I want garlic fried rice with coke", "[Coke Combo] Garlic Fried Rice with Coke"]]) {
      const r = await ask(q);
      expect(r.action.type, q).toBe("add_to_picks");
      expect(shown(r), q).toEqual([name]);
    }
  });
  it("lists the sets in Thai and Burmese", async () => {
    const th = await ask("มีเซ็ตอะไรบ้าง", "th");
    expect(th.usedModel).toBe(false);
    expect(th.reply).toContain("6 รายการ");
    expect(th.reply).toContain("Omori Set (1200 บาท)");
    const my = await ask("ဆက်မီနူး ရှိလား", "my");
    expect(my.usedModel).toBe(false);
    expect(my.reply).toContain("Omori Set");
    expect(my.reply).toContain("၆ မျိုး");
  });
});

describe("categories", () => {
  it.each([
    ["What sushi do you have?", "Sushi (25)"], ["Show me sashimi", "Sashimi (14)"], ["What skewers do you have?", "Grilled Skewers (15)"], ["Any appetizers?", "Appetizers (44)"],
    ["Rice bowls?", "Rice & Don (20)"], ["What drinks do you have?", "Drinks (4)"],
  ])("'%s' lists the category from the data (%s)", async (q, head) => {
    const r = await ask(q);
    expect(r.usedModel).toBe(false);
    expect(r.reply.startsWith(head), r.reply).toBe(true);
    expect(shown(r).length).toBeGreaterThan(0);
  });
  it("a long category shows the first twelve and says how many more", async () => {
    const r = await ask("Any appetizers?");
    expect(r.reply).toContain("and 32 more");
  });
  it("a short category (noodles, soup) names all its dishes, with price and spice level", async () => {
    const noodles = await ask("Any noodles?");
    expect(shown(noodles).sort()).toEqual(["Yakisoba", "Yakisoba with Onsen Egg"]);
    const soup = await ask("Do you have soup?");
    expect(shown(soup).sort()).toEqual(["Clear Soup", "Miso Soup"]);
    expect(soup.reply).toContain("฿42");
  });
  it("a recommendation inside a category keeps the three-dish answer", async () => {
    expect(shown(await ask("recommend a sushi"))).toHaveLength(3);
  });
  it("the cheapest dish of a category is the cheapest of that category, not of the menu", async () => {
    const r = await ask("cheapest sushi");
    expect(r.reply).toMatch(/^The cheapest in Sushi/);
    const min = Math.min(...ctx.items.filter((i: any) => i.category_id === ctx.categories.find((c: any) => c.name.en === "Sushi").id && i.available).map((i: any) => i.price));
    expect(shown(r).every((n: string) => dish(n).price >= min)).toBe(true);
    expect(dish(shown(r)[0]).price).toBe(min);
  });
  it("lists a category in Thai and Burmese with the names in that language", async () => {
    const th = await ask("มีเครื่องดื่มอะไรบ้าง", "th");
    expect(th.reply).toContain("หมวดเครื่องดื่ม มี 4 รายการ");
    const my = await ask("အဖျော်ယမကာ ဘာရှိလဲ", "my");
    expect(my.reply).toContain("၄ မျိုး");
  });
  it("a dish named in full is a dish, not its category ('Salmon Sushi' is not 'what sushi do you have?')", async () => {
    const r = await ask("How much is the Salmon Sushi?");
    expect(shown(r)).toEqual(["Salmon Sushi"]);
  });
});
