// "Smooth response" eval: how long a diner waits for an answer, measured against a RUNNING server with the real model.
// eval-live.mts checks that answers are right; this checks that they come fast enough and keep coming under load.
//
//   npm run eval:smooth                 (server on http://localhost:3000, restaurant golden-lotus, eval/sushi_menu_questions.json)
//   npm run eval:smooth -- --write      also saves eval/results/smooth-latest.{md,json}
//
// Three parts, all with preview:true as the signed-in owner (nothing is stored or counted, see eval-live.mts):
//   1. one question after another: the time of each answer, split into rule answers (from the database) and model answers
//   2. a burst: BURST_SIZE model questions sent at the same moment (the shop has one computer, so they queue; SRS NFR-7: nobody waits more than 30 s)
//   3. the rules while the model is busy: rule questions sent while a model question is running must not wait for it
// Thresholds: eval/thresholds.json "smooth". Env: EVAL_BASE_URL, EVAL_SLUG, EVAL_QUESTIONS, EVAL_LABEL, EVAL_OWNER_EMAIL / EVAL_OWNER_PASSWORD, BURST_SIZE.
// The server's rate limits are per minute (RATE_LIMIT_CHAT_IP_MAX 60, RATE_LIMIT_CHAT_RESTAURANT_MAX 120): start it with larger ones for this run.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { latencyOf, shareWithin, type EvalQuestion, type Latency } from "../tests/evalScore.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const evalDir = path.join(here, "..", "..", "eval");
const base = (process.env.EVAL_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const slug = process.env.EVAL_SLUG || "golden-lotus";
const label = process.env.EVAL_LABEL || process.env.OLLAMA_MODEL || "gemma4:12b (Ollama default)";
const questions: EvalQuestion[] = JSON.parse(fs.readFileSync(path.join(evalDir, process.env.EVAL_QUESTIONS || "sushi_menu_questions.json"), "utf8"));
const T = JSON.parse(fs.readFileSync(path.join(evalDir, "thresholds.json"), "utf8")).smooth;
const BURST = Number(process.env.BURST_SIZE) || 4;
const FALLBACK = /unavailable right now|ใช้งานไม่ได้ในขณะนี้|ခဏမရနိုင်ပါဘူး/;

const DEMO_OWNER: Record<string, [string, string]> = { "golden-lotus": ["demo@shop.ai", "demo1234"], "hachi-kyu": ["hachi@shop.ai", "demo1234"] };
const [email, password] = [process.env.EVAL_OWNER_EMAIL || DEMO_OWNER[slug]?.[0] || "", process.env.EVAL_OWNER_PASSWORD || DEMO_OWNER[slug]?.[1] || ""];
const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }).catch(() => null);
const cookie = (login?.headers.getSetCookie() || []).map((c) => c.split(";")[0]).join("; ");
if (!login?.ok || !cookie) { console.error(`Could not sign in as the owner of "${slug}" (${email || "no email"}); the questions would be stored as real chats.`); process.exit(2); }

