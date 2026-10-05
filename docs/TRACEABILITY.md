# Traceability: SRS requirement → code → tests

Every requirement ID of `docs/SRS_Shop_AI.md` is listed here with the code that implements it and the automated tests that check it. `app/tests/traceability.test.ts` fails if an SRS ID is missing from this file, if a listed file does not exist, or if a listed test file does not mention the ID, so this table cannot silently go stale.

**Status**: **Tested** = automated tests cover it · **Partly** = the logic/API is tested, the screen or a detail is not · **Manual** = only checked by hand (screens, layout, language) · **Not measured** = no evidence yet.

Run the tests with `cd app && npm test` (unit + integration + offline AI eval) and `npm run test:e2e` (real server, after `npm run build`). `npm run eval:live` scores the AI against a real model.

**Summary:** 108 IDs · 76 Tested · 21 Partly · 10 Manual · 1 Not measured.

Test files: `ai-rules` (rule-based answers), `ai-guard` (model output checks), `chat-api`, `auth`, `menu`, `orders`, `import`, `provider`, `eval` (the 30 questions of `eval/questions.json`), `diner-flow`, `seed`, `platform`, `e2e/diner-flow.e2e`.

## How the course's FR-1 … FR-10 map to these IDs

The M2 SRS (`Team18_M2_SRS.pdf.pdf`) uses the ten functional requirements of the M1 charter; `docs/SRS_Shop_AI.md` splits them into finer IDs. Use this table to move between them.

| Course FR | Meaning | IDs in this file |
|---|---|---|
| FR-1 | Multilingual menu browsing | DM-1 … DM-10, UC-1 |
| FR-2 | Safe AI waiter chat | AI-1 … AI-16, UC-2, BR-1, BR-5, NFR-S1 … S3 |
| FR-3 | Picks, orders and staff calls | PC-1 … PC-6, UC-3, UC-4, BR-2 |
| FR-4 | Waiter and kitchen live screens | SF-3 … SF-6, UC-8, UC-9, UC-10, BR-4 |
| FR-5 | Owner account and menu / allergen management | OA-1 … OA-3, MM-1 … MM-7, UC-5 |
| FR-6 | Menu import from a photo | MI-1 … MI-5, UC-6 |
| FR-7 | Restaurant settings (hours, specials, FAQ, AI voice) | ST-1 … ST-5 |
| FR-8 | QR codes per table | QR-1, QR-2, UC-7 |
| FR-9 | Staff accounts (PIN) | SF-1, SF-2 |
| FR-10 | Insights | IN-1 … IN-3, UC-11 |

## Diner menu (DM)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| DM-1 | show the restaurant's menu at a public address containing the restaurant code and optional table number (… | `app/src/modules/diner/api/menu.ts`<br>`app/src/modules/diner/Diner.tsx`<br>`app/src/app/r/[slug]/page.tsx` | `app/tests/menu.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Partly** · API and page load tested; layout manual |
| DM-2 | group dishes by category and show name, price, photo (or placeholder), tags and up to three allergens per… | `app/src/modules/diner/Diner.tsx` | none | **Manual** · rendering only |
| DM-3 | let the diner search dish names in any language. | `app/src/modules/diner/Diner.tsx` | `app/tests/diner-filters.test.ts` | **Partly** · search logic tested (`filters.ts`); the search box UI is manual |
| DM-4 | offer filters: vegetarian, no peanuts, under ฿100, spicy. The "no peanuts" filter shall exclude dishes wi… | `app/src/modules/diner/Diner.tsx` | `app/tests/diner-filters.test.ts` | **Partly** · the four filters are tested, including 'No peanuts hides dishes with missing allergen data'; the filter chips UI is manual |
| DM-5 | let the diner switch between Thai, Burmese and English; labels and dish names change accordingly. | `app/src/modules/diner/Diner.tsx`<br>`app/src/modules/diner/i18n.ts` | none | **Manual** · labels need native review |
| DM-6 | show dishes that are not available as "sold out today" and refresh availability at least every 20 seconds. | `app/src/modules/diner/api/menu.ts`<br>`app/src/modules/diner/Diner.tsx` | `app/tests/menu.test.ts` | **Partly** · sold-out reaches the public menu (tested); the 20 s refresh is manual |
| DM-7 | show a detail view with description, all allergens (or "allergen info not provided"), ingredients, an Add… | `app/src/modules/diner/Diner.tsx` | none | **Manual** |
| DM-8 | show active specials. | `app/src/modules/diner/api/menu.ts`<br>`app/src/modules/platform/menu.ts` | `app/tests/menu.test.ts` | **Partly** · live/expired/future specials tested; display manual |
| DM-9 | show a saved copy of the menu with a notice if the server cannot be reached. | `app/src/modules/diner/Diner.tsx` | none | **Manual** · offline copy |
| DM-10 | record each menu open for insights. | `app/src/modules/diner/api/menu.ts` | `app/tests/menu.test.ts` | **Tested** |
| DM-11 | choose their allergies once (the 14 allergens), kept only on the phone; dishes that list one are marked, and a "fits my allergies" filter hides them and dishes with no data. | `app/src/modules/diner/Diner.tsx`<br>`app/src/modules/diner/filters.ts`<br>`app/src/modules/platform/constants.ts` | `app/tests/allergy-profile.test.ts`<br>`app/tests/diner-filters.test.ts` | **Partly** · profile rules and filter tested; the dialog and red marks are manual |

