# Shop AI clickable prototype (Milestone 4)

**Open `index.html` in a browser** (double-click it), or use the published copy: <https://aung-nyi-thant.github.io/WaiterAi/> (GitHub Pages deploys this folder on every change to `main`). No server, no database, no install. Reloading the page resets everything.
The only thing loaded from the internet is the font stylesheet; without a connection the page falls back to system fonts.

It meets the M3 minimum bar:

1. **Every Must requirement can be clicked through (happy path)**, and each journey also shows an unhappy path (empty, error or refused states).
2. **It opens in a browser with no server or database.** The data is mock; buttons that would save only change the page's memory.
3. **You can point at a screen and say which requirement it is.** Every screen has a green **Covers:** bar naming the SRS IDs it demonstrates; the **Requirements map** tab lists FR-1 … FR-10 with the screens and the unhappy paths.

## The journeys (tabs at the top)

| Tab | What you can do | Requirements |
|---|---|---|
| **1 · Diner (phone)** | menu by QR address, TH/MY/EN, search, filters, allergy profile, dish detail, AI chat (8 sample questions), My picks, Send to staff, Call staff, table bill | FR-1, FR-2, FR-3 |
| **2 · Staff (phone)** | PIN sign-in (5 wrong PINs lock it), waiter floor screen (calls, picks with allergy banner, take order, ready, tables, bills, sold out), chef board (New / Cooking / Ready, late tickets) | FR-4, FR-9 |
| **3 · Owner (laptop)** | sign in / register, menu items with the 14 allergens, import a menu photo, hours and FAQ, AI settings, QR codes, staff accounts, insights | FR-5 … FR-10 |
| **Requirements map** | the Golden Thread table: course FR → SRS IDs → screen → unhappy path to try | all |

The three tabs share one memory, so the story runs end to end: a dish added on the diner screen and sent to staff appears on the waiter screen, goes to the chef, comes back as ready, and ends up on the diner's bill. A PIN the owner creates signs in on the staff tab; a dish the owner switches off is "sold out" for the diner and the AI at once.

## Unhappy paths (try them)

- Diner: search "zzz" (empty state); "No peanuts" hides the dish with no allergen data; the sold-out dish cannot be added; press the bell twice (one open call per table); side panel switches for **AI offline**, **model makes an allergen claim** (the guard replaces it) and **no connection**.
- Staff: wrong PIN, then five wrong PINs (locked); a chef-only button pressed by the waiter (403).
- Owner: wrong password, a dish without a name or with a negative price, flagged import rows block publishing, invalid opening times, more than 60 tables, a duplicate or too-short PIN.

## What it is not

The AI here is a scripted stand-in with the same rules as the real one for the sample questions (allergen answers come from the data and never say "safe"; the staff are always told to confirm). The real application (`../app/`) answers from the database, uses a local language model only for open questions, and checks every model reply: see `../docs/AI_SAFETY.md`. The prototype shows replies in English only; the real app answers in the language of the question.

## Files

| File | What it holds |
|---|---|
| `index.html`, `proto.css` | the page and the real app's design tokens (colours, fonts, radii) |
| `app.js` | state, the scripted AI, the diner and staff journeys |
| `owner.js` | the owner journey and the requirements map |
| `data.js` | the sample menu (`eval/menu.json`) and the FR map |
| `i18n.js` | **generated** from the app's labels: `cd app && node --experimental-strip-types --no-warnings ../prototype/make-i18n.mjs` |

`app/tests/prototype.test.ts` checks that the prototype cites only real SRS IDs, mentions every Must requirement, uses the real sample menu and labels, and loads nothing from a server.
