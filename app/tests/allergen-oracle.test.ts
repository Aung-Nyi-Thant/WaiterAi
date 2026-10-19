// Exhaustive check of the safety-critical path against the database as the "oracle".
// For every dish x every one of the 14 allergens x English and Thai, the rule-based answer must say exactly what the
// stored allergen data says: present, absent, or "not provided" (NULL) – and the language model must never be called.
// The allergens of each dish are randomised (seeded, so a failure is reproducible) so that all 14 allergens are
// exercised, not just the six that the demo menu happens to use.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { allergenName } from "@/modules/platform/constants";

afterEach(() => { vi.unstubAllGlobals(); });

// A word the diner would use for each allergen, one per language (the first keyword of each in ai.ts).
const KEYS: Record<string, { en: string; th: string }> = {
  peanut: { en: "peanuts", th: "ถั่วลิสง" }, tree_nut: { en: "almonds", th: "อัลมอนด์" }, shellfish: { en: "shellfish", th: "กุ้ง" },
  molluscs: { en: "squid", th: "หมึก" }, fish: { en: "fish", th: "ปลา" }, egg: { en: "egg", th: "ไข่" }, milk: { en: "milk", th: "นมวัว" },
  soy: { en: "soy", th: "ถั่วเหลือง" }, gluten: { en: "gluten", th: "กลูเตน" }, sesame: { en: "sesame", th: "งา" }, celery: { en: "celery", th: "คื่นช่าย" },
  mustard: { en: "mustard", th: "มัสตาร์ด" }, sulphites: { en: "sulphites", th: "ซัลไฟต์" }, lupin: { en: "lupin", th: "ลูพิน" },
};
const ALL = Object.keys(KEYS);
// small seeded generator (mulberry32)
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

async function randomMenu(seed: number) {
  const rand = rng(seed), base = await aiCtx();
  const items = base.items.filter((i) => i.available).map((i, n) => ({
    ...i,
    // roughly: 1 dish in 6 has no allergen data (NULL), 1 in 6 lists none, the rest list a random subset
    allergens: n % 6 === 0 ? null : n % 6 === 1 ? [] : ALL.filter(() => rand() < 0.3),
  }));
  return { ...base, items };
}
const SEEDS = [1, 7, 42];
const staff = /staff|พนักงาน/;
// "has no allergens listed" is the app's own honest wording (it says what the data lists, not that the dish is free of them)
const UNSAFE = /\bis safe\b|\bsafe to eat\b|\ballergen[- ]free\b|\bno allergens\b(?! listed)|\bguarantee|ปลอดภัย/i;
const notProvided = /not provided|ไม่มีข้อมูล|ยังไม่มีข้อมูล/;

describe.each(SEEDS)("allergen answers equal the database, seed %i", (seed) => {
  for (const lang of ["en", "th"] as const) {
    it(`${lang}: "I'm allergic to X. Can I eat <dish>?" for every dish and allergen`, async () => {
      const ctx = await randomMenu(seed);
      const wrong: string[] = [];
      for (const d of ctx.items) for (const a of ALL) {
        const name = d.name[lang];
        const q = lang === "en" ? `I'm allergic to ${KEYS[a].en}. Can I eat the ${name}?` : `ฉันแพ้${KEYS[a].th} กิน${name}ได้ไหม`;
        const calls = noModel();
        const r = await answer(q, lang, ctx);
        vi.unstubAllGlobals();
        const where = `[${d.name.en} | ${d.allergens === null ? "NULL" : d.allergens.join(",") || "none"} | ask ${a}] ${r.reply}`;
        if (calls.length) wrong.push(`went to the model: ${where}`);
        else if (UNSAFE.test(r.reply)) wrong.push(`unsafe wording: ${where}`);
        else if (!staff.test(r.reply)) wrong.push(`no staff line: ${where}`);
        else if (d.allergens === null) { if (!notProvided.test(r.reply)) wrong.push(`NULL not reported as unknown: ${where}`); }
        else {
          // every allergen the dish lists must be named, and no allergen it does not list may be named
          for (const k of ALL) {
            const nameK = allergenName(k, lang).toLowerCase(), listed = d.allergens.includes(k);
            // a short name can sit inside a longer listed one ("fish" in "shellfish"): blank out the dish name and the longer listed names first
            // (the fixed staff sentence is blanked too: Thai "พนักงาน" contains "งา" = sesame)
            let rest = r.reply.toLowerCase().split(d.name[lang].toLowerCase()).join(" ").replace(/กรุณายืนยันกับพนักงาน|please confirm with the staff/g, " ");
            for (const o of d.allergens) { const n = allergenName(o, lang).toLowerCase(); if (o !== k && n.length > nameK.length && n.includes(nameK)) rest = rest.split(n).join(" "); }
            const shown = rest.includes(nameK);
            if (listed && !shown) wrong.push(`missing ${k}: ${where}`);
            if (!listed && shown) wrong.push(`invented ${k}: ${where}`);
          }
        }
      }
      expect(wrong, wrong.slice(0, 8).join("\n")).toEqual([]);
    });

    it(`${lang}: "which dishes contain X?" lists exactly the dishes that list X, and the unknown ones separately`, async () => {
      const ctx = await randomMenu(seed);
      const wrong: string[] = [];
      for (const a of ALL) {
        const q = lang === "en" ? `Which dishes contain ${KEYS[a].en}?` : `เมนูไหนมี${KEYS[a].th}บ้าง`;
        const calls = noModel();
        const r = await answer(q, lang, ctx);
        vi.unstubAllGlobals();
        if (calls.length) { wrong.push(`went to the model: ${q}`); continue; }
        if (UNSAFE.test(r.reply)) wrong.push(`unsafe wording: ${r.reply}`);
        const shouldShow = ctx.items.filter((d) => d.allergens === null || d.allergens.includes(a));
        // a dish name that is the prefix of another ("Chicken Fried Rice" vs ...) cannot be told apart by substring, so compare on full names
        for (const d of ctx.items) {
          const shown = r.reply.includes(d.name[lang]);
          const expected = shouldShow.includes(d);
          if (shown !== expected) wrong.push(`${a}: ${d.name.en} ${expected ? "missing from" : "wrongly in"} the answer. [${d.allergens === null ? "NULL" : d.allergens.join(",") || "none"}] ${r.reply}`);
        }
        if (!staff.test(r.reply)) wrong.push(`no staff line: ${r.reply}`);
      }
      expect(wrong, wrong.slice(0, 8).join("\n")).toEqual([]);
    });
  }
});
