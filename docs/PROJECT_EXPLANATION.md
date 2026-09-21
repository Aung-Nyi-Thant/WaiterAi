# Shop AI: the digital waiter. Project explanation

## 1. The problem
- Diners dislike today's QR menus: small text, no photos, no way to ask a question. In a survey (US Foods, 2024) 90% of diners preferred a paper menu.
- Tourists and migrant workers often cannot read the menu language. In Thailand, Thai, Burmese and English are all needed.
- Allergy questions are risky. A wrong answer from a chatbot can cause harm and legal trouble (the Air Canada chatbot case, 2024).
- Small restaurants cannot afford expensive systems and do not have time to type a whole menu into software.

## 2. The solution
A web app with three kinds of users, all running on one laptop:
1. **Diner**: scans a QR code at the table, browses the menu, and chats with an AI waiter in Thai, Burmese or English. No login, no app.
2. **Owner**: manages the menu, allergens, AI settings, QR codes and sees what diners asked.
3. **Staff**: the waiter sees calls and picked dishes, the chef sees a kitchen queue.

The main idea: the AI waiter knows only this restaurant's menu, and everything that could hurt a customer (allergens, prices, opening hours, sold-out dishes) comes from the database with fixed sentences, not from the AI's imagination.

## 3. Features by user

### 3.1 Diner (page `/r/<restaurant>?t=<table>`)
| Feature | What it does | How it works |
|---|---|---|
| Menu browsing | Categories, search, photos, prices, allergen chips, "sold out today" label | Loaded from the database; refreshes every 20 seconds so sold-out changes appear |
| Filters | Vegetarian, No peanuts, Under ฿100, Spicy | Filter on dish tags, allergens and price. "No peanuts" hides dishes whose allergen data is missing |
| 3 languages | TH / MY / EN buttons change labels and dish names | Each dish stores its name in all three languages |
| Dish detail | Description, ingredients, all allergens, Add button, "Ask the waiter about this dish" | Bottom sheet |
| AI chat | Ask anything about the menu in any language; the AI replies in the language you wrote in | See section 4 |
| Dish cards in chat | The AI shows the dishes it talks about with an Add button | The app checks that each dish exists and is on sale |
| My picks | Add dishes, change quantity, then "Show to waiter" | Creates an order with status "picked"; allergies the diner mentioned in chat are attached |
| Call staff | Bell button | Creates a call for that table; one open call per type per table |
| Feedback | Thumbs up/down on each AI answer | A thumbs-down flags the answer for the owner |
| Offline copy | If the connection drops the last saved menu is shown with a notice | Saved in the browser |

### 3.2 Owner (`/login`, then `/owner/...`)
| Page | What it does |
|---|---|
| Sign in / register | Email and password (passwords stored hashed). Registering creates a restaurant with a web address like `/r/my-cafe` |
| Menu items | Table of dishes with photo, prices, allergens, tags and a "sold out" switch. Add, edit, delete. Categories in three languages. Photo upload. The 14 EU allergens as checkboxes, or "allergen info not provided". A meter shows how many dishes have complete allergen data |
| Import a menu | Upload a photo of a printed menu. The vision AI reads dishes and prices. The owner reviews every row (flagged rows: missing price, suspicious name), can ask for Thai/Burmese name suggestions, then confirms. Nothing goes live before confirmation. Allergens are never guessed from a photo |
| Specials & hours | Opening, closing and last-order time and closed days (the AI answers hours questions word for word from here). Specials with start and end dates |
| FAQ & rules | Question/answer pairs (Wi-Fi, parking, invoices) and free-text shop rules for the AI |
| AI waiter | Restaurant name, assistant name, male/female voice (Thai ครับ/ค่ะ, Burmese ခင်ဗျာ/ရှင်), tone, greeting, upselling on/off, and a test chat |
| QR codes | One code per table, printable sheet, SVG download. Offers your Wi-Fi address so phones can scan it |
| Insights | Chats, share answered from the menu, questions the AI could not answer (with "Add FAQ" button), most-asked topics, languages used, unmet demand (for example vegetarian questions vs vegetarian dishes), answers diners marked wrong |
| Staff | Create waiter and chef accounts with a PIN; change or remove them |
| Test the assistant | Try the AI as a diner from any owner page; not saved or counted |

### 3.3 Waiter (`/staff`, PIN, then `/staff/waiter`, phone layout)
- **Calls**: table number, reason (bill, help), minutes waiting, "Done".
- **Picks**: what a table chose. A red banner shows an allergy the diner mentioned ("Confirm with the kitchen before ordering"). Buttons: Take order (sends it to the kitchen) or Dismiss.
- **Ready**: dishes the chef finished; "Served".
- **Tables**: 12 tables coloured by state (calling, picks, in kitchen, free).
- **Sold out**: mark a dish sold out from the floor.
- Updates every 3 seconds, shows LIVE/OFFLINE.

### 3.4 Chef (`/staff/chef`, tablet or laptop)
- Three columns: **New**, **Cooking**, **Ready**, with big table numbers, dishes with quantities, timers (red after 10 minutes) and the allergy banner.
- One big button per ticket: Start cooking, Mark ready.
- **Sold out today** panel: switch dishes off; diners and the AI stop offering them immediately.

