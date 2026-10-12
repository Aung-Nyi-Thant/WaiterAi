// AI-2 / AI-19 everyday questions in natural wording (eval/questions_natural.json): thanks, "can I pay by card?", cheapest / most
// expensive, "is the Tom Yum spicy?", "what's the difference between A and B", halal, seafood, "without shrimp", kids menu, plus what is
// done to a model reply (currency words, allergen remarks, the "answered" flag). Each of these was answered wrongly before:
// a Thai "thank you" with "here is our menu", a card question with a bill call, the wrong "cheapest dish", and so on.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, mockModel, noModel } from "./helpers";
import { answer, inLocalCurrency } from "@/modules/ai/ai";
import { categoriesOf, itemsOf } from "@/modules/platform/menu";

afterEach(() => { vi.unstubAllGlobals(); });
type L = "en" | "th" | "my";
const name = (id: number) => itemsOf(1).find((i) => i.id === id)!.name.en;
const shown = (r: { action: { ids?: number[] } }) => (r.action.ids ?? []).map(name);
// answered by the rules: the model is switched off and must not be called
const rules = async (msg: string, lang: L = "en", over: Record<string, unknown> = {}) => {
  const calls = noModel();
  const r = await answer(msg, lang, await aiCtx({ categories: categoriesOf(1), popular: {}, ...over }));
  expect(calls, `"${msg}" must be answered from the rules`).toHaveLength(0);
  return r;
};
// goes to the model, which says `reply`
const viaModel = async (msg: string, reply: string, lang: L = "en", over: Record<string, unknown> = {}) => {
  const calls = mockModel(reply);
  const r = await answer(msg, lang, await aiCtx({ categories: categoriesOf(1), popular: {}, ...over }));
  expect(calls, `"${msg}" should reach the model`).toHaveLength(1);
  return r;
};

describe("thanks", () => {
  it.each([["Thank you!", "en", "You're welcome"], ["ขอบคุณครับ", "th", "ยินดี"], ["ကျေးဇူးတင်ပါတယ်", "my", "ရပါတယ်"]] as [string, L, string][])("'%s' is answered with a welcome, not the menu", async (q, l, word) => {
    const r = await rules(q, l);
    expect(r.reply).toContain(word);
    expect(r.action.type).toBe("none");
  });
  it("a thank-you with a question in it still gets the question answered", async () => {
    const r = await rules("Thanks! How much is the Massaman curry?");
    expect(r.reply).toContain("฿160");
  });
});

describe("a Thai request that starts with ขอ is not 'show me the menu'", () => {
  it("ขอใบกำกับภาษี (a tax invoice) reaches the FAQ answer", async () => {
    const r = await viaModel("ขอใบกำกับภาษี", "ได้ครับ กรุณาแจ้งพนักงานก่อนชำระเงินครับ", "th");
    expect(r.action.type).not.toBe("show_menu");
    expect(r.reply).toContain("พนักงาน");
  });
  it("ขอดูเมนู still shows the menu", async () => {
    expect((await rules("ขอดูเมนูหน่อย", "th")).action.type).toBe("show_menu");
  });
});

describe("paying", () => {
  it("'Can I pay by credit card?' is a question, not a call for the bill", async () => {
    const r = await viaModel("Can I pay by credit card?", "I don't have that information. Please ask the staff.");
    expect(r.action.type).not.toBe("call_staff");
    expect(r.reply).not.toContain("called the staff");
  });
  it.each(["I want to pay", "Check please", "bill please"])("'%s' still calls the staff for the bill", async (q) => {
    const r = await rules(q);
    expect(r.action).toEqual({ type: "call_staff", kind: "bill" });
  });
});

