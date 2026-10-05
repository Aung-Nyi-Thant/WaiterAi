// The diner's allergy profile: chosen once, applied to every answer, and flagged on the order that reaches the chef.
// Safety rules that must hold: facts only from the database, a dish with no allergen data is never suggested for an
// allergy, and nothing is ever called "safe".
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, call, mockModel, noModel, staffLogin } from "./helpers";
import { answer, fitsProfile } from "@/modules/ai/ai";
import { ALLERGENS, allergenName, cleanProfile } from "@/modules/platform/constants";
import { DICT } from "@/modules/diner/i18n";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { POST as orderAction } from "@/modules/staff/api/orders";
import { GET as floor } from "@/modules/staff/api/floor";
import { GET as kitchen } from "@/modules/staff/api/kitchen";
import { all, get } from "@/modules/platform/db";
import { itemsOf } from "@/modules/platform/menu";

afterEach(() => { vi.unstubAllGlobals(); });
const slug = "golden-lotus";
const STAFF_EN = "Please confirm with the staff";
const names = (r: { action: { ids?: number[] } }, items: { id: number; name: { en: string } }[]) => (r.action.ids ?? []).map((id) => items.find((i) => i.id === id)!.name.en);
const ask = async (msg: string, profile: string[], lang: "en" | "th" | "my" = "en") => answer(msg, lang, await aiCtx({ profile }));

describe("the profile helpers", () => {
  it("cleanProfile keeps only known allergens, once each, and ignores anything else", () => {
    expect(cleanProfile(["peanut", "drop table", "peanut", 7, null, "shellfish"])).toEqual(["peanut", "shellfish"]);
    expect(cleanProfile("peanut")).toEqual([]);
    expect(cleanProfile(undefined)).toEqual([]);
  });
  it("a dish fits a profile only when it HAS allergen data and lists none of the allergens", async () => {
    const items = itemsOf(1);
    const dish = (n: string) => items.find((i) => i.name.en === n)!;
    expect(fitsProfile(dish("Thai Iced Tea"), ["peanut"])).toBe(true);
    expect(fitsProfile(dish("Beef Massaman Curry"), ["peanut"])).toBe(false);
    expect(fitsProfile(dish("Fresh Spring Rolls"), ["peanut"])).toBe(false);     // allergen data not provided: never assumed fine
    expect(fitsProfile(dish("Mango Sticky Rice"), ["peanut", "milk"])).toBe(true);   // data says no allergens
    expect(fitsProfile(dish("Fresh Spring Rolls"), [])).toBe(true);              // no profile: no filtering
  });
});

describe("'what can I eat?' with a profile is answered from the database", () => {
  it.each(["What can I eat with my allergies?", "what can I order?", "dishes for my profile please"])("%s", async (q) => {
    const noModelCalls = noModel();
    const ctx = await aiCtx({ profile: ["peanut"] });
    const r = await answer(q, "en", ctx);
    expect(noModelCalls).toHaveLength(0);
    expect(r.usedModel).toBe(false);
    expect(r.topic).toBe("allergens");
    expect(r.reply).toContain("Dishes that do not list peanut:");
    for (const d of ["Beef Massaman Curry", "Papaya Salad", "Shrimp Pad Thai"]) expect(r.reply).not.toContain(d);
    expect(r.reply).toContain("Thai Iced Tea");
    expect(r.reply).toContain("Allergen information is not provided for: Fresh Spring Rolls");   // unknown data is named, not offered
    expect(r.reply).toContain(STAFF_EN);
    expect(r.reply).not.toMatch(/\bsafe\b|allergy-free|guarantee/i);
    for (const n of names(r, ctx.items)) expect(fitsProfile(ctx.items.find((i) => i.name.en === n)!, ["peanut"])).toBe(true);
  });
  it("combines several allergens, and leaves out sold-out dishes", async () => {
    noModel();
    const ctx = await aiCtx({ profile: ["peanut", "milk", "shellfish"] });
    const r = await answer("What can I eat with my allergies?", "en", ctx);
    for (const d of ["Thai Iced Tea", "Coconut Ice Cream", "Tom Yum Goong", "Chicken Green Curry"]) expect(r.reply.split("Allergen information")[0]).not.toContain(d);
    expect(r.reply).toContain("Mango Sticky Rice");
  });
  it("without a profile the same words get the normal 'tell me the allergen' answer", async () => {
    noModel();
    const r = await ask("What can I eat with my allergies?", []);
    expect(r.reply).toContain("I can't confirm allergens");
  });
  it("works in Thai and Burmese, in the diner's language and voice", async () => {
    noModel();
    const th = await ask("ฉันกินอะไรได้บ้าง ตามโปรไฟล์การแพ้", ["peanut"], "th");
    expect(th.reply).toContain("เมนูที่ไม่ได้ระบุว่ามี ถั่วลิสง");
    expect(th.reply).toContain("กรุณายืนยันกับพนักงาน");
    expect(th.reply).not.toContain("แกงมัสมั่นเนื้อ");
    const my = await ask("ကျွန်တော် စားလို့ရတဲ့ ဟင်းလျာတွေ ပြပါ", ["peanut"], "my");
    expect(my.reply).toContain("peanut");
    expect(my.reply).toContain("ဝန်ထမ်းကို မေးမြန်းပေးပါ");
    expect(my.reply).not.toContain("အမဲသား မတ်စမန်ကာရီ");
  });
});

