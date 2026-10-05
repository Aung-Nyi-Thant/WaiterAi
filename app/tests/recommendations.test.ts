// Smart recommendations: "mild under 100 baht", "what's spicy?", "a dessert", "what's popular?" are answered from the menu
// data, ranked by real orders, and filtered by the allergy profile. Only open questions reach the language model.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, call, mockModel, noModel, staffLogin } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { POST as orderAction } from "@/modules/staff/api/orders";
import { categoriesOf, itemsOf, popularDishes } from "@/modules/platform/menu";
import { run } from "@/modules/platform/db";

afterEach(() => { vi.unstubAllGlobals(); });
const slug = "golden-lotus";
const dish = (n: string) => itemsOf(1).find((i) => i.name.en === n)!.id;
const rec = async (msg: string, lang: "en" | "th" | "my" = "en", over: Record<string, unknown> = {}) => {
  const calls = noModel();
  const r = await answer(msg, lang, await aiCtx({ categories: categoriesOf(1), popular: {}, ...over }));
  expect(calls, "the model must not be used").toHaveLength(0);
  return r;
};
const shown = (r: { action: { ids?: number[] } }) => (r.action.ids ?? []).map((id) => itemsOf(1).find((i) => i.id === id)!.name.en);

describe("spice level", () => {
  it("'What's spicy?' lists the spiciest dishes first, from the data", async () => {
    const r = await rec("What's spicy?");
    expect(r.topic).toBe("recommend");
    expect(shown(r)).toEqual(["Tom Yum Goong", "Papaya Salad", "Chicken Green Curry"]);
    expect(r.reply).toContain("Tom Yum Goong (฿180, very spicy)");
    expect(r.reply).toContain("Chicken Green Curry (฿140, spicy)");
    expect(r.reply).toContain("Based on what you asked (spicy)");
    expect(r.reply).not.toMatch(/Pad Thai|Tofu|Tea/);
  });
  it("'not spicy' means mild or no spice, never the spicy dishes", async () => {
    const r = await rec("something not spicy please");
    for (const n of shown(r)) expect(["Tom Yum Goong", "Papaya Salad", "Chicken Green Curry", "Steamed Fish with Lime"]).not.toContain(n);
    expect(r.reply).toContain("(mild)");
  });
});

describe("budget", () => {
  it("'mild under 100 baht': strictly under, cheapest first, sold-out dishes left out", async () => {
    const r = await rec("something mild under 100 baht");
    expect(shown(r)).toEqual(["Thai Iced Tea", "Grilled Pork Skewers", "Chicken Fried Rice"]);
    expect(r.reply).toContain("(mild, under ฿100)");
    expect(r.reply).not.toContain("Coconut Ice Cream");
  });
  it("'up to 100' includes a dish that costs exactly 100", async () => {
    const r = await rec("dessert up to 100 baht");
    expect(shown(r)).toEqual(["Mango Sticky Rice"]);
    expect(r.reply).toContain("up to ฿100");
  });
  it("a number without a budget word is not a budget", async () => {
    mockModel("Try the Thai Iced Tea.");
    const r = await answer("table 12 is celebrating, what do you suggest?", "en", await aiCtx());
    expect(r.usedModel).toBe(true);
  });
  it("says so when nothing matches, and what to change", async () => {
    const r = await rec("mild dishes under 40 baht");
    expect(r.reply).toContain("No dish on the menu matches mild, under ฿40 right now");
    expect(r.reply).toContain("Tell me what to change");
    expect(r.action).toEqual({ type: "show_dishes", ids: [] });
  });
  it("a vegetarian question with only a budget still uses the vegetarian rule", async () => {
    const r = await rec("vegetarian dishes under 100 baht");
    expect(r.reply).toMatch(/^Vegetarian dishes under ฿100:/);
    expect(r.topic).not.toBe("recommend");
  });
});

describe("type of dish and diet", () => {
  it.each([["any desserts?", ["Mango Sticky Rice"], "Desserts"], ["I would like a drink", ["Thai Iced Tea"], "Drinks"], ["any starters?", ["Fresh Spring Rolls", "Grilled Pork Skewers"], "Starters"]])("%s", async (q, expected, cat) => {
    const r = await rec(q);
    expect(shown(r)).toEqual(expected);
    expect(r.reply).toContain(cat as string);                       // the category's own name is shown
  });
  it("'vegetarian, not spicy' combines both", async () => {
    const r = await rec("vegetarian and not spicy");
    expect(shown(r)).toEqual(["Vegetable Tofu Stir-fry", "Mango Sticky Rice", "Thai Iced Tea"]);
    expect(r.reply).toContain("(mild, vegetarian)");
  });
  it("a category the owner does not have is ignored (the question then goes to the model)", async () => {
    mockModel("We have a few choices.");
    const r = await answer("any pizza?", "en", await aiCtx({ categories: categoriesOf(1) }));
    expect(r.usedModel).toBe(true);
  });
});

