import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const win: any = {};
new Function("window", read("prototype/photos.js"))(win);
const { MENU, AL } = new Function("window", `${read("prototype/data.js")}\nreturn { MENU, AL };`)(win) as {
  MENU: any[];
  AL: Record<string, string[]>;
};
const store: Record<string, string> = {};
const sessionStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
};
const S = { al: [] as string[] };
const tr = (a: string[]) => a[1] || a[0];
const loadRules = (menu = MENU) => new Function(
  "window",
  "sessionStorage",
  "MENU",
  "AL",
  "S",
  "tr",
  `${read("prototype/ai-rules.js")}\nreturn window.AIRules;`
)(win, sessionStorage, menu, AL, S, tr);
const rules = loadRules();

describe("prototype AI rules extended coverage (FR-2)", () => {
  describe("Bug 1: Negated spicy vs Positive spicy", () => {
    it("handles negated spicy in English for kids and adults", () => {
      const phrases = [
        "My child can't eat too spicy food, what should he eat?",
        "not spicy",
        "no spicy",
        "mild",
        "for kids",
        "can't eat spicy",
        "cannot eat spicy",
        "kid-friendly food",
        "without chili",
      ];
      for (const phrase of phrases) {
        const res = rules.answer(phrase, { lang: "en" });
        expect(res, `failed for "${phrase}"`).not.toBeNull();
        expect(res.t).toContain("These dishes are not spicy (no spice level):");
        expect(res.items.length).toBeGreaterThan(0);
        expect(res.kind).toBe("data");
        for (const id of res.items) {
          const dish = MENU.find((m) => m.id === id);
          expect(dish.sp).toBe(false);
          expect(dish.n[0]).not.toMatch(/กระเพรา|โกจุงจัง|ยำ|ลาบ|กิมจิ/);
          expect(dish.n[1]).not.toMatch(/\bspicy\b/i);
        }
      }
    });

    it("handles negated spicy in Thai", () => {
      const thPhrases = [
        "ไม่เผ็ด",
        "ไม่กินเผ็ด",
        "กินเผ็ดไม่ได้",
        "เผ็ดน้อย",
        "สำหรับเด็ก",
        "เด็กกินอะไรดี",
      ];
      for (const phrase of thPhrases) {
        const res = rules.answer(phrase, { lang: "th" });
        expect(res, `failed for Thai "${phrase}"`).not.toBeNull();
        expect(res.t).toContain("เมนูเหล่านี้ไม่เผ็ด");
        expect(res.items.length).toBeGreaterThan(0);
        for (const id of res.items) {
          const dish = MENU.find((m) => m.id === id);
          expect(dish.sp).toBe(false);
        }
      }
    });

    it("handles negated spicy in Burmese", () => {
      const myRes1 = rules.answer("မစပ်", { lang: "my" });
      expect(myRes1.t).toContain("ဤဟင်းလျာများသည် မစပ်ပါ");
      expect(myRes1.items.length).toBeGreaterThan(0);

      const myRes2 = rules.answer("ကလေးအတွက်", { lang: "my" });
      expect(myRes2.t).toContain("ဤဟင်းလျာများသည် မစပ်ပါ");
      expect(myRes2.items.length).toBeGreaterThan(0);
    });

    it("keeps positive spicy requests working in English, Thai, and Burmese", () => {
      const enRes = rules.answer("recommend something spicy", { lang: "en" });
      expect(enRes.t).toContain("These come with a spice level:");
      expect(enRes.items.length).toBeGreaterThan(0);
      for (const id of enRes.items) {
        const dish = MENU.find((m) => m.id === id);
        expect(dish.sp).toBe(true);
      }

      const thRes = rules.answer("ขออะไรเผ็ดๆ หน่อย", { lang: "th" });
      expect(thRes.t).toContain("เมนูที่เลือกระดับความเผ็ดได้:");
      expect(thRes.items.length).toBeGreaterThan(0);

      const myRes = rules.answer("စပ်တာ", { lang: "my" });
      expect(myRes.t).toContain("စပ်အဆင့်ရွေးနိုင်သော ဟင်းလျာများ:");
      expect(myRes.items.length).toBeGreaterThan(0);
    });
  });

  describe("Bug 2: Recommended / popular dishes / what should I eat today", () => {
    it("answers recommendation queries in English with recommended dishes and cards", () => {
      const recPhrases = [
        "What do you recommend today?",
        "what should I eat today",
        "popular dishes",
        "recommend",
        "what's good",
        "what is good",
        "signature dishes",
        "today's special",
      ];
      for (const q of recPhrases) {
        const res = rules.answer(q, { lang: "en" });
        expect(res, `failed for "${q}"`).not.toBeNull();
        expect(res.t).toContain("The restaurant marks these as recommended:");
        expect(res.items).toEqual([98, 99, 100]); // Fatty Beef Don with Onsen Egg, Jo Tontoro Don with Onsen Egg, Yakisoba with Onsen Egg
        expect(res.kind).toBe("data");
      }
    });

    it("answers recommendation queries in Thai with cards", () => {
      const thPhrases = [
        "วันนี้กินอะไรดี",
        "กินอะไรดี",
        "มีอะไรแนะนำบ้าง",
        "เมนูแนะนำ",
        "เมนูยอดนิยม",
        "เมนูเด็ด",
      ];
      for (const q of thPhrases) {
        const res = rules.answer(q, { lang: "th" });
        expect(res, `failed for "${q}"`).not.toBeNull();
        expect(res.t).toContain("ร้านแนะนำเมนูเหล่านี้:");
        expect(res.items).toEqual([98, 99, 100]);
      }
    });

    it("answers recommendation queries in Burmese with cards", () => {
      const myPhrases = [
        "ဒီနေ့ ဘာစားရမလဲ",
        "ဘာစားရမလဲ",
        "အကြံပြု",
        "လူကြိုက်များ",
        "ဘာကောင်းလဲ",
      ];
      for (const q of myPhrases) {
        const res = rules.answer(q, { lang: "my" });
        expect(res, `failed for "${q}"`).not.toBeNull();
        expect(res.t).toContain("ဆိုင်က အကြံပြုသော ဟင်းလျာများ:");
        expect(res.items).toEqual([98, 99, 100]);
      }
    });
  });

  describe("Bug 3: Common diner questions", () => {
    it("greets politely in English, Thai, and Burmese", () => {
      expect(rules.answer("hello", { lang: "en" }).t).toMatch(/Hello! Ask me about dishes/);
      expect(rules.answer("good morning", { lang: "en" }).t).toMatch(/Hello! Ask me about dishes/);
      expect(rules.answer("good evening", { lang: "en" }).t).toMatch(/Hello! Ask me about dishes/);
      expect(rules.answer("sawasdee", { lang: "th" }).t).toContain("สวัสดีค่ะ");
      expect(rules.answer("สวัสดี", { lang: "th" }).t).toContain("สวัสดีค่ะ");
      expect(rules.answer("ขอบคุณ", { lang: "th" }).t).toContain("สวัสดีค่ะ");
      expect(rules.answer("မင်္ဂလာပါ", { lang: "my" }).t).toContain("မင်္ဂလာပါ။");
      expect(rules.answer("ကျေးဇူးတင်ပါတယ်", { lang: "my" }).t).toContain("မင်္ဂလာပါ။");
    });

    it("answers vegetarian and vegan questions with real meat-free menu items", () => {
      const res = rules.answer("vegetarian dishes", { lang: "en" });
      expect(res.t).toContain("suitability unconfirmed");
      expect(res.t).toContain("confirm with the staff");
      expect(res.items.length).toBeGreaterThan(0);
      for (const id of res.items) {
        const dish = MENU.find((m) => m.id === id);
        expect(dish.c).not.toContain("drink");
        expect(dish.c).not.toContain("sashimi");
      }

      const under100 = rules.answer("Vegan dishes under 100 baht", { lang: "en" });
      expect(under100.items.length).toBeGreaterThan(0);
      for (const id of under100.items) {
        const dish = MENU.find((m) => m.id === id);
        expect(dish.p).toBeLessThanOrEqual(100);
      }

      const thVeg = rules.answer("มังสวิรัติ", { lang: "th" });
      expect(thVeg.t).toContain("ยังไม่ยืนยัน");
      expect(thVeg.t).toContain("กรุณายืนยันกับพนักงาน");
      expect(thVeg.items.length).toBeGreaterThan(0);

      const myVeg = rules.answer("သက်သတ်လွတ်", { lang: "my" });
      expect(myVeg.t).toContain("အတည်မပြုရသေးပါ");
      expect(myVeg.t).toContain("ဝန်ထမ်းကို မေးမြန်းပေးပါ");
      expect(myVeg.items.length).toBeGreaterThan(0);
    });

    it("answers ingredient queries for chicken and salmon", () => {
      const chicken = rules.answer("something with chicken", { lang: "en" });
      expect(chicken.t).toContain("Dishes with chicken:");
      expect(chicken.items.length).toBeGreaterThan(0);
      for (const id of chicken.items) {
        const dish = MENU.find((m) => m.id === id);
        const match =
          dish.n[1].toLowerCase().includes("chicken") ||
          dish.n[0].includes("ไก่") ||
          dish.ing.includes("chicken");
        expect(match).toBe(true);
      }

      const salmon = rules.answer("something with salmon", { lang: "en" });
      expect(salmon.t).toContain("Dishes with salmon:");
      expect(salmon.items.length).toBeGreaterThan(0);
      for (const id of salmon.items) {
        const dish = MENU.find((m) => m.id === id);
        const match =
          dish.n[1].toLowerCase().includes("salmon") ||
          dish.n[0].includes("แซลม่อน") ||
          dish.ing.includes("salmon");
        expect(match).toBe(true);
      }

      const chickenTh = rules.answer("มีเมนูไก่อะไรบ้าง", { lang: "th" });
      expect(chickenTh.t).toContain("เมนูที่มีไก่:");
      expect(chickenTh.items.length).toBeGreaterThan(0);

      const salmonTh = rules.answer("อยากกินแซลม่อน", { lang: "th" });
      expect(salmonTh.t).toContain("เมนูที่มีแซลม่อน:");
      expect(salmonTh.items.length).toBeGreaterThan(0);

      const chickenMy = rules.answer("ကြက်သား", { lang: "my" });
      expect(chickenMy.t).toContain("ကြက်သားပါသော ဟင်းလျာများ:");
    });

    it("answers cheap and budget dish queries", () => {
      const cheap = rules.answer("cheap dishes", { lang: "en" });
      expect(cheap.t).toContain("Affordable dishes on our menu:");
      expect(cheap.items.length).toBeGreaterThan(0);
      for (const id of cheap.items) {
        const dish = MENU.find((m) => m.id === id);
        expect(dish.p).toBeLessThanOrEqual(50);
      }

      const under100 = rules.answer("dishes under 100 baht", { lang: "en" });
      expect(under100.items.length).toBeGreaterThan(0);
      for (const id of under100.items) {
        const dish = MENU.find((m) => m.id === id);
        expect(dish.p).toBeLessThanOrEqual(100);
      }

      const cheapTh = rules.answer("เมนูราคาถูก", { lang: "th" });
      expect(cheapTh.t).toContain("เมนูราคาย่อมเยา:");
      expect(cheapTh.items.length).toBeGreaterThan(0);

      const cheapMy = rules.answer("အဈေးသက်သာ", { lang: "my" });
      expect(cheapMy.t).toContain("ဈေးသက်သာသော ဟင်းလျာများ:");
    });
  });
});


