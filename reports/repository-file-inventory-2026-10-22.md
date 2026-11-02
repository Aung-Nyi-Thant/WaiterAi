# Shop AI file inventory

Snapshot: 22 October 2026. This lists all **395** scoped project/configuration files present before the analysis reports were added. It is a navigation and coverage inventory, not a claim that every file received a line-by-line security audit. See [the analysis](repository-analysis-2026-10-22.md) for findings and verification limits.

Excluded: `.git`, installed dependencies, `.next`, npm caches, runtime `data`, Python caches, OS metadata, generated TypeScript build information, bundled agent skills, agent definitions, and duplicate `.claude` worktrees. These exclusions prevent generated and third-party copies from being counted as application source.

| Area | Files |
|---|---:|
| `(root)` | 13 |
| `.codex` | 1 |
| `.github` | 3 |
| `app` | 237 |
| `design` | 19 |
| `docs` | 35 |
| `eval` | 54 |
| `prototype` | 11 |
| `reports` | 1 |
| `research_notes` | 5 |
| `windows` | 16 |

## .codex

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [.codex/hooks.json](../.codex/hooks.json) | 1,084 B | 31 | Agent post-edit/stop hook configuration invoking bundled tooling | Structure/consistency |

## .github

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [.github/hooks/impeccable.json](../.github/hooks/impeccable.json) | 377 B | 13 | Agent post-edit/stop hook configuration invoking bundled tooling | Structure/consistency |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | 6,489 B | 145 | CI checks on Linux/Windows and Docker | Source/content review |
| [.github/workflows/pages.yml](../.github/workflows/pages.yml) | 844 B | 33 | Publish static prototype to GitHub Pages | Source/content review |

## app configuration/assets

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/.env.example](../app/.env.example) | 1,944 B | 26 | Documented environment-variable example; not live credentials | Source/content review |
| [app/.gitignore](../app/.gitignore) | 121 B | 9 | Repository/build filtering or line-ending configuration | Source/content review |
| [app/.impeccable/hook.cache.json](../app/.impeccable/hook.cache.json) | 1,837 B | 1 | Application compiler, test, lint or framework configuration | Structure/consistency |
| [app/AGENTS.md](../app/AGENTS.md) | 678 B | 9 | Next.js repository-agent guidance | Source/content review |
| [app/CLAUDE.md](../app/CLAUDE.md) | 11 B | 1 | Reference to the application agent guidance | Source/content review |
| [app/README.md](../app/README.md) | 12,113 B | 96 | Documentation: Shop AI – the digital waiter | Source/content review |
| [app/biome.json](../app/biome.json) | 1,053 B | 30 | Application compiler, test, lint or framework configuration | Structure/consistency |
| [app/next-env.d.ts](../app/next-env.d.ts) | 296 B | 7 | Application compiler, test, lint or framework configuration | Source/content review |
| [app/next.config.ts](../app/next.config.ts) | 255 B | 9 | Application compiler, test, lint or framework configuration | Source/content review |
| [app/package-lock.json](../app/package-lock.json) | 122,159 B | 3651 | Locked dependency graph; 231 entries including root | Structure/consistency |
| [app/package.json](../app/package.json) | 1,621 B | 43 | Application dependency manifest and command entry points | Structure/consistency |
| [app/public/uploads/.gitkeep](../app/public/uploads/.gitkeep) | 0 B | 0 | Placeholder preserving an otherwise empty upload folder | Source/content review |
| [app/src/instrumentation.ts](../app/src/instrumentation.ts) | 409 B | 6 | Start background AI warm-up in the Node runtime | Runtime source inspection |
| [app/tsconfig.json](../app/tsconfig.json) | 595 B | 21 | Application compiler, test, lint or framework configuration | Structure/consistency |
| [app/vitest.config.mts](../app/vitest.config.mts) | 426 B | 14 | Application compiler, test, lint or framework configuration | Source/content review |
| [app/vitest.e2e.config.mts](../app/vitest.e2e.config.mts) | 379 B | 13 | Application compiler, test, lint or framework configuration | Source/content review |

## app/scripts

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/scripts/chat_smoke.py](../app/scripts/chat_smoke.py) | 1,292 B | 21 | HTTP scenario or non-functional verification script | Source/content review |
| [app/scripts/e2e.py](../app/scripts/e2e.py) | 18,388 B | 189 | HTTP scenario or non-functional verification script | Source/content review |
| [app/scripts/eval-live.mts](../app/scripts/eval-live.mts) | 7,354 B | 83 | Authenticated real-model question-set runner | Source/content review |
| [app/scripts/eval-smooth.mts](../app/scripts/eval-smooth.mts) | 8,566 B | 98 | Sequential/burst/busy-model latency and fallback measurements | Source/content review |
| [app/scripts/load-test.mts](../app/scripts/load-test.mts) | 8,004 B | 104 | Concurrent diner/staff and extended model load measurements | Source/content review |
| [app/scripts/make-hachi-kyu-seed.mts](../app/scripts/make-hachi-kyu-seed.mts) | 7,119 B | 89 | Build seed JSON from prototype dish data | Source/content review |
| [app/scripts/nfr_check.py](../app/scripts/nfr_check.py) | 8,650 B | 159 | HTTP scenario or non-functional verification script | Source/content review |
| [app/scripts/seed-data/dish-details/README.md](../app/scripts/seed-data/dish-details/README.md) | 2,705 B | 35 | Documentation: HaChi Kyu dish details | Source/content review |
| [app/scripts/seed-data/dish-details/components.json](../app/scripts/seed-data/dish-details/components.json) | 19,882 B | 118 | Restaurant seed, components or translated dish-details dataset | Structure/consistency |
| [app/scripts/seed-data/dish-details/kitchen.json](../app/scripts/seed-data/dish-details/kitchen.json) | 34,289 B | 1040 | Restaurant seed, components or translated dish-details dataset | Structure/consistency |
| [app/scripts/seed-data/dish-details/sashimi-sushi.json](../app/scripts/seed-data/dish-details/sashimi-sushi.json) | 15,338 B | 435 | Restaurant seed, components or translated dish-details dataset | Structure/consistency |
| [app/scripts/seed-data/hachi-kyu.json](../app/scripts/seed-data/hachi-kyu.json) | 115,502 B | 3230 | Restaurant seed, components or translated dish-details dataset | Structure/consistency |
| [app/scripts/seed-hachi-kyu.mts](../app/scripts/seed-hachi-kyu.mts) | 10,560 B | 128 | Seed/merge/replace sushi menu and guarded demo accounts | Source/content review |
| [app/scripts/seed.mts](../app/scripts/seed.mts) | 5,955 B | 76 | Seed sample restaurant with production-safe credential selection | Source/content review |