describe("cheapest / most expensive, sorted from the real prices", () => {
  it("cheapest: Thai Iced Tea 50, Grilled Pork Skewers 60, Papaya Salad 70 (the sold-out ice cream is left out)", async () => {
    const r = await rules("What's the cheapest dish?");
    expect(shown(r)).toEqual(["Thai Iced Tea", "Grilled Pork Skewers", "Papaya Salad"]);
    expect(r.reply).toContain("Thai Iced Tea (฿50)");
  });
  it("most expensive", async () => {
    expect(shown(await rules("Which dish is the most expensive?"))).toEqual(["Steamed Fish with Lime", "Tom Yum Goong", "Beef Massaman Curry"]);
  });
  it("in Thai and in Burmese", async () => {
    expect(shown(await rules("อาหารที่ถูกที่สุดคืออะไร", "th"))[0]).toBe("Thai Iced Tea");
    expect(shown(await rules("အပေါဆုံး ဟင်း ဘာလဲ", "my"))[0]).toBe("Thai Iced Tea");
    expect(shown(await rules("แพงที่สุดคืออะไร", "th"))[0]).toBe("Steamed Fish with Lime");
  });
  it("within a type of dish: the cheapest dessert", async () => {
    expect(shown(await rules("What's the cheapest dessert?"))).toEqual(["Mango Sticky Rice"]);
  });
  it("the allergy profile is applied (shellfish: no Papaya Salad; dishes without allergen data are left out)", async () => {
    const r = await rules("What's the cheapest dish?", "en", { profile: ["shellfish"] });
    expect(shown(r)).toEqual(["Thai Iced Tea", "Grilled Pork Skewers", "Chicken Fried Rice"]);
    expect(r.reply).toContain("allergy profile");
  });
});

describe("a question about ONE named dish is answered about that dish", () => {
  it.each([["Is the Tom Yum very spicy?", "en", "very spicy"], ["ต้มยำเผ็ดมากไหม", "th", "เผ็ดมาก"], ["တွမ်ယမ်ကွန်း စပ်လား", "my", "အရမ်းစပ်"]] as [string, L, string][])("'%s'", async (q, l, word) => {
    const r = await rules(q, l);
    expect(shown(r)).toEqual(["Tom Yum Goong"]);
    expect(r.reply).toContain(word);
  });
  it("'not spicy' dishes are still a list, not a named-dish answer", async () => {
    expect(shown(await rules("any dish that is not spicy?")).length).toBeGreaterThan(1);
  });
});

describe("what's the difference between two dishes", () => {
  it("gives price and spice level of both and sends taste and portion questions to the staff", async () => {
    const r = await rules("What's the difference between the green curry and the massaman?");
    expect(shown(r).sort()).toEqual(["Beef Massaman Curry", "Chicken Green Curry"]);
    expect(r.reply).toContain("฿140");
    expect(r.reply).toContain("฿160");
    expect(r.reply).toContain("ask the staff");
    expect(r.reply).not.toContain("allergens");
  });
  it("in Thai", async () => {
    const r = await rules("แกงเขียวหวานกับมัสมั่นต่างกันยังไง", "th");
    expect(shown(r).sort()).toEqual(["Beef Massaman Curry", "Chicken Green Curry"]);
    expect(r.reply).toContain("พนักงาน");
  });
});

describe("halal: no data, said honestly, with the dishes that list pork", () => {
  it.each([["Is the pork skewer halal?", "en", "Grilled Pork Skewers"], ["มีอาหารฮาลาลไหม", "th", "หมูปิ้ง"], ["ဟလာလ် စားလို့ရလား", "my", "ဝန်ထမ်း"]] as [string, L, string][])("'%s'", async (q, l, word) => {
    const r = await rules(q, l);
    expect(r.reply).toContain(word);
    expect(shown(r)).toEqual(["Grilled Pork Skewers"]);
    expect(r.answered).toBe(false);                                   // the owner sees it in the insights and can add an FAQ
    expect(r.reply).not.toMatch(/\bis halal\b|เป็นอาหารฮาลาล/);
  });
});

describe("seafood", () => {
  it("lists the dishes whose allergen data has fish or shellfish, and says so", async () => {
    const r = await rules("Do you have seafood?");
    expect(r.reply).toContain("Tom Yum Goong");
    expect(r.reply).toContain("Steamed Fish with Lime");
    expect(r.reply).toContain("Allergen information is not provided for: Fresh Spring Rolls");
    expect(r.reply).toContain("confirm with the staff");
  });
  it("'I'm allergic to seafood' is still an allergy statement we cannot confirm, never a menu list", async () => {
    const r = await rules("I'm allergic to seafood");
    expect(r.answered).toBe(false);
    expect(r.reply).toContain("can't confirm");
  });
});

