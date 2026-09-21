# Software Requirements Specification (SRS)
## Shop AI: The Digital Waiter
Version 1.0 · September 2026 · Format follows IEEE 830 / ISO 29148
Author: [your name] · Course: [course] · Supervisor: [name]

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements of **Shop AI**, a web-based system in which restaurant customers use an AI waiter, restaurant owners manage their menu, and waiters and chefs handle live calls and orders. It is written for the project supervisor, the developers and the testers.

### 1.2 Scope
Shop AI lets a restaurant publish a digital menu reached by a table QR code, with an AI chat assistant that answers in Thai, Burmese and English using only that restaurant's data.
**In scope:** diner web page, AI chat, menu management, menu import from a photo, QR code generation, live waiter and kitchen screens, basic insights.
**Out of scope (this version):** online payment, delivery, loyalty, billing plans, LINE/WhatsApp channels, native mobile apps, POS integration.
**Benefits:** better menu experience, help for people who cannot read the menu language, safer allergy information, lower cost than commercial systems, all data and AI running locally.

### 1.3 Definitions and abbreviations
| Term | Meaning |
|---|---|
| Diner | Customer who scans the QR code (no account) |
| Owner | Restaurant owner or manager with an account |
| Staff | Waiter or chef who signs in with a PIN |
| AI waiter | The chat assistant |
| LLM | Large language model (`gemma4:12b`, run with Ollama) |
| Allergen | One of 14 allergen categories (EU list) |
| Pick | A dish a diner has chosen but not yet confirmed by the waiter |
| Ticket | An order shown in the kitchen |
| 86'd / sold out | A dish temporarily not available |
| API | Server interface used by the web pages |
| PIN | 4–8 digit code for staff sign-in |

### 1.4 References
- IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.
- EU Regulation 1169/2011 (allergen information, 14 allergens).
- Project files: `docs/FEATURE_PLAN.md`, `docs/PROJECT_EXPLANATION.md`, `eval/` (model comparison and test questions).
- Moffatt v. Air Canada, 2024 BCCRT 149 (liability for chatbot statements).

### 1.5 Overview
Section 2 describes the product in general, Section 3 the specific requirements, Section 4 supporting models and data, Section 5 verification.

---

## 2. Overall description

### 2.1 Product perspective
A new, self-contained web application. Components:
- **Web client** (browser): diner, owner and staff pages (Next.js/React).
- **Server** (Next.js API routes): business rules, login, AI logic.
- **Database**: SQLite file on the server computer.
- **AI service**: Ollama on the same computer, model `gemma4:12b` (text and image input).

Architecture: Browser ⇄ HTTPS/HTTP ⇄ Next.js server ⇄ SQLite, and Next.js server ⇄ Ollama (localhost:11434).

### 2.2 Product functions (summary)
1. Public menu with search, filters, three languages.
2. AI chat in Thai, Burmese, English with safety rules.
3. Table picks sent to the waiter; call staff.
4. Owner menu, category, allergen and tag management with photos.
5. Menu import from a photo with owner review.
6. Opening hours, specials, FAQ, shop rules, AI voice settings.
7. QR code generation per table.
8. Waiter screen and chef (kitchen) screen with order life cycle.
9. Sold-out control shared by owner, waiter and chef.
10. Insights on what diners asked.
11. Staff account and PIN management.

### 2.3 User classes
| User | Technical skill | Access | Device |
|---|---|---|---|
| Diner | none | public pages only, no login | own phone |
| Owner | low | full restaurant data, after email/password login | laptop, phone |
| Waiter | low | floor screen, sold-out control, after PIN | phone |
| Chef | low | kitchen screen, sold-out control, after PIN | tablet / screen |
| Administrator / developer | high | server, database file | server computer |

### 2.4 Operating environment
- Server computer: macOS (tested on MacBook Air M4, 32 GB), Node.js 22.13 or newer, Ollama with `gemma4:12b` (about 8.4 GB memory).
- Clients: current versions of Chrome, Safari and Edge on phones, tablets and computers, on the same Wi-Fi network as the server (or reachable through a tunnel).

### 2.5 Design and implementation constraints
- The AI must run locally (no paid cloud API).
- Allergen, price, hours and availability answers must come from the database.
- Diners must not be required to register.
- Languages: Thai, Burmese (Unicode), English.
- Single server computer, one AI answer processed at a time.

