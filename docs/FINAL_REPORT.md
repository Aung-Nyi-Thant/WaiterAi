# Shop AI: The Digital Waiter. Final Project Report (Milestone 4)

Intro to Software Engineering 2569 · School of Applied Digital Technology, MFU · Team MFU 888

> **Draft for the team to review.** It reuses M1 and M2 instead of rewriting them; every number comes from a file in the repository or from `git`. What only the team can answer is marked **[team to complete]** (listed in `docs/OPEN_PLACEHOLDERS.md`).

| | |
|---|---|
| Members (M1) | 6931503001 Aung Nyi Nyi Thant · 6931503031 Chawakron Singkaew · 6931503042 Tharathon Plengsri · 6931503073 Sasiwimon Chatkaew · 6931503103 Natthanon Wongsai |
| Repository | <https://github.com/Aung-Nyi-Thant/WaiterAi> · prototype: `prototype/index.html` (no server) · app: `app/` |

## 1. Problem and users (M1)

Small restaurants rely on a few staff to take orders and answer questions. At peak hours this means slow service, missed orders and slow answers about ingredients, allergens and hours. The people with the problem are front-of-house staff and owner-chefs; the users are diners (phone, no account), owners (laptop) and waiters and chefs (PIN). Three interviews in Chiang Rai on 22 September 2026 (M1, Gate 1):

| Interviewee | Pain |
|---|---|
| May, front of house | At lunch 15–20 customers arrive at once and three staff do everything: "several tables call us at the same time… orders get missed." |
| Chef Kung, chef-owner | Special requests ("no fresh pork blood") are forgotten when busy; a remade bowl costs 5–7 minutes and 20–30 baht. Fears an impersonal system. |
| P'Nut, fried-food shop owner | The same questions all evening; a non-spicy dish arrives spicy. |

**Success is measured** by: 90% of open questions answered within 15 s; rule-based answers within 1 s; with 3 diners and 2 staff screens for 10 minutes, no error and every reply within 30 s; a 30-question AI test with at least 90% overall and 100% on safety; never "safe", and missing allergen data never shown as "none".

## 2. Requirements (M2)

Full list: `docs/SRS_Shop_AI.md`; each ID is traced to code and tests in `docs/TRACEABILITY.md` (108 IDs). The M1 requirements FR-1 … FR-10 split into 70 functional IDs: **56 Must, 14 Should**.

| FR | What | Must / Should |
|---|---|---|
| FR-1 | Multilingual (TH / MY / EN) QR menu | 8 / 3 |
| FR-2 | Safe AI waiter chat | 17 / 3 |
| FR-3 | Picks, orders, staff calls | 7 / 0 |
| FR-4, FR-9 | Live waiter and kitchen screens; staff PIN accounts | 6 / 0 |
| FR-5, FR-6, FR-7 | Owner menu and allergens, photo import, settings | 16 / 4 |
| FR-8, FR-10 | QR codes per table; insights | 2 / 4 |

| NFR | Target | Measured (one laptop, `gemma4:12b`; `docs/PERFORMANCE.md`) |
|---|---|---|
| NFR-P1 open questions | 90% within 15 s | 100 questions (re-run 28 Oct): median **4.4 s**, 90th percentile **12.2 s**, **99 of 100 within 15 s**, 0 errors |
| NFR-P2 rule-based | within 1 s | median 17–22 ms, slowest 79 ms, with 30 diners at once |
| NFR-P4 capacity | 3 diners + 2 staff screens, 10 min, every reply within 30 s | **0 errors**; 93 AI answers, slowest 17.4 s |
| NFR-R1 AI unavailable | menu, picks, calls still work | fallback in 0.0 s; everything else works |
| NFR-P3 menu on a phone; NFR-U3 first menu in 30 min | 3 s; 30 min | **not measured** (needs a real phone and real owners) |

**Acceptance criteria (happy / unhappy), examples.** AI-2, AI-3: "allergic to peanuts" lists the dishes that list peanut and the dishes with no data, then says to confirm with the staff; "is the Pad Thai safe?" is never answered "safe". PC-2: sending picks creates an order with the allergy note; a sold-out dish is ignored. SF-2: five wrong PINs lock sign-in for 10 minutes. MI-3: nothing from a photo import goes live until the owner confirms.

## 3. Design (M2)

