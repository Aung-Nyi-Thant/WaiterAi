// Builds scripts/seed-data/hachi-kyu.json (the HaChi Kyu sushi menu) from the clickable prototype's menu (prototype/data.js: names, prices,
// photos, categories) and the researched details in scripts/seed-data/dish-details/ (descriptions, what each dish is made of, Burmese names).
//
//   node --experimental-strip-types --no-warnings scripts/make-hachi-kyu-seed.mts         writes the file
//   ... --check                                                                           fails when the file is out of date
//
// Nobody publishes this restaurant's recipes, so the details describe each dish as it is usually made, from recipe and product-label
// sources (listed in dish-details/components.json). Ingredients and allergens are worked out from the parts a dish is made of: a dish's
// allergens are the union of its parts' allergens, and a dish with a part whose content is not known (a house sauce, a set, a dressing)
// is stored as "not provided" (NULL), never as "none" (docs/AI_SAFETY.md R3). See dish-details/README.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "seed-data", "hachi-kyu.json");
const win: any = {};
const src = fs.readFileSync(path.join(here, "..", "..", "prototype", "data.js"), "utf8");
// from the prototype: the menu rows (names, prices, categories, photos) and the categories; what each dish is made of comes from dish-details/
const { RAW, CATS } = new Function("window", `${src}\nreturn { RAW, CATS };`)(win) as { RAW: any[]; CATS: any[] };

const ORDER = ["gluten", "shellfish", "egg", "fish", "peanut", "soy", "milk", "tree_nut", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs"];
const SEPARATOR = /[,，、;；·•\n]/;           // what the app cuts an ingredient line at (outside brackets): no name may contain it, or the lines would fall out of step

// ---- the researched details
const detailsDir = path.join(here, "seed-data", "dish-details");
const COMP: Record<string, any> = JSON.parse(fs.readFileSync(path.join(detailsDir, "components.json"), "utf8")).components;
const DETAILS: Record<string, any> = {};
for (const f of fs.readdirSync(detailsDir).filter((x) => x.endsWith(".json") && x !== "components.json").sort()) {
  for (const [name, det] of Object.entries(JSON.parse(fs.readFileSync(path.join(detailsDir, f), "utf8")))) {
    if (name in DETAILS) throw new Error(`The dish "${name}" is described twice (${f}).`);
    DETAILS[name] = det;
  }
}
const topLevelSeparator = (name: string) => { let depth = 0; for (const c of name) { if (c === "(" || c === "（") depth++; else if (c === ")" || c === "）") depth = Math.max(0, depth - 1); else if (depth === 0 && SEPARATOR.test(c)) return true; } return false; };

const categories = CATS.filter((c: any) => c[0] !== "all" && c[0] !== "rec").map((c: any) => ({ key: c[0], th: c[2][0], en: c[2][1], my: c[2][2] }));
function describe(name: string) {
  const det = DETAILS[name];
  if (!det) throw new Error(`The dish "${name}" has no details in ${path.relative(process.cwd(), detailsDir)}.`);
  for (const k of det.parts) if (!COMP[k]) throw new Error(`${name}: unknown part "${k}".`);
  const known: string[] = det.parts.filter((k: string) => COMP[k].en);                  // a part with no name (unknownpart) only marks "not everything is listed"
  const unknown = det.parts.some((k: string) => COMP[k].unknown);
  const names = known.map((k) => COMP[k].en);
  for (const n of [...names, ...known.map((k) => COMP[k].th), ...known.map((k) => COMP[k].my)]) if (topLevelSeparator(n)) throw new Error(`${name}: the name "${n}" contains a separator: the translated lines would no longer line up.`);
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error(`${name}: two parts share an English name (${names.join(", ")}): the translated lines would no longer line up.`);
  const my = known.map((k) => COMP[k].my || "");
  const found = new Set<string>(known.flatMap((k) => COMP[k].allergens));
  const tags = new Set<string>(det.tags || []);
  if (known.some((k) => COMP[k].pork)) tags.add("contains_pork");
  if (known.length && !unknown && known.every((k) => COMP[k].vegetarian)) tags.add("vegetarian");
  return {
    name_my: det.name_my || "", desc: det.desc,
    ingredients: names.join(", "), ingredients_tr: { th: known.map((k) => COMP[k].th).join(", "), my: my.some(Boolean) ? my.join(", ") : "" },
    allergens: unknown ? null : [...found].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)),
    tags: [...tags], spice: det.spice || 0,
  };
}
const seen = new Set<string>();
const items = RAW.map(([th, en, price, cats, photo]: any[]) => {
  seen.add(en);
  const d = describe(en);
  return {
    category: cats.split(",")[0], name: { en, th, ...(d.name_my ? { my: d.name_my } : {}) }, price, desc: d.desc,
    ingredients: d.ingredients, ingredients_tr: d.ingredients_tr, allergens: d.allergens, tags: d.tags, spice: d.spice, photo,
  };
});
for (const name of Object.keys(DETAILS)) if (!seen.has(name)) throw new Error(`The details describe "${name}", which is not on the prototype's menu.`);

const data = {
  _note: "Generated by scripts/make-hachi-kyu-seed.mts from prototype/data.js and scripts/seed-data/dish-details/. Ingredients and allergens are those of each dish as it is usually made, from recipe and product-label sources: not this restaurant's own recipes, which are not public. A dish with a part whose content is unknown (a house sauce, a set, a dressing) is stored as 'not provided'. Photos are links to the source site and are only used when SEED_HACHI_PHOTOS=1.",
  restaurant: { name: "HaChi Kyu", slug: "hachi-kyu", currency: "THB", hours: { open: "11:00", close: "22:00", lastOrder: "22:00", closedDays: [] } },
  categories,
  items,
  faq: [
    { q: "Are the ingredients and allergens confirmed by the kitchen?", a: "Not yet. They are the usual ingredients and allergens of each dish, checked against recipe and product-label sources, not the kitchen's own recipes. Where a sauce, a dressing or a set is not listed, the allergens are shown as not provided. Please confirm any allergy with the staff before ordering." },
    { q: "Do you serve raw fish?", a: "Yes. Sashimi and many of our sushi are raw. Ask the staff if you are unsure." },
  ],
};
const text = `${JSON.stringify(data, null, 1)}\n`;
if (process.argv.includes("--check")) {
  // Windows checks files out with CRLF line endings: compare the content, not the line endings
  const same = fs.existsSync(out) && fs.readFileSync(out, "utf8").replace(/\r\n/g, "\n") === text;
  console.log(same ? "hachi-kyu.json is up to date" : "hachi-kyu.json is out of date: run scripts/make-hachi-kyu-seed.mts");
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(out, text);
const nul = items.filter((i: any) => i.allergens === null).length;
console.log(`Wrote ${path.relative(process.cwd(), out)}: ${items.length} dishes in ${categories.length} categories; ${items.length - nul} with estimated allergens, ${nul} stored as "not provided".`);
