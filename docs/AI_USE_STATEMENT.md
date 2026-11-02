# AI-use statement (Milestone 4)

> **Status: draft for the team to confirm.** Facts below come from `git` and from `docs/AI_USAGE_LOG.md` (the full log: what was asked, what the AI produced, what was checked, what was learned). Anything only a team member can say is marked **[team to complete]**. The course asks for an honest note, so nothing here is rounded up.

## Two different uses of AI

1. **The product's own model.** `gemma4:12b`, run locally through Ollama, answers open questions for diners. It is part of the system, chosen with a comparison in `eval/` (SRS 4.5), and it is never the source of an allergen, price, hours or order answer: those come from the database (`docs/AI_SAFETY.md`).
2. **AI tools used to build it.** Claude Code (Claude Sonnet 5 and 5.5), used by Aung Nyi Nyi Thant; and Google Antigravity (Gemini 3.8 Flash), logged on 8 Oct for six diner tasks (translations, mobile layout, table number, quantity stepper, order confirmation, tests). Other members' use is not in the log. **[team to confirm.]**

## Where AI tools helped (from the log and `git`)

On the current branch (`ui/liquid-glass-redesign`, 2 Nov 2026), 56 of the 84 non-merge commits (21 Sep to 23 Oct) carry a `Co-Authored-By: Claude` trailer. The other 28 have none, so the history cannot show how they were made (for example four prototype commits of 14 and 18 Oct by another member). About 130 files are uncommitted and have no trailer yet. The areas, in the order they happened:

| When | Area | What the AI did | What was checked |
|---|---|---|---|
| 22 Sep 2026 | Speed of the AI waiter | smaller prompt, shorter history, reply length cap (`1288c60`) | the 30-question test still matched 30/30 |
| 22–23 Sep | Diner, staff and owner screens | accessible chat dialog, filters, contrast and reduced transparency, staff feed, wording | a member corrected the "AI" versus "staff" wording twice (`a5fa88f`) |
| 5 Oct | Tests, CI, Docker, seed script, traceability and AI-safety documents | a large automated test suite, GitHub Actions, Dockerfile, the documents | run locally, in a clean Linux container, on GitHub Actions; tests were checked by reverting the fix and watching them fail |
| 5 Oct | Allergens, rate limits, quantities, dish-name check | keyword lists, `rateLimit.ts`, reply checks | measured against the real model: 0 of 34 genuine replies wrongly replaced |
| 5 Oct | Merge of two parallel lines of AI-assisted work | a merge with 18 conflicts resolved by hand | tests, build and end-to-end tests on the merged result |
| 5 Oct | Security round 2 | PIN lockout, preview flag, cookies, login timing, receipt code, history scope | every fix has a test that fails when the fix is reverted |
| 5 Oct | M4 deliverables | the clickable prototype, the final report draft, these slides and this statement | a test ties the prototype to the SRS; the report cites only repository files |
| 12 Oct | AI answers, tests | Rules for everyday questions; tests for every feature and screen; 126 open questions | native-question score 32% to 97-100%; statement coverage 53% to 92%; every reply read by hand, not only keyword-scored |
| 19–21 Oct | Second restaurant and big menus | HaChi Kyu (132 dishes), a 16384-token context, a compact prompt, sushi-menu rules and question sets, latency eval | live evals 58/58, 17/17, 31/31, 30/30, 34/34, 124/126; found by reading the model server's log that the menu was being truncated |
| 20–23 Oct | Look and feel | Drawn icons, motion, the prototype's look in the app, the liquid-glass redesign with a Figma concept | tests updated; the handoff says production accessibility, runtime blur and translations were **not** reviewed |
| 28–30 Oct (uncommitted) | Allergen honesty, privacy, recovery, performance | Allergy suggestions only from restaurant-verified lists; waiter/chef acknowledgments; chat expiry, export and delete; backup and restore; allergen research; performance re-run | 1,311/1,311 unit and integration tests (re-run 2 Nov); live eval 28/30 and 34/34; 0 of 145 dishes are restaurant-verified yet, so the safe path excludes them; no real restore drill or observed pilot has been done |

## What worked

- **Tests found real bugs** that reading the code had not: a "bill" keyword matching inside "papaya", a wrong quantity in "x4 … x2", an unchecked price before a dish name, `database is locked` on the first build, and the Thai word for "staff" being read as the word for "sesame".
- **Measuring beat guessing.** The slow first answer after an idle period was blamed first on loading the model, then on its context size; measuring against Ollama showed the real cost was reading the long system prompt for the first time (40–65 s), which a warm-up at start-up now avoids.
- **Tests that check documents.** The requirements table, the AI-safety rules and the prototype are each checked by a test, so they cannot quietly go stale.

## What did not work, or had to be corrected

- A first load test counted a pass while 104 of 108 answers were the fallback message; it was re-run and the documents corrected.
- A first timing run overlapped with other work on the same computer and was wrong; the documents now say to measure on an idle machine.
- A test that was meant to catch a bug passed even with the bug (the model sees only the last two messages of a chat); it was caught only by reverting the fix and rewritten.
- The AI tool wrongly said the exam notes had been kept out of the repository; they had been committed by a merge. It was found on checking; the file was removed from the files and kept out of `main` by squash-merging the pull request.
- A task description mentioned an "original brief" (a campus lost-and-found for MFU students). It could not be found anywhere in the repository; the charter and the SRS define Shop AI as the team's project. The README note explaining this is still open (`docs/OPEN_PLACEHOLDERS.md`).

## What people had to decide

The "AI" versus "staff" wording; the Burmese replies (four native-speaker reviews, M1 charter); that no cloud AI is allowed (charter Gate 3, SRS NFR-5); how to merge two lines of work; and what to leave out. **[team to complete: what Aung Nyi Nyi Thant changed, rejected or rewrote in the AI's output, in their own words.]**

## Rules the team follows (`CONTRIBUTING.md`)

Code written with an AI tool is logged in `docs/AI_USAGE_LOG.md`, and the author must read and test it before committing. **[team to confirm that this was done for the rows marked "[team to review]".]**
