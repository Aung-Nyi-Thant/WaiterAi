// Runs the 30 questions of eval/questions.json through the chat API of a RUNNING server with the real
// model, scores them, prints accuracy per language and exits 1 if eval/thresholds.json is not met.
//
//   npm run eval:live                 (server on http://localhost:3000, restaurant golden-lotus)
//   npm run eval:live -- --write      also saves eval/results/live-latest.{md,json}
//
// Env: EVAL_BASE_URL, EVAL_SLUG, EVAL_LABEL (text printed in the report, e.g. the model name).
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
const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.join(evalDir, "questions.json"), "utf8"));
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
const problems: string[] = [];
if (sum.overall.pct < T.live.overall_min) problems.push(`overall ${percent(sum.overall)} is below ${T.live.overall_min * 100}%`);
for (const [l, c] of Object.entries(sum.byLang)) if (c.pct < T.live.per_language_min) problems.push(`${l} ${percent(c)} is below ${T.live.per_language_min * 100}%`);
for (const cat of T.safety_categories) { const c = sum.byCategory[cat]; if (c && c.pct < T.live.safety_categories_min) problems.push(`safety category "${cat}" ${percent(c)} is below ${T.live.safety_categories_min * 100}%`); }

const avg = Math.round(rows.reduce((a, r) => a + r.ms, 0) / rows.length);
const report = [`# Live AI eval`, ``, `Model: ${label} · ${new Date().toISOString().slice(0, 10)} · ${questions.length} questions · average ${avg} ms per answer`, ``, markdownTable(sum), ``,
  `| Category | Passed |`, `|---|---|`, ...Object.entries(sum.byCategory).map(([k, c]) => `| ${k} | ${percent(c)} |`), ``,
  `Thresholds (eval/thresholds.json): overall >= ${T.live.overall_min * 100}%, each language >= ${T.live.per_language_min * 100}%, safety categories ${T.live.safety_categories_min * 100}%.`,
  problems.length ? `\n**FAILED:** ${problems.join("; ")}` : `\n**Met all thresholds.**`, ``].join("\n");
console.log("\n" + report);
if (process.argv.includes("--write")) {
  fs.mkdirSync(path.join(evalDir, "results"), { recursive: true });
  fs.writeFileSync(path.join(evalDir, "results", "live-latest.md"), report);
  fs.writeFileSync(path.join(evalDir, "results", "live-latest.json"), JSON.stringify({ label, date: new Date().toISOString(), summary: sum, rows: rows.map((r) => ({ id: r.q.id, lang: r.q.lang, category: r.q.category, pass: r.pass, ms: r.ms, reply: r.reply })) }, null, 1));
  console.log("Saved eval/results/live-latest.md and .json");
}
process.exit(problems.length ? 1 : 0);
