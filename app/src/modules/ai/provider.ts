// The one place that talks to a language model. Used by the chat (ai.ts) and the photo import.
//
// The model always runs locally through Ollama (OLLAMA_URL, OLLAMA_MODEL). There is deliberately no cloud
// option: the SRS promises that no customer data is sent to a cloud AI service (constraint 2.2, NFR-5).
// Settings are read on every call, so they can be changed without a rebuild.
export type Msg = { role: "system" | "user" | "assistant"; content: string; images?: string[] };
// timeoutMs: how long the model may work on this request once it has started.
// maxWaitMs: how long the request may wait in line for its turn (none = wait as long as it takes).
// fitMs: the time the reply should fit in. When the model's measured speed says maxTokens would not finish by then, fewer tokens are asked for.
export type Opts = { temperature: number; maxTokens: number; json?: boolean; timeoutMs: number; maxWaitMs?: number; fitMs?: number };

// The model's speed in tokens per second, from Ollama's own numbers (eval_count / eval_duration), smoothed. It is NOT constant: a laptop
// slows to about half after a minute of continuous answers (measured on gemma4:12b: 11.8 tokens/s at first, 6 tokens/s from the 9th
// answer on), and an answer that is not finished when the time limit ends is thrown away. So the length of a reply follows the speed.
const PROMPT_READ_S = 1.5, MIN_TOKENS = 60;
export const modelSpeed = (): number | undefined => (globalThis as any).__aiSpeed;
export function tokenBudget(maxTokens: number, fitMs: number | undefined, speed = modelSpeed()): number {
  if (!fitMs || !speed) return maxTokens;
  return Math.min(maxTokens, Math.max(Math.min(MIN_TOKENS, maxTokens), Math.floor((fitMs / 1000 - PROMPT_READ_S) * speed)));
}
function noteSpeed(tokens: number, ns: number) {
  if (tokens < 20 || !(ns > 0)) return;                       // a short reply gives a noisy figure
  const s = tokens / (ns / 1e9), old = modelSpeed();
  (globalThis as any).__aiSpeed = old ? (old + s) / 2 : s;
}

// SRS FR-6: a menu photo is shown for review within 120 seconds, so the model gets at most that long.
export const IMPORT_TIMEOUT_MS = 120_000;

// SRS 2.2: "one server computer processes one AI answer at a time". Requests are served first come, first served.
// Without this, every request would start at once, share the model and all run slower, so with three diners
// most answers would hit the time limit (measured: 104 of 108 answers). The line is kept on globalThis because
// Next.js can load this module more than once (one copy per route bundle), and there must be only one line.
const g = globalThis as any;
export class AiBusyError extends Error { constructor() { super("The AI is busy; the wait for a turn was too long."); } }

export async function complete(messages: Msg[], o: Opts): Promise<string> {
  const before: Promise<void> = g.__aiLine ?? Promise.resolve();
  let release!: () => void;
  g.__aiLine = new Promise<void>((r) => (release = r));          // the next request waits for this one
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (o.maxWaitMs === undefined) await before;
    else await Promise.race([before, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { reject(new AiBusyError()); before.then(release); }, o.maxWaitMs);   // give up, but keep the line moving
    })]);
  } finally { clearTimeout(timer); }
  try { return await viaOllama(messages, o); } finally { release(); }
}

// Context size of every request (Ollama reloads the model when it changes, so it must be the same everywhere).
// 16384 since the menus grew: Golden Lotus with the prototype's 132 dishes added is an 8,574-token prompt (Ollama's log: "truncating input
// prompt"), which did not fit 8192, so Ollama cut the middle out of it (the menu the model saw was incomplete) and, because the cut
// moved with every question, could never reuse the prompt it had read. OLLAMA_NUM_CTX overrides it.
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX) || 16384;

async function viaOllama(messages: Msg[], o: Opts): Promise<string> {
  const res = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "gemma4:12b", stream: false, think: false, ...(o.json ? { format: "json" } : {}),
      // Keep the model in memory while the restaurant is open: after an idle gap Ollama needs ~15 s to load it again,
      // and the first diner would get the "AI unavailable" message because of the 15 s limit (SRS NFR-1).
      keep_alive: process.env.OLLAMA_KEEP_ALIVE || "12h",
      options: { temperature: o.temperature, num_ctx: NUM_CTX, num_predict: tokenBudget(o.maxTokens, o.fitMs) },
      messages: messages.map((m) => ({ role: m.role, content: m.content, ...(m.images?.length ? { images: m.images } : {}) })),
    }),
    signal: AbortSignal.timeout(o.timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const j = await res.json();
  noteSpeed(Number(j.eval_count), Number(j.eval_duration));
  const text = String(j.message?.content ?? "");
  // The model hit the token cap (num_predict): the reply ends mid-sentence. Keep what it said up to the last full sentence instead of
  // showing a cut-off word. (JSON answers are not trimmed: they are parsed whole.)
  return j.done_reason === "length" && !o.json ? trimToSentence(text) : text;
}

// A reply cut off by the token cap, cut back to its last complete sentence (English . ! ?, Burmese ။, or a line break). Thai has no
// full stop, so it is cut back to the last space (the partial last word is dropped). The cut is only used when it keeps at least
// 40% (60% for the space) of the text; otherwise the reply is returned as it is.
export function trimToSentence(text: string): string {
  const t = text.trimEnd();
  const end = [...t.matchAll(/[.!?\u2026\u104B]+(?=\s|$)|\n/g)].pop();
  if (end?.index !== undefined) { const cut = t.slice(0, end.index + end[0].length).trimEnd(); if (cut.length >= t.length * 0.4) return cut; }
  const sp = t.lastIndexOf(" ");
  return sp > 0 && sp >= t.length * 0.6 ? t.slice(0, sp).trimEnd() : t;
}

// Asks for a JSON answer (menu photo import, name suggestions). Temperature 0: extraction should be repeatable.
export async function completeJson(prompt: string, images: string[] = [], maxTokens = 2000): Promise<any> {
  const text = await complete([{ role: "user", content: prompt, images }], { temperature: 0, maxTokens, json: true, timeoutMs: IMPORT_TIMEOUT_MS });
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("The model did not return JSON.");
    return JSON.parse(m[0]);
  }
}
