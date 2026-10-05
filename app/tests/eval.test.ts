// AI-1 .. AI-13: the 30 questions of eval/questions.json, enforced.
// Offline = the language model is switched off, so this checks the rule-based answers (all safety-critical
// ones) and fails if their accuracy drops below eval/thresholds.json. The model-dependent questions are
// checked by `npm run eval:live` against a real model.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { scoreReply, summarize, markdownTable, type EvalQuestion, type Scored } from "./evalScore";

const root = path.resolve(__dirname, "../../eval");
const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.join(root, "questions.json"), "utf8"));
const T = JSON.parse(fs.readFileSync(path.join(root, "thresholds.json"), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); });

async function runOffline() {
  const ctx = await aiCtx();
  const rows: (Scored & { needsModel: boolean })[] = [];
  for (const q of questions) {
    const calls = noModel();
    const r = await answer(q.question, q.lang, ctx);
    rows.push({ ...scoreReply(q, r.reply), needsModel: calls.length > 0 });
    vi.unstubAllGlobals();
  }
  return rows;
}

describe("AI-1 / AI-2 / AI-3 / AI-4 / AI-5 / AI-8 / NFR-S1 offline eval of the rule-based answers (the 30 questions)", () => {
  it("has the expected question set: 10 questions in each of Thai, Burmese and English", () => {
    expect(questions).toHaveLength(30);
    for (const l of ["en", "th", "my"]) expect(questions.filter((q) => q.lang === l)).toHaveLength(10);
  });

  it(`answers at least ${T.offline.min_rule_handled_questions} questions from the rules, with accuracy >= ${T.offline.rule_handled_accuracy_min * 100}%`, async () => {
    const rows = await runOffline();
    const rules = rows.filter((r) => !r.needsModel);
    const s = summarize(rules);
    console.log("\nRule-based eval (model off):\n" + markdownTable(s));
    const failed = rules.filter((r) => !r.pass).map((r) => `${r.q.id} "${r.q.question}" -> ${r.reply} (missing ${JSON.stringify(r.missing)}, forbidden ${JSON.stringify(r.forbidden)})`);
    expect(failed, failed.join("\n")).toEqual([]);
    expect(rules.length).toBeGreaterThanOrEqual(T.offline.min_rule_handled_questions);
    expect(s.overall.pct).toBeGreaterThanOrEqual(T.offline.rule_handled_accuracy_min);
  });

  it("answers every safety-critical category from the rules, never from the model", async () => {
    const rows = await runOffline();
    const viaModel = rows.filter((r) => T.safety_categories.includes(r.q.category) && r.needsModel).map((r) => `${r.q.id} (${r.q.category})`);
    expect(viaModel, "these safety questions fell through to the language model").toEqual([]);
  });

  it("no safety-category answer contains a forbidden claim (safe, allergy-free, no allergens ...)", async () => {
    const rows = await runOffline();
    expect(rows.filter((r) => r.forbidden.length).map((r) => r.q.id)).toEqual([]);
  });
});

describe("the scorer itself", () => {
  const q: EvalQuestion = { id: "x", lang: "en", category: "allergen", question: "?", expect: [["peanut"], ["staff"]], forbid: ["\\bis safe\\b"] };
  it("passes when every expected group matches and nothing forbidden does", () => {
    expect(scoreReply(q, "Contains Peanut. Ask the staff.").pass).toBe(true);
  });
  it("fails on a missing group", () => {
    const r = scoreReply(q, "Contains peanut.");
    expect(r.pass).toBe(false);
    expect(r.missing).toEqual([["staff"]]);
  });
  it("fails on a forbidden pattern even if everything expected is there", () => {
    const r = scoreReply(q, "It is safe? No: this IS SAFE. peanut staff");
    expect(r.pass).toBe(false);
    expect(r.forbidden).toEqual(["\\bis safe\\b"]);
  });
  it("summarises per language and renders a table", () => {
    const a = (lang: "en" | "th", pass: boolean): Scored => ({ q: { ...q, lang }, reply: "", pass, missing: [], forbidden: [] });
    const s = summarize([a("en", true), a("en", false), a("th", true)]);
    expect(s.byLang.en).toMatchObject({ pass: 1, total: 2 });
    expect(s.overall.pct).toBeCloseTo(2 / 3);
    expect(markdownTable(s)).toContain("| English | 50% (1/2) |");
  });
});
