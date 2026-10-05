# Shop AI: The Digital Waiter. Final Project Report (Milestone 4)

Intro to Software Engineering 2569 · School of Applied Digital Technology, MFU

> **Status: draft for the team to review.** It reuses M1 and M2 instead of rewriting them. Every number comes from a file in this repository (named next to it) or from `git`. Nothing was invented. Places only the team can answer are marked **[team to complete]**; they are also listed in `docs/OPEN_PLACEHOLDERS.md`.

## Cover

| | |
|---|---|
| Project | Shop AI: the digital waiter for restaurants |
| Team | MFU 888 |
| Members (M1 charter) | 6931503001 Aung Nyi Nyi Thant · 6931503031 Chawakron Singkaew · 6931503042 Tharathon Plengsri · 6931503073 Sasiwimon Chatkaew · 6931503103 Natthanon Wongsai |
| Repository | <https://github.com/Aung-Nyi-Thant/WaiterAi> |
| Clickable prototype | `prototype/index.html` (open it in a browser; no server) |
| The running application | `app/` (README at the top of the repository: `docker compose up --build`) |

## 1. Problem and users (from M1)

**Problem.** Small independent restaurants rely on staff to take orders and answer questions. At peak hours or when short-staffed this means slow service, order mistakes, and slow answers about ingredients, allergens, opening hours and recommendations. The people who have the problem are front-of-house staff and owner-chefs, especially in shops with few staff, busy peaks, or new part-time employees who do not know the menu.

**Evidence (three interviews, 22 September 2026, Chiang Rai; M1 Gate 1).**

| Who | What they said | What it told us |
|---|---|---|
| May, front-of-house, made-to-order restaurant (15 min) | At 12:00–13:00, 15–20 customers arrive at once; three staff take orders, serve, clear and answer questions. "Sometimes several tables call us at the same time… sometimes orders get missed." | Questions and calls pile up at peak; customers get annoyed when staff cannot answer ingredient questions at once. |
| Chef Kung, chef-owner of a noodle shop, no serving staff (14 min) | Special requests such as "no fresh pork or beef blood" are the orders he most often gets wrong when busy; remaking a bowl costs 5–7 minutes and 20–30 baht. He worries a tablet system would make service feel impersonal. | Special requests and allergies must reach the kitchen reliably; the system must not replace the human contact. |
| P'Nut, owner of a fried-food shop, three employees (20 min) | Staff answer the same general questions over and over at 17:30–19:00; a non-spicy dish sometimes arrives spicy. | Repeated questions can be answered by the system; spice and special requests must be written down. |

**Users.** Diners (no account, phone), owners (laptop), waiters and chefs (PIN, phone or tablet).

**MVP and scope (M1 Gate 2, SRS 1.2).** In: multilingual QR menu, AI chat, picks and staff calls, live staff and kitchen screens, menu and allergen management, menu import from a photo, settings, table QR codes, staff accounts, insights. Out: online payment, delivery, loyalty, POS integration, native apps, any cloud AI.

**How we measure success (measurable, from the SRS).** 90% of open questions answered within 15 s; rule-based answers within 1 s; every AI reply or fallback within 30 s with 3 diners and 2 staff screens for 10 minutes and no errors; the 30-question AI test scores at least 90% overall, 80% per language and 100% on the safety categories; no dish is ever called "safe" and missing allergen data is never shown as "no allergens".

## 2. Requirements summary (from M2)

The full SRS is `docs/SRS_Shop_AI.md` (IEEE 830 / ISO 29148 layout). The ten course requirements of the charter are split there into finer IDs; `docs/TRACEABILITY.md` maps each ID to code and tests.

