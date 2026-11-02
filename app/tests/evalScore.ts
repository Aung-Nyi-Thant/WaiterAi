// Scores an AI reply against one question from eval/questions.json.
// Same rule as scripts/chat_smoke.py: every "expect" group needs at least one of its words in the
// reply (case-insensitive), and no "forbid" pattern may match.
export type EvalQuestion = { id: string; lang: "en" | "th" | "my"; category: string; question: string; expect: string[][]; forbid: string[]; rules?: boolean; helpful?: boolean; offer?: "help" | "bill" | "none" };
export type Scored = { q: EvalQuestion; reply: string; pass: boolean; missing: string[][]; forbidden: string[] };

// "helpful": the question has an answer the AI can give (a recommendation, small talk, a dish description), so "I don't have that
// information, ask the staff" is a failure even though it is safe. Questions with no data keep the plain expect/forbid check.
export const DONT_KNOW = /(?:don'?t|do not|doesn'?t|does not) have (?:any |that |this |the )?(?:information|info|data)|no information|not have information|ไม่มีข้อมูล|ไม่ทราบ(?!ว่า)|အချက်အလက်\s*မရှိ|အချက်အလက်မရှိ|မသိပါ/i;
// `offer` is the staff button that came with the reply ("none" when there was none); checked only when the question says which one it expects
export function scoreReply(q: EvalQuestion, reply: string, offer?: string): Scored {
  const low = reply.toLowerCase();
  const missing = q.expect.filter((group) => !group.some((s) => low.includes(s.toLowerCase())));
  const forbidden = q.forbid.filter((p) => new RegExp(p, "i").test(reply));
  if (q.helpful && DONT_KNOW.test(reply)) forbidden.push("unhelpful: says it has no information");
  if (q.offer && offer !== undefined && offer !== q.offer) forbidden.push(`button: expected ${q.offer}, got ${offer}`);
  return { q, reply, pass: !missing.length && !forbidden.length, missing, forbidden };
}

type Count = { pass: number; total: number; pct: number };
const count = (rows: Scored[]): Count => ({ pass: rows.filter((r) => r.pass).length, total: rows.length, pct: rows.length ? rows.filter((r) => r.pass).length / rows.length : 1 });
export function summarize(rows: Scored[]) {
  const by = (key: "lang" | "category") => Object.fromEntries([...new Set(rows.map((r) => r.q[key]))].sort().map((k) => [k, count(rows.filter((r) => r.q[key] === k))]));
  return { overall: count(rows), byLang: by("lang") as Record<string, Count>, byCategory: by("category") as Record<string, Count> };
}

export const percent = (c: Count) => `${Math.round(c.pct * 100)}% (${c.pass}/${c.total})`;
export function markdownTable(s: ReturnType<typeof summarize>): string {
  const L: Record<string, string> = { en: "English", th: "Thai", my: "Burmese" };
  return ["| Language | Passed |", "|---|---|", ...["en", "th", "my"].filter((l) => s.byLang[l]).map((l) => `| ${L[l]} | ${percent(s.byLang[l])} |`), `| **All** | **${percent(s.overall)}** |`].join("\n");
}

// ---- smooth response (scripts/eval-smooth.mts): how long diners wait, not only whether the answer is right
/** Nearest-rank percentile of a list of numbers (p in 0..100); 0 for an empty list. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}
export type Latency = { n: number; mean: number; p50: number; p90: number; p95: number; max: number };
export function latencyOf(ms: number[]): Latency {
  return { n: ms.length, mean: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0, p50: percentile(ms, 50), p90: percentile(ms, 90), p95: percentile(ms, 95), max: ms.length ? Math.max(...ms) : 0 };
}
/** The share of values at or under a limit (1 for an empty list). */
export const shareWithin = (ms: number[], limit: number) => (ms.length ? ms.filter((x) => x <= limit).length / ms.length : 1);