## app/src/app

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/src/app/api/auth/login/route.ts](../app/src/app/api/auth/login/route.ts) | 53 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/login | Runtime source inspection |
| [app/src/app/api/auth/logout/route.ts](../app/src/app/api/auth/logout/route.ts) | 54 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/logout | Runtime source inspection |
| [app/src/app/api/auth/register/route.ts](../app/src/app/api/auth/register/route.ts) | 56 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/register | Runtime source inspection |
| [app/src/app/api/owner/[resource]/[id]/route.ts](../app/src/app/api/owner/[resource]/[id]/route.ts) | 64 B | 1 | Next.js HTTP wrapper → @/modules/owner/api/resourceItem | Runtime source inspection |
| [app/src/app/api/owner/[resource]/route.ts](../app/src/app/api/owner/[resource]/route.ts) | 58 B | 1 | Next.js HTTP wrapper → @/modules/owner/api/resource | Runtime source inspection |
| [app/src/app/api/owner/import/confirm/route.ts](../app/src/app/api/owner/import/confirm/route.ts) | 61 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/importConfirm | Runtime source inspection |
| [app/src/app/api/owner/import/route.ts](../app/src/app/api/owner/import/route.ts) | 86 B | 2 | Next.js HTTP wrapper → @/modules/platform/api/import | Runtime source inspection |
| [app/src/app/api/owner/import/translate/route.ts](../app/src/app/api/owner/import/translate/route.ts) | 95 B | 2 | Next.js HTTP wrapper → @/modules/platform/api/importTranslate | Runtime source inspection |
| [app/src/app/api/owner/insights/route.ts](../app/src/app/api/owner/insights/route.ts) | 55 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/insights | Runtime source inspection |
| [app/src/app/api/owner/items/[id]/route.ts](../app/src/app/api/owner/items/[id]/route.ts) | 61 B | 1 | Next.js HTTP wrapper → @/modules/owner/api/itemsById | Runtime source inspection |
| [app/src/app/api/owner/items/bulk/route.ts](../app/src/app/api/owner/items/bulk/route.ts) | 55 B | 1 | Next.js HTTP wrapper → @/modules/owner/api/itemsBulk | Runtime source inspection |
| [app/src/app/api/owner/items/route.ts](../app/src/app/api/owner/items/route.ts) | 55 B | 1 | Next.js HTTP wrapper → @/modules/owner/api/items | Runtime source inspection |
| [app/src/app/api/owner/lan/route.ts](../app/src/app/api/owner/lan/route.ts) | 50 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/lan | Runtime source inspection |
| [app/src/app/api/owner/me/route.ts](../app/src/app/api/owner/me/route.ts) | 54 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/ownerMe | Runtime source inspection |
| [app/src/app/api/owner/qr/route.ts](../app/src/app/api/owner/qr/route.ts) | 49 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/qr | Runtime source inspection |
| [app/src/app/api/owner/settings/route.ts](../app/src/app/api/owner/settings/route.ts) | 57 B | 1 | Next.js HTTP wrapper → @/modules/owner/api/settings | Runtime source inspection |
| [app/src/app/api/owner/upload/route.ts](../app/src/app/api/owner/upload/route.ts) | 54 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/upload | Runtime source inspection |
| [app/src/app/api/public/[slug]/bill/route.ts](../app/src/app/api/public/[slug]/bill/route.ts) | 48 B | 1 | Next.js HTTP wrapper → @/modules/diner/api/bill | Runtime source inspection |
| [app/src/app/api/public/[slug]/calls/route.ts](../app/src/app/api/public/[slug]/calls/route.ts) | 50 B | 1 | Next.js HTTP wrapper → @/modules/diner/api/calls | Runtime source inspection |
| [app/src/app/api/public/[slug]/chat/route.ts](../app/src/app/api/public/[slug]/chat/route.ts) | 46 B | 1 | Next.js HTTP wrapper → @/modules/ai/api/chat | Runtime source inspection |
| [app/src/app/api/public/[slug]/feedback/route.ts](../app/src/app/api/public/[slug]/feedback/route.ts) | 53 B | 1 | Next.js HTTP wrapper → @/modules/diner/api/feedback | Runtime source inspection |
| [app/src/app/api/public/[slug]/menu/route.ts](../app/src/app/api/public/[slug]/menu/route.ts) | 48 B | 1 | Next.js HTTP wrapper → @/modules/diner/api/menu | Runtime source inspection |
| [app/src/app/api/public/[slug]/orders/route.ts](../app/src/app/api/public/[slug]/orders/route.ts) | 51 B | 1 | Next.js HTTP wrapper → @/modules/diner/api/orders | Runtime source inspection |
| [app/src/app/api/staff/bills/[table]/route.ts](../app/src/app/api/staff/bills/[table]/route.ts) | 50 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/bills | Runtime source inspection |
| [app/src/app/api/staff/calls/[id]/route.ts](../app/src/app/api/staff/calls/[id]/route.ts) | 50 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/calls | Runtime source inspection |
| [app/src/app/api/staff/floor/route.ts](../app/src/app/api/staff/floor/route.ts) | 49 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/floor | Runtime source inspection |
| [app/src/app/api/staff/items/[id]/route.ts](../app/src/app/api/staff/items/[id]/route.ts) | 50 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/items | Runtime source inspection |
| [app/src/app/api/staff/kitchen/route.ts](../app/src/app/api/staff/kitchen/route.ts) | 51 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/kitchen | Runtime source inspection |
| [app/src/app/api/staff/login/route.ts](../app/src/app/api/staff/login/route.ts) | 50 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/login | Runtime source inspection |
| [app/src/app/api/staff/me/route.ts](../app/src/app/api/staff/me/route.ts) | 46 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/me | Runtime source inspection |
| [app/src/app/api/staff/orders/[id]/route.ts](../app/src/app/api/staff/orders/[id]/route.ts) | 51 B | 1 | Next.js HTTP wrapper → @/modules/staff/api/orders | Runtime source inspection |
| [app/src/app/api/uploads/[name]/route.ts](../app/src/app/api/uploads/[name]/route.ts) | 59 B | 1 | Next.js HTTP wrapper → @/modules/platform/api/uploadsServe | Runtime source inspection |
| [app/src/app/globals.css](../app/src/app/globals.css) | 62,161 B | 735 | Global design tokens, responsive layouts, components and motion | Runtime source inspection |
| [app/src/app/layout.tsx](../app/src/app/layout.tsx) | 798 B | 16 | Next.js layout/template for app/src/app | Runtime source inspection |
| [app/src/app/login/page.tsx](../app/src/app/login/page.tsx) | 121 B | 1 | Next.js page route for login | Runtime source inspection |
| [app/src/app/owner/ai/page.tsx](../app/src/app/owner/ai/page.tsx) | 50 B | 1 | Next.js page route for owner/ai | Runtime source inspection |
| [app/src/app/owner/faq/page.tsx](../app/src/app/owner/faq/page.tsx) | 51 B | 1 | Next.js page route for owner/faq | Runtime source inspection |
| [app/src/app/owner/hours/page.tsx](../app/src/app/owner/hours/page.tsx) | 53 B | 1 | Next.js page route for owner/hours | Runtime source inspection |
| [app/src/app/owner/import/page.tsx](../app/src/app/owner/import/page.tsx) | 57 B | 1 | Next.js page route for owner/import | Runtime source inspection |
| [app/src/app/owner/insights/page.tsx](../app/src/app/owner/insights/page.tsx) | 59 B | 1 | Next.js page route for owner/insights | Runtime source inspection |
| [app/src/app/owner/layout.tsx](../app/src/app/owner/layout.tsx) | 177 B | 1 | Next.js layout/template for owner | Runtime source inspection |
| [app/src/app/owner/menu/page.tsx](../app/src/app/owner/menu/page.tsx) | 52 B | 1 | Next.js page route for owner/menu | Runtime source inspection |
| [app/src/app/owner/page.tsx](../app/src/app/owner/page.tsx) | 104 B | 2 | Next.js page route for owner | Runtime source inspection |
| [app/src/app/owner/qr/page.tsx](../app/src/app/owner/qr/page.tsx) | 53 B | 1 | Next.js page route for owner/qr | Runtime source inspection |
| [app/src/app/owner/staff/page.tsx](../app/src/app/owner/staff/page.tsx) | 59 B | 1 | Next.js page route for owner/staff | Runtime source inspection |
| [app/src/app/owner/template.tsx](../app/src/app/owner/template.tsx) | 263 B | 4 | Next.js layout/template for owner | Runtime source inspection |
| [app/src/app/page.tsx](../app/src/app/page.tsx) | 4,010 B | 69 | Next.js page route for app/src/app | Runtime source inspection |
| [app/src/app/prototypes/dish-card/Harness.tsx](../app/src/app/prototypes/dish-card/Harness.tsx) | 5,545 B | 112 | In-app dish-card design experiment: Harness | Experiment structure |
| [app/src/app/prototypes/dish-card/VariantAllergyFirst.tsx](../app/src/app/prototypes/dish-card/VariantAllergyFirst.tsx) | 3,217 B | 51 | In-app dish-card design experiment: VariantAllergyFirst | Experiment structure |
| [app/src/app/prototypes/dish-card/VariantMenuBoard.tsx](../app/src/app/prototypes/dish-card/VariantMenuBoard.tsx) | 2,946 B | 51 | In-app dish-card design experiment: VariantMenuBoard | Experiment structure |
| [app/src/app/prototypes/dish-card/VariantShowcase.tsx](../app/src/app/prototypes/dish-card/VariantShowcase.tsx) | 2,719 B | 45 | In-app dish-card design experiment: VariantShowcase | Experiment structure |
| [app/src/app/prototypes/dish-card/data.ts](../app/src/app/prototypes/dish-card/data.ts) | 8,401 B | 326 | In-app dish-card design experiment: data | Experiment structure |
| [app/src/app/prototypes/dish-card/page.tsx](../app/src/app/prototypes/dish-card/page.tsx) | 153 B | 7 | In-app dish-card design experiment: page | Experiment structure |
| [app/src/app/prototypes/dish-card/proto.css](../app/src/app/prototypes/dish-card/proto.css) | 11,394 B | 117 | In-app dish-card design experiment: proto | Experiment structure |
| [app/src/app/prototypes/dish-card/shared.tsx](../app/src/app/prototypes/dish-card/shared.tsx) | 2,908 B | 57 | In-app dish-card design experiment: shared | Experiment structure |
| [app/src/app/r/[slug]/page.tsx](../app/src/app/r/[slug]/page.tsx) | 181 B | 5 | Next.js page route for r/[slug] | Runtime source inspection |
| [app/src/app/register/page.tsx](../app/src/app/register/page.tsx) | 124 B | 1 | Next.js page route for register | Runtime source inspection |
| [app/src/app/staff/chef/page.tsx](../app/src/app/staff/chef/page.tsx) | 52 B | 1 | Next.js page route for staff/chef | Runtime source inspection |
| [app/src/app/staff/page.tsx](../app/src/app/staff/page.tsx) | 54 B | 1 | Next.js page route for staff | Runtime source inspection |
| [app/src/app/staff/template.tsx](../app/src/app/staff/template.tsx) | 263 B | 4 | Next.js layout/template for staff | Runtime source inspection |
| [app/src/app/staff/waiter/page.tsx](../app/src/app/staff/waiter/page.tsx) | 54 B | 1 | Next.js page route for staff/waiter | Runtime source inspection |