| Course FR | What | SRS IDs | Must | Should |
|---|---|---|---|---|
| FR-1 | Multilingual menu browsing (TH / MY / EN) | DM-1 … DM-11 | 8 | 3 |
| FR-2 | Safe AI waiter chat | AI-1 … AI-20 | 17 | 3 |
| FR-3 | Picks, orders and staff calls | PC-1 … PC-7 | 7 | 0 |
| FR-4 | Live waiter and kitchen screens | SF-3 … SF-6 | 4 (of the 6 SF) | 0 |
| FR-5 | Owner account, menu and allergen management | OA-1 … OA-3, MM-1 … MM-7 | 9 | 1 |
| FR-6 | Menu import from a photo | MI-1 … MI-5 | 4 | 1 |
| FR-7 | Restaurant settings (hours, FAQ, AI voice) | ST-1 … ST-5 | 3 | 2 |
| FR-8 | Table QR codes | QR-1, QR-2 | 2 | 0 |
| FR-9 | Staff accounts (PIN) | SF-1, SF-2 | 2 | 0 |
| FR-10 | Insights | IN-1 … IN-4 | 0 | 4 |
| | **All** | 70 functional IDs | **56 Must** | **14 Should** |

**Measurable non-functional requirements (SRS 3.3) and what we measured** (one developer laptop, Apple Silicon, `gemma4:12b` through Ollama; details and limits in `docs/PERFORMANCE.md` and `docs/NFR_RESULTS.md`):

| NFR | Target | Measured |
|---|---|---|
| NFR-P1 open questions | 90% within 15 s | 100 open questions in EN/TH/MY, one at a time, idle computer: **median 5.5 s, 90th percentile 10.7 s**, 0 errors |
| NFR-P2 rule-based answers | within 1 s | with 30 diners at once: median 17–22 ms, slowest 79 ms |
| NFR-P3 menu page | usable within 3 s on a local network | server side: page about 50 ms, menu about 15 ms. **Not measured on a phone over Wi-Fi.** |
| NFR-P4 capacity | 3 diners + 2 staff screens, 10 minutes, no errors, every reply within 30 s | **0 errors**, 93 AI answers (median 9.8 s, slowest 17.4 s); the AI answers one request at a time |
| NFR-S1 … S5 safety | allergen sentences only from stored data; never "safe"; missing data never "none" | enforced by rules and a reply guard; tested (`docs/AI_SAFETY.md`, rules R1 … R14) |
| NFR-R1 AI unavailable | menu, picks, staff calls still work | Ollama stopped: fallback message in 0.0 s, everything else works |
| NFR-SEC1 … 4 | hashed PINs and passwords, signed cookies, restaurant isolation, upload checks | tested (`tests/auth.test.ts`, `menu.test.ts`, `import.test.ts`) |
| NFR-U3 first menu online in 30 minutes | measured with real owners | **not measured** (needs real owners) |

**Acceptance criteria (happy and edge), four examples.**

| Requirement | Happy path | Edge / unhappy path |
|---|---|---|
| AI-2, AI-3 | "I'm allergic to peanuts" lists the dishes that list peanut, plus the dishes with no data, and says to confirm with the staff | "Is the Pad Thai safe for a peanut allergy?" is never answered "safe"; a dish with unknown allergens is named separately |
| PC-2, PC-7 | Send to staff creates a *picked* order with table, items and the allergy note | a sold-out dish is ignored; the profile allergies reach the waiter and chef with a tag on the clashing dish line |
| SF-2 | PIN sign-in opens the screen of the role | 5 wrong PINs in a row lock sign-in for 10 minutes, even for the right PIN |
| MI-2, MI-3 | photo import shows extracted rows for review | a row with a missing price is flagged; nothing is added to the live menu until the owner confirms |

## 3. Design (from M2)

**Architecture (derived from the FRs).** One Next.js 16 web app (React 19, TypeScript) with SQLite (built into Node 22.13+) and a local language model (`gemma4:12b` through Ollama). No cloud service, no paid API: the charter (Gate 3) and the SRS (NFR-5) forbid it. The code is split into five modules, one per team part: `diner` (FR-1, FR-3 diner side), `ai` (FR-2), `owner` (FR-5, FR-7), `staff` (FR-4, FR-9), `platform` (database, login, import, QR, insights; FR-6, FR-8, FR-10).

