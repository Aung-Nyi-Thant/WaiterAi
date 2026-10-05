# Shop AI: UI redesign brief

## What the product is
Shop AI is a web app that works as an AI waiter for small restaurants in Thailand. Diners scan a QR code at their table and get the restaurant's menu on their phone. They can browse it and chat with an AI assistant in **Thai, Burmese or English**. The owner manages the menu and the AI. Staff (floor staff and the chef) see live calls and orders.

The AI knows only this restaurant's menu. Anything that could hurt a customer (allergens, prices, opening hours, sold-out dishes) comes from the database as fixed sentences, not from the AI's imagination.

## The four kinds of user and their screens

### 1. Diner (phone, no login): `/r/<restaurant>?t=<table>`
The main screen, and the one that matters most.
- Menu: category tabs, search, dish cards with a photo, price, allergen chips and a "sold out today" label.
- Filters: Vegetarian, No peanuts, Under ฿100, Spicy.
- Language switch: TH / MY / EN changes the labels and the dish names.
- Dish detail (bottom sheet): description, ingredients, all allergens, an **Add** button and **Ask AI about this dish**.
- AI chat: the diner asks anything in any of the three languages. Replies can include **dish cards** with an Add button. Each AI answer has thumbs up/down.
- My picks: a list of chosen dishes with quantities and a **Send to staff** button.
- **Call staff** (bell button): for the bill or for help.
- Offline notice: if the connection drops, the last saved menu is shown.

### 2. Owner (laptop/desktop, email login): `/owner/...`
A dashboard with a left sidebar holding 8 pages, plus a "View live menu" button and a "Test the assistant" chat popup.
- **Menu items**: a table of dishes (photo, 3-language names, price, the 14 EU allergens as checkboxes or "allergen info not provided", tags, a sold-out switch). Also category management, photo upload, and a meter showing how many dishes have complete allergen data.
- **Import a menu**: upload a photo of a printed menu, the AI reads it, and the owner reviews every row before publishing. Problem rows (missing price, odd name) are flagged. The owner can ask for Thai and Burmese name suggestions.
- **Specials & hours**: opening, closing and last-order times, closed days, and specials with start and end dates.
- **FAQ & rules**: question/answer pairs (Wi-Fi, parking...) and free-text shop rules for the AI.
- **AI settings**: assistant name, male/female voice, tone, greeting, upselling on/off.
- **QR codes**: one per table, a printable sheet, SVG download.
- **Insights**: number of chats, share answered from the menu, questions the AI couldn't answer (with an "Add FAQ" button), top topics, languages used, unmet demand, answers diners marked wrong.
- **Staff**: create, edit and remove floor staff and chef accounts, each with a PIN.
- Also: the sign-in and register pages.

### 3. Floor staff (phone, PIN login): `/staff/waiter`
Tabs, auto-refreshing every 3 seconds, with a LIVE/OFFLINE indicator:
- **Calls**: table number, reason (bill, help), minutes waiting, and a Done button.
- **Picks**: what a table chose. A red **allergy banner** appears if the diner mentioned an allergy ("Confirm with the kitchen before ordering"). Buttons: Take order, Dismiss.
- **Ready**: dishes the kitchen finished, with a Served button.
- **Tables**: a grid of 12 tables, coloured by state (calling, picks, in kitchen, free).
- **Sold out**: mark a dish as sold out.

### 4. Chef (tablet/laptop, PIN login): `/staff/chef`
- A kitchen board with three columns: **New / Cooking / Ready**. Tickets show big table numbers, dishes with quantities, a timer (red after 10 minutes) and the allergy banner.
- One big button per ticket: Start cooking, then Mark ready.
- A "Sold out today" panel with on/off switches.

### Order flow
picked (diner) → staff takes the order → new → chef: cooking → chef: ready → served.

## Rules the design must keep
- **Three languages and scripts.** Thai and Burmese text is longer and taller than English, so layouts must not break. Fonts: Noto Sans Thai and Noto Sans Myanmar.
- **Word choice, AI vs human:** anything that opens the AI chat says "AI" (e.g. "Ask AI"). Anything that reaches a real person says "staff" (e.g. "Call staff", "Send to staff"). Never use the bare word "waiter" as a button or action label. It may only appear in the AI's display name (e.g. "AI Waiter").
- **Allergen safety:** never show a dish as "safe" or "allergen-free". Missing data is shown as "allergen info not provided", never as "no allergens". Allergy banners on staff screens must stand out.
- **Accessibility:** WCAG AA contrast (at least 4.5:1), tap targets of 44px or more, visible focus, and support for reduced motion and reduced transparency.
- **Devices:** diner and floor staff screens are phone-first. The chef screen suits a tablet. The owner dashboard is for desktop but should still work on a tablet.

## The current design (what exists today)
- Style: **glassmorphism**, meaning frosted translucent panels over soft "aurora" gradient backgrounds.
  - Dark theme (navy `#0e1030` with violet/cyan/pink glows): diner, floor staff, chef and the home page.
  - Light theme (lavender `#efebff` with pastel glows): owner dashboard and sign-in.
- Colours: navy `#191a45`, violet `#6e56ff`, purple `#2e2a78`, gold `#ffd98a`, green `#1fa68a`, red `#c62828`.
- Fonts: Outfit (headings) and Manrope (body).
- Pill-shaped buttons and chips, rounded corners of 14/20/24px.

## Tech (so the design can be built)
Next.js 16 + React 19 + TypeScript, styled with **plain CSS** in one global stylesheet (class names such as `.btn`, `.chip`, `.pill`, `.gd`/`.gl` glass panels). No Tailwind and no component library. A design system of CSS variables (tokens) plus a small set of reusable components fits best.

## What I want from you
<!-- Fill this in before sending, e.g.: -->
- [ ] Keep the glass style but make it cleaner, or propose a new direction
- [ ] Main problems I see today: ...
- [ ] Screens to design first: Diner menu + chat, then ...
- [ ] Output: design system (colours, type, spacing, components) + mock-ups for each screen