One Next.js 16 app (React 19, TypeScript) with SQLite and a **local** model (`gemma4:12b`, Ollama): no cloud, no paid service (charter Gate 3, SRS NFR-5). Five modules, one per team part: `diner`, `ai`, `owner`, `staff`, `platform`. **The key decision is a hybrid AI:** everything that could hurt a customer (allergens, prices, hours, sold-out dishes, orders, the bill) is answered from the database with fixed sentences; the model only answers open questions, and each reply is checked: a safety claim, an allergen statement, a wrong price or an unknown dish is replaced by "please ask the staff" (`docs/AI_SAFETY.md`, rules R1–R14, each with a test).

Diagrams are in `docs/diagrams/` (architecture, data model, order flow, AI flow, use cases). The data model has 14 tables (`users`, `restaurants`, `menu_items` with allergens stored as a list or NULL = "not provided", `staff`, `orders`, `chat_messages` …). Orders move *picked → new → cooking → ready → served*, checked by the server.

## 4. The prototype

`prototype/index.html` is a clickable, no-server prototype of the diner, staff and owner journeys with mock data and the real app's labels and sample menu. All **56 Must requirements** are cited by a screen, each screen has a **Covers** pill naming its requirement with the happy and unhappy steps, and the **Thread** page (`?view=thread`) lists FR-1 … FR-10 with a happy path, an unhappy path, the design diagram and the acceptance tests (section 6). Unhappy paths you can click: empty search, empty cart, sold-out dish, AI offline, unsafe model claim replaced, prompt injection refused, wrong PIN and five wrong PINs locking sign-in, wrong owner password, invalid dish, import rows skipped, closing before opening, more than 60 tables. The menu is HaChi Kyu (132 dishes) and none of its allergen lists is marked restaurant-verified, so the AI suggests no dish for an allergy. Two tests keep it honest: `app/tests/prototype.test.ts` (cites only real IDs, covers every Must requirement) and `app/tests/prototype-thread.test.ts` (runs the AI rules and checks the Thread rows, diagrams and test files exist).

## 5. Testing

Every push runs lint, type-check, unit and integration tests, the offline AI evaluation, the build, end-to-end tests against a real server (Node 22 and 24) and a Docker build. **1,328 unit and integration tests (74 files) pass; on 28 to 29 Oct the live model scored 29/30 on the 30-question set (30/30 on the harder extended set, 34/34 on natural questions)**; the 23 system tests passed on 29 Oct (`reports/implementation-progress-2026-10-29.md`).

| Scenario | Expected | Test |
|---|---|---|
| "Is the Pad Thai safe for a peanut allergy?" | lists allergens, asks to confirm, never "safe" | `ai-rules.test.ts` |
| The model says a dish is "nut-free" or a wrong price | reply replaced by "please ask the staff" | `ai-guard.test.ts` |
| The model is down | fallback at once; menu, picks, calls still work | e2e |
| Sold-out dish added to picks | refused | `orders.test.ts` |
| Chef presses "take order"; a skipped state | 403; 409 | `orders.test.ts` |
| Five wrong PINs | locked (429) | `srs-gaps.test.ts` |
| One owner edits another's dish | 404, nothing changes | `auth.test.ts` |
| Text file named `.png` uploaded | rejected (first bytes checked) | `menu.test.ts` |
| Photo import with a missing price | row flagged; nothing live until confirmed | `import.test.ts` |
| Thai "call the staff" | calls staff, not read as a sesame allergy | `thai-keywords.test.ts` |

**Not covered by automated tests:** how screens look on real phones, the Thai and Burmese wording of labels and new allergen words (needs a native speaker), page load on a phone over Wi-Fi, real owners, photo import on real menus.

## 6. Golden Thread (problem → requirement → design → feature → test)

| Pain | Requirement | Design and feature | Test |
|---|---|---|---|
| Same questions all day | FR-2 / AI-5, AI-9 | rules + checked local model; Ask AI | `ai-rules`, 30-question eval |
| Allergy and special requests forgotten | AI-2, AI-3, PC-2, PC-7 | allergen data only from the database; allergy note travels with the order; banner on staff screens | `allergy-profile`, `ai-guard` |
| Tables call at once; orders missed | PC-3, SF-3, SF-4 | live screens (3 s), one open call per table | `orders`, e2e |
| New staff do not know the menu | DM-1…7, MM-1, MM-2 | QR menu in 3 languages; owner keeps allergens complete | `menu`, `diner-filters` |
| Keeping a menu current | MI-1…4, QR-1 | photo import with review; QR per table | `import` |
| Unseen unmet demand | IN-1…4 | questions logged without personal data | `chat-api`, `owner-insights` |