## app/src/modules/ai

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/src/modules/ai/README.md](../app/src/modules/ai/README.md) | 4,537 B | 37 | Documentation: Module 2: AI waiter | Runtime source inspection |
| [app/src/modules/ai/ai.ts](../app/src/modules/ai/ai.ts) | 129,870 B | 1213 | Multilingual rules, dish matching, prompt and model-output checks | Runtime source inspection |
| [app/src/modules/ai/api/chat.ts](../app/src/modules/ai/api/chat.ts) | 5,374 B | 69 | API implementation | Runtime source inspection |
| [app/src/modules/ai/provider.ts](../app/src/modules/ai/provider.ts) | 6,791 B | 98 | Ollama request queue, deadlines, token budget and JSON requests | Runtime source inspection |
| [app/src/modules/ai/warmup.ts](../app/src/modules/ai/warmup.ts) | 1,489 B | 20 | Warm restaurant prompts in the background | Runtime source inspection |

## app/src/modules/diner

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/src/modules/diner/Diner.tsx](../app/src/modules/diner/Diner.tsx) | 59,700 B | 838 | Diner menu, storage, filters, picks, chat, sheets and billing | Runtime source inspection |
| [app/src/modules/diner/README.md](../app/src/modules/diner/README.md) | 2,278 B | 23 | Documentation: Module 1: Diner web app | Runtime source inspection |
| [app/src/modules/diner/api/bill.ts](../app/src/modules/diner/api/bill.ts) | 1,625 B | 24 | Receipt-gated running table bill | Runtime source inspection |
| [app/src/modules/diner/api/calls.ts](../app/src/modules/diner/api/calls.ts) | 893 B | 16 | Create or resolve staff calls | Runtime source inspection |
| [app/src/modules/diner/api/feedback.ts](../app/src/modules/diner/api/feedback.ts) | 1,044 B | 19 | Diner rating and reason persistence | Runtime source inspection |
| [app/src/modules/diner/api/menu.ts](../app/src/modules/diner/api/menu.ts) | 901 B | 16 | Public restaurant menu and menu-open event | Runtime source inspection |
| [app/src/modules/diner/api/orders.ts](../app/src/modules/diner/api/orders.ts) | 2,808 B | 41 | Create picks or advance staff order status | Runtime source inspection |
| [app/src/modules/diner/filters.ts](../app/src/modules/diner/filters.ts) | 1,614 B | 21 | Diner category/search/diet/allergen filter logic | Runtime source inspection |
| [app/src/modules/diner/i18n.ts](../app/src/modules/diner/i18n.ts) | 16,247 B | 74 | Diner or owner multilingual interface dictionary | Runtime source inspection |

## app/src/modules/owner

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/src/modules/owner/AiPage.tsx](../app/src/modules/owner/AiPage.tsx) | 3,252 B | 40 | Restaurant and assistant persona settings | Runtime source inspection |
| [app/src/modules/owner/FaqPage.tsx](../app/src/modules/owner/FaqPage.tsx) | 3,939 B | 54 | FAQ creation/deletion and assistant shop rules | Runtime source inspection |
| [app/src/modules/owner/HoursPage.tsx](../app/src/modules/owner/HoursPage.tsx) | 5,646 B | 62 | Opening hours, closed days and specials management | Runtime source inspection |
| [app/src/modules/owner/MenuPage.tsx](../app/src/modules/owner/MenuPage.tsx) | 24,060 B | 304 | Dish list, category controls, editor and duplication | Runtime source inspection |
| [app/src/modules/owner/OwnerShell.tsx](../app/src/modules/owner/OwnerShell.tsx) | 5,527 B | 74 | Owner context, auth loading, sidebar, quota and test chat | Runtime source inspection |
| [app/src/modules/owner/README.md](../app/src/modules/owner/README.md) | 1,268 B | 23 | Documentation: Module 3: Owner back office | Runtime source inspection |
| [app/src/modules/owner/TestChat.tsx](../app/src/modules/owner/TestChat.tsx) | 3,204 B | 45 | Non-persistent owner assistant preview | Runtime source inspection |
| [app/src/modules/owner/api/items.ts](../app/src/modules/owner/api/items.ts) | 2,869 B | 40 | Menu item CRUD or availability | Runtime source inspection |
| [app/src/modules/owner/api/itemsBulk.ts](../app/src/modules/owner/api/itemsBulk.ts) | 925 B | 17 | Bulk category availability | Runtime source inspection |
| [app/src/modules/owner/api/itemsById.ts](../app/src/modules/owner/api/itemsById.ts) | 1,240 B | 21 | Update/delete one menu item | Runtime source inspection |
| [app/src/modules/owner/api/resource.ts](../app/src/modules/owner/api/resource.ts) | 899 B | 15 | Generic owner-resource list/create | Runtime source inspection |
| [app/src/modules/owner/api/resourceItem.ts](../app/src/modules/owner/api/resourceItem.ts) | 1,014 B | 18 | Generic owner-resource update/delete | Runtime source inspection |
| [app/src/modules/owner/api/settings.ts](../app/src/modules/owner/api/settings.ts) | 1,690 B | 30 | Restaurant, hours and assistant settings | Runtime source inspection |
| [app/src/modules/owner/crud.ts](../app/src/modules/owner/crud.ts) | 4,119 B | 55 | Allowlisted owner resource persistence and staff PIN uniqueness | Runtime source inspection |
| [app/src/modules/owner/i18n.ts](../app/src/modules/owner/i18n.ts) | 1,723 B | 25 | Diner or owner multilingual interface dictionary | Runtime source inspection |

## app/src/modules/platform

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/src/modules/platform/AuthCard.tsx](../app/src/modules/platform/AuthCard.tsx) | 2,586 B | 33 | Owner sign-in and registration forms | Runtime source inspection |
| [app/src/modules/platform/DishPhoto.tsx](../app/src/modules/platform/DishPhoto.tsx) | 1,475 B | 29 | Dish photo rendering with failed-image fallback | Runtime source inspection |
| [app/src/modules/platform/Icon.tsx](../app/src/modules/platform/Icon.tsx) | 4,518 B | 44 | Shared SVG icon catalog | Runtime source inspection |
| [app/src/modules/platform/ImportPage.tsx](../app/src/modules/platform/ImportPage.tsx) | 10,059 B | 114 | Photo extraction/review/translation/publish workflow | Runtime source inspection |
| [app/src/modules/platform/InsightsPage.tsx](../app/src/modules/platform/InsightsPage.tsx) | 8,757 B | 90 | Owner question, language, allergy and dish-demand dashboard | Runtime source inspection |
| [app/src/modules/platform/Presence.tsx](../app/src/modules/platform/Presence.tsx) | 2,169 B | 42 | Exit retention and newly arrived item animation state | Runtime source inspection |
| [app/src/modules/platform/QrPage.tsx](../app/src/modules/platform/QrPage.tsx) | 3,298 B | 39 | Table count, LAN base address and printable QR cards | Runtime source inspection |
| [app/src/modules/platform/README.md](../app/src/modules/platform/README.md) | 2,293 B | 25 | Documentation: Module 5: Data, import, QR, insights, tests and docs | Runtime source inspection |
| [app/src/modules/platform/api/import.ts](../app/src/modules/platform/api/import.ts) | 2,648 B | 43 | Upload photo and request model extraction | Runtime source inspection |
| [app/src/modules/platform/api/importConfirm.ts](../app/src/modules/platform/api/importConfirm.ts) | 1,839 B | 29 | Publish reviewed imported dishes | Runtime source inspection |
| [app/src/modules/platform/api/importTranslate.ts](../app/src/modules/platform/api/importTranslate.ts) | 1,011 B | 14 | Request multilingual dish-name suggestions | Runtime source inspection |
| [app/src/modules/platform/api/insights.ts](../app/src/modules/platform/api/insights.ts) | 5,198 B | 50 | Aggregate chats, profiles and demand | Runtime source inspection |
| [app/src/modules/platform/api/lan.ts](../app/src/modules/platform/api/lan.ts) | 559 B | 11 | Discover host LAN addresses | Runtime source inspection |
| [app/src/modules/platform/api/login.ts](../app/src/modules/platform/api/login.ts) | 1,203 B | 20 | Password or PIN authentication | Runtime source inspection |
| [app/src/modules/platform/api/logout.ts](../app/src/modules/platform/api/logout.ts) | 186 B | 3 | Clear owner and staff cookies | Runtime source inspection |
| [app/src/modules/platform/api/ownerMe.ts](../app/src/modules/platform/api/ownerMe.ts) | 578 B | 12 | Current owner restaurant and quota use | Runtime source inspection |
| [app/src/modules/platform/api/qr.ts](../app/src/modules/platform/api/qr.ts) | 1,250 B | 23 | Generate table/restaurant QR SVG | Runtime source inspection |
| [app/src/modules/platform/api/register.ts](../app/src/modules/platform/api/register.ts) | 2,182 B | 33 | Create owner, restaurant and starter categories | Runtime source inspection |
| [app/src/modules/platform/api/upload.ts](../app/src/modules/platform/api/upload.ts) | 1,274 B | 25 | Validate and store dish image | Runtime source inspection |
| [app/src/modules/platform/api/uploadsServe.ts](../app/src/modules/platform/api/uploadsServe.ts) | 719 B | 13 | Serve validated uploaded-image filenames | Runtime source inspection |
| [app/src/modules/platform/auth.ts](../app/src/modules/platform/auth.ts) | 7,604 B | 127 | Password hashing, signed cookies, session validation and PIN locks | Runtime source inspection |
| [app/src/modules/platform/client.ts](../app/src/modules/platform/client.ts) | 1,646 B | 46 | Fetch wrapper, polling, Escape and relative time helpers | Runtime source inspection |
| [app/src/modules/platform/constants.ts](../app/src/modules/platform/constants.ts) | 1,862 B | 10 | Fourteen allergen keys, tag keys and localized labels | Runtime source inspection |
| [app/src/modules/platform/db.ts](../app/src/modules/platform/db.ts) | 18,604 B | 261 | SQLite schema, migrations, helpers and development seed | Runtime source inspection |
| [app/src/modules/platform/http.ts](../app/src/modules/platform/http.ts) | 715 B | 9 | JSON responses, errors and permissive body parsing | Runtime source inspection |
| [app/src/modules/platform/images.ts](../app/src/modules/platform/images.ts) | 695 B | 11 | Upload byte limit and image signature checks | Runtime source inspection |
| [app/src/modules/platform/ingredients.ts](../app/src/modules/platform/ingredients.ts) | 4,819 B | 79 | Ingredient splitting, translation alignment and allergen-word mapping | Runtime source inspection |
| [app/src/modules/platform/menu.ts](../app/src/modules/platform/menu.ts) | 3,939 B | 73 | Shared entity types, normalization and database selectors | Runtime source inspection |
| [app/src/modules/platform/paths.ts](../app/src/modules/platform/paths.ts) | 348 B | 6 | Runtime database and upload paths | Runtime source inspection |
| [app/src/modules/platform/rateLimit.ts](../app/src/modules/platform/rateLimit.ts) | 4,415 B | 79 | Process-local sliding-window counters and client IP policy | Runtime source inspection |
| [app/src/modules/platform/showcase.ts](../app/src/modules/platform/showcase.ts) | 1,526 B | 25 | Category-diverse home-page dish selection | Runtime source inspection |

