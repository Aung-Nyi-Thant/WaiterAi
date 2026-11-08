# Test report, 20 Oct 2026

Branch `main-ui-hachi-kyu-tests` (not pushed). Model `gemma4:12b` on the project laptop, one test at a time.

## What was applied to the main app

| Area | Change |
|---|---|
| UI | The prototype's improvements, **keeping the app's own design system** (cherry / teal / mustard, day and night themes): no emoji or glyph icons (drawn `Icon` instead), a photo that cannot load falls back to a plate, sheets slide up (320 ms) and away (170 ms), dish cards arrive 30 ms apart, picks count bounces, quantities tick, a new order or call rises in and glows, pages slide in, hover only on devices that can hover, no tap flash, reduced motion keeps the fades. |
| Product data | **HaChi Kyu** (132 dishes, 9 categories) as a second restaurant: `npm run db:seed:hachi`. Built from the prototype menu by `scripts/make-hachi-kyu-seed.mts`. Allergens are **estimated from the dish names**: a dish with no clear allergen is stored as "not provided" (never "none"), crustaceans and molluscs are separate, no vegetarian guesses, photo links off unless `SEED_HACHI_PHOTOS=1`. Golden Lotus stays the default. |

## Test results

| Level | Command | Result |
|---|---|---|
| Unit + integration + component | `npm test` | **955 passed**, 47 files (was 892 / 44) |
| Type check, build | `npm run typecheck`, `npm run build` | clean, builds |
| Lint | `npm run lint` | 0 errors, 3 warnings (in files that were already there) |
| System (real built server over HTTP) | `npm run test:e2e` | **22 passed** (was 14); the new file runs the whole HaChi Kyu flow |
| NFR-2 menu and staff screen data < 3 s | `scripts/nfr_check.py nfr2` | pass (avg 1 ms) |
| NFR-4 diner flow with the AI off | `scripts/nfr_check.py nfr4` | pass (fallback in 0.0 s) |
| Load, 13-dish menu | `npm run load-test -- --diners 30` | 0 errors, chat median 22-28 ms |
| Load, 132-dish menu | `LOAD_SLUG=hachi-kyu ... --diners 60` | 0 errors; chat 300-800 ms **before** the cache below |
| Live AI, original 30 | `npm run eval:live` | **30/30** |
| Live AI, extended 30 | `-- --extended` | **29/30** (was 25/30 on a busy machine) |
| Live AI, natural wording 34 | `EVAL_QUESTIONS=questions_natural.json` | **34/34** |
| Live AI, HaChi Kyu 31 (new, 132-dish menu) | `EVAL_SLUG=hachi-kyu EVAL_QUESTIONS=hachi_kyu_questions.json` | **31/31** |
| Live AI, open 126 | `EVAL_QUESTIONS=open_questions.json` | **125/126**, 0 slow fallbacks, all model answers within 15 s |

Not run: `scripts/e2e.py` (hard-wired to a dev server on port 3000; the Vitest e2e covers the same ground), a real phone (touch behaviour needs a device).

## Issues found and fixed

| # | Found by | Issue | Fix |
|---|---|---|---|
| 1 | HaChi Kyu oracle | **"I'll have the Squid Sushi" put nine dishes in the picks**: the nickname "sushi" of other dishes inside the typed name counted as more dishes | a match inside a longer match of another dish is dropped |
| 2 | HaChi Kyu oracle | A dish name with a bracket ("Hamachi (Yellowtail) Sushi") never matched when typed in full | the bracket is removed without leaving a double space; the whole name is also a variant |
| 3 | HaChi Kyu oracle | "Salmon Sushi" is a dish and also the nickname of "Seared Salmon Sushi": a tie made the AI list every fish dish | an exact full name beats a nickname |
| 4 | probe | "I'll have the sashimi" added all 14 sashimi dishes | a word three or more dishes share, and nobody's full name, is no choice of dish |
| 5 | live eval | "How much is the Wagyu Steak?" (not on the menu) answered with the **Chicken Steak's** price | a one-word nickname after another descriptive word names a different dish |
| 6 | load test | 300-800 ms per question on 132 dishes (9 ms of matching, 0.4 ms on 13) | name variants cached per menu, keyed on ids and names: 0.3 ms |
| 7 | live eval | **The eval stored every question as a real chat and counted it against the monthly quota** (its header said it did not; `preview` only works for the signed-in owner): a few hundred questions made every answer "limit reached" and polluted Insights | the script signs in as the owner first, and refuses to run if it cannot |
| 8 | live eval | **Slow answers thrown away.** A 220-token reply needs 17 s at 12 tokens/s and the limit is 15 s; and the laptop slows to 6 tokens/s after 90 s of continuous answers (measured, 24 requests in a row) | per-language caps, trim to the last full sentence, and a reply length that follows the measured speed. Slow fallbacks 7 -> 0, model answers within 15 s 87.7% -> 100% (NFR-1 now met) |
| 9 | live eval | A Burmese "something sweet" (အချို) went to the model, which recommended a drink | Burmese and Thai dessert words added to the rules |
| 10 | live eval | "Can I get a discount?" went to the model, which invented a policy ("prices cannot be reduced") | a rule for topics the data never holds, unless an owner FAQ covers them |
| 11 | screenshot | The allergy-warning toast wrapped into a tall circle over the dish cards | sized to its text, with rounded corners |
| 12 | UI tests | Sheets replayed their entrance on every tap inside them (prototype) | entrances play only for what is new |

## Left as it is, on purpose

- **The model sometimes misspells a dish name** (Thai "ถาดผักรวมเต้าหู้" for "ผัดผักรวมเต้าหู้"); the guard replaces such a reply with "I don't have that information". It showed up in 2 of 126 questions. Safe, not ideal.
- One correct Thai answer (tax invoice) omits the word the scorer looks for (`oth-f3`).
- HaChi Kyu has no Burmese dish names and no photos by default; its allergens are estimates, so almost every allergy answer ends in "please confirm with the staff" (the FAQ says so).
- The `src/app/prototypes/` folder was already untracked and is not part of the commits.

## Re-run

```
cd app
npm test && npm run typecheck && npm run lint
npm run build && npm run test:e2e
npm run dev        # or next start; with Ollama running:
npm run eval:live -- --extended --write        # needs the demo owner, or EVAL_OWNER_EMAIL / EVAL_OWNER_PASSWORD
EVAL_SLUG=hachi-kyu EVAL_QUESTIONS=hachi_kyu_questions.json npm run eval:live -- --write
```
