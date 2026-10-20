import { all } from "@/modules/platform/db";
import { restaurantById, itemsOf, faqsOf, specialsOf, categoriesOf } from "@/modules/platform/menu";
import { warmUpPrompt } from "@/modules/ai/ai";

// Called once when the server starts (src/instrumentation.ts), not awaited there. Reads each restaurant's system prompt into
// the model so the first diner's question does not pay for it. Does nothing if AI_WARMUP=0 or if Ollama is not running.
// A change to the menu, FAQs, specials or AI settings changes the system prompt, so the first question after an edit
// pays for the read again once. The model keeps the prompt of the restaurant it read last (one slot), so the restaurants are read
// from the last to the first: the first one (the default, the demo) is the one that stays warm.
export async function warmUpAll(max = 5): Promise<number> {
  if (process.env.AI_WARMUP === "0") return 0;
  let done = 0;
  for (const { id } of all<{ id: number }>("SELECT id FROM restaurants ORDER BY id LIMIT ?", max).reverse()) {
    const r = restaurantById(id);
    if (!r) continue;
    try { await warmUpPrompt({ restaurant: r, items: itemsOf(id), faqs: faqsOf(id) as any, specials: specialsOf(id), history: [], categories: categoriesOf(id) }); done++; }   // the same context as api/chat.ts, or the prompt differs and the warm-up is wasted
    catch { break; }                                 // Ollama is not running: the first real question will load the model instead
  }
  return done;
}
