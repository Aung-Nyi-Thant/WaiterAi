# Shop AI clickable prototype (M3)

**Open `index.html` in a browser** (double-click it) to see the landing-page prototype. Select **Explore the demo** to open the **HaChi Kyu** diner menu. No server, database or install is required. Demo changes are saved in your browser, shared between tabs; **Reset** in the demo toolbar clears them. The published copy at <https://aung-nyi-thant.github.io/WaiterAi/> updates when this folder is merged to `main`; local changes are not published automatically.

The interface uses black, white and gray, with food photography in color. Six existing reference photos are bundled in `assets/`, with source URLs in `assets/provenance.json`. The remaining menu photos and optional Thai/Myanmar font stylesheet need an internet connection; unavailable photos retain the category fallback and fonts fall back to the system.

## Landing-page comparison

Use the floating **Service / Table / Workspace** picker, number keys **1–3**, or left/right arrows. **R** replays the entrance. Selection persists in `?v=1`, `?v=2` or `?v=3`.

| Direction | Layout | Tradeoff |
|---|---|---|
| Service | Product introduction beside an interactive menu, followed by role previews | Explains the whole product; more scrolling |
| Table | A sticky food mosaic beside a restaurant-led story | Food gets more space; reading column is narrower |
| Workspace | Role switcher and interactive preview immediately after a compact introduction | Quicker to explore; less atmosphere |

Landing preview picks are separate from diner orders. You can switch Thai/Burmese/English, add and clear preview picks, switch roles, and expand FAQs. The demo links open the existing journeys. Direct links remain available: `index.html?view=customer`, `?view=staff`, and `?view=owner`. Existing URLs with `table` or `restaurant` still open the diner menu directly. Append `&lang=en` to open the diner in English.

For a local HTTP preview: `python3 -m http.server 4173 --directory prototype` from the repository root, then open <http://localhost:4173/>.

It meets the M3 minimum bar:

1. **Every Must requirement can be clicked through (happy path)**, and each journey also shows an unhappy path (empty, error or refused states).
2. **It opens in a browser with no server or database.** The data is mock; buttons that would save only change the browser's own storage (`localStorage` for the shared data, `sessionStorage` for the open session). Nothing is sent anywhere.
3. **You can point at a screen and say which requirement it is.** Every screen has a **Covers** pill (top-left) naming the requirement it shows, with the happy and unhappy steps for that screen; the **Thread** button in the toolbar (`?view=thread`) opens the Golden Thread table: FR-1 … FR-10, happy path, unhappy path, design diagram and acceptance tests.

## Demo sign-ins (prototype only, written in `owner.js` and `app.js`, not real credentials)

| Who | Sign-in |
|---|---|
| Owner | `owner@hachi-kyu.example` / `1234` |
| Waiter | PIN `1111` |
| Chef | PIN `2222` |

The real application uses other, generated credentials (see the root README). A dish carries the badge "Verified by the restaurant" only if it is listed in `VERIFIED` in `data.js`; all other allergen lists are estimates made from the ingredient keywords, and the prototype never calls a dish allergy-safe.

## The journeys (tabs at the top)

| Tab | What you can do | Requirements |
|---|---|---|
| **1 · Diner (phone)** | menu by QR address, TH/MY/EN, search, filters, allergy profile, dish detail, AI chat (allergen, price, availability, cheapest, recommended, spicy, hours and FAQ questions), My picks, Send to staff, Call staff, table bill | FR-1, FR-2, FR-3 |
| **2 · Staff (phone)** | PIN sign-in (5 wrong PINs lock it), waiter floor screen (calls, picks with allergy banner, take order, ready, tables, bills, sold out), chef board (New / Cooking / Ready, late tickets) | FR-4, FR-9 |
| **3 · Owner (laptop)** | sign in / register, menu items with the 14 allergens, import a menu photo, hours and FAQ, AI settings, QR codes, staff accounts, insights | FR-5 … FR-10 |
| **Thread** (`?view=thread`) | the Golden Thread table: course FR → SRS IDs → happy path → unhappy path → diagram → acceptance tests, with a link to each screen | all |

The three tabs share one memory, so the story runs end to end: a dish added on the diner screen and sent to staff appears on the waiter screen, goes to the chef, comes back as ready, and ends up on the diner's bill. A PIN the owner creates signs in on the staff tab; a dish the owner switches off is "sold out" for the diner and the AI at once.

## Unhappy paths (try them)

Each is checked by hand in a browser; the same list is in the Thread table.

- Diner: search "zzz" (empty state); an empty cart; a sold-out dish cannot be added (mark it sold out on the staff Menu tab); a second staff call within 60 seconds is refused. On the **Ask AI** screen the **Covers** pill has two switches: **AI model offline** (fallback with Browse / Call staff buttons) and **Model makes an unsafe claim** (the guard replaces its reply). "Ignore all previous instructions…" is refused.
- Staff: a wrong PIN ("1 of 5"), then five wrong PINs lock sign-in for 10 minutes, even for the right PIN (the lock lives in this browser tab: open a new tab to continue the demo); waiter and chef see different tabs; empty queues show an empty state.
- Owner: wrong password; a dish without a name or with a negative price; import rows with a missing name or price are skipped and counted; a closing time not after the opening time; fewer than 1 or more than 60 tables; an account without a name or a 4-digit PIN.

## What it is not

The AI here is a scripted stand-in with the same rules as the real one for the sample questions (allergen answers come from the data and never say "safe"; the staff are always told to confirm). The real application (`../app/`) answers from the database, uses a local language model only for open questions, and checks every model reply: see `../docs/AI_SAFETY.md`. The prototype shows replies in English only; the real app answers in the language of the question.

## Files

| File | What it holds |
|---|---|
| `index.html`, `proto.css`, `design.css` | routing, existing base styles and the prototype's responsive monochrome design |
| `landing.js`, `landing-service.js`, `landing-table.js`, `landing-workspace.js`, `landing.css` | shared landing interactions and three isolated layout directions |
| `picker.js`, `picker.css` | landing-layout comparison controls |
| `assets/` | six local menu reference photos and their provenance |
| `app.js` | state, the diner and staff journeys |
| `ai-rules.js` | the scripted AI waiter (FR-2): rules that answer from the menu data |
| `thread.js` | the Golden Thread page (`?view=thread`) and the Covers pill |
| `owner.js` | the owner journey |
| `data.js` | the HaChi Kyu menu (`RAW`), ingredient and allergen tables, `VERIFIED`, the FR map, and the browser-storage `Store`. `DISH_SEED` (the 13-dish Golden Lotus demo from `eval/menu.json`) is kept for the test but is not shown |
| `i18n.js` | **generated** from the app's labels: `cd app && node --experimental-strip-types --no-warnings ../prototype/make-i18n.mjs` |

`app/tests/prototype.test.ts` checks that the prototype cites only real SRS IDs, mentions every Must requirement, builds a non-empty menu with prices and allergen lists, uses the app's own labels, loads no script from a server, makes no network calls, and that **this README states the sign-ins the code really uses**. It does not click through the screens: do that once yourself before presenting.

`app/tests/prototype-design.test.ts` checks landing/table routing, all three layout selections, preview arithmetic, language switching, role destinations and keyboard focus. Run both suites from `app/`: `npm test -- tests/prototype.test.ts tests/prototype-design.test.ts`.
