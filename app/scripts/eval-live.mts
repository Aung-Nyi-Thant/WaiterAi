// Runs the 30 questions of eval/questions.json through the chat API of a RUNNING server with the real
// model, scores them, prints accuracy per language and exits 1 if eval/thresholds.json is not met.
//
//   npm run eval:live                 (server on http://localhost:3000, restaurant golden-lotus)
//   npm run eval:live -- --write      also saves eval/results/live-latest.{md,json}
//   npm run eval:live -- --extended   runs eval/model_questions.json instead (30 more questions that mostly
//                                     reach the model: open questions, paraphrased attacks, misspellings,
//                                     mixed languages); results go to live-extended.{md,json}
//
// Env: EVAL_BASE_URL, EVAL_SLUG, EVAL_LABEL (text printed in the report, e.g. the model name),
//      EVAL_QUESTIONS (file in eval/, default questions.json; questions_natural.json = the harder, natural-wording set).
// Questions are sent with preview:true, so nothing is stored or counted in the restaurant's insights.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreReply, summarize, markdownTable, percent, type EvalQuestion } from "../tests/evalScore.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const evalDir = path.join(here, "..", "..", "eval");
const base = (process.env.EVAL_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const slug = process.env.EVAL_SLUG || "golden-lotus";
const label = process.env.EVAL_LABEL || process.env.OLLAMA_MODEL || "gemma4:12b (Ollama default)";
const extended = process.argv.includes("--extended");
const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.join(evalDir, process.env.EVAL_QUESTIONS || (extended ? "model_questions.json" : "questions.json")), "utf8"));
const T = JSON.parse(fs.readFileSync(path.join(evalDir, "thresholds.json"), "utf8"));

const rows = [];
for (const q of questions) {
  const t0 = Date.now();
  let reply = "";
  try {
    const res = await fetch(`${base}/api/public/${slug}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: q.question, preview: true, table: "5" }), signal: AbortSignal.timeout(180_000) });
    reply = String((await res.json()).reply ?? "");
  } catch (e: any) { console.error(`  ${q.id}: request failed (${e?.message})`); }
  const s = scoreReply(q, reply);
  rows.push({ ...s, ms: Date.now() - t0 });
  console.log(`${s.pass ? "PASS" : "FAIL"} ${q.id.padEnd(4)} ${q.category.padEnd(16)} ${String(Date.now() - t0).padStart(6)} ms  ${reply.replace(/\s+/g, " ").slice(0, 80)}${s.pass ? "" : `   <- missing ${JSON.stringify(s.missing)} forbidden ${JSON.stringify(s.forbidden)}`}`);
}

const sum = summarize(rows);
// A failure is either a WRONG answer or the safe "AI unavailable" fallback (the model was too slow: the diner is
// sent to the menu and the staff, nothing false is shown). They are counted apart so a slow computer is not
// mistaken for an inaccurate model. The pass thresholds below still count both as failures.
const FALLBACK = /unavailable right now|ใช้งานไม่ได้ในขณะนี้|ခဏမရနိုင်ပါဘူး/;
const failed = rows.filter((r) => !r.pass), fallbacks = failed.filter((r) => FALLBACK.test(r.reply));
const breakdown = `Failures: ${failed.length} (${fallbacks.length} safe fallback because the model was too slow, ${failed.length - fallbacks.length} wrong or incomplete answers).`;
const problems: string[] = [];
if (sum.overall.pct < T.live.overall_min) problems.push(`overall ${percent(sum.overall)} is below ${T.live.overall_min * 100}%`);
for (const [l, c] of Object.entries(sum.byLang)) if (c.pct < T.live.per_language_min) problems.push(`${l} ${percent(c)} is below ${T.live.per_language_min * 100}%`);
for (const cat of extended ? T.extended_safety_categories : T.safety_categories) { const c = sum.byCategory[cat]; if (c && c.pct < T.live.safety_categories_min) problems.push(`safety category "${cat}" ${percent(c)} is below ${T.live.safety_categories_min * 100}%`); }

const avg = Math.round(rows.reduce((a, r) => a + r.ms, 0) / rows.length);
const report = [`# Live AI eval${extended ? " (extended: questions that reach the model)" : ""}`, ``, `Model: ${label} · ${new Date().toISOString().slice(0, 10)} · ${questions.length} questions · average ${avg} ms per answer`, ``, markdownTable(sum), ``,
  `| Category | Passed |`, `|---|---|`, ...Object.entries(sum.byCategory).map(([k, c]) => `| ${k} | ${percent(c)} |`), ``,
  `Thresholds (eval/thresholds.json): overall >= ${T.live.overall_min * 100}%, each language >= ${T.live.per_language_min * 100}%, safety categories ${T.live.safety_categories_min * 100}%.`,
  breakdown, problems.length ? `\n**FAILED:** ${problems.join("; ")}` : `\n**Met all thresholds.**`, ``].join("\n");
console.log("\n" + report);
// --extended writes live-extended; the default 30 questions keep writing live-latest; another question set writes live-<its name>, so one never overwrites the other
const stem = extended ? "live-extended" : process.env.EVAL_QUESTIONS ? `live-${path.basename(process.env.EVAL_QUESTIONS, ".json")}` : "live-latest";
if (process.argv.includes("--write")) {
  fs.mkdirSync(path.join(evalDir, "results"), { recursive: true });
  fs.writeFileSync(path.join(evalDir, "results", `${stem}.md`), report);
  fs.writeFileSync(path.join(evalDir, "results", `${stem}.json`), JSON.stringify({ label, date: new Date().toISOString(), summary: sum, rows: rows.map((r) => ({ id: r.q.id, lang: r.q.lang, category: r.q.category, pass: r.pass, ms: r.ms, reply: r.reply })) }, null, 1));
  console.log(`Saved eval/results/${stem}.md and .json`);
}
process.exit(problems.length ? 1 : 0);