### 3.5 Order life cycle
`picked` (diner) → waiter **takes** → `new` → chef **cooking** → chef **ready** → waiter/chef **served`. Each step is only allowed for the right role and in the right order (the server rejects skipping steps or wrong roles).

## 4. The AI waiter: how it works (the most important part)
**Model:** `gemma4:12b` running locally with Ollama (about 8.4 GB, about 5 seconds per answer on a MacBook Air M4 with 32 GB). No cloud, no per-message cost. Chosen after a test of four models on 30 questions in Thai, Burmese and English, and reviewed by a native Burmese speaker.

**Hybrid design.** Each question goes through this pipeline:
1. **Detect the language** from the letters used (Thai, Burmese, or English).
2. **Rules first, from the database, with fixed sentences** for anything safety-critical:
   - allergen questions ("I'm allergic to peanuts", "Does the stir-fry have allergens?", "anything without shellfish?"): lists dishes from the allergen data, says which dishes have no data, and always ends with "please confirm with the staff". It never says "safe".
   - vegetarian/vegan lists with a budget ("vegetarian under 100 baht"): only dishes with that tag, only below the price.
   - price of a named dish, opening hours, sold-out dishes (with alternatives), pork, ingredients.
   - orders ("2 x mango sticky rice please" adds to My picks), "the bill" and "call staff" (creates a call).
   - attempts to change the rules ("ignore all your rules") are refused.
3. **Only open questions go to the language model** (recommendations, FAQs, small talk, "do you have pizza?"). It receives the menu, hours, FAQs, shop rules and voice settings as data, plus strict rules.
4. **The reply is checked before it is shown.** It is replaced by a safe "I don't have that, please ask the staff" if it says something is safe or allergy-free, contains a price that does not match the menu, or is empty. Dish cards it suggests are checked against the database.
5. **Fallbacks:** if the model is unavailable the diner sees the menu and a call-staff option; if the monthly chat limit is reached the same happens.
6. **Logging for insights:** topic, language and whether it could be answered (no personal data).

**Why hybrid?** Our tests showed that even a good model sometimes forgot a shellfish dish, called a dish vegetarian when it contained meat, or obeyed "ignore your rules". Fixed sentences from the database make these safety-critical answers correct every time, while the model keeps the chat natural.

**Burmese style rules** (from the native speaker): polite spoken style "ပါတယ်ခင်ဗျာ", never formal "သည်", "Allergens" kept in English, prices with "ဘတ်", the fixed staff sentence "ဝန်ထမ်းကို မေးမြန်းပေးပါခင်ဗျာ".

## 5. Technology
| Part | Choice | Why |
|---|---|---|
| Web app | Next.js 16, React 19, TypeScript | One project for pages and API |
| Database | SQLite (Node's built-in `node:sqlite`) | No server or account; one file; easy to demo and reset |
| AI | Ollama + `gemma4:12b` (text and vision) | Runs on the laptop; reads menu photos too |
| Login | Passwords and PINs hashed with bcrypt; signed, expiring cookies | Owners and staff kept apart |
| QR | `qrcode` library | Generates SVG codes |
| Design | Glassmorphism (frosted panels on a coloured background), Outfit and Manrope fonts, Noto Thai/Myanmar | Chosen by the team |
| Live updates | Screens ask the server every 3 seconds | Simple and reliable on a local network |

## 6. Database (12 tables)
users, restaurants (hours, AI voice settings, chat limit), categories, menu_items (3-language names, price, allergens or "not provided", tags), specials, faqs, staff (PIN hashes), chat_sessions, chat_messages (topic, language, answered, feedback), orders, order_items, calls, events (menu opens), imports.
Every owner or staff query is limited to their own restaurant, so one restaurant cannot see or change another's data.

## 7. Safety and privacy
- Diners do not log in and no personal data is stored; chat questions are stored without names.
- Owner routes need an owner login; staff routes need a PIN and a role.
- Uploads are limited to JPG/PNG/WebP up to 8 MB.
- Allergen data missing = shown as "not provided", never as "no allergens".

## 8. How it was tested
- **Eval of 4 models** (30 questions, 3 languages) plus 4 rounds of Burmese review by a native speaker.
- **Chat test**: the same 30 questions through the real chat API: 30/30 match the expected answers.
- **End-to-end API test (64 checks)**: login and wrong password, dish create/update/delete and validation, categories, FAQs, specials, staff, hours flowing into AI answers, female voice, QR, diner picks, sold-out dishes ignored, waiter/chef order flow and role limits, insights, registering a second restaurant and isolation, and reading a menu photo.

## 9. Limits and future work
- Screens were tested through the API; a full visual check on phones is still to do.
- Thai and Burmese interface labels are first drafts and need a native review; the owner dashboard is English only.
- Runs on one laptop, so it serves a few tables at once (one AI answer at a time, about 5 seconds each). More restaurants need a GPU server or a hosted model.
- Not built yet: online payment, LINE/WhatsApp, billing plans, AI-generated dish photos, email summaries, order status for diners.
- Photo import may misread unclear photos; the owner review step exists for this reason.

## 10. Suggested demo (5 minutes)
1. Diner phone: open the menu at table 5, switch TH/MY/EN, use the "No peanuts" filter.
2. Chat: "I'm allergic to peanuts" (fixed safe answer), "vegetarian under 100 baht", then in Burmese "ပီဇာ ရှိလား", then "2 x mango sticky rice please".
3. Tap **Show to waiter**. On the waiter screen, see the pick with the allergy banner; tap **Take order**.
4. Chef screen: **Start cooking**, **Mark ready**; waiter taps **Served**.
5. Chef marks a dish sold out; ask the AI for it and show the answer changes at once.
6. Owner: import a menu photo, review and publish; show QR codes and Insights.