describe("the diner screen's allergy texts exist in every language, and its quick question is understood in each", () => {
  const KEYS = ["myAllergies", "setAllergies", "clearAll", "done", "mine", "yourAllergen", "profileHelp", "conflictToast", "chipMyAllergies"];
  it.each(["en", "th", "my"] as const)("%s has every label and says the profile never makes a dish safe", (lang) => {
    for (const k of KEYS) expect(DICT[lang][k], `${lang}.${k}`).toBeTruthy();
    expect(DICT[lang].profileHelp.length).toBeGreaterThan(40);
  });
  it.each(["en", "th", "my"] as const)("the %s quick question 'what can I eat?' is answered from the data, not by the model", async (lang) => {
    const noModelCalls = noModel();
    const r = await answer(DICT[lang].chipMyAllergies, lang, await aiCtx({ profile: ["peanut"] }));
    expect(noModelCalls).toHaveLength(0);
    expect(r.topic).toBe("allergens");
    expect(r.action.type).toBe("show_dishes");
    expect(r.reply).toMatch(lang === "en" ? /Dishes that do not list peanut/ : lang === "th" ? /เมนูที่ไม่ได้ระบุว่ามี ถั่วลิสง/ : /peanut ပါဝင်တယ်လို့ မဖော်ပြထားတဲ့/);
  });
  it("every allergen has a Thai name, and the English and Burmese screens use the English names", () => {
    for (const a of ALLERGENS) {
      expect(allergenName(a, "th"), a).not.toBe(a);
      expect(allergenName(a, "en")).toBe(allergenName(a, "my"));   // the owner asked for English allergen names in Burmese
      expect(allergenName(a, "en").length).toBeGreaterThan(2);
    }
  });
});

describe("the profile applies to every list of dishes the AI gives", () => {
  it("a vegetarian list leaves out vegetarian dishes that list the diner's allergen, and says so", async () => {
    noModel();
    const ctx = await aiCtx({ profile: ["milk"] });
    const r = await answer("vegetarian dishes please", "en", ctx);
    expect(r.reply).toContain("Mango Sticky Rice");
    expect(r.reply).toContain("Vegetable Tofu Stir-fry");
    expect(r.reply).not.toContain("Thai Iced Tea");                        // vegetarian, but lists milk
    expect(r.reply).toContain("Your allergy profile (milk) is applied");
    expect(r.reply).toContain(STAFF_EN);
    const plain = await answer("vegetarian dishes please", "en", await aiCtx());
    expect(plain.reply).toContain("Thai Iced Tea");                        // without a profile nothing changes
    expect(plain.reply).not.toContain("allergy profile");
  });
  it("a vegetarian dish with no allergen data is left out too", async () => {
    noModel();
    const items = itemsOf(1).map((i) => (i.name.en === "Mango Sticky Rice" ? { ...i, allergens: null } : i));
    const r = await answer("vegetarian dishes please", "en", await aiCtx({ profile: ["peanut"], items }));
    expect(r.reply).not.toContain("Mango Sticky Rice");
  });
});

