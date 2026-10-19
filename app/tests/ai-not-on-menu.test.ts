// AI-2 / R5: a diner asks for food or drink the menu does not have ("Do you have pizza?", "ขอเบียร์", "ဘီယာ ရှိလား").
// The answer says plainly that it is not on the menu, suggests the closest dishes that ARE on it (with prices), and offers the staff.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, mockModel, noModel } from "./helpers";
import { answer, offMenuFoods } from "@/modules/ai/ai";
import { scoreReply, type EvalQuestion } from "./evalScore";
import { categoriesOf, itemsOf } from "@/modules/platform/menu";

afterEach(() => { vi.unstubAllGlobals(); });
type L = "en" | "th" | "my";
const name = (id: number) => itemsOf(1).find((i) => i.id === id)!.name.en;
const shown = (r: { action: { ids?: number[] } }) => (r.action.ids ?? []).map(name);
const rules = async (msg: string, lang: L = "en", over: Record<string, unknown> = {}) => {
  const calls = noModel();
  const r = await answer(msg, lang, await aiCtx({ categories: categoriesOf(1), popular: {}, ...over }));
  expect(calls, `"${msg}" must be answered from the rules`).toHaveLength(0);
  return r;
};

describe("the answer", () => {
  it("says it is not on the menu, suggests mains with prices, and offers the staff (pizza)", async () => {
    const r = await rules("Do you have pizza?");
    expect(r.reply).toBe('Sorry, pizza is not on our menu. You might like Chicken Fried Rice (฿80), Vegetable Tofu Stir-fry (฿90), Shrimp Pad Thai (฿120) instead. If you have a special request, tap "Call staff" and the staff can tell you what the kitchen can do.');
    expect(r.action.type).toBe("show_dishes");
    expect(shown(r)).toEqual(["Chicken Fried Rice", "Vegetable Tofu Stir-fry", "Shrimp Pad Thai"]);
    expect(r.topic).toBe("not_on_menu");
    expect(r.answered).toBe(true);
  });
  it("never says 'I don't have any information' and never promises the kitchen can make it", async () => {
    for (const q of ["Do you have pizza?", "Can I get sushi?", "Do you sell beer?", "I'd like a cake", "ขอเบียร์หน่อย", "ဘီယာ ရှိလား"]) {
      const r = await rules(q, /[฀-๿]/.test(q) ? "th" : /[က-႟]/.test(q) ? "my" : "en");
      expect(r.reply).not.toMatch(/don't have (?:any )?information|ไม่มีข้อมูล|အချက်အလက် မရှိ/i);
      expect(r.reply).not.toMatch(/\bwe can make\b|can be made|yes, we/i);
    }
  });
  it("suggests the same KIND of thing: drinks for a drink, dessert for a cake, fish for sushi", async () => {
    expect(shown(await rules("Do you sell beer?"))).toEqual(["Thai Iced Tea"]);
    expect(shown(await rules("Do you have cake?"))).toEqual(["Mango Sticky Rice"]);          // the coconut ice cream is sold out
    expect(shown(await rules("Can I get sushi?"))).toEqual(["Steamed Fish with Lime", "Shrimp Pad Thai", "Chicken Green Curry"]);
  });
  it("works without a question mark and with a request word that used to mean 'show the menu'", async () => {
    expect((await rules("can I have sushi")).reply).toMatch(/^Sorry, sushi is not on our menu\./);
    expect((await rules("I'd like a burger please")).reply).toMatch(/^Sorry, burger is not on our menu\./);
  });
  it("names the food the way the diner typed it: 'BBQ ribs' is one food, 'tom kha gai' is not cut to 'tom kha', 'curry puffs' stays plural", async () => {
    expect((await rules("Do you serve BBQ ribs?")).reply).toMatch(/^Sorry, bbq ribs is not on our menu\./);
    expect((await rules("Do you have tom kha gai?")).reply).toMatch(/^Sorry, tom kha gai is not on our menu\./);
    expect((await rules("Do you have curry puffs?")).reply).toMatch(/^Sorry, curry puffs is not on our menu\./);
  });
  it("suggests a soup for a missing soup, a starter for a missing starter", async () => {
    expect(shown(await rules("Do you have tom kha gai?"))).toEqual(["Tom Yum Goong"]);
    expect(shown(await rules("Do you have tempura?"))).toEqual(["Grilled Pork Skewers", "Fresh Spring Rolls"]);
  });
  it("names two foods when the diner asked for two", async () => {
    expect((await rules("pizza or burger?")).reply).toMatch(/^Sorry, pizza or burger is not on our menu\./);
  });
  it("in Thai and Burmese, with the label of the Call staff button the screen really has", async () => {
    const th = await rules("มีพิซซ่าไหม", "th");
    expect(th.reply).toMatch(/^ขออภัยครับ ในเมนูของเราไม่มีพิซซ่าครับ ลอง .* แทนไหมครับ/);
    expect(th.reply).toContain('กดปุ่ม "เรียกพนักงาน"');
    const my = await rules("ဘီယာ ရှိလား", "my");
    expect(my.reply).toMatch(/^တောင်းပန်ပါတယ်ခင်ဗျာ။ ဘီယာ က ကျွန်တော်တို့ မီနူးမှာ မရှိပါဘူးခင်ဗျာ။/);
    expect(my.reply).toContain('"ဝန်ထမ်းခေါ်ရန်"');
  });
  it("a female voice changes the particles, as everywhere else", async () => {
    const c = await aiCtx({ categories: categoriesOf(1), popular: {} });
    c.restaurant = { ...c.restaurant, persona: { ...c.restaurant.persona, gender: "female" } };
    noModel();
    expect((await answer("มีพิซซ่าไหม", "th", c)).reply).toMatch(/^ขออภัยค่ะ ในเมนูของเราไม่มีพิซซ่าค่ะ/);
  });
});

describe("what it suggests respects the diner and the menu", () => {
  it("never suggests a sold-out dish, and applies the allergy profile (and says so)", async () => {
    const r = await rules("Do you have pizza?", "en", { profile: ["shellfish"] });
    expect(shown(r)).toEqual(["Chicken Fried Rice", "Vegetable Tofu Stir-fry", "Beef Massaman Curry"]);   // the Pad Thai lists shellfish
    expect(r.reply).toContain("allergy profile");
    expect(r.reply).toContain("confirm with the staff");
  });
  it("ranks by what diners really ordered here", async () => {
    const r = await rules("Do you have pizza?", "en", { popular: { 7: 9, 2: 3 } });
    expect(shown(r).slice(0, 2)).toEqual(["Beef Massaman Curry", "Chicken Green Curry"]);
  });
  it("when nothing fits the diner's profile it still answers, and shows the menu instead of dishes", async () => {
    const r = await rules("Do you sell beer?", "en", { profile: ["milk"] });                  // the only drink lists milk
    expect(r.reply).toMatch(/^Sorry, beer is not on our menu\. /);
    expect(r.action.type).toBe("show_menu");
  });
});

describe("when it must NOT say 'not on our menu'", () => {
  it("a dish the diner named that IS on the menu is handled as that dish (by the model, as before)", async () => {
    mockModel("Yes, the Thai Iced Tea is ฿50.");
    const r = await answer("Do you have Thai Iced Tea?", "en", await aiCtx({ categories: categoriesOf(1), popular: {} }));
    expect(r.reply).not.toMatch(/not on our menu/);
    expect(r.usedModel).toBe(true);
  });
  it("a word the restaurant itself uses (an ingredient, a category, a FAQ) is not 'missing'", async () => {
    const ctx = await aiCtx({ categories: categoriesOf(1) });
    ctx.faqs = [...ctx.faqs, { q: "Do you sell beer?", a: "Yes, ask the staff for our beer list." }];
    mockModel("Yes, ask the staff for our beer list.");
    const r = await answer("Do you sell beer?", "en", ctx);
    expect(r.reply).not.toMatch(/not on our menu/);
    expect(r.usedModel).toBe(true);                                                           // the FAQ answer comes from the model, as before
  });
  it("'I don't like pizza' and 'no pizza please' are not requests for pizza", async () => {
    expect(offMenuFoods("i don't like pizza", itemsOf(1), [], [], [])).toBeNull();
    expect(offMenuFoods("no pizza please", itemsOf(1), [], [], [])).toBeNull();
    expect(offMenuFoods("ไม่ชอบพิซซ่า", itemsOf(1), [], [], [])).toBeNull();
  });
  it("short words do not match inside longer ones: pie / piece, Wi-Fi / wine, tuna / tunable", () => {
    for (const t of ["a piece of advice", "where is the wi-fi password", "ဝိုင်ဖိုင် ရှိလား", "is it tunable"]) expect(offMenuFoods(t, itemsOf(1), [], [], []), t).toBeNull();
    expect(offMenuFoods("two pizzas please", itemsOf(1), [], [], [])?.terms).toEqual(["pizzas"]);   // a plural is still pizza, shown as the diner typed it
  });
  it("no question in the project's own evaluation sets is mistaken for a missing food unless it really asks for one", () => {
    const dir = path.resolve(__dirname, "../../eval");
    const sets = ["questions.json", "questions_natural.json", "open_questions.json", "off_menu_questions.json"].flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { id: string; question: string; category: string }[]);
    const caught = sets.filter((q) => offMenuFoods(q.question.toLowerCase(), itemsOf(1), [], [], []));
    expect(caught.length).toBeGreaterThan(5);                                  // the pizza / sushi / beer questions
    for (const q of caught) expect(q.category, `"${q.question}" was taken for a missing food`).toBe("out_of_menu");
  });
});