## app/src/modules/staff

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/src/modules/staff/ChefPage.tsx](../app/src/modules/staff/ChefPage.tsx) | 6,624 B | 92 | Kitchen columns, recall and sold-out controls | Runtime source inspection |
| [app/src/modules/staff/ManageStaffPage.tsx](../app/src/modules/staff/ManageStaffPage.tsx) | 3,512 B | 50 | Owner staff creation, PIN changes and removal | Runtime source inspection |
| [app/src/modules/staff/README.md](../app/src/modules/staff/README.md) | 2,452 B | 29 | Documentation: Module 4: Staff and orders | Runtime source inspection |
| [app/src/modules/staff/StaffLogin.tsx](../app/src/modules/staff/StaffLogin.tsx) | 2,050 B | 33 | PIN keypad and role-specific navigation | Runtime source inspection |
| [app/src/modules/staff/SwipeCard.tsx](../app/src/modules/staff/SwipeCard.tsx) | 3,600 B | 88 | Pointer-driven staff action shortcut and click fallback | Runtime source inspection |
| [app/src/modules/staff/WaiterPage.tsx](../app/src/modules/staff/WaiterPage.tsx) | 15,931 B | 204 | Floor feed, picks, ready orders, bills and sold-out controls | Runtime source inspection |
| [app/src/modules/staff/api/bills.ts](../app/src/modules/staff/api/bills.ts) | 1,179 B | 18 | Waiter bill settlement | Runtime source inspection |
| [app/src/modules/staff/api/calls.ts](../app/src/modules/staff/api/calls.ts) | 498 B | 9 | Create or resolve staff calls | Runtime source inspection |
| [app/src/modules/staff/api/floor.ts](../app/src/modules/staff/api/floor.ts) | 919 B | 18 | Waiter feed, bills, dishes and calls | Runtime source inspection |
| [app/src/modules/staff/api/items.ts](../app/src/modules/staff/api/items.ts) | 542 B | 10 | Menu item CRUD or availability | Runtime source inspection |
| [app/src/modules/staff/api/kitchen.ts](../app/src/modules/staff/api/kitchen.ts) | 723 B | 14 | Kitchen columns and dish availability | Runtime source inspection |
| [app/src/modules/staff/api/login.ts](../app/src/modules/staff/api/login.ts) | 1,180 B | 20 | Password or PIN authentication | Runtime source inspection |
| [app/src/modules/staff/api/me.ts](../app/src/modules/staff/api/me.ts) | 223 B | 6 | Read current staff session | Runtime source inspection |
| [app/src/modules/staff/api/orders.ts](../app/src/modules/staff/api/orders.ts) | 1,452 B | 25 | Create picks or advance staff order status | Runtime source inspection |
| [app/src/modules/staff/beep.ts](../app/src/modules/staff/beep.ts) | 394 B | 15 | Short Web Audio staff notification | Runtime source inspection |
| [app/src/modules/staff/orders.ts](../app/src/modules/staff/orders.ts) | 2,869 B | 40 | Staff order hydration, open calls and aggregate table bills | Runtime source inspection |

