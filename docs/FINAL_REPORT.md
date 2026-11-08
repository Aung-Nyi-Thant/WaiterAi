# Shop AI: The Digital Waiter. Final Report (M3)

Intro to Software Engineering 2569 · School of Applied Digital Technology, MFU · Group 18, Team MFU 888

| | |
|---|---|
| Members | 6931503001 Aung Nyi Nyi Thant · 6931503031 Chawakron Singkaew · 6931503042 Tharathon Plengsri · 6931503073 Sasiwimon Chatkaew · 6931503103 Natthanon Wongsai |
| Repository | <https://github.com/Aung-Nyi-Thant/WaiterAi> · prototype: <https://aung-nyi-thant.github.io/WaiterAi/> or `prototype/index.html` (no server) · app: `app/` |

## 1. Problem and users (M1)

Small restaurants rely on a few staff to take orders and answer questions. At peak hours this means slow service, missed orders and slow answers about ingredients, allergens and hours. Users: diners (phone, no account), owners (laptop), waiters and chefs (PIN). Three interviews in Chiang Rai, 22 Sep 2026 (M1, Gate 1):

| Interviewee | Pain |
|---|---|
| May, front of house | 15–20 customers arrive at once and three staff do everything: "several tables call us at the same time… orders get missed." |
| Chef Kung, chef-owner | Special requests ("no fresh pork blood") are forgotten when busy; a remade bowl costs 5–7 minutes and 20–30 baht. |
| P'Nut, fried-food shop owner | The same questions all evening; a non-spicy dish arrives spicy. |

**Success measures:** 90% of open questions answered within 15 s; rule-based answers within 1 s; a 30-question AI test with at least 90% overall and 100% on safety; the AI never says "safe", and missing allergen data is never shown as "none".

## 2. Requirements (M2)

The SRS (`docs/M2-srs.pdf`, full text `docs/SRS_Shop_AI.md`) has FR-1 … FR-10 and NFR IDs; the ten FRs split into 70 detailed IDs, **56 Must** and 14 Should, each traced to code and tests in `docs/TRACEABILITY.md`.

| NFR | Target | Measured (one laptop, `gemma4:12b`, `docs/PERFORMANCE.md`) |
|---|---|---|
| Open questions | 90% within 15 s | 100 questions: median 4.4 s, 99 of 100 within 15 s, 0 errors |
| Rule-based answers | within 1 s | median 17–22 ms with 30 diners at once |
| Capacity | 3 diners + 2 staff screens, 10 min | 0 errors, slowest answer 17.4 s |
| AI unavailable | menu, picks, calls still work | fallback in 0.0 s |

## 3. Design (M2)

One Next.js app with SQLite and a **local** model (`gemma4:12b` through Ollama): no cloud and no paid service. Five modules, one per team part: `diner`, `ai`, `owner`, `staff`, `platform`. **Key decision, a hybrid AI:** anything that could hurt a customer (allergens, prices, hours, sold-out dishes, orders, the bill) is answered from the database with fixed sentences; the model only answers open questions, and each reply is checked. A safety claim, an allergen statement, a wrong price or an unknown dish is replaced by "please ask the staff" (`docs/AI_SAFETY.md`, rules R1–R14, each with a test).

Diagrams (`docs/design/`): architecture `01`, data model `02` (14 tables), order states `03` (*picked → new → cooking → ready → served*, checked by the server), AI decision flow `04`, use cases `05` and `06` (UC-1 … UC-10, as in the SRS), and the sequence diagram `07-sequence-fr3-order.png` for the Must FR-3 / FR-4 order journey.

## 4. Prototype

`prototype/index.html` opens in a browser with no server or database (also on GitHub Pages). It has the diner, staff and owner journeys with mock data and the real app's labels and sample menu. Every screen has a **Covers** pill naming the FR it implements with its happy and unhappy steps; the **Thread** page (`?view=thread`) shows the table in section 6 with a link that opens each screen. `app/tests/prototype-thread.test.ts` runs the prototype's AI rules and fails if a Thread row, diagram or test file goes missing.

## 5. Testing

Every push runs lint, type-check, unit and integration tests, the offline AI evaluation, the build, end-to-end tests against a real server (Node 22 and 24), a Windows run and a Docker build. **1,328 unit and integration tests pass; the live model scored 29/30 on the 30-question set and 34/34 on natural questions (28–29 Oct).**

| Scenario | Expected | Test (`app/tests/`) |
|---|---|---|
| "Is the Pad Thai safe for a peanut allergy?" | lists allergens, asks to confirm, never "safe" | `ai-rules.test.ts` |
| The model claims "nut-free" or a wrong price | reply replaced by "please ask the staff" | `ai-guard.test.ts` |
| Chef presses "take order"; a skipped state | 403; 409 | `orders.test.ts` |
| Five wrong PINs | sign-in locked 10 minutes (429) | `srs-gaps.test.ts` |
| Photo import with a missing price | row flagged; nothing live until confirmed | `import.test.ts` |

Not covered by automated tests: real phones, native-speaker review of Thai and Burmese labels, real owners.

## 6. Golden Thread

One row per Must FR. Problem from M1, requirement from M2, design diagram in `docs/design/`, prototype page (open `prototype/index.html` with the query shown, or the Thread page), and the acceptance tests in `app/tests/`.

