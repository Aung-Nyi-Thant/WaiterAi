// AI-2 / AI-19 / NFR-S1: what the 126-question open evaluation (eval/open_questions.json) found wrong when read answer by answer:
// "what should we order?" showed the menu, a Thai "tell me about X" added X to the picks, a Burmese "are you a real person?" was
// answered "I'm a staff member", "without meat or fish" listed meat dishes, a Burmese reply said a dish with no allergen data has none.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, mockModel, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { categoriesOf, itemsOf } from "@/modules/platform/menu";

afterEach(() => { vi.unstubAllGlobals(); });
type L = "en" | "th" | "my";
const name = (id: number) => itemsOf(1).find((i) => i.id === id)!.name.en;
const shown = (r: { action: { ids?: number[] } }) => (r.action.ids ?? []).map(name);
const ctx = async (over: Record<string, unknown> = {}) => aiCtx({ categories: categoriesOf(1), popular: {}, ...over });
const rules = async (msg: string, lang: L = "en", over: Record<string, unknown> = {}) => {
  const calls = noModel();
  const r = await answer(msg, lang, await ctx(over));
  expect(calls, `"${msg}" must be answered from the rules`).toHaveLength(0);
  return r;
};
const viaModel = async (msg: string, reply: string, lang: L = "en") => {
  const calls = mockModel(reply);
  const r = await answer(msg, lang, await ctx());
  expect(calls, `"${msg}" should reach the model`).toHaveLength(1);
  return r;
};
const NOT_STAFF = /staff member|a waiter|พนักงานต้อนรับ|ဝန်ဆောင်မှုပေးသူ ဝန်ထမ်း/;

describe("a question word is not 'show me the menu'", () => {
  it.each([["What should we order for two people?", "en"], ["I don't eat beef, what can I have?", "en"], ["สองคนควรสั่งอะไรดี", "th"], ["နှစ်ယောက်စားအတွက် ဘာမှာသင့်လဲ", "my"]] as [string, L][])("'%s' goes to the model", async (q, l) => {
    const r = await viaModel(q, "ok", l);
    expect(r.action.type).not.toBe("show_menu");
  });
  it("a plain 'I want to order' still shows the menu", async () => {
    expect((await rules("I want to order")).action.type).toBe("show_menu");
  });
  it("a question about reserving a table is not 'show me the menu' either (Burmese 'ကြိုမှာ' contains 'order')", async () => {
    const r = await viaModel("စားပွဲ ကြိုမှာလို့ရလား", "ကျွန်တော် အဲဒီအချက်အလက် မသိပါဘူးခင်ဗျာ။", "my");
    expect(r.action.type).not.toBe("show_menu");
  });
});

describe("'what is X?' is answered from the owner's description", () => {
  it.each([["What is Tom Yum Goong?", "en"], ["ต้มยำกุ้งคืออะไร", "th"], ["တွမ်ယမ်ကွန်း ဆိုတာ ဘာလဲ", "my"]] as [string, L][])("'%s'", async (q, l) => {
    const r = await rules(q, l);
    expect(r.reply).toContain("Hot and sour shrimp soup with lemongrass and lime.");
    expect(shown(r)).toEqual(["Tom Yum Goong"]);
    expect(r.action.type).toBe("show_dishes");
  });
  it("a Thai 'tell me about X, please' does NOT put X in the picks (หน่อย used to mean 'order it')", async () => {
    const r = await rules("เล่าเรื่องแกงมัสมั่นให้ฟังหน่อย", "th");
    expect(r.action.type).toBe("show_dishes");
    expect(r.reply).not.toContain("เพิ่มลงในรายการ");
  });
  it("a sold-out dish says it is sold out instead of being described", async () => {
    const r = await rules("What is Coconut Ice Cream?");
    expect(r.reply).toContain("sold out");
  });
});

describe("'what's in X?' gives the ingredients", () => {
  it.each([["What's in the Fresh Spring Rolls?", "en", "made with"], ["ปอเปี๊ยะสดมีอะไรบ้าง", "th", "ส่วนผสมของ"], ["ကော်ပြန့်စိမ်းမှာ ဘာတွေပါလဲ", "my", "ပါဝင်ပစ္စည်းများ"]] as [string, L, string][])("'%s'", async (q, l, word) => {
    const r = await rules(q, l);
    expect(r.reply).toContain(word);
    expect(shown(r)).toEqual(["Fresh Spring Rolls"]);
  });
});

describe("portion size and the Burmese 'how big' (no data, never a guess)", () => {
  it.each([["How big is the Pad Thai?", "en"], ["ผัดไทยจานใหญ่ไหม", "th"], ["ပတ်ထိုင်း ဘယ်လောက်ကြီးလဲ", "my"]] as [string, L][])("'%s' says there is no portion information", async (q, l) => {
    const r = await rules(q, l);
    expect(r.answered).toBe(false);
    expect(r.reply).not.toMatch(/฿|บาท|ဘတ်/);                              // not a price
  });
  it("the Burmese 'how much' is still a price question", async () => {
    expect((await rules("ပတ်ထိုင်း ဘယ်လောက်လဲ", "my")).reply).toContain("၁၂၀ ဘတ်");
  });
});