## app/tests

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/tests/adversarial.test.ts](../app/tests/adversarial.test.ts) | 5,355 B | 94 | Automated unit/integration checks for adversarial | Executed or supporting harness |
| [app/tests/ai-guard.test.ts](../app/tests/ai-guard.test.ts) | 22,401 B | 339 | Automated unit/integration checks for ai-guard | Executed or supporting harness |
| [app/tests/ai-natural.test.ts](../app/tests/ai-natural.test.ts) | 15,679 B | 243 | Automated unit/integration checks for ai-natural | Executed or supporting harness |
| [app/tests/ai-open.test.ts](../app/tests/ai-open.test.ts) | 15,082 B | 203 | Automated unit/integration checks for ai-open | Executed or supporting harness |
| [app/tests/ai-prompt.test.ts](../app/tests/ai-prompt.test.ts) | 5,652 B | 83 | Automated unit/integration checks for ai-prompt | Executed or supporting harness |
| [app/tests/ai-rules.test.ts](../app/tests/ai-rules.test.ts) | 42,131 B | 606 | Automated unit/integration checks for ai-rules | Executed or supporting harness |
| [app/tests/allergen-oracle.test.ts](../app/tests/allergen-oracle.test.ts) | 6,528 B | 94 | Automated unit/integration checks for allergen-oracle | Executed or supporting harness |
| [app/tests/allergy-profile.test.ts](../app/tests/allergy-profile.test.ts) | 15,869 B | 236 | Automated unit/integration checks for allergy-profile | Executed or supporting harness |
| [app/tests/auth.test.ts](../app/tests/auth.test.ts) | 16,111 B | 269 | Automated unit/integration checks for auth | Executed or supporting harness |
| [app/tests/chat-api.test.ts](../app/tests/chat-api.test.ts) | 13,878 B | 233 | Automated unit/integration checks for chat-api | Executed or supporting harness |
| [app/tests/db-concurrency.test.ts](../app/tests/db-concurrency.test.ts) | 3,656 B | 69 | Automated unit/integration checks for db-concurrency | Executed or supporting harness |
| [app/tests/diner-filters.test.ts](../app/tests/diner-filters.test.ts) | 5,063 B | 83 | Automated unit/integration checks for diner-filters | Executed or supporting harness |
| [app/tests/diner-flow.test.ts](../app/tests/diner-flow.test.ts) | 3,637 B | 63 | Automated unit/integration checks for diner-flow | Executed or supporting harness |
| [app/tests/e2e/diner-flow.e2e.test.ts](../app/tests/e2e/diner-flow.e2e.test.ts) | 9,363 B | 151 | Automated real-server HTTP checks for diner-flow | Executed or supporting harness |
| [app/tests/e2e/globalSetup.ts](../app/tests/e2e/globalSetup.ts) | 4,107 B | 60 | Real-server E2E setup with temporary production seeds and cleanup | Executed or supporting harness |
| [app/tests/e2e/hachi-kyu.e2e.test.ts](../app/tests/e2e/hachi-kyu.e2e.test.ts) | 6,564 B | 98 | Automated real-server HTTP checks for hachi-kyu | Executed or supporting harness |
| [app/tests/eval-latency.test.ts](../app/tests/eval-latency.test.ts) | 1,561 B | 35 | Automated unit/integration checks for eval-latency | Executed or supporting harness |
| [app/tests/eval-natural.test.ts](../app/tests/eval-natural.test.ts) | 2,005 B | 33 | Automated unit/integration checks for eval-natural | Executed or supporting harness |
| [app/tests/eval-open.test.ts](../app/tests/eval-open.test.ts) | 2,254 B | 39 | Automated unit/integration checks for eval-open | Executed or supporting harness |
| [app/tests/eval-sushi.test.ts](../app/tests/eval-sushi.test.ts) | 2,945 B | 49 | Automated unit/integration checks for eval-sushi | Executed or supporting harness |
| [app/tests/eval.test.ts](../app/tests/eval.test.ts) | 4,285 B | 80 | Automated unit/integration checks for eval | Executed or supporting harness |
| [app/tests/evalScore.ts](../app/tests/evalScore.ts) | 2,938 B | 39 | Shared test harness, fixtures or evaluation scoring helpers | Executed or supporting harness |
| [app/tests/facts-oracle.test.ts](../app/tests/facts-oracle.test.ts) | 5,375 B | 75 | Automated unit/integration checks for facts-oracle | Executed or supporting harness |
| [app/tests/hachi-kyu.test.ts](../app/tests/hachi-kyu.test.ts) | 41,043 B | 539 | Automated unit/integration checks for hachi-kyu | Executed or supporting harness |
| [app/tests/helpers.ts](../app/tests/helpers.ts) | 3,700 B | 64 | Shared test harness, fixtures or evaluation scoring helpers | Executed or supporting harness |
| [app/tests/i18n.test.ts](../app/tests/i18n.test.ts) | 4,663 B | 70 | Automated unit/integration checks for i18n | Executed or supporting harness |
| [app/tests/import.test.ts](../app/tests/import.test.ts) | 6,858 B | 105 | Automated unit/integration checks for import | Executed or supporting harness |
| [app/tests/ingredients-i18n.test.ts](../app/tests/ingredients-i18n.test.ts) | 10,945 B | 137 | Automated unit/integration checks for ingredients-i18n | Executed or supporting harness |
| [app/tests/ingredients.test.ts](../app/tests/ingredients.test.ts) | 7,323 B | 108 | Automated unit/integration checks for ingredients | Executed or supporting harness |
| [app/tests/lan.test.ts](../app/tests/lan.test.ts) | 1,283 B | 27 | Automated unit/integration checks for lan | Executed or supporting harness |
| [app/tests/menu.test.ts](../app/tests/menu.test.ts) | 15,110 B | 226 | Automated unit/integration checks for menu | Executed or supporting harness |
| [app/tests/no-glyph-icons.test.ts](../app/tests/no-glyph-icons.test.ts) | 1,750 B | 24 | Automated unit/integration checks for no-glyph-icons | Executed or supporting harness |
| [app/tests/orders.test.ts](../app/tests/orders.test.ts) | 14,812 B | 235 | Automated unit/integration checks for orders | Executed or supporting harness |
| [app/tests/owner-bulk.test.ts](../app/tests/owner-bulk.test.ts) | 4,572 B | 74 | Automated unit/integration checks for owner-bulk | Executed or supporting harness |
| [app/tests/owner-insights.test.ts](../app/tests/owner-insights.test.ts) | 5,831 B | 95 | Automated unit/integration checks for owner-insights | Executed or supporting harness |
| [app/tests/platform.test.ts](../app/tests/platform.test.ts) | 1,603 B | 24 | Automated unit/integration checks for platform | Executed or supporting harness |
| [app/tests/prototype.test.ts](../app/tests/prototype.test.ts) | 5,638 B | 81 | Automated unit/integration checks for prototype | Executed or supporting harness |
| [app/tests/provider.test.ts](../app/tests/provider.test.ts) | 13,890 B | 206 | Automated unit/integration checks for provider | Executed or supporting harness |
| [app/tests/ratelimit.test.ts](../app/tests/ratelimit.test.ts) | 13,982 B | 214 | Automated unit/integration checks for ratelimit | Executed or supporting harness |
| [app/tests/recommendations.test.ts](../app/tests/recommendations.test.ts) | 12,066 B | 193 | Automated unit/integration checks for recommendations | Executed or supporting harness |
| [app/tests/security-round2.test.ts](../app/tests/security-round2.test.ts) | 15,609 B | 223 | Automated unit/integration checks for security-round2 | Executed or supporting harness |
| [app/tests/seed.test.ts](../app/tests/seed.test.ts) | 6,863 B | 113 | Automated unit/integration checks for seed | Executed or supporting harness |
| [app/tests/setup.ts](../app/tests/setup.ts) | 2,496 B | 45 | Per-file isolated database, fake cookies/router and model isolation | Executed or supporting harness |
| [app/tests/showcase.test.ts](../app/tests/showcase.test.ts) | 2,303 B | 36 | Automated unit/integration checks for showcase | Executed or supporting harness |
| [app/tests/smoke.test.ts](../app/tests/smoke.test.ts) | 471 B | 12 | Automated unit/integration checks for smoke | Executed or supporting harness |
| [app/tests/srs-gaps.test.ts](../app/tests/srs-gaps.test.ts) | 13,215 B | 182 | Automated unit/integration checks for srs-gaps | Executed or supporting harness |
| [app/tests/staff-calls.test.ts](../app/tests/staff-calls.test.ts) | 2,677 B | 51 | Automated unit/integration checks for staff-calls | Executed or supporting harness |
| [app/tests/sushi-menu-ai.test.ts](../app/tests/sushi-menu-ai.test.ts) | 16,813 B | 264 | Automated unit/integration checks for sushi-menu-ai | Executed or supporting harness |
| [app/tests/sushiMenu.ts](../app/tests/sushiMenu.ts) | 757 B | 12 | Shared test harness, fixtures or evaluation scoring helpers | Executed or supporting harness |
| [app/tests/thai-keywords.test.ts](../app/tests/thai-keywords.test.ts) | 2,875 B | 44 | Automated unit/integration checks for thai-keywords | Executed or supporting harness |
| [app/tests/traceability.test.ts](../app/tests/traceability.test.ts) | 3,816 B | 67 | Automated unit/integration checks for traceability | Executed or supporting harness |
| [app/tests/warmup-big-menu.test.ts](../app/tests/warmup-big-menu.test.ts) | 1,525 B | 25 | Automated unit/integration checks for warmup-big-menu | Executed or supporting harness |
| [app/tests/warmup.test.ts](../app/tests/warmup.test.ts) | 3,605 B | 62 | Automated unit/integration checks for warmup | Executed or supporting harness |

## app/tests/ui

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [app/tests/ui/client.test.tsx](../app/tests/ui/client.test.tsx) | 4,521 B | 98 | Automated component checks for client | Executed or supporting harness |
| [app/tests/ui/diner-chat.test.tsx](../app/tests/ui/diner-chat.test.tsx) | 13,223 B | 233 | Automated component checks for diner-chat | Executed or supporting harness |
| [app/tests/ui/diner-nav.test.tsx](../app/tests/ui/diner-nav.test.tsx) | 30,102 B | 483 | Automated component checks for diner-nav | Executed or supporting harness |
| [app/tests/ui/diner.test.tsx](../app/tests/ui/diner.test.tsx) | 27,290 B | 446 | Automated component checks for diner | Executed or supporting harness |
| [app/tests/ui/error-paths.test.tsx](../app/tests/ui/error-paths.test.tsx) | 10,356 B | 178 | Automated component checks for error-paths | Executed or supporting harness |
| [app/tests/ui/harness.tsx](../app/tests/ui/harness.tsx) | 7,813 B | 137 | Shared test harness, fixtures or evaluation scoring helpers | Executed or supporting harness |
| [app/tests/ui/import-errors.test.tsx](../app/tests/ui/import-errors.test.tsx) | 5,130 B | 82 | Automated component checks for import-errors | Executed or supporting harness |
| [app/tests/ui/import.test.tsx](../app/tests/ui/import.test.tsx) | 8,356 B | 135 | Automated component checks for import | Executed or supporting harness |
| [app/tests/ui/motion.test.tsx](../app/tests/ui/motion.test.tsx) | 7,941 B | 137 | Automated component checks for motion | Executed or supporting harness |
| [app/tests/ui/owner-menu-form.test.tsx](../app/tests/ui/owner-menu-form.test.tsx) | 10,939 B | 182 | Automated component checks for owner-menu-form | Executed or supporting harness |
| [app/tests/ui/owner-menu.test.tsx](../app/tests/ui/owner-menu.test.tsx) | 13,824 B | 236 | Automated component checks for owner-menu | Executed or supporting harness |
| [app/tests/ui/owner-pages.test.tsx](../app/tests/ui/owner-pages.test.tsx) | 14,895 B | 240 | Automated component checks for owner-pages | Executed or supporting harness |
| [app/tests/ui/owner-shell.test.tsx](../app/tests/ui/owner-shell.test.tsx) | 6,988 B | 122 | Automated component checks for owner-shell | Executed or supporting harness |
| [app/tests/ui/pages.test.tsx](../app/tests/ui/pages.test.tsx) | 8,331 B | 145 | Automated component checks for pages | Executed or supporting harness |
| [app/tests/ui/staff.test.tsx](../app/tests/ui/staff.test.tsx) | 22,606 B | 405 | Automated component checks for staff | Executed or supporting harness |
| [app/tests/ui/theme.test.tsx](../app/tests/ui/theme.test.tsx) | 9,140 B | 148 | Automated component checks for theme | Executed or supporting harness |
| [app/tests/ui/toast-timer.test.tsx](../app/tests/ui/toast-timer.test.tsx) | 5,016 B | 99 | Automated component checks for toast-timer | Executed or supporting harness |