type Timed = { id: string; lang: string; ms: number; usedModel: boolean; fallback: boolean; ok: boolean };
async function ask(q: Pick<EvalQuestion, "id" | "lang" | "question">): Promise<Timed> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/api/public/${slug}/chat`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ message: q.question, preview: true, table: "5" }), signal: AbortSignal.timeout(180_000) });
    const j: any = await res.json();
    const reply = String(j.reply ?? "");
    return { id: q.id, lang: q.lang, ms: Date.now() - t0, usedModel: !!j.usedModel, fallback: FALLBACK.test(reply), ok: res.ok };
  } catch { return { id: q.id, lang: q.lang, ms: Date.now() - t0, usedModel: false, fallback: false, ok: false }; }
}

// ---- 1. one after another
const seq: Timed[] = [];
for (const q of questions) {
  const r = await ask(q);
  seq.push(r);
  console.log(`${r.fallback ? "SLOW" : r.ok ? "ok  "  : "FAIL"} ${q.id.padEnd(7)} ${r.usedModel ? "model" : "rules"} ${String(r.ms).padStart(6)} ms`);
}
const rules = seq.filter((r) => !r.usedModel), model = seq.filter((r) => r.usedModel);
const L = { rules: latencyOf(rules.map((r) => r.ms)), model: latencyOf(model.map((r) => r.ms)), all: latencyOf(seq.map((r) => r.ms)) };
// a model answer that came back as the "AI unavailable" message was cut off at the 15 s limit: it counts as slow even though it came back
const fallbacks = seq.filter((r) => r.fallback), failedRequests = seq.filter((r) => !r.ok);

// ---- 2. a burst of model questions at the same moment
const modelQs = questions.filter((q) => seq.find((r) => r.id === q.id)?.usedModel).slice(0, BURST);
const burst = modelQs.length ? await Promise.all(modelQs.map(ask)) : [];
const B = latencyOf(burst.map((r) => r.ms));

// ---- 3. rule questions while a model question is running
const ruleQs = questions.filter((q) => seq.find((r) => r.id === q.id && !r.usedModel)).slice(0, 10);
let during: Timed[] = [];
if (modelQs.length && ruleQs.length) {
  const slow = ask(modelQs[0]);
  await new Promise((r) => setTimeout(r, 300));                       // the model question is running now
  during = await Promise.all(ruleQs.map(ask));
  await slow;
}
const D = latencyOf(during.map((r) => r.ms));

// ---- verdict
const problems: string[] = [];
if (failedRequests.length) problems.push(`${failedRequests.length} request(s) failed`);
if (L.rules.p95 > T.rules_p95_ms) problems.push(`rule answers p95 ${L.rules.p95} ms is above ${T.rules_p95_ms} ms`);
if (model.length && shareWithin(model.map((r) => r.ms), T.model_limit_ms) < T.model_within_limit_min) problems.push(`only ${Math.round(shareWithin(model.map((r) => r.ms), T.model_limit_ms) * 100)}% of model answers came within ${T.model_limit_ms} ms (need ${T.model_within_limit_min * 100}%)`);
if (model.length && fallbacks.length / model.length > T.fallback_max_share) problems.push(`${fallbacks.length} of ${model.length} model answers fell back to "AI unavailable" (limit ${Math.round(T.fallback_max_share * 100)}%)`);
if (burst.length && B.max > T.burst_max_ms) problems.push(`the slowest of ${burst.length} simultaneous model questions took ${B.max} ms (limit ${T.burst_max_ms} ms)`);
if (during.length && D.p95 > T.rules_while_model_p95_ms) problems.push(`rule answers while the model was busy: p95 ${D.p95} ms is above ${T.rules_while_model_p95_ms} ms`);

const row = (name: string, x: Latency) => `| ${name} | ${x.n} | ${x.p50} | ${x.p90} | ${x.p95} | ${x.max} | ${x.mean} |`;
const report = [`# Smooth response eval`, ``, `Model: ${label} · ${new Date().toISOString().slice(0, 10)} · ${questions.length} questions (${slug}) · times in milliseconds`, ``,
  `| Part | Answers | p50 | p90 | p95 | max | mean |`, `|---|---|---|---|---|---|---|`,
  row("Rule answers, one at a time", L.rules), row("Model answers, one at a time", L.model), row("All answers, one at a time", L.all),
  row(`Burst: ${burst.length} model questions at once`, B), row("Rule answers while the model is busy", D), ``,
  `Model answers within ${T.model_limit_ms / 1000} s: ${model.length ? Math.round(shareWithin(model.map((r) => r.ms), T.model_limit_ms) * 100) : 100}% · fell back to "AI unavailable": ${fallbacks.length} of ${model.length} · failed requests: ${failedRequests.length}`, ``,
  `Thresholds (eval/thresholds.json "smooth"): rule p95 <= ${T.rules_p95_ms} ms; >= ${T.model_within_limit_min * 100}% of model answers within ${T.model_limit_ms} ms; at most ${Math.round(T.fallback_max_share * 100)}% fallbacks; burst max <= ${T.burst_max_ms} ms; rules while the model is busy p95 <= ${T.rules_while_model_p95_ms} ms.`,
  problems.length ? `\n**FAILED:** ${problems.join("; ")}` : `\n**Met all thresholds.**`, ``].join("\n");
console.log("\n" + report);
if (process.argv.includes("--write")) {
  fs.mkdirSync(path.join(evalDir, "results"), { recursive: true });
  fs.writeFileSync(path.join(evalDir, "results", "smooth-latest.md"), report);
  fs.writeFileSync(path.join(evalDir, "results", "smooth-latest.json"), JSON.stringify({ label, date: new Date().toISOString(), latency: { ...L, burst: B, rulesWhileModelBusy: D }, rows: seq }, null, 1));
  console.log("Saved eval/results/smooth-latest.md and .json");
}
process.exit(problems.length ? 1 : 0);
