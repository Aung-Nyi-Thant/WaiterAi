// eval/situations.json: what the AI leaves to the staff (payment, bill, complaint, booking, order change, shop facts the owner never entered)
// and what it declines (off-topic), in English, Thai and Burmese. All of these are answered by rules, so this runs offline: the staff sentence,
// the right button (help / bill / none), the model never called, and never "I don't have that information".
// Live: EVAL_QUESTIONS=situations.json npm run eval:live
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, noModel, mockModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { categoriesOf } from "@/modules/platform/menu";
import { scoreReply, type EvalQuestion } from "./evalScore";

const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../eval/situations.json"), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); });

describe("the situation set", () => {
  it("has the same 9 situations in each of English, Thai and Burmese", () => {
    for (const l of ["en", "th", "my"]) expect(questions.filter((q) => q.lang === l)).toHaveLength(9);
  });
  it("every question is answered by the rules with the right staff sentence and button", async () => {
    const ctx = await aiCtx({ categories: categoriesOf(1), popular: {} });
    const failed: string[] = [];
    for (const q of questions) {
      const calls = noModel();
      const r = await answer(q.question, q.lang, ctx);
      vi.unstubAllGlobals();
      const s = scoreReply(q, r.reply, r.offer ?? "none");
      if (calls.length) failed.push(`${q.id} "${q.question}" reached the model`);
      else if (!s.pass) failed.push(`${q.id} "${q.question}" -> ${r.reply} (missing ${JSON.stringify(s.missing)}, forbidden ${JSON.stringify(s.forbidden)})`);
      if (r.action.type === "call_staff") failed.push(`${q.id} called the staff without a tap`);
    }
    expect(failed, failed.join("\n")).toEqual([]);
  });
});

describe("urgent safety: the one case where the staff are called without a tap", () => {
  it.each([["I feel sick after eating", "en"], ["ฉันอาเจียนหลังกินอาหาร", "th"], ["စားပြီးနောက် မူးလဲချင်တယ်", "my"], ["I can't breathe, I think it's an allergic reaction", "en"]] as [string, "en" | "th" | "my"][])("'%s'", async (q, l) => {
    const calls = noModel();
    const r = await answer(q, l, await aiCtx());
    expect(calls).toHaveLength(0);
    expect(r.action).toEqual({ type: "call_staff", kind: "help" });
  });
});

describe("the owner's own FAQ wins over the staff sentence", () => {
  it("a question the owner has an FAQ for goes to the model, which has the FAQ; one with no FAQ is left to the staff", async () => {
    const calls = mockModel("Yes, free Wi-Fi. The password is on the receipt.");
    const r = await answer("Is there Wi-Fi?", "en", await aiCtx());     // the demo restaurant has a Wi-Fi FAQ
    expect(calls).toHaveLength(1);
    expect(r.reply).toContain("Wi-Fi");
    vi.unstubAllGlobals();
    noModel();
    const none = await answer("Is there Wi-Fi?", "en", await aiCtx({ faqs: [] }));
    expect(none.offer).toBe("help");
    expect(none.reply).toMatch(/best answered by our staff/);
  });
});
