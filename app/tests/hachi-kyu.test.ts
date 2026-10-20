// The second sample restaurant (HaChi Kyu, 132 dishes, built from the clickable prototype): the data itself, the seed script, the
// isolation between the two restaurants, the full order flow on the big menu, and the allergen answers checked dish by dish.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { call, noModel, ownerLogin, signOut, staffLogin } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { ALLERGENS, allergenName } from "@/modules/platform/constants";
import { splitIngredients, translationParts } from "@/modules/platform/ingredients";
import { GET as publicMenu } from "@/modules/diner/api/menu";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { POST as chat } from "@/modules/ai/api/chat";
import { GET as floor } from "@/modules/staff/api/floor";
import { GET as kitchen } from "@/modules/staff/api/kitchen";
import { POST as orderAction } from "@/modules/staff/api/orders";
import { GET as ownerItems } from "@/modules/owner/api/items";

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "scripts/seed-data/hachi-kyu.json"), "utf8"));
const node = ["--experimental-strip-types", "--no-warnings"];
const run = (script: string, env: Record<string, string>, args: string[] = []) => {
  const r = spawnSync(process.execPath, [...node, script, ...args], { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH!, NODE_ENV: "development", ...env } });
  return { code: r.status, out: r.stdout + r.stderr };
};
afterEach(() => { vi.unstubAllGlobals(); });