describe("picking a dish that conflicts with the profile: allowed, but the diner is warned", () => {
  it("adds it to the picks and names the allergen", async () => {
    noModel();
    const r = await ask("I'll have the Beef Massaman Curry", ["peanut"]);
    expect(r.action.type).toBe("add_to_picks");
    expect(r.reply).toContain("Added to your picks");
    expect(r.reply).toContain('Tap "Send to staff"');                       // the button is called "Send to staff", not "waiter"
    expect(r.reply).toContain("⚠ Beef Massaman Curry lists peanut, which is in your allergy profile.");
    expect(r.reply).toContain(STAFF_EN);
  });
  it("a dish with no allergen data gets the 'not provided' warning", async () => {
    noModel();
    const r = await ask("I'll have the fresh spring rolls", ["peanut"]);
    expect(r.action.type).toBe("add_to_picks");
    expect(r.reply).toContain("Allergen information is not provided for Fresh Spring Rolls");
  });
  it("no warning for a dish that fits, and none without a profile", async () => {
    noModel();
    expect((await ask("I'll have the Thai Iced Tea", ["peanut"])).reply).not.toContain("⚠");
    expect((await ask("I'll have the Beef Massaman Curry", [])).reply).not.toContain("⚠");
  });
});

describe("the language model with a profile", () => {
  const LUNCH = "What is a light dish for lunch?";
  it("is told the allergies, and only when there are some", async () => {
    let calls = mockModel("Try the Thai Iced Tea.");
    await answer(LUNCH, "en", await aiCtx({ profile: ["peanut", "shellfish"] }));
    expect(calls[0].body.messages[0].content).toContain("11b. The customer has told us their allergies: peanut, shellfish");
    calls = mockModel("Try the Thai Iced Tea.");
    await answer(LUNCH, "en", await aiCtx());
    expect(calls[0].body.messages[0].content).not.toContain("11b.");
  });
  it("a reply that suggests a dish with the diner's allergen is replaced by what the data says", async () => {
    mockModel("Try the Beef Massaman Curry, it is mild.");
    const r = await answer(LUNCH, "en", await aiCtx({ profile: ["peanut"] }));
    expect(r.reply).toBe(`Beef Massaman Curry lists peanut, which is in your allergy profile. ${STAFF_EN} before ordering.`);
    expect(r.topic).toBe("allergens");
  });
  it("a reply that suggests a dish with no allergen data is replaced too", async () => {
    mockModel("The Fresh Spring Rolls are light and fresh.");
    const r = await answer(LUNCH, "en", await aiCtx({ profile: ["peanut"] }));
    expect(r.reply).toContain("Allergen information is not provided for Fresh Spring Rolls");
  });
  it("a fitting suggestion passes, and dish cards are limited to dishes that fit", async () => {
    const ctx = await aiCtx({ profile: ["peanut"] });
    const id = (n: string) => ctx.items.find((i) => i.name.en === n)!.id;
    mockModel(`Try the Thai Iced Tea.\nACTION: {"type":"show_dishes","ids":[${id("Thai Iced Tea")},${id("Beef Massaman Curry")},${id("Fresh Spring Rolls")}]}`);
    const r = await answer(LUNCH, "en", ctx);
    expect(r.reply).toBe("Try the Thai Iced Tea.");
    expect(r.action).toEqual({ type: "show_dishes", ids: [id("Thai Iced Tea")] });
  });
  it("without a profile nothing changes", async () => {
    mockModel("Try the Beef Massaman Curry, it is mild.");
    expect((await answer(LUNCH, "en", await aiCtx())).reply).toBe("Try the Beef Massaman Curry, it is mild.");
  });
});

