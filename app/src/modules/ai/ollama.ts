const URL_ = process.env.OLLAMA_URL || "http://localhost:11434";
export const MODEL = process.env.OLLAMA_MODEL || "gemma4:12b";

export async function ollamaJson(prompt: string, images: string[] = [], numPredict = 2000): Promise<any> {
  const res = await fetch(`${URL_}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, stream: false, think: false, format: "json", keep_alive: "30m",
      options: { temperature: 0, num_ctx: 8192, num_predict: numPredict },
      messages: [{ role: "user", content: prompt, ...(images.length ? { images } : {}) }],
    }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const text = String((await res.json()).message?.content ?? "");
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("The model did not return JSON.");
    return JSON.parse(m[0]);
  }
}