## design

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [design/build.py](../design/build.py) | 35,086 B | 421 | Generate Art Deco canvas HTML reference screens | Supporting material |
| [design/build_glass.py](../design/build_glass.py) | 34,064 B | 372 | Generate Glass canvas HTML reference screens | Supporting material |
| [design/build_staff.py](../design/build_staff.py) | 19,670 B | 186 | Generate staff canvas HTML reference screens | Supporting material |
| [design/canvas.server.json](../design/canvas.server.json) | 1,989 B | 1 | Generate Art Deco canvas HTML reference screens | Structure/consistency |
| [design/canvas/project/Chef-Kitchen.dc.html](../design/canvas/project/Chef-Kitchen.dc.html) | 15,601 B | 57 | Generated Chef Kitchen design reference; structural review | Supporting material |
| [design/canvas/project/Diner-Chat.dc.html](../design/canvas/project/Diner-Chat.dc.html) | 12,100 B | 59 | Generated Diner Chat design reference; structural review | Supporting material |
| [design/canvas/project/Diner-Menu.dc.html](../design/canvas/project/Diner-Menu.dc.html) | 15,779 B | 72 | Generated Diner Menu design reference; structural review | Supporting material |
| [design/canvas/project/Glass-Chef-Kitchen.dc.html](../design/canvas/project/Glass-Chef-Kitchen.dc.html) | 15,437 B | 57 | Generated Glass Chef Kitchen design reference; structural review | Supporting material |
| [design/canvas/project/Glass-Diner-Chat.dc.html](../design/canvas/project/Glass-Diner-Chat.dc.html) | 11,742 B | 52 | Generated Glass Diner Chat design reference; structural review | Supporting material |
| [design/canvas/project/Glass-Diner-Menu.dc.html](../design/canvas/project/Glass-Diner-Menu.dc.html) | 16,765 B | 64 | Generated Glass Diner Menu design reference; structural review | Supporting material |
| [design/canvas/project/Glass-Owner-Import.dc.html](../design/canvas/project/Glass-Owner-Import.dc.html) | 26,996 B | 69 | Generated Glass Owner Import design reference; structural review | Supporting material |
| [design/canvas/project/Glass-Owner-Insights.dc.html](../design/canvas/project/Glass-Owner-Insights.dc.html) | 18,728 B | 56 | Generated Glass Owner Insights design reference; structural review | Supporting material |
| [design/canvas/project/Glass-Owner-Menu.dc.html](../design/canvas/project/Glass-Owner-Menu.dc.html) | 32,017 B | 93 | Generated Glass Owner Menu design reference; structural review | Supporting material |
| [design/canvas/project/Glass-Waiter-Floor.dc.html](../design/canvas/project/Glass-Waiter-Floor.dc.html) | 10,647 B | 49 | Generated Glass Waiter Floor design reference; structural review | Supporting material |
| [design/canvas/project/Owner-Import.dc.html](../design/canvas/project/Owner-Import.dc.html) | 25,629 B | 88 | Generated Owner Import design reference; structural review | Supporting material |
| [design/canvas/project/Owner-Insights.dc.html](../design/canvas/project/Owner-Insights.dc.html) | 23,455 B | 63 | Generated Owner Insights design reference; structural review | Supporting material |
| [design/canvas/project/Owner-Menu.dc.html](../design/canvas/project/Owner-Menu.dc.html) | 32,562 B | 108 | Generated Owner Menu design reference; structural review | Supporting material |
| [design/canvas/project/Waiter-Floor.dc.html](../design/canvas/project/Waiter-Floor.dc.html) | 10,061 B | 49 | Generated Waiter Floor design reference; structural review | Supporting material |
| [design/canvas/project/canvas.json](../design/canvas/project/canvas.json) | 3,349 B | 191 | Canvas document manifest | Structure/consistency |

## docs

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [docs/AI_SAFETY.md](../docs/AI_SAFETY.md) | 31,983 B | 155 | Documentation: AI safety: the rules, where they are enforced, and the test that checks each one | Source/content review |
| [docs/AI_USAGE_LOG.md](../docs/AI_USAGE_LOG.md) | 22,937 B | 80 | Documentation: AI usage log | Source/content review |
| [docs/AI_USE_STATEMENT.md](../docs/AI_USE_STATEMENT.md) | 4,924 B | 44 | Documentation: AI-use statement (Milestone 4) | Source/content review |
| [docs/DEMO_SLIDES.html](../docs/DEMO_SLIDES.html) | 21,661 B | 212 | Demo slides or native-language evaluation review sheet | Source/content review |
| [docs/FEATURE_PLAN.md](../docs/FEATURE_PLAN.md) | 28,008 B | 370 | Documentation: Shop_Ai: Detailed Feature Plan (Web Version) | Source/content review |
| [docs/FINAL_REPORT.md](../docs/FINAL_REPORT.md) | 10,257 B | 105 | Documentation: Shop AI: The Digital Waiter. Final Project Report (Milestone 4) | Source/content review |
| [docs/FINAL_REPORT.pdf](../docs/FINAL_REPORT.pdf) | 413,459 B | 3 pages | PDF document; 3 pages; content extracted | Text; selected pages rendered |
| [docs/NFR_RESULTS.md](../docs/NFR_RESULTS.md) | 7,144 B | 76 | Documentation: Measured results (5 Oct 2026) | Source/content review |
| [docs/OPEN_PLACEHOLDERS.md](../docs/OPEN_PLACEHOLDERS.md) | 3,630 B | 46 | Documentation: Open placeholders: what the team still has to fill in or confirm | Source/content review |
| [docs/ORAL_EXAM_PREP.md](../docs/ORAL_EXAM_PREP.md) | 34,461 B | 282 | Documentation: Oral exam prep: Shop AI (Member 2: AI waiter + backend core) | Source/content review |
| [docs/PDF_CORRECTIONS.md](../docs/PDF_CORRECTIONS.md) | 8,715 B | 64 | Documentation: Corrections to make in the course PDFs (SRS and charter) | Source/content review |
| [docs/PERFORMANCE.md](../docs/PERFORMANCE.md) | 6,885 B | 76 | Documentation: Performance measurements (SRS NFR-P1, NFR-P3, NFR-P4) | Source/content review |
| [docs/PRODUCT_IDEA_WORKSHEET.md](../docs/PRODUCT_IDEA_WORKSHEET.md) | 5,353 B | 38 | Documentation: Product Idea Worksheet: Shop AI, the digital waiter | Source/content review |
| [docs/PROJECT_EXPLANATION.md](../docs/PROJECT_EXPLANATION.md) | 12,613 B | 125 | Documentation: Shop AI: the digital waiter. Project explanation | Source/content review |
| [docs/SRS_Shop_AI.md](../docs/SRS_Shop_AI.md) | 30,685 B | 350 | Documentation: Software Requirements Specification (SRS) | Source/content review |
| [docs/Shop_AI_Explained.pdf](../docs/Shop_AI_Explained.pdf) | 983,630 B | 20 pages | PDF document; 20 pages; content extracted | Text; selected pages rendered |
| [docs/TEAM_WORK_PLAN.md](../docs/TEAM_WORK_PLAN.md) | 5,524 B | 68 | Documentation: Team work plan: 5 members, 5 parts | Source/content review |
| [docs/TEST_REPORT_2026-10-20.md](../docs/TEST_REPORT_2026-10-20.md) | 6,181 B | 65 | Documentation: Test report, 20 Oct 2026 | Source/content review |
| [docs/TEST_REPORT_2026-10-21.md](../docs/TEST_REPORT_2026-10-21.md) | 8,861 B | 84 | Documentation: Test report, 21 Oct 2026: the AI and the sushi menu | Source/content review |
| [docs/TRACEABILITY.md](../docs/TRACEABILITY.md) | 30,429 B | 201 | Documentation: Traceability: SRS requirement → code → tests | Source/content review |
| [docs/UI_REDESIGN_BRIEF.md](../docs/UI_REDESIGN_BRIEF.md) | 6,121 B | 72 | Documentation: Shop AI: UI redesign brief | Source/content review |
| [docs/WHY_TRUST_THE_AI.md](../docs/WHY_TRUST_THE_AI.md) | 7,504 B | 76 | Documentation: How do we trust the AI, and how do we prove it? | Source/content review |
| [docs/deliverables/M1_Charter_MFU888.pdf](../docs/deliverables/M1_Charter_MFU888.pdf) | 121,703 B | 1 pages | PDF document; 1 pages; content extracted | Text; selected pages rendered |
| [docs/deliverables/M2_SRS_Team18_submitted.pdf](../docs/deliverables/M2_SRS_Team18_submitted.pdf) | 299,316 B | 10 pages | PDF document; 10 pages; content extracted | Text; selected pages rendered |
| [docs/deliverables/M2_SRS_Team18_v1.1.pdf](../docs/deliverables/M2_SRS_Team18_v1.1.pdf) | 1,084,839 B | 12 pages | PDF document; 12 pages; content extracted | Text; selected pages rendered |
| [docs/diagrams/01-architecture.png](../docs/diagrams/01-architecture.png) | 151,218 B | — | Generated diagram or static image asset; metadata only | Asset metadata |
| [docs/diagrams/02-database.png](../docs/diagrams/02-database.png) | 161,830 B | — | Generated diagram or static image asset; metadata only | Asset metadata |
| [docs/diagrams/03-order-flow.png](../docs/diagrams/03-order-flow.png) | 101,997 B | — | Generated diagram or static image asset; metadata only | Asset metadata |
| [docs/diagrams/04-ai-flow.png](../docs/diagrams/04-ai-flow.png) | 287,399 B | — | Generated diagram or static image asset; metadata only | Asset metadata |
| [docs/diagrams/05-use-cases.png](../docs/diagrams/05-use-cases.png) | 242,185 B | — | Generated diagram or static image asset; metadata only | Asset metadata |
| [docs/diagrams/06-use-cases-srs.png](../docs/diagrams/06-use-cases-srs.png) | 209,442 B | — | Generated diagram or static image asset; metadata only | Asset metadata |
| [docs/diagrams/build_pdf.py](../docs/diagrams/build_pdf.py) | 39,588 B | 556 | Documentation PDF/diagram generator | Source/content review |
| [docs/diagrams/gen_diagrams.py](../docs/diagrams/gen_diagrams.py) | 12,571 B | 223 | Documentation PDF/diagram generator | Source/content review |
| [docs/diagrams/gen_use_cases.py](../docs/diagrams/gen_use_cases.py) | 3,569 B | 51 | Documentation PDF/diagram generator | Source/content review |
| [docs/make_report_pdf.py](../docs/make_report_pdf.py) | 2,848 B | 76 | Documentation PDF/diagram generator | Source/content review |