describe("'is X vegan / vegetarian?' and 'is there pork in X?' come from the owner's tags", () => {
  it("vegan", async () => {
    const r = await rules("Is the Mango Sticky Rice vegan?");
    expect(r.reply).toContain("is tagged vegan on our menu");
    expect(r.reply).toContain("confirm with the staff");
  });
  it("vegetarian only, asked as vegan", async () => {
    expect((await rules("Is the Thai Iced Tea vegan?")).reply).toContain("is tagged vegetarian, not vegan");
  });
  it("not tagged: says it may contain meat or fish, never 'yes'", async () => {
    const r = await rules("I'm vegetarian. Is the Pad Thai okay?");
    expect(r.reply).toContain("is not tagged vegetarian on our menu, so it may contain meat or fish");
    expect(r.reply).not.toMatch(/\byes\b/i);
  });
  it("in Thai and Burmese", async () => {
    expect((await rules("ข้าวเหนียวมะม่วงเป็นวีแกนไหม", "th")).reply).toContain("ในเมนูระบุว่าเป็นวีแกน");
    expect((await rules("သရက်သီးကောက်ညှင်းပေါင်းက Vegan လား", "my")).reply).toContain("Vegan လို့ ဖော်ပြထားပါတယ်");
  });
  it("pork: tagged dish and untagged dish; the dish's own name 'Pork' is not read as the question", async () => {
    expect((await rules("Is there pork in the Fried Rice?")).reply).toContain("is not tagged as containing pork");
    expect((await rules("Is there pork in the Grilled Pork Skewers?")).reply).toContain("is tagged as containing pork");
    expect((await rules("How much are the Grilled Pork Skewers?")).reply).toContain("฿60");
  });
});

describe("'which is spicier / cheaper / more expensive?' is compared from the data", () => {
  it("English", async () => {
    expect((await rules("Which is spicier, the Green Curry or the Papaya Salad?")).reply).toMatch(/^Papaya Salad is spicier \(very spicy\); Chicken Green Curry is spicy\./);
    expect((await rules("Which is cheaper, the Fried Rice or the Pad Thai?")).reply).toContain("Chicken Fried Rice is cheaper (฿80); Shrimp Pad Thai is ฿120.");
    expect((await rules("Which is more expensive, the Tom Yum or the Pad Thai?")).reply).toContain("Tom Yum Goong is more expensive");
  });
  it("Thai and Burmese", async () => {
    expect((await rules("แกงเขียวหวานกับส้มตำอันไหนเผ็ดกว่า", "th")).reply).toMatch(/^ส้มตำเผ็ดกว่า/);
    expect((await rules("ဂရင်းကာရီနဲ့ သင်္ဘောသီးသုပ် ဘယ်ဟာ ပိုစပ်လဲ", "my")).reply).toMatch(/^သင်္ဘောသီးသုပ် က .* ပိုစပ်ပါတယ်/);
  });
});

describe("who am I talking to? The AI is honest that it is the AI", () => {
  it.each([["Are you a real person?", "en", "not a person"], ["Who are you?", "en", "AI waiter"], ["คุณเป็นคนจริงๆ หรือเปล่า", "th", "ไม่ใช่คน"], ["လူအစစ်လား", "my", "လူမဟုတ်ပါဘူး"]] as [string, L, string][])("'%s'", async (q, l, word) => {
    const r = await rules(q, l);
    expect(r.reply).toContain(word);
    expect(r.reply).not.toMatch(NOT_STAFF);
    expect(r.reply).toContain(l === "en" ? "Call staff" : l === "th" ? "เรียกพนักงาน" : "ဝန်ထမ်းခေါ်");   // and where the people are
  });
  it("uses the owner's name for the assistant and the restaurant's name", async () => {
    const c = await ctx(); c.restaurant = { ...c.restaurant, persona: { ...c.restaurant.persona, name: "Lotus" } };
    noModel();
    expect((await answer("Who are you?", "en", c)).reply).toContain("I'm Lotus, the AI waiter of Golden Lotus Kitchen");
  });
});

describe("a complaint gets an apology and the staff, not a dish recommendation", () => {
  it.each([["My food is cold", "en", "I'm sorry"], ["I've been waiting too long", "en", "I'm sorry"], ["อาหารของฉันเย็นแล้ว", "th", "ขออภัย"], ["รอนานมากแล้ว", "th", "ขออภัย"], ["ကျွန်တော့်အစားအစာ အေးနေပြီ", "my", "တောင်းပန်"], ["ကြာနေပြီ", "my", "တောင်းပန်"]] as [string, L, string][])("'%s'", async (q, l, word) => {
    const r = await rules(q, l);
    expect(r.reply).toContain(word);
    expect(r.action).toEqual({ type: "call_staff", kind: "help" });
  });
  it("'How long does the food take?' is a question, not a complaint", async () => {
    const r = await viaModel("How long does the food take?", "I'm sorry, I don't have that information. Please ask the staff.");
    expect(r.action.type).not.toBe("call_staff");
  });
});

