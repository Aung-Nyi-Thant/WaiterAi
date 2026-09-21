# Module 2: AI waiter
Owner: Member 2 (Aung-Nyi-Thant, who also owns the backend core in `platform/`) · Requirements: FR-2 (safe AI waiter chat)

What it does: answers diners' questions in Thai, Burmese and English. Safety-critical answers (allergens, vegetarian lists, prices, hours, sold-out dishes, orders, the bill, rule-change attempts) are built from the database with fixed sentences. Only open questions go to the language model, and its reply is checked before it is shown.

| File | Purpose |
|---|---|
| `ai.ts` | The pipeline: language detection, rules, sentence templates, model prompt, reply checks |
| `ollama.ts` | Helper to call Ollama and get JSON back (used by photo import too) |
| `api/chat.ts` | `POST /api/public/<code>/chat` – runs the pipeline, logs the question, creates staff calls, enforces the monthly chat limit |

Evidence and test data live in `eval/` (30 questions, sample menu, model comparison).
Tests: `python3 scripts/chat_smoke.py` (30 questions through the real API) and the chat parts of `e2e.py`.

## What I did (each member fills this in)
- 