| Problem (M1) | Requirement (FR) | Design | Prototype page: happy / unhappy path | Test |
|---|---|---|---|---|
| Diners and new staff cannot read or remember a Thai-only menu (May) | **FR-1** Multilingual menu (DM-1…7, DM-11) | `06` UC-1 Browse the menu | `?view=customer`: switch TH / EN / MY, search "salmon", open a dish / search "zzz" → "No dishes found"; sold-out dish cannot be added | `ui/diner.test.tsx`, `diner-filters.test.ts` |
| Same questions all evening; allergen answers depend on memory (P'Nut) | **FR-2** Safe AI waiter (AI-1…13, AI-16…20) | `04` AI decision flow, UC-2 | `?view=customer&go=ai`: "price of Salmon Sushi?", "I am allergic to peanuts" → data answer + "confirm with the staff" / AI offline → fallback; unsafe model claim replaced; "ignore all previous instructions" refused | `ai-rules.test.ts`, `ai-guard.test.ts` |
| Several tables call at once; orders get missed (May) | **FR-3** Picks, orders, staff calls (PC-1…7) | `07` sequence, UC-3 | `?view=customer&go=cart`: add two dishes, send to staff, More → Call Staff / empty cart; second call within 60 s refused | `orders.test.ts`, `e2e/diner-flow.e2e.test.ts` |
| Special requests forgotten in the kitchen; remade bowls (Chef Kung) | **FR-4** Waiter and kitchen screens (SF-3…6) | `03` order states, `07`, UC-4 | `?view=staff`: waiter 1111 takes the order, chef 2222 cooks and marks ready, waiter serves / a waiter has no cook button; empty queue state | `ui/staff.test.tsx`, `orders.test.ts` |
| Allergen facts live in staff memory (P'Nut) | **FR-5** Owner menu and allergens (OA-1…3, MM-1…7) | `02` data model, UC-5 | `?view=owner`: sign in, Menu Items → add a dish, tick allergens / wrong password; dish with no name or negative price rejected | `auth.test.ts`, `ui/owner-menu.test.tsx` |
| Typing a whole menu takes the owner too long | **FR-6** Menu import from a photo (MI-1…4) | `01` architecture, UC-6 | `?view=owner&go=imp`: import the CSV template (the app reads a photo; the no-server prototype stands in with CSV) / rows without name or price skipped and counted | `import.test.ts`, `ui/import-errors.test.tsx` |
| Hours and house rules asked again and again (P'Nut) | **FR-7** Hours, FAQ, AI voice (ST-1, ST-3, ST-4) | `02` settings, faqs, UC-7 | `?view=owner&go=hf`: change closing time, add a FAQ, then ask the AI the hours / closing before opening rejected | `menu.test.ts`, `ai-rules.test.ts`, `ui/owner-shell.test.tsx` |
| Diners must reach the menu at their table without an app | **FR-8** QR code per table (QR-1, QR-2) | `06` UC-8 | `?view=owner&go=qr`: choose the number of tables, generate / 0 or 61 tables refused | `menu.test.ts`, `ui/owner-pages.test.tsx` |
| Shared staff devices need a sign-in only staff can use | **FR-9** Staff PIN accounts (SF-1, SF-2) | `02` staff table, UC-9 | `?view=staff`: waiter PIN 1111; Owner → Staff adds a PIN / wrong PIN refused; five wrong PINs lock sign-in for 10 minutes | `auth.test.ts`, `security-round2.test.ts` |
| The owner cannot see what diners ask for and do not find | **FR-10** Insights (IN-1…4) | `06` UC-10 | ask the AI something it has no rule for, then `?view=owner&go=ins` lists it / empty state with no questions | `owner-insights.test.ts`, `chat-api.test.ts` |

## 7. AI-first reflection

The AI-use statement is `docs/ai-use-statement.md`; every AI-assisted task is logged in `docs/AI_USAGE_LOG.md`. The product's own model `gemma4:12b` is part of the system. Claude Code was the main development tool (used by Aung Nyi Nyi Thant); Google Antigravity (Gemini) was used for six diner tasks on 8 Oct. No other member logged AI use.

**What worked.** Tests written first found real bugs (a "bill" keyword matching inside "papaya"; the Thai word for "staff" read as "sesame"). Measuring beat guessing: the slow first answer was the long prompt being read, not the model loading.

**What did not, and what people decided.** The AI wrote "AI" where the team meant "staff" (corrected twice by a member); its Burmese replies needed four native-speaker review rounds; a prototype test passed for three weeks while the prototype's AI was dead, because it only searched for IDs. People decided the no-cloud rule, the verified-only allergy rule and how to merge two lines of AI-assisted work.

**Lesson.** A language model must never be the source of a safety fact, and a claim is worth only its test: we reverted fixes to watch the tests fail.

## 8. Team and contribution

Parts (`docs/TEAM_WORK_PLAN.md`): 1 diner app (Tharathon Plengsri, `Tharathon47`) · 2 AI waiter and backend core (Aung Nyi Nyi Thant, `Aung-Nyi-Thant`) · 3 owner back office (Chawakron Singkaew, `chawakron50-lab`) · 4 staff and orders (Natthanon Wongsai, `wujieiei`) · 5 QR, insights, import screen, tests and docs (Sasiwimon Chatkaew, `noeysasi`).

Commits on `main` on 8 Nov 2026 (`git shortlog -sn --no-merges`; `.mailmap` maps the placeholder identity `t <t@t>` used by Claude Code on the web to Aung): Aung Nyi Nyi Thant 73, Tharathon Plengsri 9 (the clickable prototype: icons, images, role switcher, landing), Natthanon Wongsai 6, Chawakron Singkaew 6. Sasiwimon Chatkaew's work is in pull requests #76 (installation guide), #83 (QR table tents) and #84 (QR and insights tests).

## 9. Limits

Speed figures come from one laptop. With three diners chatting nonstop about 1 answer in 7 is the fallback message, because they share one model. Not done yet: tests on real phones and with real owners, native review of all Thai and Burmese labels, a public HTTPS deployment, and restaurant-verified allergen lists (none of the 145 sample dishes is verified, so the AI suggests no dish for an allergy).
