// Thai has no spaces, so a short allergen word can sit inside an ordinary word. These must not be read as allergens,
// while the real allergen words are still found (AI-1, AI-2, AI-7).
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer, allergensMentioned, detectLang } from "@/modules/ai/ai";

afterEach(() => { vi.unstubAllGlobals(); });

describe("AI-2 / AI-20 short Thai allergen words do not match inside ordinary words", () => {
  it.each([
    ["พนักงาน", "staff (contains งา, sesame)"], ["งานเลี้ยง", "a party (งา + น)"], ["ปูนซีเมนต์", "cement (contains ปู, crab)"],
    ["ปู่", "grandfather (contains ปู, crab)"], ["ปลายทาง", "destination (contains ปลา, fish)"], ["ร้านมีพนักงานกี่คน", "how many staff"],
  ])("%s (%s) is not an allergen", (text) => {
    expect(allergensMentioned(text)).toEqual([]);
  });
  it.each([
    ["ผมแพ้งา", "sesame"], ["ขนมงาดำ", "sesame"], ["แพ้ปลา", "fish"], ["แพ้ปู", "shellfish"], ["ปลาหมึก", "molluscs"], ["ซอสปลา", "fish"], ["แพ้ปูและกุ้ง", "shellfish"],
  ])("%s is still found as %s", (text, key) => {
    expect(allergensMentioned(text)).toContain(key);
  });
});

describe("AI-7 asking for the staff in Thai calls the staff (it used to be answered with a sesame allergen list)", () => {
  it.each([
    ["เรียกพนักงานหน่อย", "help"],
    ["ขอเรียกพนักงานหน่อยครับ", "help"],
    ["ขอเช็คบิล เรียกพนักงานด้วย", "bill"],
    ["เช็คบิลหน่อย", "bill"],
  ])("%s", async (text, kind) => {
    const calls = noModel();
    const r = await answer(text, detectLang(text), await aiCtx());
    expect(r.action).toEqual({ type: "call_staff", kind });
    expect(r.allergens).toEqual([]);
    expect(r.reply).not.toMatch(/สารก่อภูมิแพ้|เมนูที่ระบุว่ามี|เมนูที่มี /);      // no allergen wording (the reply itself contains พนักงาน, so do not look for งา)
    expect(calls.length).toBe(0);
  });
  it("a real sesame allergy statement is still answered from the allergen data", async () => {
    noModel();
    const r = await answer("ผมแพ้งา", "th", await aiCtx());
    expect(r.allergens).toEqual(["sesame"]);
    expect(r.reply).toMatch(/กรุณายืนยันกับพนักงาน/);       // the staff-confirm sentence itself contains พนักงาน and must not add a second allergen
    expect(r.action.type).toBe("show_dishes");
  });
});
