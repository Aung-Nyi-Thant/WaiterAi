# Shop AI – the digital waiter

Menu-aware AI waiter for restaurants (Thai, Burmese, English). Diners scan a QR code, browse the menu and chat with the AI.
Owners manage the menu; waiters and chefs see live calls and orders.

## Run it
```
cd app
npm install          # if it fails with an EACCES cache error: npm install --cache ./.npm-cache
npm run dev          # http://localhost:3000  (also on your Wi-Fi address, port 3000)
```
Needs Node 22.13+ (uses the built-in SQLite). The open-question chat and the menu photo import need a model: Ollama with `ollama pull gemma4:12b`. Allergen, price, hours and order answers need none.
The database (`data/shop.db`) is created on first start; delete it to reset. Docker: see the README in the repository root.

## Logins (development only)
`npm run dev` creates the sample restaurant with **public** logins. They are never created when `NODE_ENV=production`.

| Who | Where | Login |
|---|---|---|
| Diner | `/r/golden-lotus?t=5` | none |
| Owner | `/login` | demo@shop.ai / demo1234 |
| Waiter | `/staff` | restaurant `golden-lotus`, PIN 1111 |
| Chef | `/staff` | restaurant `golden-lotus`, PIN 2222 |

For a real deployment run `npm run db:seed` with `NODE_ENV=production`: it loads the sample menu from `eval/menu.json` with a **random** owner password and PINs (printed once), or your own `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_WAITER_PIN`, `SEED_CHEF_PIN`. It refuses the public demo logins and does nothing if the database already has users. Real restaurants register at `/register`.

## Settings (environment variables, all optional; see `.env.example`)
| Variable | Meaning | Default |
|---|---|---|
| `OLLAMA_URL`, `OLLAMA_MODEL` | the local model (there is no cloud option) | `http://localhost:11434`, `gemma4:12b` |
| `OLLAMA_KEEP_ALIVE` | how long the model stays loaded after the last question | `12h` |
| `DATA_DIR` | database, session secret and uploaded photos | `./data` |
| `SESSION_SECRET` | signs session cookies | generated once into `DATA_DIR/secret` |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_LOGIN_WINDOW_SEC` | failed owner logins allowed per account (email) per window, then HTTP 429. Staff PIN sign-in has its own built-in lock: 5 wrong PINs lock it for that restaurant for 10 minutes | 10, 60 s |
| `RATE_LIMIT_CHAT_MAX`, `RATE_LIMIT_CHAT_WINDOW_SEC` | chat messages per chat session per window | 20, 60 s |
| `RATE_LIMIT_CHAT_RESTAURANT_MAX`, `RATE_LIMIT_CHAT_IP_MAX` | chat messages per restaurant / per client address per window | 120, 60 |
| `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_REGISTER_WINDOW_SEC`, `RATE_LIMIT_REGISTER_IP_MAX` | new owner accounts allowed per window for the whole server / per client address | 20 per 3600 s / 5 |
| `RATE_LIMIT_TRUST_PROXY` | `1` = take the client address from `X-Forwarded-For` (only behind your own reverse proxy; otherwise a client can fake it). Per-address limits apply only then | off |

Every `RATE_LIMIT_*` value can be `0` to switch that limit off. Counters live in memory in one server process (several server instances count separately) and restart with the server. A locked account stays locked until the window ends, even for the right password, so someone who knows an owner's email can lock that owner out for a minute at a time; behind a proxy set `RATE_LIMIT_TRUST_PROXY=1` so one address is limited as well.

## Tests
```
npm test              # unit + integration + offline AI eval (no model, no server needed)
npm run lint          # Biome
npm run typecheck
npm run build && npm run test:e2e     # end-to-end against a real server
npm run eval:live     # the 30 AI questions against a running server and a real model; fails below eval/thresholds.json
```
The older Python scripts still work against a running dev server: `python3 scripts/e2e.py` and `python3 scripts/chat_smoke.py`.

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
tests/                 automated tests (tests/e2e = against a real server)
scripts/               seed.mts, eval-live.mts, and the older Python test scripts
src/app/               thin Next.js route and page files that re-export the modules
```