## eval

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [eval/burmese_review.html](../eval/burmese_review.html) | 10,931 B | 67 | Demo slides or native-language evaluation review sheet | Source/content review |
| [eval/burmese_review.md](../eval/burmese_review.md) | 7,301 B | 137 | Documentation: Burmese review sheet (gemma4:12b) | Source/content review |
| [eval/burmese_review_v2.html](../eval/burmese_review_v2.html) | 9,484 B | 16 | Demo slides or native-language evaluation review sheet | Source/content review |
| [eval/burmese_review_v3.html](../eval/burmese_review_v3.html) | 9,719 B | 16 | Demo slides or native-language evaluation review sheet | Source/content review |
| [eval/burmese_review_v4.html](../eval/burmese_review_v4.html) | 9,660 B | 16 | Demo slides or native-language evaluation review sheet | Source/content review |
| [eval/burmese_review_v5.html](../eval/burmese_review_v5.html) | 8,203 B | 5 | Demo slides or native-language evaluation review sheet | Source/content review |
| [eval/hachi_kyu_questions.json](../eval/hachi_kyu_questions.json) | 10,391 B | 592 | Question fixture with 31 entries | Structure/consistency |
| [eval/make_native_review.py](../eval/make_native_review.py) | 7,887 B | 68 | Model evaluation/review utility | Source/content review |
| [eval/menu.json](../eval/menu.json) | 4,588 B | 25 | Demo menu data | Structure/consistency |
| [eval/model_questions.json](../eval/model_questions.json) | 11,010 B | 588 | Question fixture with 30 entries | Structure/consistency |
| [eval/native_review_allergens.html](../eval/native_review_allergens.html) | 20,226 B | 11 | Demo slides or native-language evaluation review sheet | Source/content review |
| [eval/open_questions.json](../eval/open_questions.json) | 39,875 B | 2123 | Question fixture with 126 entries | Structure/consistency |
| [eval/questions.json](../eval/questions.json) | 12,240 B | 633 | Question fixture with 30 entries | Structure/consistency |
| [eval/questions_natural.json](../eval/questions_natural.json) | 8,905 B | 571 | Question fixture with 34 entries | Structure/consistency |
| [eval/rescore.py](../eval/rescore.py) | 1,326 B | 27 | Model evaluation/review utility | Source/content review |
| [eval/run_actions.py](../eval/run_actions.py) | 3,267 B | 67 | Model evaluation/review utility | Source/content review |
| [eval/run_eval.py](../eval/run_eval.py) | 13,597 B | 280 | Model evaluation/review utility | Source/content review |
| [eval/sushi_menu_questions.json](../eval/sushi_menu_questions.json) | 15,306 B | 999 | Question fixture with 58 entries | Structure/consistency |
| [eval/sushi_open_questions.json](../eval/sushi_open_questions.json) | 11,865 B | 529 | Question fixture with 17 entries | Structure/consistency |
| [eval/thresholds.json](../eval/thresholds.json) | 1,151 B | 36 | Offline/live/safety/latency pass thresholds | Structure/consistency |

## eval/results

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [eval/results/20260921-152448.json](../eval/results/20260921-152448.json) | 3,698 B | 116 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-152448.md](../eval/results/20260921-152448.md) | 216 B | 3 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-152810-rescored.json](../eval/results/20260921-152810-rescored.json) | 81,118 B | 2046 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-152810.json](../eval/results/20260921-152810.json) | 82,390 B | 2075 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-152810.md](../eval/results/20260921-152810.md) | 424 B | 6 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-160332.json](../eval/results/20260921-160332.json) | 7,992 B | 185 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-160332.md](../eval/results/20260921-160332.md) | 169 B | 3 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-160547.json](../eval/results/20260921-160547.json) | 8,035 B | 182 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-160547.md](../eval/results/20260921-160547.md) | 168 B | 3 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-161355.json](../eval/results/20260921-161355.json) | 7,870 B | 176 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/20260921-161355.md](../eval/results/20260921-161355.md) | 172 B | 3 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/actions.json](../eval/results/actions.json) | 6,545 B | 188 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/full_run.log](../eval/results/full_run.log) | 8,173 B | 137 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-extended-run1.json](../eval/results/live-extended-run1.json) | 13,583 B | 312 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-extended-run1.md](../eval/results/live-extended-run1.md) | 703 B | 25 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-extended-run2-contended.md](../eval/results/live-extended-run2-contended.md) | 779 B | 25 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-extended-run4-busy.json](../eval/results/live-extended-run4-busy.json) | 12,902 B | 312 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-extended-run4-busy.md](../eval/results/live-extended-run4-busy.md) | 873 B | 26 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-extended.json](../eval/results/live-extended.json) | 12,584 B | 312 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-extended.md](../eval/results/live-extended.md) | 800 B | 26 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-hachi_kyu_questions.json](../eval/results/live-hachi_kyu_questions.json) | 22,479 B | 340 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-hachi_kyu_questions.md](../eval/results/live-hachi_kyu_questions.md) | 855 B | 30 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-latest.json](../eval/results/live-latest.json) | 11,102 B | 322 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-latest.md](../eval/results/live-latest.md) | 776 B | 28 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-open_questions.json](../eval/results/live-open_questions.json) | 43,987 B | 1100 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-open_questions.md](../eval/results/live-open_questions.md) | 823 B | 30 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-questions_natural.json](../eval/results/live-questions_natural.json) | 13,705 B | 374 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-questions_natural.md](../eval/results/live-questions_natural.md) | 847 B | 32 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-sushi_menu_questions.json](../eval/results/live-sushi_menu_questions.json) | 23,317 B | 591 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-sushi_menu_questions.md](../eval/results/live-sushi_menu_questions.md) | 1,098 B | 37 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-sushi_open_questions.json](../eval/results/live-sushi_open_questions.json) | 14,704 B | 173 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/live-sushi_open_questions.md](../eval/results/live-sushi_open_questions.md) | 562 B | 19 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/smooth-latest.json](../eval/results/smooth-latest.json) | 9,468 B | 648 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |
| [eval/results/smooth-latest.md](../eval/results/smooth-latest.md) | 921 B | 17 | Saved historical model/evaluation output; inspected as evidence, not rerun | Historical evidence |