describe("the chat endpoint takes the profile", () => {
  const say = (message: string, o: Record<string, unknown> = {}) => call(chat, { method: "POST", params: { slug }, body: { message, sessionId: "p-" + Math.random().toString(36).slice(2), table: "7", lang: "en", ...o } });
  it("applies it to the answer, keeps only known allergens, and stores them with the session (no personal data)", async () => {
    noModel();
    const r = await say("What can I eat with my allergies?", { sessionId: "prof-1", profile: ["peanut", "<script>", "peanut", "milk"] });
    expect(r.data.reply).toContain("Dishes that do not list peanut / milk:");
    expect(JSON.parse(get("SELECT profile FROM chat_sessions WHERE id = 'prof-1'")!.profile)).toEqual(["peanut", "milk"]);
    await say("hello", { sessionId: "prof-1" });                                          // a later message without a profile resets it
    expect(get("SELECT profile FROM chat_sessions WHERE id = 'prof-1'")!.profile).toBe("[]");
  });
  it("test chats from the owner dashboard (preview) store nothing", async () => {
    noModel();
    await say("What can I eat with my allergies?", { sessionId: "prof-prev", profile: ["peanut"], preview: true });
    expect(get("SELECT 1 AS x FROM chat_sessions WHERE id = 'prof-prev'")).toBeUndefined();
  });
});

describe("the profile reaches the waiter and the chef with the dish lines that clash", () => {
  const dish = (n: string) => itemsOf(1).find((i) => i.name.en === n)!.id;
  const send = (b: object) => call(placeOrder, { method: "POST", params: { slug }, body: { table: "31", lang: "en", ...b } });
  it("stores the profile as the allergy note and flags each clashing line", async () => {
    const r = await send({ profile: ["peanut", "milk"], items: [{ id: dish("Beef Massaman Curry"), qty: 1 }, { id: dish("Thai Iced Tea"), qty: 2 }, { id: dish("Fresh Spring Rolls"), qty: 1 }, { id: dish("Mango Sticky Rice"), qty: 1 }] });
    expect(r.status).toBe(200);
    expect(get("SELECT allergy_note FROM orders WHERE id = ?", r.data.id)!.allergy_note).toBe("peanut, milk");
    const flags = Object.fromEntries(all("SELECT name, flag FROM order_items WHERE order_id = ?", r.data.id).map((x: any) => [x.name, x.flag]));
    expect(flags).toEqual({ "Beef Massaman Curry": "peanut", "Thai Iced Tea": "milk", "Fresh Spring Rolls": "unknown", "Mango Sticky Rice": "" });
  });
  it("merges the profile with allergens the diner mentioned in the chat", async () => {
    noModel();
    await call(chat, { method: "POST", params: { slug }, body: { message: "I'm allergic to shellfish", sessionId: "merge-1", table: "32", lang: "en" } });
    const r = await send({ table: "32", sessionId: "merge-1", profile: ["peanut"], items: [{ id: dish("Thai Iced Tea"), qty: 1 }] });
    expect(get("SELECT allergy_note FROM orders WHERE id = ?", r.data.id)!.allergy_note).toBe("peanut, shellfish");
  });
  it("ignores unknown allergens, and without a profile nothing is flagged", async () => {
    const r = await send({ profile: ["peanuts!!", "x"], items: [{ id: dish("Beef Massaman Curry"), qty: 1 }] });
    expect(get("SELECT allergy_note FROM orders WHERE id = ?", r.data.id)!.allergy_note).toBe("");
    expect(all("SELECT flag FROM order_items WHERE order_id = ?", r.data.id).map((x: any) => x.flag)).toEqual([""]);
  });
  it("the waiter sees the flags on the pick, and the chef on the ticket", async () => {
    const r = await send({ table: "33", profile: ["peanut"], items: [{ id: dish("Beef Massaman Curry"), qty: 1 }] });
    await staffLogin("1111");
    const pick = (await call(floor)).data.picks.find((o: any) => o.id === r.data.id);
    expect(pick.allergy).toBe("peanut");
    expect(pick.items).toEqual([{ name: "Beef Massaman Curry", qty: 1, price: 160, flag: "peanut" }]);
    expect((await call(orderAction, { method: "POST", params: { id: String(r.data.id) }, body: { action: "take" } })).status).toBe(200);
    await staffLogin("2222");
    const ticket = (await call(kitchen)).data.tickets.new.find((o: any) => o.id === r.data.id);
    expect(ticket.allergy).toBe("peanut");
    expect(ticket.items[0].flag).toBe("peanut");
  });
});