### 2.6 Assumptions and dependencies
- The owner enters or confirms allergen data; the system does not infer allergens.
- The server computer is on and connected while the restaurant is open.
- Ollama and the model are installed.
- Internet is needed only to load web fonts (system fonts are used if offline).

---

## 3. Specific requirements

### 3.1 Functional requirements
Priority: **M** = must, **S** = should.

#### 3.1.1 Diner menu (DM)
| ID | Requirement | Pri |
|---|---|---|
| DM-1 | The system shall show the restaurant's menu at a public address containing the restaurant code and optional table number (`/r/<code>?t=<table>`) without login. | M |
| DM-2 | The system shall group dishes by category and show name, price, photo (or placeholder), tags and up to three allergens per dish. | M |
| DM-3 | The system shall let the diner search dish names in any language. | M |
| DM-4 | The system shall offer filters: vegetarian, no peanuts, under ฿100, spicy. The "no peanuts" filter shall exclude dishes with missing allergen data. | M |
| DM-5 | The system shall let the diner switch between Thai, Burmese and English; labels and dish names change accordingly. | M |
| DM-6 | The system shall show dishes that are not available as "sold out today" and refresh availability at least every 20 seconds. | M |
| DM-7 | The system shall show a detail view with description, all allergens (or "allergen info not provided"), ingredients, an Add button and an "Ask the waiter" button. | M |
| DM-8 | The system shall show active specials. | S |
| DM-9 | The system shall show a saved copy of the menu with a notice if the server cannot be reached. | S |
| DM-10 | The system shall record each menu open for insights. | S |

#### 3.1.2 AI chat (AI)
| ID | Requirement | Pri |
|---|---|---|
| AI-1 | The system shall let the diner send text questions and receive replies in the language of the question (Thai, Burmese or English). | M |
| AI-2 | Allergen questions (allergen named, or a dish asked about with allergy wording, or "without X") shall be answered from the allergen data with fixed sentences, list dishes that contain / do not list the allergen, name dishes with missing data, and end with a request to confirm with the staff. | M |
| AI-3 | The system shall never state that a dish is "safe", "allergy-free" or guaranteed. | M |
| AI-4 | Vegetarian/vegan requests, with optional budget, shall list only dishes carrying the matching tag, on sale, and below the budget. | M |
| AI-5 | Price, opening hours, ingredients, pork, and sold-out questions shall be answered from database values. A sold-out dish shall be reported as sold out with alternatives. | M |
| AI-6 | Order wording ("I'll have 2 …") shall add the named dishes and quantities to the diner's picks. | M |
| AI-7 | Requests for the bill or staff shall create a staff call for the table. | M |
| AI-8 | Attempts to make the assistant ignore its rules shall be refused with a fixed sentence. | M |
| AI-9 | Other questions (recommendations, FAQ, small talk, unknown dishes) shall be answered by the language model using the restaurant's menu, hours, FAQs, specials and shop rules as the only source. | M |
| AI-10 | A model reply shall be replaced by a "please ask the staff" message if it claims safety, contains a price that differs from the menu, or is empty. Dish cards suggested by the model shall be limited to existing dishes on sale. | M |
| AI-11 | If the model is unavailable, the system shall show a fallback message, the menu and the call-staff option. | M |
| AI-12 | The assistant shall use the owner's voice setting (male/female particles in Thai and Burmese) and Burmese style rules (polite spoken style, "Allergens" in English, prices in "ဘတ်"). | M |
| AI-13 | The system shall show dish cards with an Add button under replies that discuss dishes. | M |
| AI-14 | The diner shall be able to rate each reply; a negative rating flags it for the owner. | S |
| AI-15 | Each restaurant shall have a monthly chat limit (default 300); when reached, a fixed message and the plain menu are shown. | S |
| AI-16 | The system shall store for each question: text, language, topic, allergens mentioned and whether it was answered, without personal data. | M |

#### 3.1.3 Picks and staff calls (PC)
| ID | Requirement | Pri |
|---|---|---|
| PC-1 | The diner shall add, change quantity, remove dishes in "My picks" (kept in the browser). | M |
| PC-2 | "Show to waiter" shall create an order in status *picked*, with table, language, items and the allergens the diner mentioned in the chat. Sold-out dishes shall be ignored; an order with no available dish shall be rejected. | M |
| PC-3 | The call-staff button shall create a call for the table; a second open call of the same type for the same table shall reuse the first. | M |

