// eval/sushi_menu_questions.json: what a diner asks about the 132-dish sushi menu (combos and sets, categories, contents, allergens, bare recommendations,
// in English, Thai and Burmese). Questions marked "rules": true are answered from the database, so they are enforced here with the model switched
// off; the others need a real model and are scored by `EVAL_QUESTIONS=sushi_menu_questions.json npm run eval:live`.
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { scoreReply, type EvalQuestion } from "./evalScore";
import { seedSushiMenu } from "./sushiMenu";

const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../eval/sushi_menu_questions.json"), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); });
let ctx: any;
beforeAll(async () => {
  seedSushiMenu();
  const { categoriesOf } = await import("@/modules/platform/menu");
  ctx = { ...(await aiCtx()), categories: categoriesOf(1), popular: {} };
}, 60_000);

describe("the sushi menu question set", () => {
  it("covers English, Thai and Burmese, has unique ids, and most questions are answered by the rules", () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const [l, min] of [["en", 25], ["th", 6], ["my", 4]] as const) expect(questions.filter((q) => q.lang === l).length).toBeGreaterThanOrEqual(min);
    expect(questions.filter((q) => q.rules).length).toBeGreaterThanOrEqual(35);
    for (const c of ["combo_list", "combo_contents", "combo_price", "combo_order", "category", "category_rank", "allergen", "recommend_bare", "open_set"]) expect(questions.some((q) => q.category === c), c).toBe(true);
  });
  it("every question marked 'rules' is answered from the rules (no model call) and passes its checks", async () => {
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
  it("the bare recommendation in each language is answered from the rules too, and claims no best seller", async () => {
    for (const q of questions.filter((x) => x.category === "recommend_bare")) {
      const calls = noModel();
      const r = await answer(q.question, q.lang, ctx);
      expect(calls, q.id).toHaveLength(0);
      expect(scoreReply(q, r.reply).pass, `${q.id}: ${r.reply}`).toBe(true);
      vi.unstubAllGlobals();
    }
  });
});
