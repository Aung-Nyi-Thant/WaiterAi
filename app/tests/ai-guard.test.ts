// The language model path: whatever the model says is checked before the diner sees it.
// Questions here are open ones ("what do you recommend?") that the rules do not handle.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, mockModel } from "./helpers";
import { answer } from "@/modules/ai/ai";

afterEach(() => { vi.unstubAllGlobals(); });
const OPEN = "What would you recommend on a hot day?";
const ask = async (reply: string | Error, msg = OPEN, ctxOver: Record<string, unknown> = {}) => {
  const calls = mockModel(reply);
  const r = await answer(msg, "en", await aiCtx(ctxOver));
  return { r, calls };
};
const REFUSAL = "I don't have that information. Please ask the staff.";

describe("AI-9 / ST-3 open questions go to the model, with the restaurant's data (menu, hours, FAQs, owner rules) as the only source", () => {
  it("passes a good reply through and marks it answered", async () => {
    const { r, calls } = await ask("A Thai Iced Tea is refreshing.\nACTION: none");
    expect(calls.length).toBe(1);
    expect(r.usedModel).toBe(true);
    expect(r.reply).toBe("A Thai Iced Tea is refreshing.");
    expect(r.answered).toBe(true);
  });
  it("sends the menu, hours, FAQ and the rules in the system prompt, but not the ingredients", async () => {
    const { calls } = await ask("ok");
    const sys = calls[0].body.messages[0];
    expect(sys.role).toBe("system");
    expect(sys.content).toContain("Use ONLY the restaurant data below");
    expect(sys.content).toContain("Never invent dishes, prices, ingredients, allergens or opening hours");
    expect(sys.content).toContain('Never say a dish is "safe"');
    expect(sys.content).toContain("Shrimp Pad Thai");
    expect(sys.content).toContain("Open every day 10:00-22:00 (last order 21:30)");
    expect(sys.content).toContain("Is there Wi-Fi?");
    expect(sys.content).not.toContain("crushed peanuts");
  });
  it("sends only the last two turns of history, then the question; low temperature and a capped length", async () => {
    const history = [1, 2, 3, 4].map((n) => ({ role: n % 2 ? "user" : "assistant", text: `turn ${n}` }));
    const { calls } = await ask("ok", OPEN, { history });
    const msgs = calls[0].body.messages;
    expect(msgs.map((m: any) => m.content).slice(1)).toEqual(["turn 3", "turn 4", OPEN]);
    expect(calls[0].body.options).toMatchObject({ temperature: 0.2, num_predict: 220 });
    expect(calls[0].body.stream).toBe(false);
  });
  it("tells the model the owner's voice and rules", async () => {
    const c = await aiCtx();
    const { calls } = await ask("ok", OPEN, { restaurant: { ...c.restaurant, persona: { ...c.restaurant.persona, gender: "female", name: "Lotus", rules: "No durian talk." } } });
    const sys = calls[0].body.messages[0].content;
    expect(sys).toContain('You are "Lotus"');
    expect(sys).toContain("The waiter is FEMALE");
    expect(sys).toContain("Owner rules: No durian talk.");
  });
});