#### 3.1.4 Owner accounts (OA)
| ID | Requirement | Pri |
|---|---|---|
| OA-1 | The owner shall register with email, password (minimum 8 characters) and restaurant name; a unique restaurant code and default categories are created. | M |
| OA-2 | The owner shall sign in and out; wrong credentials shall be rejected. | M |
| OA-3 | All owner functions shall require sign-in and shall only affect the owner's own restaurant. | M |

#### 3.1.5 Menu management (MM)
| ID | Requirement | Pri |
|---|---|---|
| MM-1 | The owner shall create, edit and delete dishes with names in Thai, Burmese, English, description, price ≥ 0, ingredients, category, spice level, photo, tags and availability. | M |
| MM-2 | The owner shall set allergens from the 14 categories or mark "allergen info not provided" (stored as unknown, not as none). | M |
| MM-3 | The owner shall create, rename and delete categories with three-language names; deleting a category keeps its dishes. | M |
| MM-4 | The owner shall switch a dish on/off sale with one action; the change shall apply to the diner menu and AI at once. | M |
| MM-5 | The system shall show how many dishes have complete allergen data. | S |
| MM-6 | Photo upload shall accept JPG, PNG, WebP up to 8 MB. | M |
| MM-7 | The system shall reject a dish with no name or an invalid price. | M |

#### 3.1.6 Menu import (MI)
| ID | Requirement | Pri |
|---|---|---|
| MI-1 | The owner shall upload a photo of a menu; the system shall extract dish names, prices and categories with the vision model. | M |
| MI-2 | The owner shall review and edit every extracted row before publishing; rows with a missing price or suspicious name shall be flagged. | M |
| MI-3 | Nothing shall be added to the live menu until the owner confirms. | M |
| MI-4 | Imported dishes shall have unknown allergens. | M |
| MI-5 | The owner may request Thai and Burmese name suggestions, marked for review. | S |

#### 3.1.7 Settings (ST)
| ID | Requirement | Pri |
|---|---|---|
| ST-1 | The owner shall set opening time, closing time, last order time (HH:MM) and closed days; invalid times shall be rejected. The AI shall quote them exactly. | M |
| ST-2 | The owner shall manage specials with optional start/end dates and an active switch. | S |
| ST-3 | The owner shall manage FAQ question/answer pairs and free-text shop rules used by the AI. | M |
| ST-4 | The owner shall set assistant name, voice (male/female), tone, greeting and upselling on/off. | M |
| ST-5 | The owner shall try the assistant from any owner page; test chats shall not be saved or counted. | S |

