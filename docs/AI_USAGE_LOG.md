# AI usage log

This file continues **Section 8 ("AI usage log") of the team's M2 SRS** (`Team18_M2_SRS.pdf.pdf`), which logs the work of 21 September 2026. The course rule is: *you may use AI to draft, you must log it, verify it, and be able to explain every requirement and every line you submit.*

Sections: **A** AI inside the product (run time) · **B** AI tools used to build it: B1 evidence in git, B2 files with and without a trace, **B3 the new rows in the course's table format** · **C** to be completed by each member (anything the repository cannot show).

> Rule from `CONTRIBUTING.md`: code written with an AI tool is logged, and the author must read and test it before committing. Cells marked **[team to complete]** can only be filled in by the person who did the work; nothing was filled in on their behalf.

## A. AI inside the product (run time)

| What | Model / service | Used for | Where | Why this choice |
|---|---|---|---|---|
| Chat answers to open questions | `gemma4:12b` through Ollama, on the restaurant's own computer (default). Optional OpenAI-compatible cloud API (`AI_PROVIDER=openai` or `auto`) | Recommendations, FAQs, small talk. **Never** allergens, prices, hours, sold-out dishes, orders or the bill: those are rules from the database | `app/src/modules/ai/ai.ts`, `provider.ts` | Best of four local models in all three languages (SRS 4.5); no cloud cost; customer questions stay on the shop's computer |
| Menu photo import | same model, vision input | Reads dish names and prices from a photo; the owner reviews every row; allergens are never guessed | `platform/api/import.ts` | One model for text and images |
| Thai and Burmese name suggestions | same model | Suggests dish names for the owner to review | `platform/api/importTranslate.ts` | Saves typing; owner confirms |
| Model comparison (build-time evaluation) | `gemma4:12b`, SEA-LION v3 9B, `qwen3:8b`, `qwen3:4b-instruct` | Choosing the model: 30 questions, 3 languages | `eval/run_eval.py`, `eval/results/` | See `docs/SRS_Shop_AI.md` §4.5 |

How the product limits what the AI can do: `docs/AI_SAFETY.md`.

## B. AI tools used to build the project

### B1. Evidence in the git history

