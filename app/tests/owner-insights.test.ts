// What the AI teaches the owner: which allergies diners have and how many dishes serve them, which dishes are invisible to
// diners with an allergy (no allergen data), what was ordered most, and which questions keep coming back.
import { describe, it, expect, beforeAll } from "vitest";
import { call, noModel, ownerLogin, signOut } from "./helpers";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { POST as register } from "@/modules/platform/api/register";
import { GET as insights } from "@/modules/platform/api/insights";
import { run } from "@/modules/platform/db";
import { itemsOf } from "@/modules/platform/menu";

const slug = "golden-lotus";
const dish = (n: string) => itemsOf(1).find((i) => i.name.en === n)!.id;
const say = (message: string, o: Record<string, unknown> = {}, s = slug) => call(chat, { method: "POST", params: { slug: s }, body: { message, sessionId: "oi-" + Math.random().toString(36).slice(2), table: "3", lang: "en", ...o } });
const order = (items: object[], table = "3") => call(placeOrder, { method: "POST", params: { slug }, body: { table, items } });
const get = async (days = 7) => { await ownerLogin(); return (await call(insights, { url: `http://t/api/owner/insights?days=${days}` })).data; };

beforeAll(() => { run("DELETE FROM chat_messages"); run("DELETE FROM chat_sessions"); run("DELETE FROM order_items"); run("DELETE FROM orders"); });

describe("IN-4 allergies diners have, and how many dishes serve them", () => {
  it("counts each chat session's allergy profile once, and the dishes that fit each allergen", async () => {
    noModel();
    for (let i = 0; i < 3; i++) await say("hello", { profile: ["peanut"] });
    await say("hello", { profile: ["shellfish", "peanut"] });
    await say("hello");                                                       // a diner with no profile
    const d = await get();
    expect(d.allergyProfiles).toEqual([
      { allergen: "peanut", label: "Peanut", diners: 4, dishes: 8 },        // 11 dishes on sale have data; 3 of them list peanut
      { allergen: "shellfish", label: "Shellfish", diners: 1, dishes: 7 },  // 4 of them list shellfish
    ]);
  });
  it("lists the dishes with no allergen data: diners with a profile are never offered them", async () => {
    const d = await get();
    expect(d.noAllergenData).toEqual(["Fresh Spring Rolls"]);
  });
  it("counts the allergens diners asked about in the chat", async () => {
    noModel();
    await say("I'm allergic to peanuts");
    await say("which dishes have shrimp?");
    await say("without peanuts please");
    const d = await get();
    expect(d.allergensAsked).toEqual([
      { allergen: "peanut", label: "Peanut", n: 2, dishes: 8 },
      { allergen: "shellfish", label: "Shellfish", n: 1, dishes: 7 },
    ]);
  });
  it("test chats from the owner dashboard (preview) and other restaurants are not counted", async () => {
    noModel();
    await say("hello", { profile: ["sesame"], preview: true });
    signOut();
    const rival = await call(register, { method: "POST", body: { email: "oi-rival@example.com", password: "rival-pass-9", restaurantName: "Insights Rival" } });
    await say("hello", { profile: ["sesame", "milk"] }, rival.data.slug);
    const d = await get();
    expect(d.allergyProfiles.map((a: any) => a.allergen)).toEqual(["peanut", "shellfish"]);
  });
  it("a dish that fits fewer than 3 diners' needs is easy to spot (the page marks it), and sold-out dishes do not count as fitting", async () => {
    run("UPDATE menu_items SET available = 0 WHERE name_en = 'Chicken Fried Rice'");
    const d = await get();
    expect(d.allergyProfiles.find((a: any) => a.allergen === "peanut").dishes).toBe(7);
    run("UPDATE menu_items SET available = 1 WHERE name_en = 'Chicken Fried Rice'");
  });
});

describe("what was ordered most, and which questions keep coming back", () => {
  it("ranks dishes by quantity ordered, ignoring cancelled orders and orders older than the period", async () => {
    await order([{ id: dish("Mango Sticky Rice"), qty: 3 }, { id: dish("Thai Iced Tea"), qty: 1 }]);
    await order([{ id: dish("Mango Sticky Rice"), qty: 2 }]);
    const cancelled = await order([{ id: dish("Thai Iced Tea"), qty: 9 }]);
    run("UPDATE orders SET status = 'cancelled' WHERE id = ?", cancelled.data.id);
    const old = await order([{ id: dish("Papaya Salad"), qty: 40 }]);
    run("UPDATE orders SET created_at = datetime('now','-3 day') WHERE id = ?", old.data.id);
    expect((await get(1)).topDishes).toEqual([{ name: "Mango Sticky Rice", n: 5 }, { name: "Thai Iced Tea", n: 1 }]);
    expect((await get(7)).topDishes[0]).toEqual({ name: "Papaya Salad", n: 20 });   // one order line holds at most 20 of a dish
  });
  it("shows only questions asked more than once, most often first", async () => {
    noModel();
    for (let i = 0; i < 3; i++) await say("Is there parking?");
    for (let i = 0; i < 2; i++) await say("What time do you close?");
    await say("a one-off question about the weather");
    const d = await get();
    // "hello" was sent 5 times by the allergy tests above (4 with a profile, 1 without)
    expect(d.topQuestions).toEqual([{ text: "hello", n: 5 }, { text: "Is there parking?", n: 3 }, { text: "What time do you close?", n: 2 }]);
    expect(d.topQuestions.map((q: any) => q.text)).not.toContain("a one-off question about the weather");
  });
  it("recommendations are a topic of their own", async () => {
    noModel();
    await say("What's spicy?");
    const d = await get();
    expect(d.topics.find((t: any) => t.topic === "recommend")).toMatchObject({ label: "Recommendations", n: 1 });
  });
  it("needs an owner login", async () => {
    signOut();
    expect((await call(insights)).status).toBe(401);
  });
});
