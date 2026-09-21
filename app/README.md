# Shop AI – the digital waiter

Menu-aware AI waiter for restaurants (Thai, Burmese, English). Diners scan a QR code, browse the menu and chat with the AI.
Owners manage the menu; waiters and chefs see live calls and orders.

## Run it
```
cd app
npm run dev          # http://localhost:3000  (also on your Wi-Fi address, port 3000)
```
Needs Node 22.13+ (uses the built-in SQLite) and Ollama running with the model (`ollama pull gemma4:12b`).
The database (`data/shop.db`) and the demo restaurant are created automatically on first start. Delete `data/shop.db` to reset.
If `npm install` fails with an EACCES cache error, run `npm install --cache ./.npm-cache`.

## Demo logins
| Who | Where | Login |
|---|---|---|
| Diner | `/r/golden-lotus?t=5` | none |
| Owner | `/login` | demo@shop.ai / demo1234 |
| Waiter | `/staff` | restaurant `golden-lotus`, PIN 1111 |
| Chef | `/staff` | restaurant `golden-lotus`, PIN 2222 |

## Settings (env, optional)
`OLLAMA_URL` (default http://localhost:11434), `OLLAMA_MODEL` (default gemma4:12b), `SESSION_SECRET`.

## Tests
With the dev server running: `python3 scripts/e2e.py` (API, roles, orders, import) and `python3 scripts/chat_smoke.py` (the 30 eval questions through the real chat API).

## How the AI stays safe
Allergen answers, vegetarian lists, prices, opening hours, sold-out dishes, orders and the bill are built from the database with fixed sentences.
The language model only answers open questions, and its reply is rejected if it says a dish is "safe", contains a wrong price, or the dish/allergen data is missing.

## Code layout
```
src/modules/diner/     Member 1: diner page, labels, public menu/order/call APIs
src/modules/ai/        Member 2: AI waiter logic and chat API
src/modules/owner/     Member 3: owner pages, dish and settings APIs
src/modules/staff/     Member 4: waiter and chef screens, order rules, staff APIs
src/modules/platform/   Member 5: database, login, import, QR, insights, shared helpers
src/app/               thin Next.js route and page files that re-export the modules
```
