# Open placeholders: what the team still has to fill in or confirm

Nothing here was filled in with a guess. Each item can only be answered by the person who did the work or who knows the fact.
Search the repo for `[team to` and `(fill in)` to find them again; when a cell is done, delete its marker and its line in this list.

## `docs/AI_USAGE_LOG.md` (section B3, the course's AI-use table)

The rule in `CONTRIBUTING.md`: code written with an AI tool is logged, and the author reads and tests it before committing.

| Line | Row (date, what was asked) | What is missing | Who knows |
|---|---|---|---|
| 52 | 22 Sep 2026, speed up the AI waiter | **[team to complete]** in two cells: what the member changed or verified by hand, and what the team learned | the member who ran that session |
| 53 | 22–23 Sep 2026, diner and staff UI (15 commits) | **[team to complete]** in two cells, same two questions (the log says the "waiter" wording was corrected twice by a member, commit `a5fa88f`) | the member who did the UI |
| 54 | 5 Oct 2026, tests, CI, Docker, seed script, docs | **[team to complete]**: the member must read the changes and confirm | whoever reviews the PRs |
| 55 | 5 Oct 2026 (second session), 14 allergens, rate limits, quantities, dish-name check | **[team to complete]**, including a native speaker's review of the new Thai and Burmese allergen words (`eval/native_review_allergens.html`) | a Thai and a Burmese native speaker |
| 56 | 5 Oct 2026 (follow-up), notes removed, Thai fix, warm-up | **[team to review]** | whoever reviews the PRs |
| 57 | 5 Oct 2026 (integration), merge of PR #48 and the tests branch | **[team to review the resolutions]** | the authors of both lines of work |
| (new) | 5 Oct 2026 (security round 2) | **[team to review]** | whoever reviews the PRs |
| (new) | 5 Oct 2026 (M4 submission) | **[team to review]** | whoever reviews the PRs |

Line 7 of the same file only explains the marker; it is not a cell to fill in.

## `docs/PDF_CORRECTIONS.md` (the rows that mirror the AI log for the M2 PDF)

| Line | Row | What is missing |
|---|---|---|
| 28 | 22–23 Sep 2026 | two cells **[team to complete]** (same answers as AI_USAGE_LOG lines 52–53) |
| 29 | 5 Oct 2026 | **[team to read the diff and confirm]** |
| 30 | 5 Oct 2026 (later) | **[team to confirm]** |

The PDF corrections themselves (the table above these rows) are for the team to apply to the PDFs; the repo only records what to change.

## `docs/TEAM_WORK_PLAN.md`

| Line | Member | GitHub account | Missing |
|---|---|---|---|
| 8 | 1 (diner web app) | Tharathon47 | name: `(fill in)` |
| 10 | 3 (owner back office) | chawakron50-lab | name: `(fill in)` |
| 12 | 5 (QR, insights, import screen, tests, docs) | noeysasi | name: `(fill in)` |

## `docs/SRS_Shop_AI.md`

| Line | What is missing |
|---|---|
| 4 | `Supervisor: [name]`: the supervisor's name. (The authors and the course were filled in from the M1 charter and the member list.) |

## Other open items (no marker in a file, listed so they are not forgotten)

- Native-speaker review of the new Thai and Burmese allergen words: `eval/native_review_allergens.html`.
- A short README note on why the topic changed from the original brief to Shop AI (the charter and SRS PDFs define Shop AI).
- Applying `docs/PDF_CORRECTIONS.md` to the M1 and M2 PDFs.

## The M4 drafts (`docs/FINAL_REPORT.md`, `docs/AI_USE_STATEMENT.md`, `docs/DEMO_SLIDES.html`)

Each marks what only the team can answer with **[team to complete]**:

- Final report cover and section 8: which GitHub account is which member; for each member, where their work is in the repository (commits, pull requests, documents, diagrams, design, testing, the Burmese review, the PDFs).
- Final report section 7 and the AI-use statement: the tools each member used, and what each member changed or rejected in the AI's output.
- Demo slides 9 (team) and 10: who built what, and what each member changed in the AI's output.
- Individual contribution is measured from GitHub, and today `main` shows one account. This is the item to settle first.