## AI chat (AI)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| AI-1 | let the diner send text questions and receive replies in the language of the question (Thai, Burmese or E… | `app/src/modules/ai/ai.ts`<br>`app/src/modules/ai/api/chat.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/chat-api.test.ts`<br>`app/tests/eval.test.ts` | **Tested** · language detection + reply language |
| AI-2 | Allergen questions (allergen named, or a dish asked about with allergy wording, or "without X") shall be … | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/eval.test.ts`<br>`app/tests/thai-keywords.test.ts` | **Tested** · incl. missing-data and 'without X' |
| AI-3 | never state that a dish is "safe", "allergy-free" or guaranteed. | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/ai-guard.test.ts`<br>`app/tests/eval.test.ts` | **Tested** |
| AI-4 | Vegetarian/vegan requests, with optional budget, shall list only dishes carrying the matching tag, on sal… | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/eval.test.ts` | **Tested** · budget, vegan, Burmese digits |
| AI-5 | Price, opening hours, ingredients, pork, and sold-out questions shall be answered from database values. A… | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/eval.test.ts` | **Tested** · price, hours, ingredients, pork, sold-out |
| AI-6 | Order wording ("I'll have 2 …") shall add the named dishes and quantities to the diner's picks. | `app/src/modules/ai/ai.ts`<br>`app/src/modules/ai/api/chat.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/chat-api.test.ts` | **Tested** · adds to picks only; never creates an order |
| AI-7 | Requests for the bill or staff shall create a staff call for the table. | `app/src/modules/ai/ai.ts`<br>`app/src/modules/ai/api/chat.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/chat-api.test.ts`<br>`app/tests/thai-keywords.test.ts` | **Tested** · a repeated request reuses the open call |
| AI-8 | Attempts to make the assistant ignore its rules shall be refused with a fixed sentence. | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/eval.test.ts` | **Tested** · keyword-based (3 languages) |
| AI-9 | Other questions (recommendations, FAQ, small talk, unknown dishes) shall be answered by the language mode… | `app/src/modules/ai/ai.ts`<br>`app/src/modules/ai/provider.ts` | `app/tests/ai-guard.test.ts` | **Tested** · prompt contents mocked; answer quality via `npm run eval:live` |
| AI-10 | A model reply shall be replaced by a "please ask the staff" message if it claims safety, contains a price… | `app/src/modules/ai/ai.ts` | `app/tests/ai-guard.test.ts`<br>`app/tests/chat-api.test.ts` | **Tested** · unsafe wording, wrong price, empty reply, dish cards |
| AI-11 | If the model is unavailable, the system shall show a fallback message, the menu and the call-staff option. | `app/src/modules/ai/ai.ts` | `app/tests/ai-guard.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Tested** |
| AI-12 | The assistant shall use the owner's voice setting (male/female particles in Thai and Burmese) and Burmese… | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts` | **Tested** · male/female particles, Burmese style rules |
| AI-13 | show dish cards with an Add button under replies that discuss dishes. | `app/src/modules/diner/Diner.tsx`<br>`app/src/modules/ai/api/chat.ts` | `app/tests/chat-api.test.ts` | **Partly** · API returns the cards (tested); card rendering manual |
| AI-14 | Diner: be able to rate each reply; a negative rating flags it for the owner. | `app/src/modules/diner/api/feedback.ts` | `app/tests/chat-api.test.ts` | **Tested** |
| AI-15 | Each restaurant shall have a monthly chat limit (default 300); when reached, a fixed message and the plai… | `app/src/modules/ai/api/chat.ts` | `app/tests/chat-api.test.ts`<br>`app/tests/ratelimit.test.ts`<br>`app/tests/security-round2.test.ts` | **Tested** · also a per-minute chat rate limit |
| AI-16 | store for each question: text, language, topic, allergens mentioned and whether it was answered, without … | `app/src/modules/ai/api/chat.ts`<br>`app/src/modules/platform/db.ts` | `app/tests/chat-api.test.ts` | **Tested** |
| AI-17 | A model reply shall not state any allergen fact, in either direction; it is replaced by the stored data. | `app/src/modules/ai/ai.ts` | `app/tests/ai-guard.test.ts` | **Tested** |
| AI-18 | With an allergy profile the assistant applies it to every answer; "what can I eat?" lists only dishes with data that avoid the allergens. | `app/src/modules/ai/ai.ts` | `app/tests/allergy-profile.test.ts` | **Tested** |
| AI-19 | Detailed questions (spice, budget, dish type, diet, popular) are answered from the menu data without the model. | `app/src/modules/ai/ai.ts` | `app/tests/recommendations.test.ts` | **Tested** |
| AI-20 | Short Thai allergen words are not matched inside other Thai words. | `app/src/modules/ai/ai.ts` | `app/tests/thai-keywords.test.ts` | **Tested** |