describe("eval/off_menu_questions.json: 12 foods a Thai menu might have but this one does not, asked in English, Thai and Burmese", () => {
  const set: EvalQuestion[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../eval/off_menu_questions.json"), "utf8"));
  it("has 12 questions in each language", () => {
    for (const l of ["en", "th", "my"]) expect(set.filter((q) => q.lang === l)).toHaveLength(12);
  });
  it("every one the rules answer says it is not on the menu, suggests a real dish, and never says 'no information'; at least 30 of 36 are rule-answered", async () => {
    const ctx = await aiCtx({ categories: categoriesOf(1), popular: {} });
    const failed: string[] = [];
    let byRules = 0;
    for (const q of set) {
      const calls = noModel();
      const r = await answer(q.question, q.lang, ctx);
      vi.unstubAllGlobals();
      if (calls.length) continue;                                      // not in the word list: the model answers it (live eval)
      byRules++;
      const s = scoreReply(q, r.reply);
      if (!s.pass) failed.push(`${q.id} "${q.question}" -> ${r.reply}`);
    }
    expect(failed, failed.join("\n")).toEqual([]);
    expect(byRules).toBeGreaterThanOrEqual(30);
  });
});

describe("a food the list does not know still goes to the model, whose prompt now asks for the same shape of answer", () => {
  it("the prompt: not on our menu (not 'no information'), the closest dishes with prices, the staff for a special request", async () => {
    const calls = mockModel("Hello!");
    await answer("do you do karaoke nights?", "en", await aiCtx({ categories: categoriesOf(1), popular: {} }));
    const system = String(calls[0].body.messages[0].content);
    expect(system).toContain('say clearly that it is not on our menu (never "I have no information about it")');
    expect(system).toContain("suggest one or two dishes from the data that are closest in type, with their prices");
    expect(system).toContain("use show_dishes with the dishes you suggested");
  });
});
