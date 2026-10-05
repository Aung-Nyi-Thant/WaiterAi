# Module 2: AI waiter
Owner: Member 2 (Aung-Nyi-Thant, who also owns the backend core in `platform/`) · Requirements: FR-2 (safe AI waiter chat)

What it does: answers diners' questions in Thai, Burmese and English. Safety-critical answers (allergens, vegetarian lists, prices, hours, sold-out dishes, orders, the bill, rule-change attempts) are built from the database with fixed sentences. Only open questions go to the language model, and its reply is checked before it is shown.

| File | Purpose |
|---|---|
| `ai.ts` | The pipeline: language detection, rules, sentence templates, model prompt, reply checks |
| `provider.ts` | The one place that calls a language model: local Ollama (default) or an OpenAI-compatible cloud API (`AI_PROVIDER`); also used by the photo import |
| `api/chat.ts` | `POST /api/public/<code>/chat` – runs the pipeline, logs the question, creates staff calls, enforces the monthly chat limit |

Evidence and test data live in `eval/` (30 questions, sample menu, model comparison).
Tests: `npm test` (`tests/ai-rules`, `ai-guard`, `chat-api`, `eval`, `provider`) and `npm run eval:live`. The rules and where each is tested: `docs/AI_SAFETY.md`.

## What I did (each member fills this in)
- 