describe("'without meat' is a vegetarian request, even with 'fish' in it", () => {
  it.each([["Anything without meat or fish?", "en"], ["มีอะไรที่ไม่มีเนื้อสัตว์ไหม", "th"], ["အသားငါး မပါတာ ရှိလား", "my"]] as [string, L][])("'%s' lists only vegetarian dishes", async (q, l) => {
    const r = await rules(q, l);
    expect(shown(r).sort()).toEqual(["Mango Sticky Rice", "Thai Iced Tea", "Vegetable Tofu Stir-fry"]);
  });
  it("an allergy statement still wins ('I'm allergic to fish' is not 'meat-free')", async () => {
    const r = await rules("I'm allergic to fish, any dish without meat?");
    expect(r.topic).toBe("allergens");
  });
});

describe("a question about one named dish is answered about that dish", () => {
  it("'Does the Tom Yum have dairy?' lists that dish's allergens, not the dishes with milk", async () => {
    const r = await rules("Does the Tom Yum have dairy?");
    expect(r.reply).toContain("Tom Yum Goong lists these allergens: shellfish, fish.");
    expect(shown(r)).toEqual(["Tom Yum Goong"]);
  });
});

describe("Thai 'under 50' says ต่ำกว่า, not ไม่เกิน", () => {
  it("exclusive and inclusive budgets are worded differently", async () => {
    expect((await rules("มีอะไรต่ำกว่า 50 บาทไหม", "th")).reply).toContain("ต่ำกว่า 50 บาท");
    expect((await rules("ไม่เกิน 100 บาท มีอะไรบ้าง", "th")).reply).toContain("ไม่เกิน 100 บาท");
  });
});

describe("a model reply cannot say, in Thai or Burmese, that a dish has no allergens", () => {
  it("Burmese 'Allergens မရှိပါဘူး' for a dish whose allergen data is 'not provided' is replaced by the stored data", async () => {
    const r = await viaModel("ကော်ပြန့်စိမ်းက ဘာလဲ ပြောပြပါ", "ဟင်းသီးဟင်းရွက် ကော်ပြန့်စိမ်း ဟာ ၈၅ ဘတ် ဖြစ်ပါတယ်ခင်ဗျာ။ ဒီဟင်းလျာမှာ Allergens မရှိပါဘူး။", "my");
    expect(r.reply).toContain("Allergen အချက်အလက် မရှိပါဘူး");              // the rule's own sentence: no information
    expect(r.reply).not.toMatch(/ဒီဟင်းလျာမှာ Allergens မရှိ/);
    expect(shown(r)).toEqual(["Fresh Spring Rolls"]);
  });
  it("Thai 'ไม่มีสารก่อภูมิแพ้' is replaced; 'ไม่มีข้อมูลสารก่อภูมิแพ้' (no information) is a fine thing to say", async () => {
    const bad = await viaModel("ปอเปี๊ยะสดเป็นยังไง", "ปอเปี๊ยะสด ไม่มีสารก่อภูมิแพ้ ครับ", "th");
    expect(bad.reply).toContain("ยังไม่มีข้อมูลสารก่อภูมิแพ้");
    const fine = await viaModel("ปอเปี๊ยะสดเป็นยังไง", "ผมไม่มีข้อมูลสารก่อภูมิแพ้ของปอเปี๊ยะสด กรุณาสอบถามพนักงานครับ", "th");
    expect(fine.reply).toContain("ผมไม่มีข้อมูลสารก่อภูมิแพ้ของปอเปี๊ยะสด");
  });
});

describe("what is kept when the model's answer is partly an allergen claim", () => {
  it("a recommendation with one wrong allergen remark about a dish keeps the recommendation and adds that dish's stored data", async () => {
    const r = await viaModel("What should we order for two people?", "I recommend the Shrimp Pad Thai and the Chicken Green Curry. The Chicken Green Curry is free of shellfish.");
    expect(r.reply.startsWith("I recommend the Shrimp Pad Thai and the Chicken Green Curry.")).toBe(true);
    expect(r.reply).toContain("Chicken Green Curry lists these allergens: shellfish");
    expect(r.reply).not.toMatch(/free of shellfish/);
    expect(shown(r)).toEqual(["Chicken Green Curry"]);
  });
});

describe("a reply that is only 'how can I help?' does not count as an answer", () => {
  it.each([["Do you do catering for big parties?", "How can I help you today?", "en"], ["ဆိုင်ကို ဘယ်လိုလာရမလဲ", "ဘာများ ကူညီပေးရမလဲခင်ဗျာ။", "my"]] as [string, string, L][])("'%s'", async (q, reply, l) => {
    const r = await viaModel(q, reply, l);
    expect(r.answered).toBe(false);
    expect(r.reply).toMatch(/don't have that information|ไม่มีข้อมูล|အချက်အလက် မရှိ/);
  });
  it("but it is the right answer to a greeting", async () => {
    const r = await viaModel("Hello!", "Hello! How can I help you today?");
    expect(r.reply).toBe("Hello! How can I help you today?");
  });
});
