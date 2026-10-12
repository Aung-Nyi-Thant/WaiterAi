// AI-2 / AI-19: eval/open_questions.json, 126 open questions (42 each in English, Thai and Burmese): recommendations, "what is X?",
// comparisons, diets, FAQs, things not on the menu, small talk, complaints, vague questions, prices, indirect allergy questions.
// Offline (model off) this enforces every question the RULES answer; the rest need a real model:
//   EVAL_QUESTIONS=open_questions.json npm run eval:live -- --write      (report: eval/results/live-open_questions.md)
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { categoriesOf } from "@/modules/platform/menu";
import { scoreReply, type EvalQuestion } from "./evalScore";

const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../eval/open_questions.json"), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); });

describe("the open-question set", () => {
  it("has 42 questions in each of English, Thai and Burmese, with the same ids in each", () => {
    for (const l of ["en", "th", "my"]) expect(questions.filter((q) => q.lang === l)).toHaveLength(42);
    const ids = (l: string) => questions.filter((q) => q.lang === l).map((q) => q.id.replace(/^o../, ""));
    expect(ids("th")).toEqual(ids("en"));
    expect(ids("my")).toEqual(ids("en"));
  });
  it("every question the rules answer (no model call) is answered correctly, and the rules answer at least 60 of the 126", async () => {
    const ctx = await aiCtx({ categories: categoriesOf(1), popular: {} });
    const failed: string[] = [];
    let byRules = 0;
    for (const q of questions) {
      const calls = noModel();
      const r = await answer(q.question, q.lang, ctx);
      vi.unstubAllGlobals();
      if (calls.length) continue;                              // needs the model: scored live
      byRules++;
      const s = scoreReply(q, r.reply);
      if (!s.pass) failed.push(`${q.id} "${q.question}" -> ${r.reply} (missing ${JSON.stringify(s.missing)}, forbidden ${JSON.stringify(s.forbidden)})`);
    }
    expect(failed, failed.join("\n")).toEqual([]);
    expect(byRules).toBeGreaterThanOrEqual(60);
  });
});
