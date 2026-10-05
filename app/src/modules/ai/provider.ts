// The one place that talks to a language model. Used by the chat (ai.ts) and the photo import.
//
//   AI_PROVIDER=ollama   (default) local Ollama: OLLAMA_URL, OLLAMA_MODEL
//   AI_PROVIDER=openai   any OpenAI-compatible cloud API: AI_BASE_URL, AI_API_KEY, AI_MODEL
//   AI_PROVIDER=auto     try Ollama first; if it fails and AI_API_KEY is set, use the cloud API
//
// Settings are read on every call, so they can be changed without a rebuild.
export type Msg = { role: "system" | "user" | "assistant"; content: string; images?: string[] };
export type Opts = { temperature: number; maxTokens: number; json?: boolean; timeoutMs: number };

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

export async function complete(messages: Msg[], o: Opts): Promise<string> {
  const p = providerName();
  if (p === "openai") return viaOpenAI(messages, o);
  if (p === "ollama") return viaOllama(messages, o);
  try { return await viaOllama(messages, o); }
  catch (e) { if (!process.env.AI_API_KEY) throw e; return viaOpenAI(messages, o); }
}

// Asks for a JSON answer (menu photo import, name suggestions). Temperature 0: extraction should be repeatable.
export async function completeJson(prompt: string, images: string[] = [], maxTokens = 2000): Promise<any> {
  const text = await complete([{ role: "user", content: prompt, images }], { temperature: 0, maxTokens, json: true, timeoutMs: 240_000 });
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("The model did not return JSON.");
    return JSON.parse(m[0]);
  }
}
