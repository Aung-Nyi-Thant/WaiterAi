import { ALLERGENS } from "@/modules/platform/constants";

type Lang = "en" | "th" | "my";

// The owner types ingredients as one line ("rice noodles, shrimp, egg"). The diner screen shows them one by one, so the line is cut
// at commas (also the Thai/Chinese ones), semicolons, line breaks and middle dots, but not inside brackets; blanks and repeats are dropped. A
// slash is NOT a separator ("Batter / flour coating" is one ingredient).
export function splitIngredients(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of cutAt(String(text || ""), /[,，、;；·•\n]/)) {
    const part = raw.trim().replace(/\s+/g, " ").replace(/^[-–—]\s*/, "");
    const key = part.toLowerCase();
    if (!part || seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
}

// Cuts a line at a separator, but not inside brackets: "Sushi rice (vinegar, sugar, salt), Salmon" is two ingredients, not four.
function cutAt(text: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0, from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(" || c === "（") depth++;
    else if ((c === ")" || c === "）") && depth > 0) depth--;
    else if (depth === 0 && separator.test(c)) { parts.push(text.slice(from, i)); from = i + 1; }
  }
  parts.push(text.slice(from));
  return parts;
}

// Words that name an allergen inside an ingredient ("crushed peanuts" -> peanut). Only a hint to point at the ingredient behind an allergen
// the dish already lists: it never says an ingredient is safe, and an ingredient with no match is not "free of" anything.
const WORDS: Record<string, string[]> = {
  peanut: ["peanut", "groundnut", "ถั่วลิสง"],
  tree_nut: ["almond", "cashew", "walnut", "pistachio", "hazelnut", "pecan", "macadamia", "tree nut", "เม็ดมะม่วง", "อัลมอนด์"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "crayfish", "shellfish", "กุ้ง", "ปู"],
  molluscs: ["squid", "octopus", "clam", "mussel", "oyster", "scallop", "cuttlefish", "abalone", "หมึก", "หอย"],
  fish: ["fish", "salmon", "tuna", "anchovy", "anchovies", "mackerel", "eel", "bonito", "sea bass", "cod", "roe", "ปลา", "แซลมอน", "ทูน่า"],
  egg: ["egg", "mayonnaise", "mayo", "ไข่"],
  milk: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "ghee", "นม", "ชีส", "เนย"],
  soy: ["soy", "tofu", "miso", "edamame", "tempeh", "เต้าหู้", "ถั่วเหลือง"],
  gluten: ["wheat", "flour", "bread", "breadcrumb", "panko", "tempura", "udon", "ramen", "แป้งสาลี", "ขนมปัง"],
  sesame: ["sesame", "tahini", "งา"],
  celery: ["celery"],
  mustard: ["mustard", "wasabi mustard"],
  sulphites: ["sulphite", "sulfite", "wine"],
  lupin: ["lupin"],
};

/** The allergens an ingredient's name points at (empty when none; most ingredients). */
export function allergensIn(ingredient: string): string[] {
  const s = ` ${ingredient.toLowerCase()} `;
  return ALLERGENS.filter((a) => (WORDS[a] || []).some((w) => (/^[a-z ]+$/.test(w) ? new RegExp(`\\b${w}s?\\b`).test(s) : s.includes(w))));
}

// ---- translated ingredient names -------------------------------------------------------------------------------------------------
// An owner may write the ingredients again in Thai and in Burmese, in the same order as the English line. They are stored as two lines
// (`ingredients_tr`). A translated line is used only when it has as many parts as the English one; a part left empty falls back to its English
// name. So a half-finished translation can never shift names against each other or hide an ingredient.

/** The parts of a translated line, in order. Every separator counts, so an empty part ("shrimp, , lime") stays an empty part (= not translated
 *  yet), and repeats are not removed: the parts stay in step with the English list. */
export function translationParts(text: string): string[] {
  return cutAt(String(text || ""), /[,，、;；·•\n]/).map((x) => x.trim().replace(/\s+/g, " "));
}

/** The ingredients of a dish in a language: the translated names when they line up with the English ones, else the English ones. */
export function ingredientList(item: { ingredients: string; ingredients_tr?: { th?: string; my?: string } }, lang: Lang): string[] {
  const en = splitIngredients(item.ingredients);
  if (lang === "en") return en;
  const tr = translationParts(item.ingredients_tr?.[lang] || "");
  while (tr.length > en.length && !tr[tr.length - 1]) tr.pop();       // a trailing comma is not another ingredient
  if (tr.length !== en.length) return en;
  return en.map((name, i) => tr[i] || name);
}
