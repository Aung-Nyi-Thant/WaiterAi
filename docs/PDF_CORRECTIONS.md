# Corrections to make in the course PDFs (SRS and charter)

`Team18_M2_SRS.pdf.pdf` and `M1-Charter_ MFU888.pdf` are your submitted deliverables, so they were **not edited**. This file lists what no longer matches the project, with the current wording quoted and replacement text you can paste. Check each one yourself before you change the PDF.

## A. Team M2 SRS (`Team18_M2_SRS.pdf.pdf`)

| # | Where | Current text | Replace with / do |
|---|---|---|---|
| 1 | Page 1, title block | "Worked Example — StudyMate (Instructor's Teaching Demo)", the box "Do NOT copy this domain for your own M2…", and the table header "This example" | Looks like **left-over text from the instructor's template**. Check the course instructions, then delete the banner and change the header "This example" to "Value". |
| 2 | Title table, "SDLC chosen in M1 + reason" | "Incremental - ship the menu, AI waiter and order flow first…" | The M1 charter says **Agile**. Use one of them in both documents. If you keep Agile: "Agile (iterative sprints): the AI's safety answers and its Burmese replies needed repeated test-and-fix rounds (a 30-question test set and 4 reviews by a native Burmese speaker); the screens were refined from feedback every sprint." |
| 3 | FR-3 acceptance criterion | `when "Show to waiter" is tapped` | `when "Send to staff" is tapped` |
| 4 | §5.1 UC-3 | `taps "Show to waiter"; the waiter sees the order with the allergy note.` | `taps "Send to staff"; the floor staff see the order with the allergy note.` |
| 5 | §7 traceability, FR-3 row, "Feature built" | "My picks, Show to waiter, call-staff button" | "My picks, Send to staff, call-staff button" |
| 6 | §5.2 use-case diagram | "[Insert the diagram image here…]" | Insert `docs/diagrams/06-use-cases-srs.png` (matches UC-1 … UC-10 and the UC-6 «include» UC-5 line of the PlantUML code; regenerate with `python3 docs/diagrams/gen_use_cases.py`). Then tick "Use-case diagram inserted" in §9. |
| 7 | §4 NFR-1, "How we will check" | "…timing of 100 sample questions (target)." | Measured and met (100 of 100 within 15 s on an idle laptop). See section C for the numbers and suggested wording. |
| 8 | §4 NFR-2 | "(target, still to measure)" | Server side measured: page about 50 ms, menu about 15 ms with 30 simultaneous diners; staff screens poll every 3 s (`docs/PERFORMANCE.md`). Keep "still to measure" for the phone's browser over Wi-Fi. |
| 9 | §4 NFR-4 | "(still to do)" | Tested: with the AI unreachable the chat shows the fallback message and the menu, picks and calls keep working (`app/tests/e2e/diner-flow.e2e.test.ts` › "falls back safely when the language model is unreachable", which also asserts the answer arrives within 5 s). |
| 10 | §4 NFR-7 | "Load test with 3 phones and 2 staff screens for 10 minutes (target, still to do)." | "Simulated load test (3 diners, 2 staff screens, 10 minutes, one idle laptop): 0 errors; 93 AI answers, median 9.8 s, slowest 17.4 s (limit 30 s); everything else under 110 ms. Real phones not used (`docs/PERFORMANCE.md`)." |
| 11 | §7 traceability, "Test" column | e.g. "chat test 30 of 30; e2e: allergy chat…", "e2e: 20 checks for take, cook, ready, served…" | Add: "automated suite (`npm test`, 397 tests) and end-to-end tests (`npm run test:e2e`) on every push; requirement-by-requirement table in `docs/TRACEABILITY.md`". |
| 12 | §8 AI usage log, row "Build all UI features and the database" | "a Next.js and SQLite application with **12 tables**, about 30 API routes" and "Ran a **64-check** API test" | "**14 tables**" and "a 67-check API test script". |
| 13 | §8 AI usage log, new rows | (none after 21 Sep) | Add the rows below. |
| 14 | §9 self-check | Unticked: "Every FR traces back to a stated problem from a real stakeholder", "Use-case diagram inserted", "AI log is honest", "Requirements checked with a real stakeholder" | The diagram can be ticked once inserted (item 6). The other three stay open until you have done the interview and confirmed the log. **Nobody but the team can tick those honestly.** |

### New AI-log rows (same columns as §8)

| Date | Tool / model | What we asked | What AI produced | What we changed / verified | What we learned |
|---|---|---|---|---|---|
| 22–23 Sep 2026 | Claude Code (Claude Sonnet 5) | Speed up the AI waiter; build accessible diner and staff screens, the "Ask AI" card, the AI cursor, fixes | Smaller prompt and shorter history (`1288c60`); UI code, CSS and copy changes (15 commits) | [team to complete] | [team to complete] |
| 5 Oct 2026 | Claude Code (Claude Sonnet 5.5) | Add automated tests, CI, Docker, a seed script, and the documents TRACEABILITY, AI_SAFETY, AI_USAGE_LOG | A 390+ test Vitest suite and end-to-end tests, GitHub Actions, Dockerfile and compose, seed script, provider layer, the documents | Ran lint, type-check, tests, build, Docker and the live eval after each change; also in a clean Linux Node 22 container. [team to read the diff and confirm] | Writing tests found real bugs (the bill keyword matching inside "papaya"; wrong quantity for the second dish in "x4 … x2"; an unchecked price before a dish name; `database is locked` on first build). |
| 5 Oct 2026 (later) | Claude Code (Claude Sonnet 5.5) | Cover all 14 allergens; rate-limit chat, login and register; check dish names and prices in model replies; check upload contents; end sessions of removed staff; unique PINs; load tests | Keyword lists, `rateLimit.ts`, new reply checks, `imageType.ts`, `scripts/load-test.mts`, `docs/PERFORMANCE.md` | Measured the new checks against 34 real model answers (0 wrongly replaced); load-tested 3 and 30 diners and 10 minutes with staff screens. [team to confirm] | A local model is slower when run in parallel (3 at once took 32 s instead of 15 s); the SRS already said "one at a time" but the code did not enforce it. |

## B. M1 charter (`M1-Charter_ MFU888.pdf`)

| # | Where | Current text | Change |
|---|---|---|---|
| 1 | "PROCESS & TEAM" | "Agile (iterative sprints)…" | Nothing wrong; just make the SRS say the same (A2). |
| 2 | Gate 3, "Database: SQLite, which is built into Node.js" | (correct) | Nothing. The project does need **Node 22.13 or newer** (built-in SQLite); say so if the charter lists requirements. |

## C. NFR-1 measurement (100 open questions, one at a time, `gemma4:12b`)

Measured 2026-10-05 on one laptop (idle) with `npm run load-test -- --ai-questions 100`: 100 open questions (English, Thai, Burmese), one at a time, model loaded, 0 errors.

| Median | 90th percentile | Slowest | Answered within 15 s |
|---|---|---|---|
| 5.5 s | 10.7 s | 12.5 s | 100 of 100 |

**The NFR-1 target (90% within 15 s) is met** on the reference laptop. Suggested wording for §4 NFR-1, "How we will check": "Timing of 100 sample open questions on the reference computer when otherwise idle: median 5.5 s, 90th percentile 10.7 s, all within 15 s; rule-based answers reply in milliseconds. A busy server computer is slower (the same test gave a median of 12.6 s while other heavy programs were running)." Also update row 7 of the table above.
