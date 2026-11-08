// AI-2 / AI-19: eval/questions_natural.json, the harder set in everyday wording (thanks, "can I pay by card?", cheapest dish, "is the Tom Yum
// spicy?", halal, seafood, "without shrimp" ...). Questions marked "rules": true are answered from the database, so they are enforced here with the
// model switched off; the others need a real model and are scored by `EVAL_QUESTIONS=questions_natural.json npm run eval:live`.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { categoriesOf } from "@/modules/platform/menu";
import { scoreReply, type EvalQuestion } from "./evalScore";

const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../eval/questions_natural.json"), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); });

describe("the natural-wording question set", () => {
  it("covers English, Thai and Burmese and every question has a unique id", () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const l of ["en", "th", "my"]) expect(questions.filter((q) => q.lang === l).length).toBeGreaterThanOrEqual(7);
  });
  it("every question marked 'rules' is answered from the rules (no model call) and passes its checks", async () => {
    const ctx = await aiCtx({ categories: categoriesOf(1), popular: {} });
    const failed: string[] = [];
    for (const q of questions.filter((x) => x.rules)) {
      const calls = noModel();
      const r = await answer(q.question, q.lang, ctx);
      const s = scoreReply(q, r.reply);
      if (calls.length) failed.push(`${q.id} "${q.question}" needed the model`);
      else if (!s.pass) failed.push(`${q.id} "${q.question}" -> ${r.reply} (missing ${JSON.stringify(s.missing)}, forbidden ${JSON.stringify(s.forbidden)})`);
      vi.unstubAllGlobals();
    }
    expect(failed, failed.join("\n")).toEqual([]);
  });
});