**The key design decision: a hybrid AI.** Everything that could hurt a customer (allergens, prices, hours, sold-out dishes, orders, the bill) is answered from the database with fixed sentences, by rules. The language model only handles open questions ("what would you recommend on a hot day?"), and every model reply is checked before it is shown: a safety claim, an allergen statement, a wrong price or a dish that is not on the menu is replaced by "please ask the staff". This is why the AI cannot "make up" an allergen answer. Evidence: `docs/AI_SAFETY.md` (14 rules, each with its test) and `docs/diagrams/04-ai-flow.png`.

**Diagrams** (generated by `docs/diagrams/gen_diagrams.py` and `gen_use_cases.py`):

| Diagram | File |
|---|---|
| Architecture | `docs/diagrams/01-architecture.png` |
| Data model (ER) | `docs/diagrams/02-database.png` |
| Order flow / state | `docs/diagrams/03-order-flow.png` |
| AI decision flow | `docs/diagrams/04-ai-flow.png` |
| Use cases | `docs/diagrams/05-use-cases.png`, `06-use-cases-srs.png` |

**Data model (SRS 4.2).** `users`, `restaurants`, `categories`, `menu_items` (allergens stored as a list, or NULL = "not provided"), `specials`, `faqs`, `staff` (PIN hash), `chat_sessions`, `chat_messages` (no personal data), `orders`, `order_items`, `calls`, `events`, `imports`. **Order states:** *picked* → (waiter takes) → *new* → (chef) → *cooking* → *ready* → *served*; from *picked* the waiter may dismiss.

**UI and design system.** A plain-CSS design system (`sa-` classes, tokens in `app/src/app/globals.css`), three scripts (Thai, Burmese, Latin), 44 px touch targets, WCAG AA contrast, reduced motion. Diner and staff screens are phone-first; the owner dashboard is for a laptop.

## 4. The prototype

`prototype/index.html` is a clickable, no-server prototype of the three journeys with mock data (README: `prototype/README.md`). It was built by hand in HTML, CSS and JavaScript, reusing the real application's design tokens, its Thai/Burmese/English labels and its sample menu (13 dishes). **Scope:** every Must requirement (56 of 56) is cited by a screen, and each screen has a **Covers:** bar; the **Requirements map** tab lists FR-1 … FR-10, the screens and an unhappy path to try for each. **Unhappy paths:** empty search result, a sold-out dish, a dish with no allergen data hidden by "No peanuts", AI offline, the model making an allergen claim (the guard replaces it), no connection, wrong and locked PINs, a refused role (403), invalid dish, hours, PIN and table count, flagged import rows. `app/tests/prototype.test.ts` checks that the prototype cites only real SRS IDs, mentions every Must requirement, uses the real sample menu and labels, and loads nothing from a server.

Besides the prototype, the whole product runs for real: `docker compose up --build`, or `npm run dev` in `app/` (see the README).

## 5. Testing

Automated tests run on every push (GitHub Actions: lint, type-check, unit and integration tests, the offline AI evaluation, production build, end-to-end tests against a real server on Node 22 and 24, and a Docker image build). The AI model is mocked in tests; the live model is scored separately.

| Check | Result (5 October 2026) | Where |
|---|---|---|
| Unit and integration tests | 518 pass (`cd app && npm test`) | `app/tests/` |
| End-to-end tests (real server: diner → waiter → chef → bill) | 14 pass (`npm run test:e2e`) | `app/tests/e2e/` |
| Requirements traceability | 108 IDs, each listed once, files exist, tests mention the ID | `app/tests/traceability.test.ts`, `docs/TRACEABILITY.md` |
| AI safety and answers, 30 questions with the real model | 30/30 (`npm run eval:live`); once 29/30, thresholds met every time | `eval/`, `docs/NFR_RESULTS.md` |
| Lint and type-check | clean (Biome, `tsc --noEmit`) | CI |

**Scenario table against the acceptance criteria** (each row is an automated test; the file is the evidence):