describe("AI-3 / AI-10 / NFR-S3 a wrong or unsafe model reply is replaced", () => {
  it.each([
    ["claims a dish is safe", "Yes, the Pad Thai is safe to eat."],
    ["says allergy-free", "Our Mango Sticky Rice is allergy-free!"],
    ["says there are no allergens", "There are no allergens in the tofu stir-fry."],
    ["guarantees", "I guarantee this has no peanuts."],
    ["says safe in Thai", "ผัดไทยปลอดภัยสำหรับคุณ"],
    ["says safe in Burmese", "ဒီဟင်းလျာက ဘေးကင်းပါတယ်"],
  ])("%s", async (_n, reply) => {
    const { r } = await ask(reply);
    expect(r.reply).toBe(REFUSAL);
    expect(r.answered).toBe(false);
    expect(r.action.type).toBe("none");
    expect(r.usedModel).toBe(true);
  });
  it("does not block 'not safe' wording in Thai (ไม่ปลอดภัย)", async () => {
    const { r } = await ask("ขออภัย อาจไม่ปลอดภัยสำหรับคนแพ้ กรุณาถามพนักงาน");
    expect(r.reply).toContain("ไม่ปลอดภัย");
  });
  it.each([
    ["a price that differs from the menu", "The Shrimp Pad Thai costs ฿99."],
    ["a wrong price in Thai", "ผัดไทยกุ้ง ราคา 99 บาท"],
    ["a wrong price in Burmese digits", "ပုစွန် ပတ်ထိုင်း ၉၉ ဘတ်"],
    ["a wrong price for another dish", "Try the Papaya Salad (฿75), it is lovely."],
  ])("%s", async (_n, reply) => {
    const { r } = await ask(reply);
    expect(r.reply).toBe(REFUSAL);
    expect(r.answered).toBe(false);
  });
  it.each([
    ["a price that comes before the dish name", "For ฿99 you can get the Shrimp Pad Thai."],
    ["an amount with no dish name", "Most mains are around 95 baht."],
    ["a made-up amount in Thai", "ราคาเริ่มต้น 99 บาท"],
    ["a made-up amount in Burmese digits", "၉၉ ဘတ် ပဲ ကျပါတယ်"],
    ["THB written after the number", "That is 99 THB."],
  ])("AI-10 replaces %s", async (_n, reply) => {
    const { r } = await ask(reply);
    expect(r.reply).toBe(REFUSAL);
    expect(r.answered).toBe(false);
  });
  it("keeps amounts that are real menu prices (any language), and numbers the diner wrote themselves", async () => {
    expect((await ask("Try the Thai Iced Tea for 50 THB or the tofu for ฿90.")).r.reply).toBe("Try the Thai Iced Tea for 50 THB or the tofu for ฿90.");
    expect((await ask("ราคา 120 บาท ครับ")).r.reply).toBe("ราคา 120 บาท ครับ");
    expect((await ask("Here is what fits under 150 baht: the Thai Iced Tea.", "I only have 150 baht, what can I eat?")).r.reply).toContain("under 150 baht");
    expect((await ask("Here is what fits under 150 baht: the Thai Iced Tea.", "what can I eat?")).r.reply).toBe(REFUSAL);   // 150 is neither a menu price nor the diner's number
  });
  it.each([
    ["a price before the dish that belongs to a different dish", "For ฿50 you can get the Shrimp Pad Thai."],
    ["a price after 'is' that belongs to a different dish", "฿70 is what the Beef Massaman Curry costs."],
    ["a price in front of a dish in Thai", "ราคา 70 บาท สำหรับผัดไทยกุ้ง"],
    ["two dishes with the price of a third", "The Shrimp Pad Thai and the Tom Yum Goong are both 50 THB."],
  ])("AI-10 / R2 replaces %s", async (_n, reply) => {
    const { r } = await ask(reply);
    expect(r.reply).toBe(REFUSAL);
  });
  it.each([
    "Tom Yum Goong (฿180), Beef Massaman Curry (฿160) and Thai Iced Tea (฿50) are popular.",
    "I recommend the Thai Iced Tea for 50 THB or the Mango Sticky Rice for 100 THB.",
    "For ฿70 you can get the Papaya Salad.",
    "The Papaya Salad is ฿70 and the Thai Iced Tea is ฿50.",
    "ผัดไทยกุ้ง ราคา 120 บาท และ ชาไทยเย็น ราคา 50 บาท",
  ])("keeps a price that sits next to its own dish: %s", async (reply) => {
    const { r } = await ask(reply);
    expect(r.reply).toBe(reply);
  });
  it("lets the diner's own budget be repeated next to a dish, but never as the dish's price", async () => {
    const ok = await ask("With 150 baht you can have the Chicken Fried Rice (80 THB).", "I only have 150 baht, what can I eat?");
    expect(ok.r.reply).toContain("With 150 baht");
    expect((await ask("The Chicken Fried Rice is 150 baht.", "I only have 150 baht, what can I eat?")).r.reply).toBe(REFUSAL);          // the diner's budget is never the dish's price
  });
  it("accepts a correct price", async () => {
    const { r } = await ask("The Shrimp Pad Thai is ฿120 and very popular.");
    expect(r.reply).toBe("The Shrimp Pad Thai is ฿120 and very popular.");
  });
  it("replaces an empty reply", async () => {
    expect((await ask("")).r.reply).toBe(REFUSAL);
    expect((await ask("   \nACTION: none")).r.reply).toBe(REFUSAL);
  });
  it("the replacement refusal is in the diner's language and voice", async () => {
    mockModel("This is safe to eat");
    const c = await aiCtx();
    expect((await answer("อะไรอร่อยบ้างวันนี้ ช่วยเลือกให้หน่อย", "th", c)).reply).toBe("ขออภัย ไม่มีข้อมูลนี้ครับ กรุณาสอบถามพนักงานครับ");
    mockModel("This is safe to eat");
    expect((await answer("ဘာကောင်းလဲ ရွေးပေးပါ", "my", c)).reply).toContain("ဝန်ထမ်းကို မေးမြန်းပေးပါ");
  });
});