## Picks and staff calls (PC)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| PC-1 | Diner: add, change quantity, remove dishes in "My picks" (kept in the browser). | `app/src/modules/diner/Diner.tsx` | none | **Manual** · picks are kept in the browser |
| PC-2 | "Send to staff" shall create an order in status *picked*, with table, language, items and the allergens … | `app/src/modules/diner/api/orders.ts` | `app/tests/orders.test.ts`<br>`app/tests/diner-flow.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Tested** |
| PC-3 | The call-staff button shall create a call for the table; a second open call of the same type for the same… | `app/src/modules/diner/api/calls.ts` | `app/tests/orders.test.ts` | **Tested** |
| PC-4 | Waiter: running bill per table (taken orders; picks listed as pending); mark a table paid, which clears its bill and its open "bill" call; waiter role only (403) | `app/src/modules/staff/orders.ts`<br>`app/src/modules/staff/api/bills.ts`<br>`app/src/modules/staff/WaiterPage.tsx` | `app/tests/orders.test.ts` | **Tested** · the Bills tab UI is manual |
| PC-5 | Diner: running bill of their own table, shown only to a phone that sent picks from that table (random receipt code) | `app/src/modules/diner/api/bill.ts`<br>`app/src/modules/diner/Diner.tsx` | `app/tests/orders.test.ts` | **Tested** · the bill sheet UI is manual |
| PC-6 | Diner is not shown kitchen progress; the bill is a view and a manual "paid" mark only (no online payment) | `app/src/modules/diner/api/bill.ts` | `app/tests/orders.test.ts`<br>`app/tests/security-round2.test.ts` | **Tested** |
| PC-7 | An order carries the profile allergies and the chat allergies as its allergy note, and flags each line that clashes. | `app/src/modules/diner/api/orders.ts` | `app/tests/allergy-profile.test.ts` | **Tested** |

## Owner accounts (OA)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| OA-1 | Owner: register with email, password (minimum 8 characters) and restaurant name; a unique restaurant code… | `app/src/modules/platform/api/register.ts`<br>`app/src/modules/platform/menu.ts` | `app/tests/auth.test.ts` | **Tested** |
| OA-2 | Owner: sign in and out; wrong credentials shall be rejected. | `app/src/modules/platform/api/login.ts`<br>`app/src/modules/platform/auth.ts` | `app/tests/auth.test.ts`<br>`app/tests/ratelimit.test.ts` | **Tested** · failed logins are rate-limited per account |
| OA-3 | All owner functions shall require sign-in and shall only affect the owner's own restaurant. | `app/src/modules/platform/auth.ts`<br>`app/src/modules/owner/api/*.ts`<br>`app/src/modules/owner/crud.ts` | `app/tests/auth.test.ts` | **Tested** · every owner/staff route returns 401 without the right cookie |

## Menu management (MM)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| MM-1 | Owner: create, edit and delete dishes with names in Thai, Burmese, English, description, price ≥ 0, ingre… | `app/src/modules/owner/api/items.ts`<br>`app/src/modules/owner/api/itemsById.ts` | `app/tests/menu.test.ts` | **Tested** |
| MM-2 | Owner: set allergens from the 14 categories or mark "allergen info not provided" (stored as unknown, not … | `app/src/modules/owner/api/items.ts`<br>`app/src/modules/platform/db.ts` | `app/tests/menu.test.ts` | **Tested** · NULL vs [] |
| MM-3 | Owner: create, rename and delete categories with three-language names; deleting a category keeps its dish… | `app/src/modules/owner/crud.ts` | `app/tests/menu.test.ts` | **Tested** |
| MM-4 | Owner: switch a dish on/off sale with one action; the change shall apply to the diner menu and AI at once. | `app/src/modules/owner/api/itemsById.ts`<br>`app/src/modules/staff/api/items.ts` | `app/tests/menu.test.ts` | **Tested** · owner and staff switches |
| MM-5 | show how many dishes have complete allergen data. | `app/src/modules/owner/MenuPage.tsx` | none | **Manual** · the allergen-completeness meter |
| MM-6 | Photo upload shall accept JPG, PNG, WebP up to 8 MB. | `app/src/modules/platform/api/upload.ts`<br>`app/src/modules/platform/api/uploadsServe.ts` | `app/tests/menu.test.ts` | **Tested** |
| MM-7 | reject a dish with no name or an invalid price. | `app/src/modules/owner/api/items.ts` | `app/tests/menu.test.ts` | **Tested** |

## Menu import (MI)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| MI-1 | Owner: upload a photo of a menu; the system shall extract dish names, prices and categories with the visi… | `app/src/modules/platform/api/import.ts`<br>`app/src/modules/ai/provider.ts` | `app/tests/import.test.ts` | **Partly** · model mocked; **extraction accuracy on real photos is not measured** (SRS target 90%) |
| MI-2 | Owner: review and edit every extracted row before publishing; rows with a missing price or suspicious nam… | `app/src/modules/platform/ImportPage.tsx`<br>`app/src/modules/platform/api/importConfirm.ts` | `app/tests/import.test.ts` | **Partly** · confirm tested; row-flagging in the review screen is manual |
| MI-3 | Nothing shall be added to the live menu until the owner confirms. | `app/src/modules/platform/api/import.ts`<br>`app/src/modules/platform/api/importConfirm.ts` | `app/tests/import.test.ts` | **Tested** |
| MI-4 | Imported dishes shall have unknown allergens. | `app/src/modules/platform/api/importConfirm.ts` | `app/tests/import.test.ts` | **Tested** |
| MI-5 | The owner may request Thai and Burmese name suggestions, marked for review. | `app/src/modules/platform/api/importTranslate.ts` | `app/tests/import.test.ts` | **Tested** · model mocked |

## Settings (ST)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| ST-1 | Owner: set opening time, closing time, last order time (HH:MM) and closed days; invalid times shall be re… | `app/src/modules/owner/api/settings.ts`<br>`app/src/modules/ai/ai.ts` | `app/tests/menu.test.ts`<br>`app/tests/ai-rules.test.ts` | **Tested** |
| ST-2 | Owner: manage specials with optional start/end dates and an active switch. | `app/src/modules/owner/crud.ts`<br>`app/src/modules/platform/menu.ts` | `app/tests/menu.test.ts` | **Tested** |
| ST-3 | Owner: manage FAQ question/answer pairs and free-text shop rules used by the AI. | `app/src/modules/owner/crud.ts`<br>`app/src/modules/ai/ai.ts` | `app/tests/menu.test.ts`<br>`app/tests/ai-guard.test.ts` | **Tested** |
| ST-4 | Owner: set assistant name, voice (male/female), tone, greeting and upselling on/off. | `app/src/modules/owner/api/settings.ts` | `app/tests/menu.test.ts`<br>`app/tests/ai-rules.test.ts` | **Tested** |
| ST-5 | Owner: try the assistant from any owner page; test chats shall not be saved or counted. | `app/src/modules/ai/api/chat.ts`<br>`app/src/modules/owner/TestChat.tsx` | `app/tests/chat-api.test.ts` | **Partly** · preview mode is not stored (tested); the popup is manual |

## QR codes (QR)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| QR-1 | generate a QR code (SVG) per table and for the restaurant, pointing to the menu address. | `app/src/modules/platform/api/qr.ts` | `app/tests/menu.test.ts` | **Tested** |
| QR-2 | Owner: choose the base address (including the server's Wi-Fi address), set the number of tables (1–60), p… | `app/src/modules/platform/api/qr.ts`<br>`app/src/modules/platform/QrPage.tsx` | `app/tests/menu.test.ts` | **Partly** · base address tested; table count and print layout manual |

## Staff (SF)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| SF-1 | Owner: create staff with a name, role (waiter or chef) and a 4–8 digit PIN, change PINs and remove staff.… | `app/src/modules/owner/crud.ts` | `app/tests/auth.test.ts` | **Tested** · PIN rules, hashed, hidden in lists |
| SF-2 | Staff shall sign in with restaurant code and PIN and be taken to the screen of their role. | `app/src/modules/staff/api/login.ts`<br>`app/src/modules/staff/StaffLogin.tsx` | `app/tests/auth.test.ts`<br>`app/tests/srs-gaps.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts`<br>`app/tests/security-round2.test.ts` | **Partly** · API tested (PIN sign-in; 5 wrong PINs per address and 20 per restaurant lock sign-in for 10 minutes, forged address headers do not help); redirect to the role's screen manual |
| SF-3 | Waiter screen: list open calls (table, reason, waiting time) with "Done"; list picks with items, language… | `app/src/modules/staff/WaiterPage.tsx`<br>`app/src/modules/staff/api/floor.ts` | `app/tests/orders.test.ts`<br>`app/tests/diner-flow.test.ts` | **Partly** · data tested; screen manual |
| SF-4 | Chef screen: show tickets in New, Cooking, Ready with items, quantities, waiting time (highlight after 10… | `app/src/modules/staff/ChefPage.tsx`<br>`app/src/modules/staff/api/kitchen.ts` | `app/tests/orders.test.ts`<br>`app/tests/diner-flow.test.ts` | **Partly** · data tested; screen and 10-minute highlight manual |
| SF-5 | Order status changes shall follow *picked → new → cooking → ready → served* (or *picked → cancelled*); th… | `app/src/modules/staff/api/orders.ts` | `app/tests/orders.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Tested** · 403 wrong role, 409 wrong state, 404 other restaurant |
| SF-6 | Staff screens shall refresh at least every 3 seconds and show LIVE/OFFLINE. | `app/src/modules/staff/WaiterPage.tsx`<br>`app/src/modules/platform/client.ts` | none | **Manual** · 3 s polling and LIVE/OFFLINE |

## Insights (IN)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| IN-1 | Owner: see, for 1, 7 or 30 days: number of chats, tables, questions, share answered from data, unanswered… | `app/src/modules/platform/api/insights.ts` | `app/tests/chat-api.test.ts` | **Tested** |
| IN-2 | show most-asked topics, languages used, and unmet demand (vegetarian questions vs number of vegetarian di… | `app/src/modules/platform/api/insights.ts` | `app/tests/chat-api.test.ts` | **Tested** |
| IN-3 | list unanswered questions with a shortcut to add an FAQ, and answers diners rated wrong. | `app/src/modules/platform/api/insights.ts` | `app/tests/chat-api.test.ts` | **Tested** · 'Add FAQ' button is UI |
| IN-4 | The owner sees the allergies diners chose (counts only) with how many dishes serve each, dishes missing allergen data, most-ordered dishes and repeated questions. | `app/src/modules/platform/api/insights.ts` | `app/tests/owner-insights.test.ts` | **Tested** · the page is UI |

## Use cases (UC)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| UC-1 | Browse the menu | `app/src/modules/diner/Diner.tsx` | `app/tests/diner-flow.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Partly** · API journey tested; browsing UI manual |
| UC-2 | Ask about allergens | `app/src/modules/ai/ai.ts` | `app/tests/diner-flow.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts`<br>`app/tests/ai-rules.test.ts` | **Tested** |
| UC-3 | Place picks | `app/src/modules/diner/api/orders.ts` | `app/tests/diner-flow.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Tested** |
| UC-4 | Call staff | `app/src/modules/diner/api/calls.ts` | `app/tests/orders.test.ts` | **Tested** |
| UC-5 | Manage menu | `app/src/modules/owner/api/items.ts` | `app/tests/menu.test.ts` | **Tested** |
| UC-6 | Import a menu | `app/src/modules/platform/api/import.ts` | `app/tests/import.test.ts` | **Partly** · model mocked |
| UC-7 | Print QR codes | `app/src/modules/platform/api/qr.ts` | `app/tests/menu.test.ts` | **Tested** |
| UC-8 | Take an order | `app/src/modules/staff/api/orders.ts` | `app/tests/diner-flow.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Tested** |
| UC-9 | Cook and serve | `app/src/modules/staff/api/orders.ts`<br>`app/src/modules/staff/orders.ts` | `app/tests/diner-flow.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts`<br>`app/tests/orders.test.ts` | **Tested** |
| UC-10 | Mark sold out | `app/src/modules/staff/api/items.ts` | `app/tests/menu.test.ts` | **Tested** |
| UC-11 | Read insights | `app/src/modules/platform/api/insights.ts` | `app/tests/chat-api.test.ts` | **Tested** |

## Non-functional requirements (NFR)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| NFR-P1 | AI reply for open questions within 15 s on the reference computer (measured average about 5–6 s with `gem… | `app/src/modules/ai/ai.ts`<br>`app/src/modules/ai/provider.ts`<br>`app/src/instrumentation.ts` | `app/scripts/load-test.mts`<br>`app/tests/warmup.test.ts` | **Partly** · met on the reference laptop (idle): 100 open questions, median 5.5 s, 90th percentile 10.7 s, 100% within 15 s; rule answers in ms; slower if the computer is busy (docs/PERFORMANCE.md) |
| NFR-P2 | Rule-based answers (allergens, prices, hours, orders) within 1 s (observed in tests: milliseconds). | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts` | **Tested** |
| NFR-P3 | Menu page usable within 3 s on a local network. | `app/src/modules/diner/Diner.tsx` | `app/scripts/load-test.mts` | **Partly** · server side only: page 50 ms, menu 15 ms with 30 diners; phone browser time not measured (docs/PERFORMANCE.md) |
| NFR-P4 | Support at least 3 simultaneous diners on the reference computer; AI requests are processed one at a time. | `app/src/modules/ai/ai.ts` | `app/scripts/load-test.mts`<br>`app/tests/provider.test.ts` | **Partly** · 3 and 10 simultaneous diners served with 0 errors; 3 diners + 2 staff screens for 10 minutes: every AI answer within 17.4 s; AI answers are queued one at a time (`tests/provider.test.ts`) |
| NFR-S1 | Allergen answers must be generated from stored data only. | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/eval.test.ts` | **Tested** |
| NFR-S2 | Missing allergen data must never be presented as "no allergens". | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts` | **Tested** |
| NFR-S3 | The system must not claim any dish is safe for an allergy. | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/ai-guard.test.ts` | **Tested** |
| NFR-S4 | The language model makes no allergen statement; every allergen sentence comes from stored data (AI-17). | `app/src/modules/ai/ai.ts` | `app/tests/ai-guard.test.ts` | **Tested** |
| NFR-S5 | A dish with no allergen data is never suggested to a diner with a profile, and "not listed" is never worded as "safe". | `app/src/modules/ai/ai.ts` | `app/tests/allergy-profile.test.ts` | **Tested** |
| NFR-SEC1 | Passwords and PINs stored with bcrypt; session cookies signed and expiring (owner 7 days, staff 12 hours). | `app/src/modules/platform/auth.ts` | `app/tests/auth.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts`<br>`app/tests/ratelimit.test.ts`<br>`app/tests/security-round2.test.ts` | **Tested** · login rate limits |
| NFR-SEC2 | Every owner or staff query is restricted to the signed-in restaurant. | `app/src/modules/platform/auth.ts`<br>`app/src/modules/owner/*`<br>`app/src/modules/staff/api/*` | `app/tests/auth.test.ts`<br>`app/tests/orders.test.ts`<br>`app/tests/security-round2.test.ts` | **Tested** |
| NFR-SEC3 | Uploads limited by type and size; uploaded files served only by generated names. | `app/src/modules/platform/api/upload.ts`<br>`app/src/modules/platform/api/uploadsServe.ts` | `app/tests/menu.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Tested** · type is the browser-declared MIME type |
| NFR-SEC4 | Input length limits (chat message 500 characters) and parameterised SQL. | `app/src/modules/ai/api/chat.ts`<br>`app/src/modules/platform/db.ts` | `app/tests/chat-api.test.ts` | **Partly** · 500-character limit tested; SQL is parameterised by construction (not tested) |
| NFR-R1 | If the AI is unavailable the menu, picks and staff calls still work. | `app/src/modules/ai/ai.ts` | `app/tests/ai-guard.test.ts`<br>`app/tests/e2e/diner-flow.e2e.test.ts` | **Tested** |
| NFR-R2 | Database uses write-ahead logging; the file can be backed up by copying it. | `app/src/modules/platform/db.ts` | `app/tests/platform.test.ts`<br>`app/tests/db-concurrency.test.ts` | **Partly** · WAL and the retry on 'database is locked' tested; 'back up by copying' is not tested |
| NFR-U1 | A diner can order without instructions and without an account. | `app/src/modules/diner/Diner.tsx` | none | **Manual** |
| NFR-U2 | Burmese text uses Unicode (Noto Sans Myanmar) and correct line spacing. | `app/src/modules/diner/Diner.tsx` | none | **Manual** · fonts and line height |
| NFR-U3 | Owner can get a first menu online in under 30 minutes using photo import (target, not yet measured with r… | `app/src/modules/platform/ImportPage.tsx` | none | **Not measured** · target, not measured with real owners |
| NFR-M1 | Runs on macOS, Linux or Windows with Node.js 22.13+ and Ollama. | `.github/workflows/ci.yml` | none | **Manual** · CI runs Linux, Node 22 and 24; macOS and Windows not tested |
| NFR-M2 | The model name and server address are configuration values (`OLLAMA_MODEL`, `OLLAMA_URL`). | `app/src/modules/ai/provider.ts` | `app/tests/provider.test.ts` | **Tested** · local-only (also DATA_DIR) |
| NFR-M3 | Automated tests exist for the API and the chat. | `app/tests` | `app/tests/*` | **Tested** · this suite |
| NFR-PR1 | No diner name, phone number or email is collected; chat logs contain no personal identifiers. | `app/src/modules/ai/api/chat.ts`<br>`app/src/modules/platform/db.ts` | `app/tests/chat-api.test.ts` | **Tested** · chat_sessions has no name/phone/email column |

## Business rules (BR)

| ID | Requirement | Code | Tests | Status |
|---|---|---|---|---|
| BR-1 | A dish with allergen data "not provided" is listed under "allergen information not provided" in any aller… | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts` | **Tested** |
| BR-2 | Sold-out dishes cannot be picked or recommended. | `app/src/modules/ai/ai.ts`<br>`app/src/modules/diner/api/orders.ts` | `app/tests/ai-rules.test.ts`<br>`app/tests/orders.test.ts` | **Tested** |
| BR-3 | The default monthly chat limit is 300 per restaurant. | `app/src/modules/platform/db.ts`<br>`app/src/modules/ai/api/chat.ts` | `app/tests/chat-api.test.ts` | **Tested** |
| BR-4 | Only the waiter can take an order to the kitchen; only the chef can start cooking or mark ready; either c… | `app/src/modules/staff/api/orders.ts` | `app/tests/orders.test.ts` | **Tested** |
| BR-5 | The AI voice defaults to male ("ครับ", "ခင်ဗျာ"). | `app/src/modules/ai/ai.ts` | `app/tests/ai-rules.test.ts` | **Tested** |