All 20 non-merge commits in the history (2026-09-21 to 2026-09-23) carry the trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`, which means **Claude Code (Anthropic)** wrote or edited that work together with the committing member. The other 7 commits are pull-request merges, which have no trailer. Grouped by what they contain:

| Date | Commits (hash) | Work done with Claude Code |
|---|---|---|
| 2026-09-21 | `1b9dc91` | Initial commit: the first version of the app, the evaluation scripts, documents and design generators |
| 2026-09-21 | `e4233a4`, `85858cb`, `3856925` | Split the app into 5 modules (one per member); team work plan and part reassignment |
| 2026-09-22 | `1288c60` | Faster AI waiter: smaller prompt, shorter history, capped reply length |
| 2026-09-22 | `e1495bf`, `bb182aa`, `b7771d2`, `a34650e`, `ed0413f` | Hydration-warning fix; diner accessibility (chat dialog, sticky filters, feedback reasons); staff screen (inline sold-out switch, urgency colour); owner i18n mechanism; dark-theme contrast and reduced-transparency support |
| 2026-09-22 | `b15c57d`, `8f6a633`, `b26c58e`, `fb4fd53` | Diner "Ask AI" hero card (replacing the walking mascot) and in-place chat |
| 2026-09-23 | `e1668a1`, `ef9106f` | The visible "AI cursor" that shows the AI adding a dish |
| 2026-09-23 | `7b44101`, `3dedeca`, `a5fa88f`, `775452d` | Fixes: chat scroll jump, staff redirect by role, "AI" vs "staff" wording, unified staff feed with swipe |

List them yourself with: `git log --grep="Co-Authored-By: Claude" --format="%h %ad %s" --date=short`.

### B2. Files that arrived in those commits, and files with no trace

| Material | Evidence | Notes |
|---|---|---|
| `docs/SRS_Shop_AI.md`, `PROJECT_EXPLANATION.md`, `FEATURE_PLAN.md`, `TEAM_WORK_PLAN.md`, `eval/`, `design/` | First added in the initial commit `1b9dc91` (Claude co-authored) | Treat the documents as AI-assisted drafts; the team must check them against the code |
| `eval/burmese_review*.html`, `eval/burmese_review.md` | Same commit | Review sheets with the model's Burmese answers. The wording was **reviewed and corrected by a project member who is a native Burmese speaker** over four rounds; the corrections are built into the assistant (`ai.ts`, the system prompt) |
| `docs/Shop_AI_Explained.pdf`, `docs/UI_REDESIGN_BRIEF.md`, `docs/diagrams/`, `reports/`, `research_notes/` | Untracked files: no commit trailer to show how they were made | **Section C: the author should state the tool, if any** |
| Personal oral-exam study notes (not in the repository) | Written with Claude Code on 2026-10-05 | Notes from reading the code and running the app |
| Redesign on branch `ui/diner-design-system` (new `sa-` CSS system, table bills) | Uncommitted | Tool use to be stated by the author in Section C |

### B3. New rows, in the course's table format (continuing SRS §8)

| Date | Tool / model | What we asked | What AI produced | What we changed / verified | What we learned |
|---|---|---|---|---|---|
| 22 Sep 2026 | Claude Code | Speed up the AI waiter | Smaller prompt (no ingredients), last 2 turns of history, reply length cap, model kept loaded (`1288c60`) | **[team to complete]** (the 30-question chat test still matches 30/30, see `docs/AI_SAFETY.md`) | **[team to complete]** |
| 22–23 Sep 2026 | Claude Code | Diner and staff UI: accessible chat dialog, filters, feedback reasons, contrast and reduced transparency, "Ask AI" hero card, AI cursor, staff feed, "AI" vs "staff" wording (`bb182aa` … `775452d`, 15 commits) | UI code, CSS and copy changes | **[team to complete]** (the "waiter" wording was corrected twice by a member, commit `a5fa88f`) | **[team to complete]** |
| 5 Oct 2026 | Claude Code (Claude Sonnet 5.5) | Add automated tests, CI, Docker, a seed script, a configurable AI provider, and the documents `TRACEABILITY.md`, `AI_SAFETY.md` and this log | A Vitest suite (200+ tests: permissions, validation, order flow, AI rules, model-output guard, photo import, seed, traceability) plus end-to-end tests against a real server; an enforced eval gate (`eval/thresholds.json`) and `npm run eval:live`; `.github/workflows/ci.yml`; `Dockerfile`, `docker-compose.yml`, `.env.example`, `app/scripts/seed.mts`; `ai/provider.ts`; the docs | Ran on the author's computer: lint, type-check, all tests, production build, the Docker image and `docker compose up` (generated logins work, demo logins refused, chat, restart keeps data), and `npm run eval:live` with the real `gemma4:12b` (30/30). Also run in a clean Linux Node 22 container. **Not yet run on GitHub Actions.** The author must read and review the changes before committing (`git status`) **[team to complete]** | Writing the tests found real bugs the earlier tests had missed: the bill keyword "pay" matched inside "papaya" (asking its price called the staff); staff updates returned 404/500 for invalid input; repeated "bill" requests in chat created duplicate calls; and the model-reply price check ignored a price written before the dish name. Each now has a regression test. Limits that remain: `docs/AI_SAFETY.md` §Known limits |
| 5 Oct 2026 (second session) | Claude Code (Claude Sonnet 5.5) | Five improvements: all 14 allergens, rate limits on chat and logins, "dish x4" quantities, a check for dish names in model replies that are not on the menu, and the safe Biome fixes (`type` on buttons) | Keyword lists and an "I can't confirm" rule for stated allergies; `platform/rateLimit.ts` wired into both logins and chat (env-configurable); a position-based quantity parser; `unknownDish()`; `type="button"` on 79 buttons plus small lint fixes; about 130 new tests, end-to-end rate-limit tests, doc updates | Lint, type-check, all tests (331), production build and the end-to-end tests were run after every step. The dish-name check was measured against the real `gemma4:12b`: 0 of 34 genuine replies (EN/TH/MY) were replaced. The new Burmese keywords (wheat, mustard) and Thai allergen words **need a native speaker's check [team to complete]**. The author must review the diff before committing | A test for the old quantity parser exposed a worse bug than the one reported: in "papaya salad x4 thai tea x2" the tea got quantity 4. Rate limiting by client address is unsafe by default because Next lets a client send its own `X-Forwarded-For`, so per-address limits are opt-in (`RATE_LIMIT_TRUST_PROXY=1`) |

Found while re-checking CI in a Linux Node 22 container (same day, Claude Code): `next build` failed about 1 time in 5 with `database is locked`, because several worker processes created the SQLite file at the same moment and the switch to WAL mode ignored `busy_timeout`. `db.ts` now retries setup while the database is locked (`retryWhileLocked`) and no longer hides a locked error in its migrations (`addColumn`); tests: `app/tests/db-concurrency.test.ts`. The race could not be reproduced on demand, so the test checks the retry logic itself, and the fix was checked by 30 consecutive fresh builds on Linux (result in the final report).

Behaviour changes made in the 5 Oct sessions (each has a test; the second session's are listed in its row above): demo logins are no longer created when `NODE_ENV=production`; English keywords match at the start of a word; staff update validation (400 not 404/500); repeated chat requests reuse the open call; a model reply with a money amount that is not a menu price (or the diner's own number) is replaced by the safe refusal.

## C. To be completed by each member

Add one row for every AI tool you used that is not visible above (ChatGPT, Gemini, Copilot, Claude in a browser, an image generator, a translation tool …). Include text you asked an AI to translate or rewrite (for example Thai or Burmese labels).

| Member | Tool | What you used it for | Files / sections affected | How you checked it |
|---|---|---|---|---|
| (name) | (tool) | (task) | (paths) | (read the code, ran the tests, native-speaker review …) |