describe("AI-10 dish cards suggested by the model must be real dishes that are on sale", () => {
  it("drops unknown ids and sold-out dishes, and shows at most 4", async () => {
    const c = await aiCtx();
    const id = (n: string) => c.items.find((i) => i.name.en === n)!.id;
    const ids = [id("Thai Iced Tea"), 99999, id("Coconut Ice Cream"), id("Papaya Salad"), id("Tom Yum Goong"), id("Chicken Fried Rice"), id("Beef Massaman Curry")];
    const { r } = await ask(`Here are some ideas.\nACTION: {"type":"show_dishes","ids":${JSON.stringify(ids)}}`);
    expect(r.action).toEqual({ type: "show_dishes", ids: [id("Thai Iced Tea"), id("Papaya Salad"), id("Tom Yum Goong"), id("Chicken Fried Rice")] });
  });
  it("ignores a malformed or unknown action; the reply text is kept", async () => {
    expect((await ask("Fine.\nACTION: {not json")).r.action.type).toBe("none");
    expect((await ask('Fine.\nACTION: {"type":"add_to_picks","ids":[1]}')).r.action.type).toBe("none");   // the model cannot add to picks or call staff
    expect((await ask('Fine.\nACTION: {"type":"call_staff"}')).r.action.type).toBe("none");
    expect((await ask('Fine.\nACTION: {"type":"show_dishes","ids":[99999]}')).r.action.type).toBe("none");
    expect((await ask("Fine.")).r.reply).toBe("Fine.");
  });
  it("never shows the ACTION line to the diner", async () => {
    const { r } = await ask('A nice choice.\nACTION: {"type":"show_dishes","ids":[1]}');
    expect(r.reply).toBe("A nice choice.");
  });
});

