# Shop AI – the digital waiter

Menu-aware AI waiter for restaurants (Thai, Burmese, English). Diners scan a QR code, browse the menu and chat with the AI; owners manage the menu; waiters and chefs see live calls and orders.

The AI never decides anything safety-critical: allergens, prices, opening hours, sold-out dishes, orders and the bill are answered from the database with fixed sentences. The language model only handles open questions, and its reply is checked before it is shown (details and tests: [`docs/AI_SAFETY.md`](docs/AI_SAFETY.md)).

| Folder | What it holds |
|---|---|
| `app/` | The web app (Next.js + SQLite + Ollama). Start here: `app/README.md` |
| `app/src/modules/` | The code, split into 5 modules: `diner`, `ai`, `owner`, `staff`, `platform`. Each has its own README |
| `eval/` | Test questions, sample menu and the model comparison scripts |
| `docs/` | SRS, feature plan, project explanation, team work plan, measured results (`NFR_RESULTS.md`), and the product worksheet answers (`PRODUCT_IDEA_WORKSHEET.md`) |
| `design/` | UI design generators (Art Deco and Glass mock-ups) |

## Clickable prototype (no server needed)

Open `prototype/index.html` in a browser. It walks the diner, staff and owner journeys with mock data, shows every Must requirement and some unhappy paths, and labels each screen with the SRS IDs it covers (`prototype/README.md`).

## Run it in 2 minutes

**With Docker** (nothing else to install except Docker):
```
docker compose up --build
docker compose logs app        # the sign-in details are printed here once
```
Open <http://localhost:3000/r/golden-lotus?t=5> (the diner page for table 5). Owners sign in at `/login`, staff at `/staff`.
The password and PINs are **random, generated on first start** and shown only in that log; set `SEED_OWNER_PASSWORD`, `SEED_WAITER_PIN`, `SEED_CHEF_PIN` in a `.env` file (copy `.env.example`) to choose your own.

**Without Docker** (Node 22.13+):
```
cd app
npm install        # if you get an EACCES cache error: npm install --cache ./.npm-cache
npm run dev        # http://localhost:3000
```
The first start creates the sample restaurant `golden-lotus` with **public development logins** (see the table below). They exist only when `NODE_ENV` is not `production`.

**Abuse limits.** Chat messages and failed logins are rate-limited (HTTP 429); tune or switch them off with the `RATE_LIMIT_*` variables in `.env.example`.

**The AI model.** Rule-based answers (allergens, prices, hours, orders, the bill) work with no model at all. Open questions ("what do you recommend?") and the menu photo import need **Ollama on your computer**: `ollama pull gemma4:12b` and keep `ollama serve` running (Docker reaches it through `host.docker.internal`). There is deliberately no cloud AI option: customer questions never leave the restaurant's computer (SRS 2.2 and NFR-5). Answers are processed one at a time; a request that would wait too long gets the "AI unavailable" message.

### Logins

| Who | Where | Docker / production | Local `npm run dev` only |
|---|---|---|---|
| Diner | `/r/golden-lotus?t=5` | none | none |
| Owner | `/login` | `owner@example.com` (or `SEED_OWNER_EMAIL`) + generated password | `demo@shop.ai` / `demo1234` |
| Waiter | `/staff`, restaurant `golden-lotus` | generated PIN | `1111` |
| Chef | `/staff`, restaurant `golden-lotus` | generated PIN | `2222` |

> The `demo@shop.ai` / `demo1234` / `1111` / `2222` logins are public (they are in this file). They are created only in development and are **never created when `NODE_ENV=production`**; the seed script refuses to use them there (tests: `app/tests/seed.test.ts`, `app/tests/e2e/`).

## Tests and CI

```
cd app
npm test              # 200+ unit/integration tests + the offline AI eval gate (no model needed)
npm run lint          # Biome
npm run typecheck
npm run build && npm run test:e2e     # end-to-end: starts the real server on a fresh seeded database
npm run eval:live     # the 30 AI questions against a real model (server + Ollama running)
```
GitHub Actions (`.github/workflows/ci.yml`) runs install, lint, type-check, tests, build, the end-to-end tests and a Docker build on every push and pull request. Requirement → code → test mapping: [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md).

## How well does the AI answer? (`eval/questions.json`, 30 questions)

| Language | Rules only, model off (enforced in CI) | Live, `gemma4:12b` via Ollama (2026-10-05) |
|---|---|---|
| English | 100% (9/9) | 100% (10/10) |
| Thai | 100% (9/9) | 100% (10/10) |
| Burmese | 100% (9/9) | 100% (10/10) |
| **All** | **100% (27/27)** | **100% (30/30)** |

Read this with care: only 3 of the 30 questions reach the language model; the other 27 are the deterministic rules, and scoring is keyword-based. The minimum scores that make CI (and `npm run eval:live`) fail are in `eval/thresholds.json`. Full report and the known limits: [`docs/AI_SAFETY.md`](docs/AI_SAFETY.md).

## The problem this project addresses

The problem statement is the one in the team's **M1 charter** and **M2 SRS** (the course PDFs): small and mid-size restaurants rely on a few front-of-house staff who must take orders and answer questions about ingredients, allergens, opening hours and recommendations at the same time. At peak hours this causes slow service, order mistakes and repeated questions. Interviews for the charter (a front-of-house employee, a noodle-shop chef-owner and a fried-food-shop owner in Chiang Rai) described exactly this: orders missed or misunderstood when several things are said at once, and customers waiting for answers about the menu.

Shop AI answers it with a QR menu and a menu-aware AI waiter (Thai, Burmese, English) that handles repetitive questions safely, plus an owner back office and live waiter and chef screens. The two course documents above are the only problem statements in this repository; if the course gave a different original brief, the team should state it here with the reason the topic differs, because the repository does not record that.

## What is in the repository

| Folder | What it holds |
|---|---|
| `app/` | The web app (Next.js + SQLite + Ollama). Details: [`app/README.md`](app/README.md) |
| `app/src/modules/` | The code, split into 5 modules: `diner`, `ai`, `owner`, `staff`, `platform`. Each has its own README |
| `app/tests/` | Automated tests (`tests/e2e/` = against a real server) |
| `eval/` | The 30 test questions, sample menu, pass thresholds, model comparison scripts and results |
| (course PDFs, kept by the team and not committed) | `M1-Charter_ MFU888.pdf` and `Team18_M2_SRS.pdf.pdf`: the charter and SRS (FR-1 … FR-10, AI usage log). Their FR numbers map to the IDs in `docs/TRACEABILITY.md`; what to correct in them: `docs/PDF_CORRECTIONS.md` |
| `docs/` | [SRS](docs/SRS_Shop_AI.md), [traceability](docs/TRACEABILITY.md), [AI safety](docs/AI_SAFETY.md), [AI usage log](docs/AI_USAGE_LOG.md), [performance](docs/PERFORMANCE.md), feature plan, project explanation, team work plan |
| `design/` | UI design generators (Art Deco and Glass mock-ups) |
| `Dockerfile`, `docker-compose.yml`, `.env.example` | One-command start (see above) |

## Team work
See `docs/TEAM_WORK_PLAN.md` (who owns what) and `CONTRIBUTING.md` (how to commit).