describe("popular: ranked by what diners really ordered here", () => {
  it("puts the most-ordered dishes first and shows how often", async () => {
    const r = await rec("what's popular?", "en", { popular: { [dish("Papaya Salad")]: 9, [dish("Shrimp Pad Thai")]: 5, [dish("Thai Iced Tea")]: 2 } });
    expect(shown(r)).toEqual(["Papaya Salad", "Shrimp Pad Thai", "Thai Iced Tea"]);
    expect(r.reply).toContain("Papaya Salad (฿70, very spicy, ordered 9×)");
  });
  it("with no orders yet it still answers (menu order) and does not invent order counts", async () => {
    const r = await rec("surprise me");
    expect(shown(r)).toHaveLength(3);
    expect(r.reply).not.toContain("ordered");
  });
  it("popularDishes counts the last 30 days of real orders and ignores cancelled ones", async () => {
    const send = (items: object[], table: string) => call(placeOrder, { method: "POST", params: { slug }, body: { table, items } });
    const a = await send([{ id: dish("Mango Sticky Rice"), qty: 3 }], "41");
    const b = await send([{ id: dish("Mango Sticky Rice"), qty: 2 }, { id: dish("Thai Iced Tea"), qty: 1 }], "42");
    const cancelled = await send([{ id: dish("Thai Iced Tea"), qty: 7 }], "43");
    await staffLogin("1111");
    await call(orderAction, { method: "POST", params: { id: String(cancelled.data.id) }, body: { action: "later" } });
    const old = await send([{ id: dish("Papaya Salad"), qty: 50 }], "44");
    run("UPDATE orders SET created_at = datetime('now','-40 day') WHERE id = ?", old.data.id);
    const p = popularDishes(1);
    expect(p[dish("Mango Sticky Rice")]).toBeGreaterThanOrEqual(5);
    expect(p[dish("Thai Iced Tea")]).toBeGreaterThanOrEqual(1);
    expect(p[dish("Papaya Salad")] ?? 0).toBeLessThan(50);           // older than 30 days
    expect(p[dish("Thai Iced Tea")] ?? 0).toBeLessThan(8);           // the cancelled 7 are not counted
    expect(a.status + b.status).toBe(400);
  });
  it("the chat endpoint feeds it in: after real orders 'what's popular?' puts them first", async () => {
    noModel();
    const r = await call(chat, { method: "POST", params: { slug }, body: { message: "what's popular?", sessionId: "pop-1", table: "9", lang: "en", preview: true } });
    expect(r.data.reply).toMatch(/dishes from our menu: Mango Sticky Rice \(฿100, not spicy, ordered \d+×\)/);   // the most-ordered dish is named first
    expect(r.data.dishes[0].name.en).toBe("Mango Sticky Rice");                                                  // and its card is shown first
  });
});

describe("the allergy profile applies to recommendations", () => {
  it("leaves out dishes with the diner's allergen or with no allergen data, and says so", async () => {
    const r = await rec("What's spicy?", "en", { profile: ["shellfish"] });
    expect(shown(r)).toEqual(["Steamed Fish with Lime"]);
    expect(r.reply).toContain("Your allergy profile (shellfish) is applied");
    expect(r.reply).toContain("Please confirm with the staff");
    expect(r.reply).not.toMatch(/Tom Yum|Papaya|Green Curry/);
  });
  it("never recommends a dish with no allergen data to a diner with an allergy profile", async () => {
    const r = await rec("a starter", "en", { profile: ["peanut"] });
    expect(r.reply).not.toContain("Fresh Spring Rolls");              // allergen data not provided
    expect(shown(r)).toEqual(["Grilled Pork Skewers"]);
  });
});

describe("Thai and Burmese", () => {
  it("Thai: mild and a budget, in Thai, from the data", async () => {
    const r = await rec("เมนูไม่เผ็ดราคาไม่เกิน 100 บาท", "th");
    expect(r.reply).toContain("ตามที่คุณบอก (ไม่เผ็ด, ไม่เกิน 100 บาท)");
    expect(r.reply).toContain("ชาไทยเย็น (50 บาท, ไม่เผ็ด)");
    expect(r.reply.trimEnd().endsWith("ครับ")).toBe(true);
    expect(shown(r)).toEqual(["Thai Iced Tea", "Grilled Pork Skewers", "Chicken Fried Rice"]);
  });
  it("Thai: 'what is spicy' (เผ็ดๆ มีอะไรบ้าง)", async () => {
    expect(shown(await rec("เมนูเผ็ดๆ มีอะไรบ้าง", "th"))[0]).toBe("Tom Yum Goong");
  });
  it("Burmese: mild under 100 baht, English allergen/price style, male voice", async () => {
    const r = await rec("မစပ်တဲ့ ဟင်းလျာ ဘတ် ၁၀၀ အောက်", "my");
    expect(r.reply).toContain("မစပ်၊ ဘတ် ၁၀၀ အောက် အရ");
    expect(r.reply).toContain("ဘတ်");
    expect(r.reply).toContain("ခင်ဗျာ");
    expect(shown(r)).toEqual(["Thai Iced Tea", "Grilled Pork Skewers", "Chicken Fried Rice"]);
  });
  it("Burmese: what is spicy", async () => {
    expect(shown(await rec("စပ်တာ ဘာရှိလဲ", "my"))[0]).toBe("Tom Yum Goong");
  });
});

describe("open questions and named dishes still go where they did", () => {
  it("'what would you recommend on a hot day?' is an open question for the model", async () => {
    mockModel("A Thai Iced Tea is refreshing.");
    const r = await answer("What would you recommend on a hot day?", "en", await aiCtx({ categories: categoriesOf(1) }));
    expect(r.usedModel).toBe(true);
  });
  it("'is the Tom Yum spicy?' names a dish, so it is not turned into a list", async () => {
    mockModel("Tom Yum Goong is a hot and sour soup.");
    const r = await answer("is the Tom Yum Goong spicy?", "en", await aiCtx({ categories: categoriesOf(1) }));
    expect(r.topic).not.toBe("recommend");
  });
});