describe("the HaChi Kyu data", () => {
  it("has 132 dishes in 9 categories, each with a Thai and an English name and a whole, positive price", () => {
    expect(data.items.length).toBe(132);
    expect(data.categories.length).toBe(9);
    for (const i of data.items) { expect(i.name.en.length, JSON.stringify(i.name)).toBeGreaterThan(1); expect(i.name.th.length).toBeGreaterThan(1); expect(Number.isInteger(i.price) && i.price > 0, i.name.en).toBe(true); }
  });
  it("every dish is in a category that exists, and no two dishes share an English name", () => {
    const cats = new Set(data.categories.map((c: any) => c.key));
    expect(data.items.filter((i: any) => !cats.has(i.category))).toEqual([]);
    const names = data.items.map((i: any) => i.name.en);
    expect(new Set(names).size).toBe(names.length);
  });
  const details = path.join(root, "scripts/seed-data/dish-details");
  const COMP = JSON.parse(fs.readFileSync(path.join(details, "components.json"), "utf8"));
  const DETAILS: Record<string, any> = Object.assign({}, ...fs.readdirSync(details).filter((f) => f.endsWith(".json") && f !== "components.json").sort().map((f) => JSON.parse(fs.readFileSync(path.join(details, f), "utf8"))));
  const hasUnknownPart = (name: string) => DETAILS[name].parts.some((k: string) => COMP.components[k].unknown);

  it("every dish has researched details, and every detail belongs to a dish", () => {
    const names = data.items.map((i: any) => i.name.en);
    expect(names.filter((n: string) => !(n in DETAILS))).toEqual([]);
    expect(Object.keys(DETAILS).filter((n) => !names.includes(n))).toEqual([]);
  });
  it("every part a dish is made of exists, and every part says where its allergens come from, in a source that is listed", () => {
    for (const [name, det] of Object.entries(DETAILS) as [string, any][]) for (const k of det.parts) expect(COMP.components[k], `${name}: ${k}`).toBeTruthy();
    for (const [k, c] of Object.entries(COMP.components) as [string, any][]) {
      expect(Array.isArray(c.allergens), k).toBe(true);
      for (const a of c.allergens) expect(ALLERGENS as readonly string[], `${k}: ${a}`).toContain(a);
      expect(c.basis, `${k} has no basis`).toBeTruthy();
      for (const ref of String(c.basis).match(/\bS\d+\b/g) || []) expect(COMP.sources[ref], `${k}: ${ref}`).toBeTruthy();
      if (c.unknown) expect(c.allergens, k).toEqual([]);                                           // an unknown part claims nothing
    }
    for (const [id, text] of Object.entries(COMP.sources) as [string, string][]) expect(text.length, id).toBeGreaterThan(20);
  });
  it("allergens are real ones, listed once each; unknown (NULL) exactly when the dish has a part nobody knows the content of", () => {
    for (const i of data.items) {
      if (hasUnknownPart(i.name.en)) { expect(i.allergens, `${i.name.en} has an unknown part: its allergens must be 'not provided'`).toBeNull(); continue; }
      expect(Array.isArray(i.allergens), i.name.en).toBe(true);
      expect(new Set(i.allergens).size).toBe(i.allergens.length);
      for (const a of i.allergens) expect(ALLERGENS as readonly string[], `${i.name.en}: ${a}`).toContain(a);
    }
    const nulls = data.items.filter((i: any) => i.allergens === null).length;
    expect(nulls).toBeGreaterThan(20);
    expect(nulls).toBeLessThan(60);
  });
  it("a dish's allergens are exactly the union of its parts' allergens (nothing added by hand, nothing dropped)", () => {
    for (const i of data.items) {
      if (i.allergens === null) continue;
      const want = new Set<string>(DETAILS[i.name.en].parts.flatMap((k: string) => COMP.components[k].allergens));
      expect([...i.allergens].sort(), i.name.en).toEqual([...want].sort());
    }
  });
  it("an empty allergen list (a claim of 'none') is only on dishes whose every part is known and plain: rice, fries, lettuce, the drinks and the plain sea urchin nigiri", () => {
    const empty = data.items.filter((i: any) => Array.isArray(i.allergens) && i.allergens.length === 0).map((i: any) => i.name.en);
    expect(empty.sort()).toEqual(["Coca-Cola Original", "Coca-Cola Zero Sugar", "French Fries", "Japanese Rice", "Lettuce", "Red Soda", "Sea Urchin Roe Sushi", "Sprite"].sort());
  });
  it("crustaceans and molluscs are separate allergens (the prototype lumped them together)", () => {
    const shrimp = data.items.find((i: any) => i.name.en === "Giant Sweet Shrimp Sashimi");
    expect(shrimp.allergens).toContain("shellfish");
    expect(shrimp.allergens).not.toContain("molluscs");
    const molluscs = data.items.filter((i: any) => (i.allergens || []).includes("molluscs"));
    expect(molluscs.length).toBeGreaterThan(5);
    for (const m of molluscs) expect(m.ingredients.toLowerCase(), m.name.en).toMatch(/scallop|squid|octopus|clam|oyster/);
  });
  it("a listed allergen is backed by an ingredient word (nothing is invented), and an obvious one is never missed", () => {
    const BACK: Record<string, RegExp> = {
      fish: /salmon|tuna|mackerel|yellowtail|eel|crab stick|roe|fish|stingray|dashi|kimchi|yakisoba sauce|bonito|tobiko|tamago/i,
      shellfish: /shrimp|crab|kimchi|ebiko/i, molluscs: /scallop|squid|octopus|clam|oyster/i,
      egg: /egg|mayonnaise|tempura batter|breadcrumb|crab stick|omelette|batter/i, milk: /cheese/i,
      gluten: /soy sauce|teriyaki|kabayaki|tempura|noodles|wrapper|flour|batter|breadcrumb|gochujang|crab stick|oyster sauce|sauce|marinade|salmon roe|seaweed salad|omelette/i,
      soy: /soy|miso|tofu|edamame|teriyaki|kabayaki|gochujang|oyster sauce|yakisoba sauce|takoyaki sauce|salmon roe|omelette|grill sauce|marinade|seaweed salad/i,
      sesame: /sesame|seaweed salad/i, mustard: /wasabi/i,
    };
    for (const i of data.items) {
      for (const a of i.allergens || []) expect(i.ingredients, `${i.name.en} lists ${a}`).toMatch(BACK[a]);
      if (i.allergens !== null && /salmon|tuna/i.test(i.ingredients)) expect(i.allergens, i.name.en).toContain("fish");
      if (i.allergens !== null && /shrimp|crab/i.test(i.ingredients)) expect(i.allergens, i.name.en).toContain("shellfish");
      if (i.allergens !== null && /\bsoy sauce\b|teriyaki|kabayaki/i.test(i.ingredients)) expect(i.allergens, `${i.name.en}: soy sauce means soy and wheat`).toEqual(expect.arrayContaining(["soy", "gluten"]));
    }
  });
  it("tags: pork only when pork or bacon is in the dish, spicy only with a spice level, vegetarian only for plain things; never vegan", () => {
    const PLAIN = ["Coca-Cola Original", "Coca-Cola Zero Sugar", "Edamame", "French Fries", "Japanese Rice", "Lettuce", "Red Soda", "Sprite"];
    for (const i of data.items) {
      expect(i.tags.filter((t: string) => !["contains_pork", "spicy", "vegetarian"].includes(t)), i.name.en).toEqual([]);
      expect(i.tags.includes("contains_pork"), i.name.en).toBe(/pork|bacon/i.test(i.ingredients));
      expect(i.spice, i.name.en).toBe(i.tags.includes("spicy") ? 2 : 0);
      expect(i.tags.includes("vegetarian"), i.name.en).toBe(PLAIN.includes(i.name.en));
    }
  });
  it("every dish has an English and a Thai description of one or two sentences; a dish with a house sauce or an unknown part says so, and none says 'safe'", () => {
    for (const i of data.items) {
      expect(i.desc.en.length, i.name.en).toBeGreaterThan(15);
      expect(i.desc.en.length, i.name.en).toBeLessThan(260);
      expect(i.desc.th, i.name.en).toMatch(/[฀-๿]/);
      expect(`${i.desc.en} ${i.desc.th}`, i.name.en).not.toMatch(/\b(safe|allergy-free|guarantee)/i);
      if (DETAILS[i.name.en].parts.includes("unknownpart") || DETAILS[i.name.en].parts.some((k: string) => /sauce$/.test(k) && COMP.components[k].unknown)) expect(i.desc.en, i.name.en).toMatch(/not listed|not known|own|ask the staff|house|recipe/i);
    }
  });
  it("Burmese dish names use only words that are certain (the format words, the prototype's own ingredient words) or the English name in Latin letters", () => {
    for (const i of data.items) {
      if (!i.name.my) continue;
      expect(i.name.my, i.name.en).toMatch(/[က-႟]/);
      for (const word of i.name.my.split(/\s+/)) if (/[A-Za-z]/.test(word)) expect(word, `${i.name.en}: ${word}`).toMatch(/^[A-Za-z()'&-]+$/);       // a Latin word stays whole, never half Burmese half Latin
    }
    expect(data.items.filter((i: any) => i.name.my).length).toBeGreaterThan(40);
  });
  it("every dish has its ingredients in Thai too, one name per English ingredient (brackets keep their commas), and Burmese where it is known (an empty part = not translated)", () => {
    let burmese = 0;
    for (const i of data.items) {
      const en = splitIngredients(i.ingredients);
      if (!i.ingredients) { expect(i.ingredients_tr, i.name.en).toEqual({ th: "", my: "" }); continue; }            // a dish with no ingredient list has no translated one either
      const th = translationParts(i.ingredients_tr.th);
      expect(th.length, `${i.name.en}: Thai parts vs English`).toBe(en.length);
      expect(th.every(Boolean), `${i.name.en}: a Thai name is missing`).toBe(true);
      if (i.ingredients_tr.my) { burmese++; const my = translationParts(i.ingredients_tr.my); expect(my.length, `${i.name.en}: Burmese parts vs English`).toBe(en.length); expect(my.some(Boolean), i.name.en).toBe(true); }
    }
    expect(burmese).toBeGreaterThan(60);
    const yaki = data.items.find((i: any) => i.name.en === "[Coke Combo] Yakisoba with Coke");
    expect(yaki.ingredients).toBe("Yakisoba noodles (wheat), Pork, Cabbage, Yakisoba sauce (soy sauce, Worcestershire-style), Cola");
    expect(yaki.ingredients_tr.th).toBe("เส้นยากิโซบะ (แป้งสาลี), หมู, กะหล่ำปลี, ซอสยากิโซบะ, น้ำอัดลมโคล่า");
    expect(yaki.ingredients_tr.my).toBe("ခေါက်ဆွဲ, ဝက်သား, , , ");                                // Burmese names for noodles and pork; the sauce and the cola have none yet
  });
  it("the file is exactly what the generator builds from prototype/data.js and the researched details", () => {
    const r = run("scripts/make-hachi-kyu-seed.mts", {}, ["--check"]);
    expect(r.out).toContain("up to date");
    expect(r.code).toBe(0);
  });
  it("says in an FAQ that the ingredients and allergens are the usual ones, not the kitchen's, so the AI never presents them as confirmed", () => {
    expect(data.faq.some((f: any) => /not yet/i.test(f.a) && /not the kitchen's own recipes/i.test(f.a) && /allerg/i.test(f.q))).toBe(true);
  });
});

describe("scripts/seed-hachi-kyu.mts", () => {
  const dirs: string[] = [];
  const seed = (env: Record<string, string> = {}, dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-hachi-"))) => { dirs.push(dir); return { dir, ...run("scripts/seed-hachi-kyu.mts", { DATA_DIR: dir, ...env }) }; };
  const sql = async (dir: string, q: string) => { const { DatabaseSync } = await import("node:sqlite"); const d = new DatabaseSync(path.join(dir, "shop.db")); try { return d.prepare(q).all() as any[]; } finally { d.close(); } };
  afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

  it("adds the restaurant beside the first one, with 132 dishes, 2 staff and its own owner", async () => {
    const r = seed();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("/r/hachi-kyu");
    expect((await sql(r.dir, "SELECT slug FROM restaurants ORDER BY id")).map((x) => x.slug)).toEqual(["golden-lotus", "hachi-kyu"]);
    const rid = (await sql(r.dir, "SELECT id FROM restaurants WHERE slug='hachi-kyu'"))[0].id;
    expect((await sql(r.dir, `SELECT COUNT(*) n FROM menu_items WHERE restaurant_id=${rid}`))[0].n).toBe(132);
    expect((await sql(r.dir, `SELECT COUNT(*) n FROM staff WHERE restaurant_id=${rid}`))[0].n).toBe(2);
    expect((await sql(r.dir, "SELECT COUNT(DISTINCT owner_id) n FROM restaurants"))[0].n).toBe(2);
  });
  it("stores NULL where a dish has a part nobody knows, a list where it is known, and the description and the Burmese name", async () => {
    const r = seed();
    const rows = await sql(r.dir, "SELECT name_en, name_my, desc_en, desc_th, allergens_json, spice, tags_json FROM menu_items WHERE restaurant_id=(SELECT id FROM restaurants WHERE slug='hachi-kyu')");
    expect(rows.find((x) => x.name_en === "Salmon Sashimi")).toMatchObject({ allergens_json: '["fish"]', name_my: "ဆော်လမွန် ဆာရှီမီ", desc_en: "Slices of raw salmon, served on their own.", desc_th: "แซลม่อนสดหั่นเป็นชิ้นพอดีคำ เสิร์ฟเปล่า ๆ" });
    expect(rows.find((x) => x.name_en === "[Coke Combo] Garlic Fried Rice with Coke")!.allergens_json).toBeNull();
    expect(rows.find((x) => x.name_en === "Japanese Rice")!.allergens_json).toBe("[]");
    expect(rows.find((x) => x.name_en === "Yakisoba")).toMatchObject({ allergens_json: '["gluten","fish","soy"]', tags_json: '["contains_pork"]' });
    expect(rows.find((x) => x.name_en === "Kimchi")).toMatchObject({ spice: 2, tags_json: '["spicy"]' });
    expect(rows.every((x) => x.desc_en && x.desc_th)).toBe(true);
  });
  it("is safe to run twice, and leaves the first restaurant untouched", async () => {
    const r = seed();
    const before = await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id=(SELECT id FROM restaurants WHERE slug='golden-lotus')");
    const again = seed({}, r.dir);
    expect(again.code).toBe(0);
    expect(again.out).toMatch(/already exists/);
    expect((await sql(r.dir, "SELECT COUNT(*) n FROM restaurants"))[0].n).toBe(2);
    expect(await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id=(SELECT id FROM restaurants WHERE slug='golden-lotus')")).toEqual(before);
  });
  it("stores the Thai and Burmese ingredient lines with each dish", async () => {
    const r = seed();
    const row = (await sql(r.dir, "SELECT ingredients, ingredients_th, ingredients_my FROM menu_items WHERE name_en = '[Coke Combo] Yakisoba with Coke'"))[0];
    expect(row).toEqual({ ingredients: "Yakisoba noodles (wheat), Pork, Cabbage, Yakisoba sauce (soy sauce, Worcestershire-style), Cola", ingredients_th: "เส้นยากิโซบะ (แป้งสาลี), หมู, กะหล่ำปลี, ซอสยากิโซบะ, น้ำอัดลมโคล่า", ingredients_my: "ခေါက်ဆွဲ, ဝက်သား, , , " });
    const written = data.items.filter((i: any) => i.ingredients).length;                         // 6 dishes have no ingredient list at all
    expect(written).toBe(126);
    expect((await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE ingredients_th <> '' AND restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hachi-kyu')"))[0].n).toBe(written);
  });
  it("on a restaurant seeded before the translations existed, a second run fills them in, and keeps an owner's own line", async () => {
    const r = seed();
    const { DatabaseSync } = await import("node:sqlite");
    const d = new DatabaseSync(path.join(r.dir, "shop.db"));
    d.exec("UPDATE menu_items SET ingredients_th = '', ingredients_my = '' WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hachi-kyu')");
    d.exec("UPDATE menu_items SET ingredients_th = 'เส้น, น้ำ' WHERE name_en = '[Coke Combo] Yakisoba with Coke'");     // the owner already wrote this one
    d.close();
    const again = seed({}, r.dir);
    expect(again.out).toMatch(/added the Thai and Burmese ingredient names to 125 dishes/);                 // 126 with a list, minus the one the owner wrote
    const rows = await sql(r.dir, "SELECT name_en, ingredients_th FROM menu_items WHERE name_en IN ('[Coke Combo] Yakisoba with Coke', 'Tuna Sashimi')");
    expect(rows.find((x) => x.name_en.startsWith("[Coke"))!.ingredients_th).toBe("เส้น, น้ำ");
    expect(rows.find((x) => x.name_en === "Tuna Sashimi")!.ingredients_th).toBe("ทูน่า");
    expect(seed({}, r.dir).out).toMatch(/nothing to seed/);                                      // and a third run changes nothing
  });
  it("leaves the photo links out unless SEED_HACHI_PHOTOS=1 (a diner's phone would otherwise fetch them from another site)", async () => {
    const a = seed();
    expect((await sql(a.dir, "SELECT COUNT(*) n FROM menu_items WHERE photo_url <> ''"))[0].n).toBe(0);
    const b = seed({ SEED_HACHI_PHOTOS: "1" });
    expect((await sql(b.dir, "SELECT COUNT(*) n FROM menu_items WHERE photo_url LIKE 'https://%'"))[0].n).toBe(132);
  });
  describe("--into: the same dishes on an existing restaurant's menu", () => {
    const into = (dir: string, slugArg: string[] = ["golden-lotus"], env: Record<string, string> = {}) => ({ dir, ...run("scripts/seed-hachi-kyu.mts", { DATA_DIR: dir, ...env }, ["--into", ...slugArg]) });
    const fresh = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-into-")); dirs.push(dir); return dir; };
    it("adds the 132 dishes and the categories Golden Lotus does not have, without a new restaurant, owner or staff", async () => {
      const r = into(fresh());
      expect(r.code, r.out).toBe(0);
      expect(r.out).toContain('Added 132 dishes and 8 categories to "Golden Lotus Kitchen" (/r/golden-lotus).');
      expect((await sql(r.dir, "SELECT slug FROM restaurants")).map((x) => x.slug)).toEqual(["golden-lotus"]);
      expect((await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id = 1"))[0].n).toBe(145);
      expect((await sql(r.dir, "SELECT COUNT(*) n FROM users"))[0].n).toBe(1);
      expect((await sql(r.dir, "SELECT COUNT(*) n FROM staff"))[0].n).toBe(2);
    });
    it("shares a category with the same English name (Drinks), puts the new ones after the old, and leaves the old dishes as they were", async () => {
      const r = into(fresh());
      const cats = (await sql(r.dir, "SELECT name_en FROM categories WHERE restaurant_id = 1 ORDER BY sort")).map((x) => x.name_en);
      expect(cats.slice(0, 6)).toEqual(["Starters", "Mains", "Curries", "Salads", "Desserts", "Drinks"]);
      expect(cats.filter((c) => c === "Drinks")).toHaveLength(1);
      expect(cats.slice(6)).toEqual(["Sets & Combos", "Sashimi", "Sushi", "Appetizers", "Grilled Skewers", "Rice & Don", "Noodles", "Soup"]);
      const drinks = (await sql(r.dir, "SELECT i.name_en FROM menu_items i JOIN categories c ON c.id = i.category_id WHERE c.name_en = 'Drinks' ORDER BY i.sort")).map((x) => x.name_en);
      expect(drinks[0]).toBe("Thai Iced Tea");                                                              // the old drink, then the new ones
      expect(drinks.length).toBeGreaterThan(3);
      const old = await sql(r.dir, "SELECT name_en, price, ingredients_th FROM menu_items WHERE name_en = 'Shrimp Pad Thai'");
      expect(old).toEqual([{ name_en: "Shrimp Pad Thai", price: 120, ingredients_th: "เส้นผัดไทย, กุ้ง, ไข่, น้ำมะขาม, น้ำปลา, ถั่วลิสงบด" }]);
      const sorts = (await sql(r.dir, "SELECT sort FROM menu_items WHERE restaurant_id = 1 ORDER BY id")).map((x) => x.sort);
      expect(sorts).toEqual([...sorts].sort((a, b) => a - b));                                                  // the new dishes come after the old ones
      expect(new Set(sorts).size).toBe(145);
    });
    it("carries the Thai and Burmese ingredient lines and the allergen estimates, and the photo links only with SEED_HACHI_PHOTOS=1", async () => {
      const a = into(fresh());
      expect((await sql(a.dir, "SELECT COUNT(*) n FROM menu_items WHERE photo_url <> ''"))[0].n).toBe(0);
      const row = (await sql(a.dir, "SELECT ingredients_th, ingredients_my, allergens_json FROM menu_items WHERE name_en = 'Tuna Sashimi'"))[0];
      expect(row).toEqual({ ingredients_th: "ทูน่า", ingredients_my: "တူနာ", allergens_json: '["fish"]' });
      const b = into(fresh(), ["golden-lotus"], { SEED_HACHI_PHOTOS: "1" });
      expect((await sql(b.dir, "SELECT COUNT(*) n FROM menu_items WHERE photo_url LIKE 'https://%'"))[0].n).toBe(132);
    });
    it("adds the FAQ that says the ingredients and allergens are the usual ones, once only, in place of an older wording of it", async () => {
      const r = into(fresh());
      const { DatabaseSync } = await import("node:sqlite");
      const d = new DatabaseSync(path.join(r.dir, "shop.db"));
      d.exec("INSERT INTO faqs (restaurant_id, q, a, sort) VALUES (1, 'Are the allergen details of the sushi and grill dishes confirmed by the kitchen?', 'old', 9)");
      d.exec("DELETE FROM menu_items WHERE name_en = 'Tuna Sashimi'");
      d.close();
      into(r.dir);                                                                                      // adds the one dish back, so the FAQ step runs again
      const faqs = await sql(r.dir, "SELECT q, a FROM faqs WHERE restaurant_id = 1 AND q LIKE '%allergen%'");
      expect(faqs.map((f) => f.q)).toEqual(["Are the ingredients and allergens confirmed by the kitchen?"]);
      expect(faqs[0].a).toMatch(/not the kitchen's own recipes/);
      expect((await sql(r.dir, "SELECT COUNT(*) n FROM faqs WHERE restaurant_id = 1 AND q LIKE 'Do you serve raw fish%'"))[0].n).toBe(1);
      expect((await sql(r.dir, "SELECT COUNT(*) n FROM faqs WHERE restaurant_id = 1 AND q LIKE '%Wi-Fi%'"))[0].n).toBe(1);     // the restaurant's own FAQs stay
    });
    it("is safe to run twice: the second run adds nothing", async () => {
      const r = into(fresh());
      const again = into(r.dir);
      expect(again.code).toBe(0);
      expect(again.out).toContain("already has these dishes: nothing to add");
      expect((await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id = 1"))[0].n).toBe(145);
      expect((await sql(r.dir, "SELECT COUNT(*) n FROM categories WHERE restaurant_id = 1"))[0].n).toBe(14);
    });
    it("only adds the dishes the restaurant does not have yet (same English name)", async () => {
      const dir = fresh();
      const first = into(dir);
      expect(first.code).toBe(0);
      const { DatabaseSync } = await import("node:sqlite");
      const d = new DatabaseSync(path.join(dir, "shop.db"));
      d.exec("DELETE FROM menu_items WHERE name_en IN ('Tuna Sashimi', 'Salmon Sashimi')");
      d.close();
      expect(into(dir).out).toContain("Added 2 dishes and 0 categories");
    });
    it("refuses a restaurant that does not exist and a missing code, and changes nothing", async () => {
      const dir = fresh();
      expect(into(dir, ["nowhere"]).out).toMatch(/not one/);
      expect(into(dir, ["nowhere"]).code).toBe(1);
      expect(into(dir, []).code).toBe(1);
      expect(into(dir, ["--other"]).code).toBe(1);
      expect((await sql(dir, "SELECT COUNT(*) n FROM menu_items"))[0].n).toBe(13);
    });
    describe("--replace", () => {
      it("removes every dish and category the restaurant had and leaves exactly these 132 dishes in the 9 categories", async () => {
        const dir = fresh();
        const r = into(dir, ["golden-lotus", "--replace"]);
        expect(r.code, r.out).toBe(0);
        expect(r.out).toContain('Replaced the 13 dishes of "Golden Lotus Kitchen" (/r/golden-lotus) with 132 dishes in 9 categories.');
        expect((await sql(dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id = 1"))[0].n).toBe(132);
        expect((await sql(dir, "SELECT name_en FROM menu_items WHERE name_en IN ('Shrimp Pad Thai', 'Tom Yum Goong', 'Papaya Salad')")).length).toBe(0);
        expect((await sql(dir, "SELECT name_en FROM categories WHERE restaurant_id = 1 ORDER BY sort")).map((c) => c.name_en)).toEqual(data.categories.map((c: any) => c.en));
        expect((await sql(dir, "SELECT COUNT(*) n FROM menu_items WHERE category_id IS NULL"))[0].n).toBe(0);
      });
      it("keeps the restaurant's FAQs, staff, owner and orders, and an order line keeps its dish's name and price", async () => {
        const dir = fresh();
        expect(into(dir).code).toBe(0);                                                                  // makes the database (with the demo menu) first
        const { DatabaseSync } = await import("node:sqlite");
        const d = new DatabaseSync(path.join(dir, "shop.db"));
        d.exec("INSERT INTO orders (restaurant_id, table_no, status, lang) VALUES (1, '4', 'new', 'en')");
        const oid = (d.prepare("SELECT id FROM orders").get() as any).id;
        d.exec(`INSERT INTO order_items (order_id, item_id, name, qty, price) VALUES (${oid}, 1, 'Shrimp Pad Thai', 2, 120)`);
        d.close();
        expect(into(dir, ["golden-lotus", "--replace"]).code).toBe(0);
        expect(await sql(dir, "SELECT name, qty, price FROM order_items")).toEqual([{ name: "Shrimp Pad Thai", qty: 2, price: 120 }]);
        expect((await sql(dir, "SELECT COUNT(*) n FROM orders"))[0].n).toBe(1);
        expect((await sql(dir, "SELECT COUNT(*) n FROM staff"))[0].n).toBe(2);
        expect((await sql(dir, "SELECT COUNT(*) n FROM users"))[0].n).toBe(1);
        expect((await sql(dir, "SELECT COUNT(*) n FROM faqs WHERE restaurant_id = 1 AND q LIKE '%Wi-Fi%'"))[0].n).toBe(1);
      });
      it("is safe to run twice: the second run replaces the same dishes with the same dishes, and a dish's new id is never one an old order line points at", async () => {
        const dir = fresh();
        into(dir, ["golden-lotus", "--replace"]);
        const firstMax = (await sql(dir, "SELECT MAX(id) m FROM menu_items"))[0].m;
        const again = into(dir, ["golden-lotus", "--replace"]);
        expect(again.out).toContain("Replaced the 132 dishes");
        expect((await sql(dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id = 1"))[0].n).toBe(132);
        expect((await sql(dir, "SELECT MIN(id) m FROM menu_items"))[0].m).toBeGreaterThan(firstMax);          // ids are not reused (an order line of the old dishes cannot point at a new dish)
      });
      it("on a restaurant other than the first it touches only that one", async () => {
        const dir = fresh();
        expect(seed({}, dir).code).toBe(0);
        const r = into(dir, ["hachi-kyu", "--replace"]);
        expect(r.out).toContain('Replaced the 132 dishes of "HaChi Kyu"');
        expect((await sql(dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id = 1"))[0].n).toBe(13);
        expect((await sql(dir, "SELECT name_en FROM menu_items WHERE restaurant_id = 1 ORDER BY id LIMIT 1"))[0].name_en).toBe("Shrimp Pad Thai");
      });
      it("without --replace nothing is removed", async () => {
        const dir = fresh();
        into(dir);
        expect((await sql(dir, "SELECT COUNT(*) n FROM menu_items WHERE name_en = 'Shrimp Pad Thai'"))[0].n).toBe(1);
      });
    });
    it("works on the HaChi Kyu restaurant itself without duplicating (all its dishes are already there)", async () => {
      const r = seed();
      expect(into(r.dir, ["hachi-kyu"]).out).toContain("nothing to add");
    });
  });
  it("production: refuses the public demo logins, and generates its own when none are given", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-hachi-prod-"));
    dirs.push(dir);
    // the first restaurant needs an owner in production: create it the way a deployment does
    expect(run("scripts/seed.mts", { DATA_DIR: dir, NODE_ENV: "production", SEED_OWNER_PASSWORD: "a-long-password-1", SEED_WAITER_PIN: "4821", SEED_CHEF_PIN: "7390" }).code).toBe(0);
    const bad = run("scripts/seed-hachi-kyu.mts", { DATA_DIR: dir, NODE_ENV: "production", SEED_HACHI_OWNER_PASSWORD: "demo1234", SEED_HACHI_WAITER_PIN: "4444", SEED_HACHI_CHEF_PIN: "5555" });
    expect(bad.code).toBe(1);
    expect(bad.out).toMatch(/Refusing to use the public demo logins/);
    const ok = run("scripts/seed-hachi-kyu.mts", { DATA_DIR: dir, NODE_ENV: "production" });
    expect(ok.code, ok.out).toBe(0);
    expect(ok.out).toMatch(/These were generated for you/);
    expect(ok.out).not.toMatch(/demo1234|PIN 1111|PIN 2222/);
  });
  it("refuses bad PINs and short passwords, and an owner email that already exists", () => {
    expect(seed({ SEED_HACHI_WAITER_PIN: "12" }).out).toMatch(/4 to 8 digits/);
    expect(seed({ SEED_HACHI_WAITER_PIN: "1234", SEED_HACHI_CHEF_PIN: "1234" }).out).toMatch(/must be different/);
    expect(seed({ SEED_HACHI_OWNER_PASSWORD: "short" }).out).toMatch(/at least 8/);
    const r = seed();
    fs.rmSync(path.join(r.dir, "shop.db"), { force: true });   // a fresh database again, but with the owner of the demo restaurant as the email:
    expect(seed({ SEED_HACHI_OWNER_EMAIL: "demo@shop.ai" }, r.dir).out).toMatch(/already an owner/);
  });
});

// ---- the rest runs against the test database with HaChi Kyu added ----
const hachi = "hachi-kyu";
beforeAll(() => {
  const r = run("scripts/seed-hachi-kyu.mts", { DATA_DIR: process.env.DATA_DIR! });
  if (r.code !== 0) throw new Error(r.out);
});

describe("two restaurants in one database stay apart", () => {
  it("the public menu of each shows only its own dishes", async () => {
    signOut();
    const h = await call(publicMenu, { params: { slug: hachi }, url: `http://t/api/public/${hachi}/menu` });
    const g = await call(publicMenu, { params: { slug: "golden-lotus" }, url: "http://t/api/public/golden-lotus/menu" });
    expect(h.status).toBe(200);
    expect(h.data.restaurant.name).toBe("HaChi Kyu");
    expect(h.data.items.length).toBe(132);
    expect(h.data.categories.length).toBe(9);
    expect(g.data.items.length).toBeLessThan(20);
    expect(g.data.items.some((i: any) => /Sashimi/.test(i.name.en))).toBe(false);
    expect(h.data.items.some((i: any) => /Pad Thai/.test(i.name.en))).toBe(false);
  });
  it("a PIN opens only its own restaurant: the same PIN 1111 is a different waiter in each", async () => {
    const a = await staffLogin("1111", hachi);
    const b = await staffLogin("1111", "golden-lotus");
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    expect((await staffLogin("1111", "no-such-place")).status).toBeGreaterThanOrEqual(400);
  });
  it("an owner sees only their own dishes; the other owner's login does not work on the first one's data", async () => {
    await ownerLogin("hachi@shop.ai", "demo1234");
    const mine = await call(ownerItems);
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.data)).toContain("Salmon Sashimi");
    expect(JSON.stringify(mine.data)).not.toContain("Pad Thai");
    await ownerLogin("demo@shop.ai", "demo1234");
    expect(JSON.stringify((await call(ownerItems)).data)).not.toContain("Salmon Sashimi");
  });
});

describe("the HaChi Kyu ingredients in the diner's language", () => {
  const askIn = async (message: string, lang: string) => { noModel(); signOut(); return (await call(chat, { method: "POST", params: { slug: hachi }, body: { message, sessionId: `hk-i-${lang}-${Math.random()}`, table: "3", lang } })).data; };
  it("the public menu carries the translated lines next to the English one", async () => {
    signOut();
    const m = await call(publicMenu, { params: { slug: hachi }, url: `http://t/api/public/${hachi}/menu` });
    const yaki = m.data.items.find((i: any) => i.name.en === "[Coke Combo] Yakisoba with Coke");
    expect(yaki.ingredients_tr).toEqual({ th: "เส้นยากิโซบะ (แป้งสาลี), หมู, กะหล่ำปลี, ซอสยากิโซบะ, น้ำอัดลมโคล่า", my: "ခေါက်ဆွဲ, ဝက်သား, , , " });
  });
  it("asked in Thai, the AI lists the Thai ingredient names", async () => {
    const r = await askIn("Tuna Sashimi ส่วนผสมมีอะไรบ้าง", "th");
    expect(r.ingredients).toEqual(["ทูน่า"]);
    expect(r.reply).toContain("ทูน่า");
    expect(r.reply).not.toContain("Tuna,");
  });
  it("asked in Burmese, the AI uses the Burmese names it has and the English name for the one it has not", async () => {
    const r = await askIn("Eel Sushi ပါဝင်ပစ္စည်း ဘာတွေလဲ", "my");
    expect(r.ingredients).toEqual(["စူရှီထမင်း", "Grilled eel (unagi)", "Kabayaki eel sauce (soy sauce, mirin, sugar)"]);
    expect(r.lead).toMatch(/ဖြစ်ပါတယ်ခင်ဗျာ။$/);
  });
  it("asked in English, nothing changes", async () => {
    const r = await askIn("What is in the Eel Sushi?", "en");
    expect(r.reply).toBe("Eel Sushi is made with: Sushi rice (vinegar, sugar, salt), Grilled eel (unagi), Kabayaki eel sauce (soy sauce, mirin, sugar).");
    expect(r.ingredients).toEqual(["Sushi rice (vinegar, sugar, salt)", "Grilled eel (unagi)", "Kabayaki eel sauce (soy sauce, mirin, sugar)"]);        // the commas inside the brackets do not split an ingredient
  });
});

describe("a diner orders from the big menu and the HaChi Kyu staff cook it (the full flow, 132 dishes)", () => {
  it("picks go to the waiter of that restaurant only; the kitchen cooks, the waiter serves", async () => {
    noModel();
    signOut();
    const menu = await call(publicMenu, { params: { slug: hachi }, url: `http://t/api/public/${hachi}/menu` });
    const dish = (n: string) => menu.data.items.find((i: any) => i.name.en === n);
    const sashimi = dish("Salmon Sashimi"), sushi = dish("Salmon Sushi");
    // the diner tells the AI about an allergy; the order then carries it to the waiter (the allergy comes from the chat session, not the order)
    const sid = "hk-flow-1";
    expect((await call(chat, { method: "POST", params: { slug: hachi }, body: { message: "I'm allergic to shellfish", sessionId: sid, table: "7", lang: "en" } })).status).toBe(200);
    const order = await call(placeOrder, { method: "POST", params: { slug: hachi }, body: { table: "7", lang: "en", sessionId: sid, items: [{ id: sashimi.id, qty: 2 }, { id: sushi.id, qty: 1 }] } });
    expect(order.status, JSON.stringify(order.data)).toBeLessThan(300);

    await staffLogin("1111", "golden-lotus");
    expect(JSON.stringify((await call(floor)).data)).not.toContain("Salmon");      // the other restaurant's waiter never sees it

    await staffLogin("1111", hachi);
    const f = await call(floor);
    expect(f.status, JSON.stringify(f.data)).toBe(200);
    const pick = f.data.picks.find((p: any) => p.table === "7");
    expect(pick, JSON.stringify(f.data.picks)).toBeTruthy();
    expect(pick.items.reduce((s: number, i: any) => s + i.qty, 0)).toBe(3);
    expect(pick.allergy).toBe("shellfish");
    expect((await call(orderAction, { method: "POST", params: { id: String(pick.id) }, body: { action: "take" } })).status).toBe(200);

    await staffLogin("2222", hachi, "chef");
    const k = await call(kitchen);
    expect(k.data.tickets.new.some((t: any) => t.id === pick.id)).toBe(true);
    for (const action of ["cooking", "ready"]) expect((await call(orderAction, { method: "POST", params: { id: String(pick.id) }, body: { action } })).status, action).toBe(200);

    await staffLogin("1111", hachi);
    expect((await call(orderAction, { method: "POST", params: { id: String(pick.id) }, body: { action: "served" } })).status).toBe(200);
  });
  it("an allergy question over the chat endpoint is answered from the data, without the model", async () => {
    const calls = noModel();
    signOut();
    const r = await call(chat, { method: "POST", params: { slug: hachi }, body: { message: "Is the Salmon Sashimi OK? I'm allergic to fish", sessionId: "hk-1", table: "7", lang: "en" } });
    expect(r.status).toBe(200);
    expect(r.data.reply).toMatch(/fish/i);
    expect(r.data.reply).toMatch(/confirm with the staff/i);
    expect(calls.length).toBe(0);
  });
});

describe("the allergen answers equal the data, for every HaChi Kyu dish and every allergen (the oracle)", () => {
  const WORD: Record<string, string> = { peanut: "peanuts", tree_nut: "almonds", shellfish: "shellfish", molluscs: "squid", fish: "fish", egg: "egg", milk: "milk", soy: "soy", gluten: "gluten", sesame: "sesame", celery: "celery", mustard: "mustard", sulphites: "sulphites", lupin: "lupin" };
  const staffLine = /confirm with the staff/i, notProvided = /not provided/i;
  const UNSAFE = /\bis safe\b|\bsafe to eat\b|\ballergen[- ]free\b|\bno allergens\b(?! listed)|\bguarantee/i;

  async function ctx() {
    const { restaurantBySlug, itemsOf, faqsOf, specialsOf } = await import("@/modules/platform/menu");
    const r = restaurantBySlug(hachi)!;
    return { restaurant: r, items: itemsOf(r.id), faqs: faqsOf(r.id) as any[], specials: specialsOf(r.id) as any[], history: [] as any[] };
  }
  // dishes whose full name is also the start of another dish's name ("Salmon Sushi" / "Salmon Sushi Roll") cannot be told apart by a plain name match
  const ambiguous = (c: any, d: any) => c.items.some((o: any) => o !== d && (o.name.en.toLowerCase().includes(d.name.en.toLowerCase())));

  it("'I'm allergic to X. Can I eat <dish>?' names exactly the dish's listed allergens, or says 'not provided', and never calls the model", async () => {
    const c = await ctx();
    const wrong: string[] = [];
    let checked = 0;
    for (const d of c.items) {
      for (const a of Object.keys(WORD)) {
        const calls = noModel();
        const r = await answer(`I'm allergic to ${WORD[a]}. Can I eat the ${d.name.en}?`, "en", c as any);
        vi.unstubAllGlobals();
        checked++;
        const where = `[${d.name.en} | ${d.allergens === null ? "NULL" : d.allergens.join(",")} | ask ${a}] ${r.reply}`;
        if (calls.length) wrong.push(`went to the model: ${where}`);
        else if (UNSAFE.test(r.reply)) wrong.push(`unsafe wording: ${where}`);
        else if (!staffLine.test(r.reply)) wrong.push(`no staff line: ${where}`);
        else if (d.allergens === null) { if (!notProvided.test(r.reply)) wrong.push(`NULL not reported as unknown: ${where}`); }
        else {
          const rest = r.reply.toLowerCase().split(d.name.en.toLowerCase()).join(" ").replace(/please confirm with the staff/g, " ");
          for (const k of d.allergens) { if (!rest.includes(allergenName(k, "en").toLowerCase())) wrong.push(`missing ${k}: ${where}`); }
        }
      }
    }
    expect(checked).toBe(132 * 14);
    expect(wrong, `${wrong.length} wrong of ${checked}:\n${wrong.slice(0, 6).join("\n")}`).toEqual([]);
  });

  it("'Which dishes contain X?' lists every dish with X, and every dish with no data, on the 132-dish menu", async () => {
    const c = await ctx();
    const wrong: string[] = [];
    for (const a of Object.keys(WORD)) {
      const calls = noModel();
      const r = await answer(`Which dishes contain ${WORD[a]}?`, "en", c as any);
      vi.unstubAllGlobals();
      if (calls.length) { wrong.push(`went to the model for ${a}`); continue; }
      if (!staffLine.test(r.reply)) wrong.push(`${a}: no staff line`);
      const should = c.items.filter((d) => d.allergens === null || d.allergens.includes(a));
      for (const d of c.items) {
        if (ambiguous(c, d)) continue;
        if (should.includes(d) && !r.reply.includes(d.name.en)) wrong.push(`${a}: ${d.name.en} missing from the answer`);
        if (!should.includes(d) && r.reply.includes(d.name.en)) wrong.push(`${a}: ${d.name.en} wrongly listed`);
      }
    }
    expect(wrong, wrong.slice(0, 8).join("\n")).toEqual([]);
  });
});
