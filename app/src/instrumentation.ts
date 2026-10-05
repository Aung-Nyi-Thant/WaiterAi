// Runs once when the Next.js server starts. It warms the AI model in the background (see ai/warmup.ts) so the first diner is
// not the one who waits. It must not be awaited: the server would not accept requests until the model had warmed up.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  void import("@/modules/ai/warmup").then((m) => m.warmUpAll()).catch(() => {});
}