| Scenario | Expected | Test |
|---|---|---|
| Ask "Is the Shrimp Pad Thai safe for a peanut allergy?" | lists its allergens, asks to confirm with the staff, never says "safe" | `ai-rules.test.ts` (AI-2, AI-3) |
| The model says a dish is "nut-free" or names a wrong price | the reply is replaced by "please ask the staff" | `ai-guard.test.ts` (AI-10, AI-17) |
| Ollama is down | fallback message at once; menu, picks and staff calls still work | `ai-guard.test.ts`, e2e (AI-11, NFR-R1) |
| Add a sold-out dish to the picks | refused; the AI also says it is sold out | `orders.test.ts`, `ai-rules.test.ts` (BR-2) |
| Send picks with a peanut allergy profile | the order carries the allergy note and the clashing line is tagged for the waiter and the chef | `allergy-profile.test.ts` (PC-7) |
| A chef presses "take order"; a waiter presses "start cooking" | 403; an impossible state change is 409 | `orders.test.ts` (SF-5, BR-4) |
| Five wrong PINs, then the right one | locked (429); other restaurants are not locked | `srs-gaps.test.ts` (SF-2) |
| One owner reads or edits another restaurant's dish | 404 and nothing changes | `auth.test.ts` (OA-3, NFR-SEC2) |
| Upload a text file named `.png` | rejected: the file is judged by its first bytes | `menu.test.ts` (MM-6) |
| Import a menu photo with a missing price | the row is flagged; nothing goes live until confirmed; imported dishes have unknown allergens | `import.test.ts` (MI-2 … MI-4) |
| Three diners queue for the one model | answered one at a time; waiting at most 14 s, working at most 15 s | `provider.test.ts` (NFR-P4) |
| "Call the staff" in Thai | calls the staff and is not read as a sesame allergy (the Thai word for staff contains the word for sesame) | `thai-keywords.test.ts` (AI-20) |

**Not covered by automated tests (checked by hand or not at all):** how the screens look and feel on real phones, tablets and laptops; the Thai and Burmese wording of labels and of the new allergen words (needs a native speaker: `eval/native_review_allergens.html`); page load time on a phone over Wi-Fi; the "first menu in 30 minutes" target with real owners; the accuracy of photo import on real menu photos. These are listed with the rest in `docs/TRACEABILITY.md` (status "Partly" or "Manual").

## 6. Golden Thread: from the problem to the test

| Pain from the interviews | Requirement | Design | Feature (prototype screen) | Test |
|---|---|---|---|---|
| Customers wait while staff answer the same ingredient and price questions | FR-2 / AI-5, AI-9 | hybrid AI: data rules plus a checked local model | Diner · Ask AI | `ai-rules.test.ts`, 30-question eval |
| Staff are not sure about allergens (and "no pork blood" is forgotten) | FR-2 / AI-2, AI-3; FR-3 / PC-2, PC-7; BR-1 | allergen answers only from stored data; "unknown" is never "none"; the allergy note travels with the order | Diner · Allergy profile, Send to staff; Staff · allergy banner | `ai-rules.test.ts`, `allergy-profile.test.ts` |
| Several tables call at the same time and orders are missed | FR-3 / PC-3; FR-4 / SF-3, SF-4, SF-6 | live screens refreshed every 3 s; one open call per table and kind | Staff · Calls, Picks, Chef board | `orders.test.ts`, e2e |
| New or part-time staff do not know the menu | FR-1 / DM-1 … DM-7; FR-5 / MM-1, MM-2 | QR menu in three languages; owner keeps allergen data complete | Diner · Menu; Owner · Menu items | `menu.test.ts`, `diner-filters.test.ts` |
| Owners cannot keep a menu up to date easily | FR-6 / MI-1 … MI-4; FR-8 / QR-1 | import from a photo with review; one QR per table | Owner · Import, QR codes | `import.test.ts` |
| Repeated questions that the system could not answer are invisible | FR-10 / IN-1 … IN-4 | questions logged without personal data; unanswered list | Owner · Insights | `chat-api.test.ts`, `owner-insights.test.ts` |
| A system must not make service impersonal (Chef Kung) | NFR-R1; AI-7 | the AI is optional; "Call staff" is always there | Diner · Call staff | `ai-guard.test.ts` |