#### 3.1.8 QR codes (QR)
| ID | Requirement | Pri |
|---|---|---|
| QR-1 | The system shall generate a QR code (SVG) per table and for the restaurant, pointing to the menu address. | M |
| QR-2 | The owner shall choose the base address (including the server's Wi-Fi address), set the number of tables (1–60), print all codes and download single codes. | M |

#### 3.1.9 Staff (SF)
| ID | Requirement | Pri |
|---|---|---|
| SF-1 | The owner shall create staff with a name, role (waiter or chef) and a 4–8 digit PIN, change PINs and remove staff. PINs shall be stored hashed. | M |
| SF-2 | Staff shall sign in with restaurant code and PIN and be taken to the screen of their role. | M |
| SF-3 | Waiter screen: list open calls (table, reason, waiting time) with "Done"; list picks with items, language and a highlighted allergy warning; "Take order" (to the kitchen) or "Dismiss"; list ready orders with "Served"; show table states; allow marking dishes sold out. | M |
| SF-4 | Chef screen: show tickets in New, Cooking, Ready with items, quantities, waiting time (highlight after 10 minutes) and allergy warning; buttons "Start cooking", "Mark ready"; sold-out switches. | M |
| SF-5 | Order status changes shall follow *picked → new → cooking → ready → served* (or *picked → cancelled*); the server shall reject other transitions (HTTP 409) and actions by the wrong role (HTTP 403). | M |
| SF-6 | Staff screens shall refresh at least every 3 seconds and show LIVE/OFFLINE. | M |

#### 3.1.10 Insights (IN)
| ID | Requirement | Pri |
|---|---|---|
| IN-1 | The owner shall see, for 1, 7 or 30 days: number of chats, tables, questions, share answered from data, unanswered count, menu opens. | S |
| IN-2 | The system shall show most-asked topics, languages used, and unmet demand (vegetarian questions vs number of vegetarian dishes). | S |
| IN-3 | The system shall list unanswered questions with a shortcut to add an FAQ, and answers diners rated wrong. | S |

### 3.2 External interface requirements
**User interfaces:** responsive web pages in a "glass" visual style (frosted panels, rounded controls); diner pages designed for a 390 px wide phone; owner pages for desktop with a side menu; staff pages for phone (waiter) and wide screen (chef). Text ≥ 13 px, touch targets ≥ 44 px, visible keyboard focus, labels on all inputs and icon buttons.
**Hardware interfaces:** none beyond the phone camera/file picker for photo upload and printers for QR codes.
**Software interfaces:**
- Ollama HTTP API (`/api/chat`) for chat and image reading.
- SQLite through Node.js `node:sqlite`.
- Google Fonts CSS (optional).
**Communication interfaces:** HTTP/JSON between browser and server; cookies for sessions (HttpOnly, SameSite=Lax). Main endpoint groups:
- `/api/public/<code>/…`: menu, chat, calls, orders, feedback (no login).
- `/api/auth/…`: register, login, logout.
- `/api/owner/…`: items, categories, faqs, specials, staff, settings, upload, import, qr, lan, insights (owner login).
- `/api/staff/…`: login, floor, kitchen, orders, calls, items (staff PIN).

### 3.3 Non-functional requirements
**Performance** (targets; measured values in brackets where available)
- NFR-P1: AI reply for open questions within 15 s on the reference computer (measured average about 5–6 s with `gemma4:12b`).
- NFR-P2: Rule-based answers (allergens, prices, hours, orders) within 1 s (observed in tests: milliseconds).
- NFR-P3: Menu page usable within 3 s on a local network.
- NFR-P4: Support at least 3 simultaneous diners on the reference computer; AI requests are processed one at a time.
**Safety**
- NFR-S1: Allergen answers must be generated from stored data only.
- NFR-S2: Missing allergen data must never be presented as "no allergens".
- NFR-S3: The system must not claim any dish is safe for an allergy.
**Security**
- NFR-SEC1: Passwords and PINs stored with bcrypt; session cookies signed and expiring (owner 7 days, staff 12 hours).
- NFR-SEC2: Every owner or staff query is restricted to the signed-in restaurant.
- NFR-SEC3: Uploads limited by type and size; uploaded files served only by generated names.
- NFR-SEC4: Input length limits (chat message 500 characters) and parameterised SQL.
**Reliability / availability**
- NFR-R1: If the AI is unavailable the menu, picks and staff calls still work.
- NFR-R2: Database uses write-ahead logging; the file can be backed up by copying it.
**Usability**
- NFR-U1: A diner can order without instructions and without an account.
- NFR-U2: Burmese text uses Unicode (Noto Sans Myanmar) and correct line spacing.
- NFR-U3: Owner can get a first menu online in under 30 minutes using photo import (target, not yet measured with real owners).
**Portability / maintainability**
- NFR-M1: Runs on macOS, Linux or Windows with Node.js 22.13+ and Ollama.
- NFR-M2: The model name and server address are configuration values (`OLLAMA_MODEL`, `OLLAMA_URL`).
- NFR-M3: Automated tests exist for the API and the chat.
**Privacy**
- NFR-PR1: No diner name, phone number or email is collected; chat logs contain no personal identifiers.

### 3.4 Business rules
- BR-1 A dish with allergen data "not provided" is listed under "allergen information not provided" in any allergen answer.
- BR-2 Sold-out dishes cannot be picked or recommended.
- BR-3 The default monthly chat limit is 300 per restaurant.
- BR-4 Only the waiter can take an order to the kitchen; only the chef can start cooking or mark ready; either can mark served.
- BR-5 The AI voice defaults to male ("ครับ", "ခင်ဗျာ").

---

## 4. Supporting information

### 4.1 Use cases (main)
| ID | Use case | Actor | Main flow |
|---|---|---|---|
| UC-1 | Browse the menu | Diner | Scan QR → menu opens → pick language → search/filter → open a dish |
| UC-2 | Ask about allergens | Diner | Open chat → type "I'm allergic to peanuts" → system lists dishes from data and asks to confirm with staff |
| UC-3 | Place picks | Diner | Add dishes → "Show to waiter" → order *picked* created |
| UC-4 | Call staff | Diner | Press bell (or ask for the bill) → call created |
| UC-5 | Manage menu | Owner | Sign in → Menu items → add/edit dish, set allergens, sold-out switch |
| UC-6 | Import a menu | Owner | Upload photo → AI reads → owner reviews and edits → confirm and publish |
| UC-7 | Print QR codes | Owner | QR page → choose address and tables → print |
| UC-8 | Take an order | Waiter | Sign in → Picks → check allergy banner → Take order |
| UC-9 | Cook and serve | Chef, Waiter | Chef: Start cooking → Mark ready; Waiter: Served |
| UC-10 | Mark sold out | Chef, Waiter, Owner | Switch dish off → menu and AI update at once |
| UC-11 | Read insights | Owner | Insights → choose period → review questions, add FAQ |

### 4.2 Data requirements (main entities)
| Table | Key fields |
|---|---|
| users | id, email (unique), password hash |
| restaurants | id, owner, code (unique), name, city, currency, hours, AI voice settings, chat limit |
| categories | id, restaurant, names (EN/TH/MY), sort |
| menu_items | id, restaurant, category, names and descriptions (EN/TH/MY), price, ingredients, allergens (or NULL = not provided), tags, spice, available, photo |
| specials | id, restaurant, title, text, start/end date, active |
| faqs | id, restaurant, question, answer |
| staff | id, restaurant, name, role (waiter/chef), PIN hash |
| chat_sessions / chat_messages | session, table, language; role, text, topic, allergens, answered, flagged, feedback |
| orders / order_items | table, status (picked/new/cooking/ready/served/cancelled), language, allergy note; dish name, quantity, price |
| calls | table, kind, status (open/done) |
| events | restaurant, kind (menu_open) |
| imports | restaurant, photo, extracted rows, status |
Relationships: a user owns restaurants; a restaurant has many categories, dishes, specials, FAQs, staff, sessions, orders and calls; a category has many dishes; an order has many order items.

### 4.3 Order state model
`picked` → (waiter: take) → `new` → (chef: cooking) → `cooking` → (chef: ready) → `ready` → (waiter or chef: served) → `served`. From `picked`, the waiter may dismiss → `cancelled`.

### 4.4 Chat decision flow
1. Detect language.
2. If it tries to change the rules → fixed refusal.
3. If an allergen or an allergy question → allergen answer from data.
4. If bill or staff → create call.
5. If vegetarian/vegan → tag and budget list.
6. If a named dish → sold-out, price, or add to picks.
7. If pork, hours, ingredients → fixed answers.
8. If "menu"/"order" → show menu.
9. Otherwise → language model, then output checks, then reply and log.

### 4.5 Model selection evidence
Four local models were run on 30 questions (10 each in English, Thai, Burmese), with the same menu:
| Model | Memory | Speed | Result |
|---|---|---|---|
| gemma4:12b | 8.4 GB | ~11 tokens/s, ~5.6 s per answer | best in all three languages; selected |
| SEA-LION v3 9B | 6.9 GB | ~15 tokens/s, ~11.5 s | shellfish lists incomplete; rule-change attempt succeeded in Burmese |
| qwen3:8b | 6.6 GB | ~17 tokens/s, ~7 s | weak Burmese |
| qwen3:4b-instruct | 3.9 GB | ~30 tokens/s, ~3.6 s | often wrong language |
A native Burmese speaker reviewed four rounds of Burmese answers; their corrections are built into the assistant.

---

## 5. Verification
| Requirement group | Method | Result to date |
|---|---|---|
| AI-1 … AI-13 | 30-question chat test through the real chat API (`scripts/chat_smoke.py`) | 30/30 as expected |
| OA, MM, ST, QR, SF, PC, IN, MI | 64-check API test (`scripts/e2e.py`): validation, roles, order flow, isolation, photo import | all passed |
| DM, UI, NFR-U | Manual test on phone, tablet and desktop | **to do** |
| NFR-P1/P3/P4, NFR-U3 | Timing and load test with several phones; trial with real owners | **to do** |
| AI-12 Burmese/Thai wording | Native-speaker review | Burmese assistant answers reviewed; interface labels to review |

### Requirements not yet implemented / future
Online payment, LINE/WhatsApp, billing plans, AI-generated dish photos, email summaries, order status for diners, owner dashboard in Thai/Burmese, POS integration.

---

## Appendix A: Items you must add yourself
- Title page details, team, dates, supervisor, version history table.
- Diagrams: use-case diagram (from 4.1), ER diagram (from 4.2), architecture diagram (from 2.1), order state diagram (from 4.3), chat flow chart (from 4.4). Screens: export from the design file or take screenshots of the running app.
- Screenshots of each page for the UI section.
- Results of your own manual and load tests once done.
