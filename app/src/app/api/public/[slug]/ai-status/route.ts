// Read-only: a loaded model can answer without a cold start; this never sends a prompt.
export async function GET() {
  const model = process.env.OLLAMA_MODEL || "gemma4:12b";
  let modelReady = false;
  try {
    const res = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/ps`, {
      cache: "no-store", signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      const name = model.includes(":") ? model : `${model}:latest`;
      modelReady = Array.isArray(data?.models) && data.models.some((m: { name?: string; model?: string } | null) => m?.name === name || m?.model === name);
    }
  } catch { /* The app is reachable even when Ollama is stopped or slow. */ }
  return Response.json({ server: true, model, modelReady }, { headers: { "Cache-Control": "no-store" } });
}
