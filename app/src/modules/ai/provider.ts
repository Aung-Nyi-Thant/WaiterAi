// The one place that talks to a language model. Used by the chat (ai.ts) and the photo import.
//
// The model always runs locally through Ollama (OLLAMA_URL, OLLAMA_MODEL). There is deliberately no cloud
// option: the SRS promises that no customer data is sent to a cloud AI service (constraint 2.2, NFR-5).
// Settings are read on every call, so they can be changed without a rebuild.
export type Msg = { role: "system" | "user" | "assistant"; content: string; images?: string[] };
// timeoutMs: how long the model may work on this request once it has started.
// maxWaitMs: how long the request may wait in line for its turn (none = wait as long as it takes).
export type Opts = { temperature: number; maxTokens: number; json?: boolean; timeoutMs: number; maxWaitMs?: number };

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
const NUM_CTX = 8192;

async function viaOllama(messages: Msg[], o: Opts): Promise<string> {
  const res = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "gemma4:12b", stream: false, think: false, ...(o.json ? { format: "json" } : {}),
      // Keep the model in memory while the restaurant is open: after an idle gap Ollama needs ~15 s to load it again,
      // and the first diner would get the "AI unavailable" message because of the 15 s limit (SRS NFR-1).
      keep_alive: process.env.OLLAMA_KEEP_ALIVE || "12h",
      options: { temperature: o.temperature, num_ctx: NUM_CTX, num_predict: o.maxTokens },
      messages: messages.map((m) => ({ role: m.role, content: m.content, ...(m.images?.length ? { images: m.images } : {}) })),
    }),
    signal: AbortSignal.timeout(o.timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  return String((await res.json()).message?.content ?? "");
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