describe("review regressions: safety and combined constraints", () => {
  it.each([
    "not spicy without eggs",
    "mild food safe for me",
    "non-spicy free of eggs",
    "not spicy, what can I eat?",
    "mild food for my egg allergy",
    "without chili and without eggs",
    "without chili and eggs",
    "without chili and garlic",
    "without spice and onions",
    "without spice, safe for me",
    "without spice, free of milk",
  ])("keeps the allergy guard ahead of mild requests: %s", (q) => {
    const r = rules.answer(q, { lang: "en" });
    expect(r.t).toContain("No dish has an allergen list the restaurant has verified");
    expect(r.t).toContain("confirm with the staff");
    expect(r.items).toBeUndefined();
    expect(r.qa[0].slice(0, 2)).toEqual(["modal", "staff"]);
  });

  it.each(["without chili", "without chilli", "without spice"])("keeps pure spice exclusions working: %s", (q) => {
    const r = rules.answer(q, { lang: "en" });
    expect(r.t).toContain("These dishes are not spicy");
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((id: number) => !MENU.find(m => m.id === id).sp)).toBe(true);
  });

  it.each(["not spicy", "without chili"])("preserves named-dish ingredient safeguards with %s", (q) => {
    const r = rules.answer(`What ingredients does Sweet Egg (Tamago) Sushi contain, ${q}?`, { lang: "en" });
    expect(r.items).toEqual([39]);
    expect(r.t).toContain("eggs");
    expect(r.t).toContain("estimate");
    expect(r.t).toContain("confirm with the staff");
  });

  it("uses only verified egg-free lists when mixed spice and allergy requests have verified candidates", () => {
    const menu = MENU.map(m => ({ ...m, v: [39, 40].includes(m.id) ? 1 : 0 }));
    const r = loadRules(menu).answer("not spicy without eggs", { lang: "en" });
    expect(r.items).toEqual([40]);
    expect(r.t).toContain("confirm with the staff");
    expect(r.t).not.toMatch(/\bis safe\b/i);
  });

  it.each(["vegan dishes", "recommend vegan dishes", "plant-based dishes", "อาหารเจ"])("selects plant candidates without asserting vegan certification: %s", (q) => {
    const r = rules.answer(q, { lang: "en" });
    expect(r.items.map((id: number) => MENU.find(m => m.id === id).n[1])).toEqual([
      "French Fries", "Seaweed Salad", "Addictive Cucumber", "Edamame",
    ]);
    expect(r.t).toContain("suitability unconfirmed");
    expect(r.t).toContain("confirm with the staff");
    for (const id of r.items) {
      const m = MENU.find(m => m.id === id);
      expect(m.al.some((a: string) => ["egg", "milk", "fish", "shell"].includes(a))).toBe(false);
      expect(m.ing.every((i: string) => ["potato", "seaweed", "cucumber", "edamame"].includes(i))).toBe(true);
    }
  });

  it("excludes egg, dairy, honey, animal ingredients and unknown recipes from vegan candidates even with conflicting tags", () => {
    const base = MENU.find(m => m.id === 40);
    const menu = ["egg", "milk", "honey", "beef", "fish", "cheese"].map((ing, i) => ({
      ...base, id: i + 200, n: [ing, ing], ing: [ing], tags: ["vegan"], al: [],
    }));
    menu.push({ ...base, id: 300, n: ["Unknown recipe", "Unknown recipe"], ing: [], tags: [], al: [] });
    expect(loadRules(menu).answer("vegan dishes", { lang: "en" }).items).toEqual([]);
  });

  it("uses explicit dietary tags without treating vegetarian as vegan", () => {
    const base = MENU.find(m => m.id === 40);
    const menu = [
      { ...base, id: 200, n: ["Tagged plant dish", "Tagged plant dish"], ing: [], tags: ["vegan"] },
      { ...base, id: 201, n: ["Tagged egg dish", "Tagged egg dish"], ing: ["egg"], al: ["egg"], tags: ["vegetarian"] },
    ];
    expect(loadRules(menu).answer("vegan dishes", { lang: "en" }).items).toEqual([200]);
    expect(loadRules(menu).answer("vegetarian dishes", { lang: "en" }).items).toEqual([200, 201]);
  });

  it.each(["recommend vegetarian dishes", "แนะนำอาหารมังสวิรัติ", "အကြံပြု သက်သတ်လွတ်"])("keeps dietary constraints ahead of recommendations: %s", (q) => {
    const r = rules.answer(q, { lang: "en" });
    expect(r.items.map((id: number) => MENU.find(m => m.id === id).n[1])).toEqual([
      "Sweet Egg (Tamago) Sushi", "French Fries", "Seaweed Salad", "Addictive Cucumber",
    ]);
    expect(r.t).toContain("suitability unconfirmed");
    expect(r.t).toContain("confirm with the staff");
  });

  it.each([
    ["recommend something under 50 baht", null],
    ["recommend non-spicy under 50 baht", false],
    ["recommend spicy under 50 baht", true],
    ["แนะนำไม่เผ็ด ไม่เกิน 50 บาท", false],
    ["แนะนำเผ็ด ไม่เกิน 50 บาท", true],
  ])("honors budget and spice together: %s", (q, spicy) => {
    const r = rules.answer(q, { lang: "en" });
    expect(r.items.length).toBeGreaterThan(0);
    for (const id of r.items) {
      const m = MENU.find(m => m.id === id);
      expect(m.p).toBeLessThanOrEqual(50);
      if (spicy !== null) expect(m.sp).toBe(spicy);
    }
  });

  it("combines vegetarian, spice and budget limits", () => {
    const r = rules.answer("recommend non-spicy vegetarian dishes under 50 baht", { lang: "en" });
    expect(r.items.map((id: number) => MENU.find(m => m.id === id).n[1])).toEqual([
      "Japanese Leek Skewer", "Shiitake Skewer", "Japanese Rice",
    ]);
    expect(r.t).toContain("confirm with the staff");
  });

  it.each(["recommend spicy under 1 baht", "cheapest under 1 baht", "recommend vegetarian under 1 baht"])("does not fall back outside an impossible budget: %s", (q) => {
    expect(rules.answer(q, { lang: "en" }).items).toEqual([]);
  });

  it.each(["en", "th", "my"])("does not invent restaurant recommendations when none are available (%s)", (lang) => {
    const menu = MENU.map(m => ({ ...m, c: m.c.filter((c: string) => c !== "rec") }));
    const r = loadRules(menu).answer("recommend", { lang });
    expect(r.items).toEqual([]);
    expect(r.t).not.toContain("The restaurant marks these as recommended:");
    expect(r.kind).toBe("data");
    expect(loadRules([]).answer("recommend", { lang }).items).toEqual([]);
  });

  it("does not map Thai crab requests to shrimp", () => {
    expect(rules.answer("มีเมนูปูอะไรบ้าง", { lang: "th" })).toBeNull();
    const shrimp = rules.answer("มีเมนูกุ้งอะไรบ้าง", { lang: "th" });
    expect(shrimp.t).toContain("เมนูที่มีกุ้ง:");
    expect(shrimp.items.length).toBeGreaterThan(0);
  });

  it("restores the original Burmese text without Thai characters", () => {
    const offTopic = rules.answer("weather", { lang: "my" });
    expect(offTopic.t).toContain("ဒီနေ့ ဘာစားချင်လဲ?");
    expect(offTopic.t).not.toMatch(/[\u0E00-\u0E7F]/);
    const menu = MENU.map(m => ({ ...m, v: m.id === 40 ? 1 : 0 }));
    const allergy = loadRules(menu).answer("allergic to eggs", { lang: "my" });
    expect(allergy.t).toContain("ဟင်းလျာများ");
    expect(allergy.t.replaceAll("฿", "")).not.toMatch(/[\u0E00-\u0E7F]/);
  });
});