describe("'... without shrimp' is a change for the kitchen, not a list of other dishes", () => {
  it("shows the dish's own allergens and sends the change to the staff", async () => {
    const r = await rules("Can I have the Tom Yum without shrimp?");
    expect(shown(r)).toEqual(["Tom Yum Goong"]);
    expect(r.reply).toContain("shellfish");
    expect(r.reply).toContain("can't promise");
    expect(r.reply).not.toContain("Dishes that do not list");
  });
  it("in Thai", async () => {
    const r = await rules("ขอต้มยำไม่ใส่กุ้งได้ไหม", "th");
    expect(shown(r)).toEqual(["Tom Yum Goong"]);
    expect(r.reply).toContain("พนักงานยืนยัน");
  });
  it("'dishes without peanuts' (no dish named) is still the list", async () => {
    expect((await rules("Which dishes are without peanuts?")).reply).toContain("Dishes that do not list peanut");
  });
});

describe("other everyday questions", () => {
  it("'Do you have a kids menu?' is not answered with 'Here is our menu.'", async () => {
    const r = await viaModel("Do you have a kids menu?", "I don't have a separate kids menu. Please ask the staff.");
    expect(r.action.type).not.toBe("show_menu");
  });
  it.each(["What's your most famous dish?", "What's your signature dish?", "Which dish is a must try?"])("'%s' uses the real orders (popular)", async (q) => {
    const r = await rules(q);
    expect(r.topic).toBe("recommend");
    expect(r.reply).not.toContain("don't have");
  });
});

describe("what is done to a model reply", () => {
  it("Thai and Burmese replies say บาท / ဘတ်, not THB or ฿", () => {
    expect(inLocalCurrency("ผัดไทยกุ้ง (120 THB) และแกงเขียวหวาน ฿140", "th")).toBe("ผัดไทยกุ้ง (120 บาท) และแกงเขียวหวาน 140 บาท");
    expect(inLocalCurrency("တွမ်ယမ်ကွန်း 180 THB", "my")).toBe("တွမ်ယမ်ကွန်း 180 ဘတ်");
    expect(inLocalCurrency("Pad Thai is 120 THB", "en")).toBe("Pad Thai is 120 THB");
  });
  it("the Thai model reply is shown with บาท", async () => {
    const r = await viaModel("แนะนำเมนูสำหรับสองคนหน่อย", "แนะนำผัดไทยกุ้ง (120 THB) กับแกงเขียวหวานไก่ (140 THB) ครับ", "th");
    expect(r.reply).toContain("120 บาท");
    expect(r.reply).not.toContain("THB");
  });
  it("an allergen remark the diner did not ask for is dropped; the rest of the answer stays", async () => {
    const r = await viaModel("what soup do you have", "Our soup is the Tom Yum Goong (฿180). It contains shellfish and fish. It is very popular with our guests.");
    expect(r.reply).toContain("Tom Yum Goong");
    expect(r.reply).not.toMatch(/shellfish|fish\b/);
  });
  it("a remark about a NAMED dish is still replaced by that dish's stored allergen data (the one in the sentence, not the first dish in the reply)", async () => {
    const r = await viaModel("what soup do you have", "Our soup is the Tom Yum Goong, a hot and sour shrimp soup. Would you like a Mango Sticky Rice after it?");
    expect(r.reply).toBe("Tom Yum Goong lists these allergens: shellfish, fish. Please confirm with the staff before ordering.");
    expect(shown(r)).toEqual(["Tom Yum Goong"]);
  });
  it("a reply that only says nothing but an allergen statement is still replaced (nothing about allergens gets through)", async () => {
    const r = await viaModel("what soup do you have", "Tom Yum Goong contains shellfish.");
    expect(r.reply).not.toMatch(/contains shellfish/);
  });
  it("'answered' is true for an answer that sends the diner to the staff for a detail, false when the information is missing", async () => {
    expect((await viaModel("is there wifi", "Yes, free Wi-Fi. Please ask the staff for the password.")).answered).toBe(true);
    expect((await viaModel("มี wifi ไหม", "มี Wi-Fi ฟรีครับ กรุณาสอบถามรหัสผ่านจากพนักงานครับ", "th")).answered).toBe(true);
    expect((await viaModel("how long does the food take", "I'm sorry, I don't have that information. Please ask the staff.")).answered).toBe(false);
  });
  it("the prompt tells the model not to guess times, portion sizes, payment methods or popularity", async () => {
    const calls = mockModel("Hello!");
    await answer("tell me a joke", "en", await aiCtx({ categories: categoriesOf(1), popular: {} }));
    const system = String(calls[0].body.messages[0].content);
    expect(system).toContain("NO information about waiting or cooking times");
    expect(system).toContain("Do not greet or welcome the customer unless they greeted you first");
  });
});
