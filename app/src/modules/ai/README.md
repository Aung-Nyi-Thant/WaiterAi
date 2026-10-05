# Module 2: AI waiter
Owner: Member 2 (Aung-Nyi-Thant, who also owns the backend core in `platform/`) · Requirements: FR-2 (safe AI waiter chat)

What it does: answers diners' questions in Thai, Burmese and English. Safety-critical answers (allergens, vegetarian lists, prices, hours, sold-out dishes, orders, the bill, rule-change attempts, **recommendations by spice, budget and dish type, and everything that depends on the diner's allergy profile**) are built from the database with fixed sentences. Only open questions go to the language model, and its reply is checked before it is shown.

| File | Purpose |
|---|---|
| `ai.ts` | The pipeline: language detection, rules, sentence templates, **allergy profile**, **smart recommendations**, model prompt, reply checks |
| `provider.ts` | The only place that talks to the model: local Ollama (no cloud option), one answer at a time (first come, first served), time limits, JSON helper (used by photo import too) |
| `api/chat.ts` | `POST /api/public/<code>/chat` – runs the pipeline, logs the question and the diner's allergy profile (allergen keys only), creates staff calls (one open call per table and kind), enforces the rate limits and the monthly chat limit |

## The order of the pipeline (`answer()` in `ai.ts`)
1. A message that tries to change the rules gets a fixed refusal.
2. Ingredients of a named dish; allergen questions (named allergen, or a dish with allergy words); "what can I eat with my allergies?" (needs a profile) – all from the allergen data.
3. Bill and call-staff requests (one open call per table and kind).
4. **Recommendations** ("what's spicy", "something mild under 100 baht", "a dessert", "what's popular"): menu data, ranked by the last 30 days of real orders.
5. Vegetarian/vegan lists, a named dish (price, sold out, adding to picks), pork, opening hours, "show the menu".
6. An allergy question that matches nothing: ask for the dish or allergen. Never let the model guess.
7. Everything else (open questions) goes to the model, and its reply is checked (next section).

## What is checked on a model reply
Replaced by a fixed "please ask the staff" sentence: an empty reply, a claim that a dish is safe / allergy-free, a price that differs from the menu.
Replaced by the stored allergen data of the dish it names (or by a request to name the dish): **any statement about allergens**, in either direction ("contains peanuts", "nut-free", "no dairy"). The model may not say anything about allergens: it only sees the data it was given and has been wrong about it (the Papaya Salad has peanuts; the model once said it had none).
With an allergy profile: a reply that suggests a dish listing one of the diner's allergens, or having no allergen data, is replaced; dish cards the model adds are limited to dishes that fit the profile.
The owner's voice ending (ค่ะ/ครับ, ရှင်/ခင်ဗျာ) is fixed on every Thai or Burmese reply.

## Time limits and queue
One AI answer at a time (SRS 2.2). A request waits at most 14 s for its turn and the model works on it at most 15 s, so the diner has an answer or the fallback message within 30 s. Rule-based answers never wait for the model.

Evidence and test data live in `eval/` (30 questions, sample menu, model comparison).
Tests: `npm test` (`tests/ai-rules`, `ai-guard`, `chat-api`, `eval`, `provider`) and `npm run eval:live`. The rules and where each is tested: `docs/AI_SAFETY.md`.

## What I did (each member fills this in)
- 
