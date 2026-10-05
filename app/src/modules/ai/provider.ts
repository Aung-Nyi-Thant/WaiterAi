// The one place that talks to a language model. Used by the chat (ai.ts) and the photo import.
//
//   AI_PROVIDER=ollama   (default) local Ollama: OLLAMA_URL, OLLAMA_MODEL
//   AI_PROVIDER=openai   any OpenAI-compatible cloud API: AI_BASE_URL, AI_API_KEY, AI_MODEL
//   AI_PROVIDER=auto     try Ollama first; if it fails and AI_API_KEY is set, use the cloud API
//
// Settings are read on every call, so they can be changed without a rebuild.
export type Msg = { role: "system" | "user" | "assistant"; content: string; images?: string[] };
export type Opts = { temperature: number; maxTokens: number; json?: boolean; timeoutMs: number };

// ---- one answer at a time (SRS 2.5) ---------------------------------------------------------------------------------
// A local model is slower when several questions run in parallel (measured: 3 at once took 32 s in total, one after another 15 s),
// so model calls wait in a queue. Chat questions go before photo imports, which can take a minute. If too many are waiting,
// the diner gets the normal "AI unavailable" message instead of a very long wait.
//   AI_MAX_CONCURRENCY   model calls at the same time   default 1 for ollama and auto, 4 for a cloud provider
//   AI_MAX_QUEUE         calls allowed to wait          default 15 (0 = no limit)
const g = globalThis as any;
if (!g.__aiGate) g.__aiGate = { active: 0, high: [], low: [] };
const gate: { active: number; high: (() => void)[]; low: (() => void)[] } = g.__aiGate;
const intEnv = (name: string, d: number) => { const n = Number(process.env[name]); return process.env[name] !== undefined && process.env[name] !== "" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : d; };
async function acquire(low: boolean) {
  const max = Math.max(1, intEnv("AI_MAX_CONCURRENCY", providerName() === "openai" ? 4 : 1)), maxQueue = intEnv("AI_MAX_QUEUE", 15);
  if (gate.active < max) { gate.active++; return; }
  if (maxQueue > 0 && gate.high.length + gate.low.length >= maxQueue) throw new Error("The AI is busy right now.");
  await new Promise<void>((resolve) => (low ? gate.low : gate.high).push(resolve));       // the slot is handed over, so `active` stays the same
}
function release() {
  const next = gate.high.shift() ?? gate.low.shift();
  if (next) next(); else gate.active--;
}

export const providerName = (): "ollama" | "openai" | "auto" => {
  const p = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  return p === "openai" || p === "auto" ? p : "ollama";
};

async function viaOllama(messages: Msg[], o: Opts): Promise<string> {
  const res = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "gemma4:12b", stream: false, think: false, ...(o.json ? { format: "json" } : {}), keep_alive: "30m",
      options: { temperature: o.temperature, num_ctx: 8192, num_predict: o.maxTokens },
      messages: messages.map((m) => ({ role: m.role, content: m.content, ...(m.images?.length ? { images: m.images } : {}) })),
    }),
    signal: AbortSignal.timeout(o.timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  return String((await res.json()).message?.content ?? "");
}

async function viaOpenAI(messages: Msg[], o: Opts): Promise<string> {
  const model = process.env.AI_MODEL;
  if (!model) throw new Error("AI_MODEL is not set (needed for AI_PROVIDER=openai).");
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI_API_KEY is not set (needed for AI_PROVIDER=openai).");
  const res = await fetch(`${(process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, temperature: o.temperature, max_tokens: o.maxTokens, ...(o.json ? { response_format: { type: "json_object" } } : {}),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.images?.length
          ? [{ type: "text", text: m.content }, ...m.images.map((b64) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }))]
          : m.content,
      })),
    }),
    signal: AbortSignal.timeout(o.timeoutMs),
  });
  if (!res.ok) throw new Error(`AI provider ${res.status}`);
  return String((await res.json()).choices?.[0]?.message?.content ?? "");
}

export async function complete(messages: Msg[], o: Opts & { background?: boolean }): Promise<string> {
  await acquire(!!o.background);
  try {
    const p = providerName();
    if (p === "openai") return await viaOpenAI(messages, o);
    if (p === "ollama") return await viaOllama(messages, o);
    try { return await viaOllama(messages, o); }
    catch (e) { if (!process.env.AI_API_KEY) throw e; return await viaOpenAI(messages, o); }
  } finally { release(); }
}

// Asks for a JSON answer (menu photo import, name suggestions). Temperature 0: extraction should be repeatable.
export async function completeJson(prompt: string, images: string[] = [], maxTokens = 2000): Promise<any> {
  const text = await complete([{ role: "user", content: prompt, images }], { temperature: 0, maxTokens, json: true, timeoutMs: 240_000, background: true });
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("The model did not return JSON.");
    return JSON.parse(m[0]);
  }
}
