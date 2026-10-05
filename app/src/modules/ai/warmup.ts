import { all } from "@/modules/platform/db";
import { restaurantById, itemsOf, faqsOf, specialsOf } from "@/modules/platform/menu";
import { warmUpPrompt } from "@/modules/ai/ai";

// Called once when the server starts (src/instrumentation.ts), not awaited there. Reads each restaurant's system prompt into
// the model so the first diner's question does not pay for it. Does nothing if AI_WARMUP=0 or if Ollama is not running.
// A change to the menu, FAQs, specials or AI settings changes the system prompt, so the first question after an edit
// pays for the read again once.
export async function warmUpAll(max = 5): Promise<number> {
  if (process.env.AI_WARMUP === "0") return 0;
  let done = 0;
  for (const { id } of all("SELECT id FROM restaurants ORDER BY id LIMIT ?", max)) {
    const r = restaurantById(id);
    if (!r) continue;
    try { await warmUpPrompt({ restaurant: r, items: itemsOf(id), faqs: faqsOf(id) as any, specials: specialsOf(id), history: [] }); done++; }
    catch { break; }                                 // Ollama is not running: the first real question will load the model instead
  }
  return done;
}
