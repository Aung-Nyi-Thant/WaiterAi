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

describe("AI-9 open questions go to the model, with the restaurant's data as the only source", () => {
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

describe("AI-10 a wrong or unsafe model reply is replaced", () => {
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

describe("AI-3 / NFR-S1 the model may not state allergen facts, in either direction; they come from the database", () => {
  const LUNCH = "What is a light dish for lunch?";
  it.each([
    ["Papaya Salad", "Try the Papaya Salad, it has no peanuts in it.", "peanut"],                       // the data says peanut
    ["Papaya Salad", "The Papaya Salad is gluten-free and dairy-free, a good light lunch.", "peanut"],
    ["Mango Sticky Rice", "Mango Sticky Rice is vegan, nut-free and suitable for everyone.", "no allergens listed"],
    ["Beef Massaman Curry", "The Beef Massaman Curry contains cashew nuts but is mild.", "peanut"],
    ["Fresh Spring Rolls", "Fresh Spring Rolls are light and contain no peanuts or shellfish.", "not provided"],   // no allergen data at all
  ])("replaces a reply about %s that claims allergens: %s", async (dish, reply, expected) => {
    const { r } = await ask(reply, LUNCH);
    expect(r.reply).not.toBe(reply);
    expect(r.reply.toLowerCase()).toContain(expected);
    expect(r.reply).toContain("confirm with the staff");
    expect(r.reply).not.toMatch(/gluten-free|nut-free|dairy-free|no peanuts/i);
    expect(r.topic).toBe("allergens");
    const ctx = await aiCtx();
    expect(r.action).toEqual({ type: "show_dishes", ids: [ctx.items.find((i) => i.name.en === dish)!.id] });
  });
  it("a claim that names no dish is answered by asking for the dish or the allergen, and counts as not answered", async () => {
    const { r } = await ask("Most of our dishes are free from peanuts.", LUNCH);
    expect(r.reply).toContain("I can't confirm allergens");
    expect(r.reply).toContain("confirm with the staff");
    expect(r.answered).toBe(false);
  });
  it("works in Thai and Burmese too, in the diner's voice", async () => {
    mockModel("ส้มตำไม่มีถั่วลิสงเลย");
    const th = await answer("แนะนำเมนูเบาๆ หน่อย", "th", await aiCtx());
    expect(th.reply).toContain("ถั่วลิสง");
    expect(th.reply).toContain("กรุณายืนยันกับพนักงาน");
    expect(th.reply).not.toContain("ไม่มีถั่วลิสงเลย");
    expect(th.reply.endsWith("ครับ")).toBe(true);
    mockModel("ส้มตำไม่มีถั่วลิสงเลย");
    const my = await answer("ဟင်းမပြင်းတာ ရွေးပေးပါ", "my", await aiCtx());
    expect(my.reply).toContain("ဝန်ထမ်းကို မေးမြန်းပေးပါ");
  });
  it("does not touch a normal recommendation, even when a dish name contains an allergen word", async () => {
    const ok = "Shrimp Pad Thai is a favourite, 120 baht. The Thai Iced Tea is refreshing.";
    const { r } = await ask(ok, LUNCH);
    expect(r.reply).toBe(ok);
    expect(r.usedModel).toBe(true);
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
