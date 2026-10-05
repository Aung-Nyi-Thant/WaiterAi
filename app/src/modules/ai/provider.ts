// The one place that talks to a language model. Used by the chat (ai.ts) and the photo import.
//
// The model always runs locally through Ollama (OLLAMA_URL, OLLAMA_MODEL). There is deliberately no cloud
// option: the SRS promises that no customer data is sent to a cloud AI service (constraint 2.2, NFR-5).
// Settings are read on every call, so they can be changed without a rebuild.
export type Msg = { role: "system" | "user" | "assistant"; content: string; images?: string[] };
export type Opts = { temperature: number; maxTokens: number; json?: boolean; timeoutMs: number };

// SRS FR-6: a menu photo is shown for review within 120 seconds, so the model gets at most that long.
export const IMPORT_TIMEOUT_MS = 120_000;

export async function complete(messages: Msg[], o: Opts): Promise<string> {
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

// Asks for a JSON answer (menu photo import, name suggestions). Temperature 0: extraction should be repeatable.
export async function completeJson(prompt: string, images: string[] = [], maxTokens = 2000): Promise<any> {
  const text = await complete([{ role: "user", content: prompt, images }], { temperature: 0, maxTokens, json: true, timeoutMs: IMPORT_TIMEOUT_MS });
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("The model did not return JSON.");
    return JSON.parse(m[0]);
  }
}