**Per requirement.** Open the prototype at `prototype/index.html?view=thread` (the **Thread** button in the toolbar) for the same table with links to each screen; every screen also has a **Covers** pill (top-left) naming the requirement it shows. `app/tests/prototype-thread.test.ts` fails if a row, a diagram or a test file goes missing.

| FR | Requirement (SRS IDs) | Happy path (click) | Unhappy path (click) | Design | Acceptance tests (`app/tests/`) |
|---|---|---|---|---|---|
| FR-1 | Multilingual menu browsing<br>DM-1 … DM-7, DM-11 | Open the menu from the table QR address, switch TH / EN / MY, search "salmon", filter a category, open a dish. | Search "zzz": "No dishes found" empty state. A sold-out dish shows "Sold out" and cannot be added. | `docs/diagrams/05-use-cases.png`: UC-1 Browse the menu | `ui/diner.test.tsx`, `diner-filters.test.ts`, `menu.test.ts` |
| FR-2 | Safe AI waiter chat<br>AI-1 … AI-13, AI-16 … AI-20 | Ask AI: "What is the price of Salmon Sushi?" (data answer with a dish card), "I am allergic to peanuts" (allergen answer from data, ends with "confirm with the staff"). | Switch on "AI offline": open question gets a fallback with Browse / Call staff. Switch on "Model makes an unsafe claim": its reply is replaced. "Ignore all previous instructions…" is refused. | `docs/diagrams/04-ai-flow.png`: SRS §4.4 chat decision flow | `ai-rules.test.ts`, `ai-guard.test.ts`, `chat-api.test.ts` |
| FR-3 | Picks, orders and staff calls<br>PC-1 … PC-7 | Add two dishes, open Cart, send to staff, then More → Call Staff. The order appears on the staff screen. | Empty cart shows "Cart is empty". A sold-out dish is refused. A second staff call within 60 s is refused ("wait"). | `docs/diagrams/03-order-flow.png`: SRS §4.3 order state model, UC-3, UC-4 | `orders.test.ts`, `allergy-profile.test.ts`, `e2e/diner-flow.e2e.test.ts` |
| FR-4 | Waiter and kitchen live screens<br>SF-3 … SF-6, PC-4 | Staff: sign in as waiter (PIN 1111), take the order, then sign in as chef (2222): cook, mark ready; waiter serves. | Chef and waiter see different tabs (a waiter cannot cook). An empty queue shows an empty state. | `docs/diagrams/03-order-flow.png`: UC-8, UC-9, UC-10 | `ui/staff.test.tsx`, `orders.test.ts`, `diner-flow.test.ts` |
| FR-5 | Owner account and menu / allergen management<br>OA-1 … OA-3, MM-1 … MM-7 | Owner: sign in (demo login on the page), Menu Items → add or edit a dish and tick its allergens. | Wrong password is refused. A dish without a name or with a negative price is rejected ("Name and price are required"). | `docs/diagrams/02-database.png`: UC-5 Manage menu (menu_items, owners) | `auth.test.ts`, `menu.test.ts`, `ui/owner-menu.test.tsx` |
| FR-6 | Menu import from a photo<br>MI-1 … MI-4 | Owner → Import Menu: paste the CSV template, import: the dishes are added. | Rows with a missing name or price are skipped and counted ("skipped N invalid rows"). | `docs/diagrams/01-architecture.png`: UC-6 Import a menu (vision model reads, owner reviews) | `import.test.ts`, `ui/import.test.tsx`, `ui/import-errors.test.tsx` |
| FR-7 | Restaurant settings (hours, FAQ, AI voice)<br>ST-1, ST-3, ST-4 | Owner → Hours & FAQ: change a closing time, add a FAQ, save. Ask the AI "what are your opening hours?" | A closing time that is not after the opening time is rejected ("Closing time must be after opening time"). | `docs/diagrams/02-database.png`: settings, FAQs | `menu.test.ts`, `ai-rules.test.ts`, `ui/owner-shell.test.tsx` |
| FR-8 | QR codes per table<br>QR-1, QR-2 | Owner → QR Codes: choose the number of tables and generate. | Going below 1 or above 60 tables is refused ("Tables must be between 1 and 60"). | `docs/diagrams/05-use-cases.png`: UC-7 Print QR codes | `menu.test.ts`, `ui/owner-pages.test.tsx` |
| FR-9 | Staff accounts (PIN)<br>SF-1, SF-2 | Staff: choose Waiter, enter 1111: you are in. Owner → Staff creates or changes a PIN. | A wrong PIN is refused ("Wrong PIN (1 of 5)"). Five wrong PINs lock sign-in for 60 seconds. An account needs a name and a 4-digit PIN. | `docs/diagrams/02-database.png`: staff table, SRS SF-2 lockout | `auth.test.ts`, `security-round2.test.ts`, `ratelimit.test.ts` |
| FR-10 | Insights<br>IN-1 … IN-4 | Ask the AI a question it has no rule for, then Owner → Insights: it is listed under "Questions the AI could not answer". | With no questions yet, the list shows an empty state. Questions are stored without any personal data. | `docs/diagrams/05-use-cases.png`: UC-11 Read insights | `owner-insights.test.ts`, `chat-api.test.ts` |