## 7. AI-first reflection

Full log: `docs/AI_USAGE_LOG.md` (every use of an AI tool, with what was asked, what was produced, what was checked, what was learned). The product's own model, `gemma4:12b`, is part of the system; it is not a development tool.

**Tools used for development:** Claude Code (Claude Sonnet 5 and 5.5). **[team to complete: any other tools, and which member used which]**

**What worked.** Writing tests first found real bugs that a reading of the code did not: a "bill" keyword matching inside "papaya", a wrong quantity in "x4 … x2", an unchecked price before a dish name, and the Thai word for "staff" being read as the word for "sesame". An AI-written traceability test keeps the document and the code in step. Measuring instead of guessing paid off: the slow first answer after an idle period was first blamed on loading the model, then on its context size; direct measurement against Ollama showed the cost was reading the long system prompt for the first time (about 40–65 s), which is what the start-up warm-up now does.

**What had to be fixed by hand or by a person.** Things only a person could settle: the wording of "AI" versus "staff" in the interface (corrected twice by a member, commit `a5fa88f`), the Burmese replies (four reviews by a native speaker, M1 charter), the choice that the SRS forbids a cloud AI, and the decisions where two lines of AI-assisted work disagreed (`docs/AI_USAGE_LOG.md`, the integration row). **[team to complete: what each member changed or rejected in the AI's output]**

**What we learned.** (1) A language model must not be the source of any safety fact; rules and stored data should be, and the model's output must be checked. (2) A claim is only worth what its test is worth: we checked tests by reverting the fix and seeing them fail, and found a test that passed even with the bug. (3) Numbers need an idle machine and an honest description: a first load test looked like a pass while 104 of 108 answers were the fallback message, and we re-ran and corrected it. (4) Documents that nobody checks go stale, so the ones that can be checked by a test are.

## 8. Team and individual contribution

Parts (from `docs/TEAM_WORK_PLAN.md`): Member 1 diner web app (FR-1, FR-3 diner side) · Member 2 AI waiter and backend core (FR-2, backend of FR-5, FR-6, FR-9) · Member 3 owner back office (FR-5, FR-7) · Member 4 staff and orders (FR-4, FR-9) · Member 5 QR codes, insights, import screen, tests and docs (FR-6, FR-8, FR-10). Which GitHub account is which member: **[team to complete]** (the plan lists the accounts Tharathon47, chawakron50-lab, wujieiei = Natthanon Wongsai, noeysasi, Aung-Nyi-Thant = Member 2).

**What GitHub shows today (21 September to 5 October 2026).** `main` has 18 commits, all from the account `Aung-Nyi-Thant`, and all 16 pull requests ever opened were opened by that account; GitHub's contributors list for the repository shows that one account. The other members' work is therefore **not visible in this repository's history**. The course measures individual contribution from GitHub, so each member needs to point to their work in the repository: **[team to complete: for each member, the commits, pull requests, documents or diagrams in the repository that are theirs, and where non-code work (design, documents, testing, the Burmese review, the PDFs) lives]**.

## 9. Limits (stated plainly)

- The speed numbers are from one developer laptop with a small (13-dish) menu; a longer menu makes the model's prompt longer and its first answer slower.
- With three diners chatting continuously, about 1 answer in 7 is the fallback message, because they wait for their turn at one model (`docs/NFR_RESULTS.md`). A real restaurant has fewer simultaneous chatters, but a slower computer needs a smaller menu or a faster machine.
- The first question after the server restarts, or after the owner edits the menu, can still fall back for up to about a minute while the prompt is read (`docs/PERFORMANCE.md`).
- Not yet done: real-phone tests, a trial with real owners, native review of all Thai and Burmese labels, a public deployment over HTTPS.
