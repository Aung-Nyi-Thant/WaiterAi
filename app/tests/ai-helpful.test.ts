// A diner who asks for a suggestion, a joke or "how are you?" is never answered with "I don't have that information" (found by the
// strict live eval, `helpful: true` in eval/*.json). Real "no data" questions (reservations, the toilet, portion sizes) still are.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, mockModel, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { categoriesOf, itemsOf } from "@/modules/platform/menu";

afterEach(() => { vi.unstubAllGlobals(); });
type L = "en" | "th" | "my";
const DONT_KNOW = /don'?t have (?:that |any )?information|ไม่มีข้อมูล|အချက်အလက် မရှိ/;
const ctx = (over: Record<string, unknown> = {}) => aiCtx({ categories: categoriesOf(1), popular: {}, ...over });
const names = (r: { action: { ids?: number[] } }) => (r.action.ids ?? []).map((id) => itemsOf(1).find((i) => i.id === id)!.name.en);

describe("small talk", () => {
  it.each([["Tell me a joke", "en"], ["เล่าเรื่องตลกหน่อย", "th"], ["ဟာသတစ်ခု ပြောပြပါ", "my"], ["How are you?", "en"], ["สบายดีไหม", "th"]] as [string, L][])("'%s' is answered by the rules with a friendly line, not 'no information'", async (q, l) => {
    const calls = noModel();
    const r = await answer(q, l, await ctx());
    expect(calls).toHaveLength(0);
    expect(r.reply).not.toMatch(DONT_KNOW);
    expect(r.answered).toBe(true);
    expect(r.action.type).toBe("none");
  });
});

describe("a request for a suggestion that the model answers with 'no information'", () => {
  const REFUSALS: [string, L, string][] = [
    ["I'd like something light, not heavy", "en", "I don't have that information. Please ask the staff."],
    ["วันนี้อากาศร้อน แนะนำอะไรดี", "th", "ขออภัย ไม่มีข้อมูลนี้ครับ กรุณาสอบถามพนักงานครับ"],
    ["ဒီနေ့ ရာသီဥတု ပူတယ်၊ ဘာစားသင့်လဲ", "my", "ကျွန်တော်မှာ အဲဒီအချက်အလက် မရှိပါဘူးခင်ဗျာ။"],
  ];
  it.each(REFUSALS)("'%s' gets available dishes from the database instead", async (q, l, refusal) => {
    mockModel(refusal);
    const r = await answer(q, l, await ctx());
    expect(r.reply).not.toMatch(DONT_KNOW);
    expect(r.action.type).toBe("show_dishes");
    expect(r.action.ids?.length).toBeGreaterThan(0);
    expect(r.answered).toBe(true);
    for (const id of r.action.ids ?? []) expect(itemsOf(1).find((i) => i.id === id)!.available).toBe(true);
  });
  it("the suggested dishes respect the diner's allergy profile and are never sold-out ones", async () => {
    mockModel("I don't have that information. Please ask the staff.");
    const r = await answer("What do you recommend for two people sharing?", "en", await ctx({ profile: ["peanut"] }));
    expect(r.action.type).toBe("show_dishes");
    expect(r.action.ids).toEqual([]); // the demo menu has estimates, not restaurant checks
    for (const id of r.action.ids ?? []) {
      const it = itemsOf(1).find((i) => i.id === id)!;
      expect(it.available).toBe(true);
      expect(it.allergens).not.toBeNull();
      expect(it.allergens).not.toContain("peanut");
    }
    expect(r.reply).toMatch(/restaurant-checked/i);
    expect(r.reply).toContain("can't suggest a restaurant-checked dish");
  });
  it("a made-up dish in the model's reply to a suggestion request is still thrown away, and real dishes are shown", async () => {
    mockModel("You should try the Lobster Thermidor Roll (250 THB).\nACTION: none");
    const r = await answer("What should I order?", "en", await ctx());
    expect(r.reply).not.toContain("Lobster");
    expect(r.action.type).toBe("show_dishes");
    expect(names(r).length).toBeGreaterThan(0);
  });
  it("a reply to a suggestion request that names no dish at all gets dishes from the database", async () => {
    mockModel("Of course! Do you prefer something spicy or mild?\nACTION: none");
    const r = await answer("I'd like something light, not heavy", "en", await ctx());
    expect(r.action.type).toBe("show_dishes");
    expect(r.reply).toMatch(/good places to start/);
  });
  it("a reply that already names real dishes is kept as it is", async () => {
    mockModel("I don't have information on taste, but the Tom Yum Goong (180 THB) is popular with guests.\nACTION: none");
    const r = await answer("I'd like something light, not heavy", "en", await ctx());
    expect(r.reply).toContain("Tom Yum Goong");
  });
});

describe("questions the data cannot answer: the staff sentence and the Call staff button, never \"I don't have that information\"", () => {
  it.each([["How long does the food take?"], ["Is there a toilet?"], ["How big is the Pad Thai?"]])("'%s' is left to the staff without calling the model", async (q) => {
    const calls = noModel();
    const r = await answer(q, "en", await ctx());
    expect(calls).toHaveLength(0);
    expect(r.reply).toMatch(/best answered by our staff/);
    expect(r.reply).not.toMatch(DONT_KNOW);
    expect(r.offer).toBe("help");
    expect(r.answered).toBe(false);                       // the owner sees it in the insights and can add an FAQ
  });
  it("the model saying 'no information' about something else gets the same sentence and button", async () => {
    mockModel("I do not have information about the chef's family.");
    const r = await answer("Tell me about the chef's story", "en", await ctx());
    expect(r.reply).toMatch(/best answered by our staff/);
    expect(r.offer).toBe("help");
  });
});