describe("AI-10 / R1 a dish that is not on the menu is not recommended", () => {
  it.each([
    ["a made-up dish in the middle of a sentence", "We have a lovely Lobster Thermidor tonight."],
    ["a made-up dish at the start of a sentence", "Lobster Thermidor is our chef's special today."],
    ["a made-up dish after 'try'", "Try our Moussaka, it is great."],
    ["a made-up dish next to real ones", "I recommend the Wagyu Burger or the Thai Iced Tea."],
    ["a made-up dish in a list", "Here are some ideas:\n- Margherita Pizza\n- Thai Iced Tea"],
    ["a made-up dish in a Thai reply", "แนะนำ Pad Thai และ Sushi Platter ครับ"],
    ["a made-up dish offered after a refusal", "We don't have Pizza, but try the Wagyu Burger."],
    ["a made-up dish inside Markdown bold", "How about the **Green Papaya Pizza**?"],
    ["a single made-up dish after 'have a lovely'", "We have a lovely Moussaka tonight."],
    ["a single made-up dish after 'try our famous'", "Try our famous Moussaka, it is great."],
    ["a made-up dish after 'today's special is'", "Today's special is Bouillabaisse."],
  ])("AI-10 replaces %s", async (_n, reply) => {
    const { r } = await ask(reply);
    expect(r.reply).toBe(REFUSAL);
    expect(r.answered).toBe(false);
    expect(r.action.type).toBe("none");
  });
  it.each([
    "A Thai Iced Tea is refreshing.",
    "I recommend the Shrimp Pad Thai or the Mango Sticky Rice.",
    "Great choice! The Tom Yum Goong is spicy.",
    "Great Choice! The Tom Yum Goong is spicy.",
    "Try the Papaya Salad, it is a favourite.",
    "We are open from Monday to Sunday.",
    "Golden Lotus Kitchen is in Bangkok.",
    "Yes, free Wi-Fi. Ask staff for the password.",
    "ผัดไทย (Shrimp Pad Thai) ราคา 120 บาท ครับ",
    "Pad Thai and Green Curry are both popular, and the Beef Massaman Curry is milder.",
    "Our Chicken Fried Rice and Coconut Ice Cream (sold out today) are favourites.",
    "Welcome! Sure, I can help. What would you like?",
  ])("keeps a reply that only names dishes on the menu: %s", async (reply) => {
    const { r } = await ask(reply);
    expect(r.reply).toBe(reply);
  });
  it("allows a refusal that names the dish the diner asked about, even one that is not on the menu", async () => {
    expect((await ask("Sorry, we do not serve Margherita Pizza.", "Do you have Margherita Pizza?")).r.reply).toBe("Sorry, we do not serve Margherita Pizza.");
    expect((await ask("I'm sorry, but the restaurant does not serve Pizza.", "do you have pizza")).r.reply).toBe("I'm sorry, but the restaurant does not serve Pizza.");
  });
  it("allows a negated mention even if the diner did not name it, but not a recommendation of it", async () => {
    expect((await ask("Unfortunately we don't have Lobster Thermidor. The Papaya Salad is good.")).r.reply).toMatch(/^Unfortunately we don't have Lobster Thermidor/);
    expect((await ask("We don't have Pizza, but try the Papaya Salad.")).r.reply).toBe("We don't have Pizza, but try the Papaya Salad.");
  });
  it("uses the restaurant's own words: FAQs, specials, the assistant's name and the owner's rules count as known", async () => {
    const c = await aiCtx();
    const over = { faqs: [...c.faqs, { q: "Do you have a kids menu?", a: "Yes, ask for the Little Lotus Plate." }], specials: [{ title: "Chef Special", text: "Steamed Sea Bass Friday" }] };
    expect((await ask("Today's Chef Special is the Steamed Sea Bass Friday.", OPEN, over)).r.reply).toBe("Today's Chef Special is the Steamed Sea Bass Friday.");
    expect((await ask("The Little Lotus Plate suits children.", OPEN, over)).r.reply).toBe("The Little Lotus Plate suits children.");
    expect((await ask("The Little Lotus Plate suits children.")).r.reply).toBe(REFUSAL);          // without that FAQ it would be an invented dish
  });
  it("catches the same invention from the cloud provider", async () => {
    const saved = { p: process.env.AI_PROVIDER, k: process.env.AI_API_KEY, m: process.env.AI_MODEL };
    Object.assign(process.env, { AI_PROVIDER: "openai", AI_API_KEY: "sk-test", AI_MODEL: "cloud-model" });
    try {
      mockModel("We have a lovely Lobster Thermidor tonight.");
      expect((await answer(OPEN, "en", await aiCtx())).reply).toBe(REFUSAL);
    } finally {
      for (const [k, v] of [["AI_PROVIDER", saved.p], ["AI_API_KEY", saved.k], ["AI_MODEL", saved.m]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
  });
});

describe("AI-10 / NFR-M2 the same checks apply whichever provider answers", () => {
  it("replaces an unsafe or wrongly priced reply from the cloud provider too", async () => {
    const saved = { p: process.env.AI_PROVIDER, k: process.env.AI_API_KEY, m: process.env.AI_MODEL };
    Object.assign(process.env, { AI_PROVIDER: "openai", AI_API_KEY: "sk-test", AI_MODEL: "cloud-model" });
    try {
      for (const reply of ["The Pad Thai is safe to eat.", "The Shrimp Pad Thai costs ฿99."]) {
        const calls = mockModel(reply);
        const r = await answer(OPEN, "en", await aiCtx());
        expect(calls[0].url).toContain("/chat/completions");
        expect(r.reply).toBe(REFUSAL);
      }
    } finally {
      for (const [k, v] of [["AI_PROVIDER", saved.p], ["AI_API_KEY", saved.k], ["AI_MODEL", saved.m]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
  });
});

describe("AI-11 when the model is unavailable the diner still gets a safe answer", () => {
  it("falls back to a fixed message with the menu", async () => {
    const { r } = await ask(new Error("connect ECONNREFUSED"));
    expect(r.reply).toBe("The AI waiter is unavailable right now. You can browse the menu or call the staff.");
    expect(r.action.type).toBe("show_menu");
    expect(r.answered).toBe(false);
    expect(r.usedModel).toBe(false);
  });
  it("also falls back on an HTTP error", async () => {
    vi.stubGlobal("fetch", async () => new Response("boom", { status: 500 }));
    const r = await answer(OPEN, "en", await aiCtx());
    expect(r.reply).toMatch(/unavailable/);
  });
  it("rule-based answers do not need the model at all (NFR-R1)", async () => {
    const { r, calls } = await ask(new Error("down"), "How much is the Massaman curry?");
    expect(r.reply).toBe("Beef Massaman Curry is ฿160.");
    expect(calls.length).toBe(0);
  });
});

describe("a model reply that refers to the staff counts as 'unanswered' for the insights page", () => {
  it("marks it unanswered", async () => {
    const { r } = await ask("I'm not sure, please ask the staff about that.");
    expect(r.answered).toBe(false);
    expect(r.reply).toContain("ask the staff");
  });
});