## prototype

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [prototype/README.md](../prototype/README.md) | 3,887 B | 43 | Static prototype documentation | Source/content review |
| [prototype/app.js](../prototype/app.js) | 47,095 B | 406 | Separate static diner/staff rendering, scripted AI and browser session state | Source/content review |
| [prototype/data.js](../prototype/data.js) | 44,300 B | 354 | Legacy traceability fixtures plus persisted prototype store and sushi menu | Source/content review |
| [prototype/i18n.js](../prototype/i18n.js) | 33,280 B | 466 | Generated real-app dictionary plus prototype translation helpers | Source/content review |
| [prototype/icons.js](../prototype/icons.js) | 6,946 B | 72 | Prototype SVG icons and glyph stripping | Source/content review |
| [prototype/index.html](../prototype/index.html) | 1,920 B | 36 | Static entry point choosing diner/staff/owner from query string | Source/content review |
| [prototype/make-i18n.mjs](../prototype/make-i18n.mjs) | 1,184 B | 19 | Regenerate real-app labels inside the prototype | Source/content review |
| [prototype/motion.js](../prototype/motion.js) | 2,909 B | 43 | Prototype redraw-diff entrance and feedback effects | Source/content review |
| [prototype/owner.js](../prototype/owner.js) | 20,572 B | 114 | Separate static owner dashboard and CSV import | Source/content review |
| [prototype/proto.css](../prototype/proto.css) | 41,816 B | 2631 | Static prototype layout, tokens, mobile and animation styles | Source/content review |
| [prototype/switcher.js](../prototype/switcher.js) | 2,980 B | 48 | Diner/staff/owner toolbar and storage reset | Source/content review |

## reports

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [reports/Shop AI UI improvement research.md](../reports/Shop%20AI%20UI%20improvement%20research.md) | 30,927 B | 39 | Historical UX research: Shop AI's UI needs disclosure, not rebuilding | Supporting material |

## research_notes

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [research_notes/Shop AI UI improvement research/chat_ui_best_practices.md](../research_notes/Shop%20AI%20UI%20improvement%20research/chat_ui_best_practices.md) | 32,634 B | 144 | Historical UX research: Chat UI Best Practices for Restaurant/Food-Ordering Assistants | Supporting material |
| [research_notes/Shop AI UI improvement research/design_system_architecture.md](../research_notes/Shop%20AI%20UI%20improvement%20research/design_system_architecture.md) | 36,956 B | 139 | Historical UX research: Frontend Design-System & CSS Architecture Best Practices (for a hand-rolled CSS Next.js/React app) | Supporting material |
| [research_notes/Shop AI UI improvement research/menu_ordering_ux.md](../research_notes/Shop%20AI%20UI%20improvement%20research/menu_ordering_ux.md) | 32,009 B | 141 | Historical UX research: Menu-Browsing & Food-Ordering UI/UX Best Practices for Diner-Facing QR-Menu Apps | Supporting material |
| [research_notes/Shop AI UI improvement research/multilingual_accessibility.md](../research_notes/Shop%20AI%20UI%20improvement%20research/multilingual_accessibility.md) | 31,760 B | 147 | Historical UX research: Multilingual and Accessibility UX Best Practices — English/Thai/Burmese Restaurant Chatbot | Supporting material |
| [research_notes/Shop AI UI improvement research/staff_kitchen_dashboard_ux.md](../research_notes/Shop%20AI%20UI%20improvement%20research/staff_kitchen_dashboard_ux.md) | 36,314 B | 146 | Historical UX research: Restaurant Staff / Kitchen Operations Dashboard UX Best Practices | Supporting material |

## root

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [.dockerignore](../.dockerignore) | 132 B | 13 | Repository/build filtering or line-ending configuration | Source/content review |
| [.env.example](../.env.example) | 2,566 B | 40 | Documented environment-variable example; not live credentials | Source/content review |
| [.gitattributes](../.gitattributes) | 148 B | 4 | Repository/build filtering or line-ending configuration | Source/content review |
| [.gitignore](../.gitignore) | 701 B | 32 | Repository/build filtering or line-ending configuration | Source/content review |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 1,641 B | 27 | Documentation: How we work in Git | Source/content review |
| [Dockerfile](../Dockerfile) | 1,321 B | 24 | Multi-stage production image and first-start seed command | Source/content review |
| [M1-Charter_ MFU888.pdf](../M1-Charter_%20MFU888.pdf) | 121,703 B | 1 pages | PDF document; 1 pages; content extracted | Text; selected pages rendered |
| [ORAL_EXAM_PREP_slides.pdf](../ORAL_EXAM_PREP_slides.pdf) | 15,887,042 B | 26 pages | PDF document; 26 pages; content extracted | Text; selected pages rendered |
| [README.md](../README.md) | 12,116 B | 131 | Documentation: Shop AI – the digital waiter | Source/content review |
| [Team18_M2_SRS.pdf.pdf](../Team18_M2_SRS.pdf.pdf) | 299,316 B | 10 pages | PDF document; 10 pages; content extracted | Text; selected pages rendered |
| [Team18_M2_SRS_updated.pdf](../Team18_M2_SRS_updated.pdf) | 1,084,839 B | 12 pages | PDF document; 12 pages; content extracted | Text; selected pages rendered |
| [docker-compose.yml](../docker-compose.yml) | 2,139 B | 41 | App service, environment, host Ollama link and data volume | Source/content review |
| [skills-lock.json](../skills-lock.json) | 7,189 B | 179 | Installed agent-skill source/version records | Structure/consistency |

## windows

| File | Size | Lines/pages | Purpose | Review |
|---|---:|---:|---|---|
| [windows/README-WINDOWS.md](../windows/README-WINDOWS.md) | 5,471 B | 69 | Documentation: Shop AI on Windows (for beginners) | Source/content review |
| [windows/check-windows.bat](../windows/check-windows.bat) | 334 B | 9 | Windows double-click wrapper for check-windows.ps1 | Source/content review |
| [windows/check-windows.ps1](../windows/check-windows.ps1) | 3,066 B | 44 | Read-only prerequisite and connectivity diagnostics; source review only | Source/content review |
| [windows/common.ps1](../windows/common.ps1) | 3,219 B | 68 | Shared Windows version, port, model and console helpers; source review only | Source/content review |
| [windows/install-from-offline-pack.bat](../windows/install-from-offline-pack.bat) | 358 B | 9 | Windows double-click wrapper for install-from-offline-pack.ps1 | Source/content review |
| [windows/install-from-offline-pack.ps1](../windows/install-from-offline-pack.ps1) | 4,442 B | 78 | Install prepared local binaries, model files and app packages; source review only | Source/content review |
| [windows/prepare-offline-pack.bat](../windows/prepare-offline-pack.bat) | 348 B | 9 | Windows double-click wrapper for prepare-offline-pack.ps1 | Source/content review |
| [windows/prepare-offline-pack.ps1](../windows/prepare-offline-pack.ps1) | 6,345 B | 107 | Collect installers, model blobs and optional node_modules archive; source review only | Source/content review |
| [windows/reset-data.bat](../windows/reset-data.bat) | 324 B | 9 | Windows double-click wrapper for reset-data.ps1 | Source/content review |
| [windows/reset-data.ps1](../windows/reset-data.ps1) | 1,481 B | 28 | Confirmed deletion of local DB, secret and uploads; source review only | Source/content review |
| [windows/setup-windows.bat](../windows/setup-windows.bat) | 322 B | 9 | Windows double-click wrapper for setup-windows.ps1 | Source/content review |
| [windows/setup-windows.ps1](../windows/setup-windows.ps1) | 6,351 B | 113 | Install Node, optional Ollama/model, and npm dependencies; source review only | Source/content review |
| [windows/start.bat](../windows/start.bat) | 344 B | 9 | Windows double-click wrapper for start.ps1 | Source/content review |
| [windows/start.ps1](../windows/start.ps1) | 3,260 B | 64 | Check requirements, start optional Ollama and run development app; source review only | Source/content review |
| [windows/stop.bat](../windows/stop.bat) | 312 B | 9 | Windows double-click wrapper for stop.ps1 | Source/content review |
| [windows/stop.ps1](../windows/stop.ps1) | 786 B | 15 | Force-stop listeners on port 3000; source review only | Source/content review |

## Ancillary tooling excluded from the product count

The workspace also contains `.agents/skills`, `.github/skills`, `.github/agents`, `.claude/skills`, and `.claude/worktrees`. The latter contains separate application checkouts. Their installed libraries, executable binaries and copied source files were not audited as new product code. `.codex/hooks.json` and `.github/hooks/impeccable.json` are included above because they configure workspace execution.

The two new analysis Markdown reports are outputs of this review and are excluded from their own snapshot count.
