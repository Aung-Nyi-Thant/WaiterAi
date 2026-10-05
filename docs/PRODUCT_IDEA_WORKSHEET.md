# Product Idea Worksheet: Shop AI, the digital waiter

Written from what the app does today (checked by tests and by running it, 5 Oct 2026). Every claim below points to something you can show.

## The four questions
| Question | Answer |
|---|---|
| **What product do we improve?** | The restaurant's QR-code menu: today a scanned PDF that nobody can read, ask questions to, or trust about allergies. We turn it into an AI waiter that lives on the diner's phone and speaks Thai, Burmese and English. |
| **Why does it need improving?** | Diners dislike QR menus (90% of US diners prefer paper, 26% say the text is too small). Tourists and migrant workers cannot read the menu language. Ordering is slow because staff must be found. A wrong answer about an allergen can hurt someone, and a generic chatbot makes things up (Moffatt v. Air Canada, 2024). |
| **How do we improve it?** | A photo menu opened by QR code with no app and no login; an AI waiter whose safety-critical answers (allergens, prices, hours, sold-out dishes, recommendations) come from the restaurant's own database in fixed sentences and whose language model only handles open questions and is checked and never allowed to state allergen facts; an allergy profile chosen once and applied to every dish, answer and order; picks sent to waiter and chef screens with the allergy warning on the exact dish line; everything running locally with Ollama, so no customer data leaves the restaurant. |
| **Why does it matter?** | A diner gets a correct answer in their own language in seconds, a kitchen never cooks a dish with someone's allergen because the note got lost, and a small restaurant gets an AI waiter and insights (which allergies its diners have, which dishes are missing allergen data, what sells) for the price of one laptop. |

## Does the product do what the pitch says? Audit (before the improvements)
| Claim | Result |
|---|---|
| 1. Chat works in Thai, Burmese, English and replies in the diner's language | **Works.** 30/30 on the eval set (10 per language). **But** a bug made Thai "call the staff" (`พนักงาน`) look like a sesame allergy (`งา` inside the word): fixed. |
| 2. Allergen, price, vegetarian, hours, sold-out, order and bill answers are fixed sentences from the database; the model only handles open questions | **Works.** Built in `ai.ts`, covered by tests; the model is never called for these. |
| 3. Model replies are rejected if they say "safe", give a wrong price, **or lack dish/allergen data** | **Partial.** "Safe" claims, wrong prices and empty replies were caught. The README claim about missing allergen data was **not true**: a model reply "the Papaya Salad has no peanuts" (the data says peanut) or "gluten-free" (no data) passed through. **Fixed:** the model may no longer state any allergen fact; such replies are replaced by the stored data. |
| 4. Orders and calls reach the waiter and chef screens live | **Works, by polling every 3 s** (not push). Roles and step order are enforced by the server (403 / 409). The allergy note reached the chef only as one banner, without saying which dish. **Improved:** warning tag on each clashing dish line. |
| 5. Owner can edit the menu; import and QR generation work | **Works.** Covered by tests and `e2e.py` (photo import with the real vision model). |
| 6. The 30 eval questions pass `chat_smoke.py`, and `e2e.py` passes | **Works:** 30/30 and 66/66 before the improvements. After: 30/30, 75/75; `eval:live` 30/30 twice. |

## What we improved, and why these three
Chosen because they close the gaps between the pitch and the product, and need no new service.
1. **Allergy profile** (pitch: allergy risk). Chosen once, kept on the phone; marks dishes, filters the menu, shapes every AI answer, and flags the order lines for the chef. A dish with no allergen data is never offered to someone with an allergy; nothing is ever called "safe".
2. **Smart recommendations** (pitch: menus that don't explain dishes, slow ordering). "Something mild under 100 baht", "what's spicy?", "a dessert", "what's popular?": answered instantly from the menu data, ranked by what diners really ordered here, in Thai, Burmese and English. Open questions still go to the model.
3. **Owner insights** (pitch: the AI is useful to the owner too). Which allergies the diners have and how many dishes serve each, which dishes are invisible to diners with an allergy because the owner has not entered allergen data, what sells, which questions repeat.

Not done on purpose: an estimated wait time (the SRS says diners must not see order status), a new fallback (the app already shows a friendly message and keeps menu, picks and calls working when Ollama is down).

## Demo
See the "Demo script" in `app/README.md` (5 steps, under 3 minutes).

## Honest limits
- The AI is one local model answering one question at a time: three diners chatting continuously get about 1 in 7 answers as the fallback message (`docs/NFR_RESULTS.md`).
- Thai and Burmese interface texts are first drafts; a native speaker must review them (the new allergy-profile texts too).
- The allergen data is only as good as what the owner enters; the app never infers allergens from a photo or a dish name.
- The allergy profile reduces risk but does not remove it: the AI says "confirm with the staff" every time because it must.