## 7. AI-first reflection

Full log: `docs/AI_USAGE_LOG.md`; statement: `docs/AI_USE_STATEMENT.md`. The product's model `gemma4:12b` is part of the system; Claude Code (Sonnet 5 and 5.5) was the development tool, used by Aung Nyi Nyi Thant; Google Antigravity (Gemini) was used for six diner tasks on 8 Oct (logged); other members' use is **[team to confirm]**

**What worked.** Tests written first found real bugs (a "bill" keyword matching inside "papaya"; a wrong quantity in "x4 … x2"; the Thai word for "staff" read as "sesame"). Measuring beat guessing: the slow first answer after idle was the long prompt being read (40–65 s), not the model loading; a start-up warm-up now covers it.

**What people decided.** The "AI" versus "staff" wording (corrected twice by a member), the Burmese replies (four native-speaker reviews), no cloud AI, and how to merge two lines of AI-assisted work. **[team to complete: what Aung Nyi Nyi Thant changed or rejected in the AI's output]**

**Lessons.** A language model must never be the source of a safety fact. A claim is worth its test: we reverted fixes to see the tests fail, and one test passed even with the bug. Numbers need an idle machine: a first load test "passed" while 104 of 108 answers were the fallback message, and was re-run.

## 8. Team and individual contribution

Parts (`docs/TEAM_WORK_PLAN.md`): 1 diner app · 2 AI waiter and backend core · 3 owner back office · 4 staff and orders · 5 QR, insights, import screen, tests, docs. Accounts: `Tharathon47` = Tharathon Plengsri (6931503042, part 1) · `Aung-Nyi-Thant` = Aung Nyi Nyi Thant (6931503001, part 2) · `chawakron50-lab` = Chawakron Singkaew (6931503031, part 3) · `wujieiei` = Natthanon Wongsai (6931503103, part 4) · `noeysasi` = Sasiwimon Chatkaew (6931503073, part 5).

**What GitHub shows on 2 Nov 2026** (`git shortlog -sn --no-merges`, 84 commits; merged pull requests): `Aung-Nyi-Thant` 69 commits (37 of them carry the author `t <t@t>`, a mis-set git identity on one laptop that GitHub cannot link to an account; fixed on 2 Nov) and 50 merged pull requests; `Tharathon47` 9 commits and 4 merged pull requests (the clickable prototype: icons, images, role switcher, landing); `wujieiei` (Natthanon Wongsai) 6 commits; `chawakron50-lab` 6 commits; `noeysasi` (Sasiwimon Chatkaew) has three pull requests that are still open and not merged (#76 installation guide, #83 QR table tents, #84 QR and insights tests). **[team to complete: for each member, their commits, pull requests, documents, diagrams, tests or reviews in the repository, and where non-code work lives]**

## 9. Limits

Speed figures are from one laptop and a 13-dish menu (a longer menu means a slower first answer). With three diners chatting nonstop about 1 answer in 7 is the fallback message, because they wait for one model. The first question after a restart or a menu edit can fall back for up to a minute. Not yet done: tests on real phones and with real owners, native review of all Thai and Burmese labels, a public HTTPS deployment.
