# Shop AI repository analysis

Reviewed 22 October 2026 against the current working tree, including the existing uncommitted UI changes.

The application builds and its existing automated checks pass. The separation between database answers and model answers is useful, and the restaurant workflows have substantial test coverage. However, this review reproduced gaps in the model safety guard, table-bill access, and concurrent PIN lockout. Passing the existing suite does not establish the stronger safety and security guarantees stated in the documentation.

## Scope and verification

The accompanying [file inventory](repository-file-inventory-2026-10-22.md) accounts for **395 project and configuration files** before adding these two analysis reports. This includes 138 files under `app/src`, 32 API route wrappers, application tests and scripts, the static prototype, evaluation fixtures and results, Windows helpers, design generators and mockups, research, and documentation. The database defines 14 tables. The counted code, styling and script files contain approximately 25,264 lines, including fixtures and generated prototype data.

Review depth varies: runtime APIs, authentication, persistence, AI boundaries, and the main screens received detailed source inspection; tests were executed and their coverage reviewed; supporting documents, datasets, generators and design files received structural and consistency checks. All nine PDF files were text-extracted; they represent six distinct documents because three root files duplicate deliverables. Selected PDF pages were rendered for inspection. This was not a page-by-page visual audit of every PDF or mockup.

Dependencies, `.next`, npm caches, Git internals, live restaurant data, installed skill binaries, and the duplicate checkouts in `.claude/worktrees` are excluded from first-party source findings. The local agent configuration and hooks were inspected as configuration, without executing their bundled tools. This is not an exhaustive audit of every dependency or bundled executable.

| Check run in this review | Result |
|---|---|
| `npm test` | **1,242 passed**, 62 files |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with **8 warnings**, no errors |
| `npm run build` | Passed, using temporary database storage and AI warm-up disabled |
| `npm run test:e2e` | **22 passed**, 2 files; real production server with temporary seeded databases |
| Additional isolated checks | **8 reproductions passed**, confirming the behaviors listed below; these are demonstrations of defects, not fixes |
| Supporting-script syntax | 14 Python files parsed and 8 JavaScript/module files checked; no syntax errors |
| Project JSON validation | All checked JSON files parsed; `tsconfig.json` was left to TypeScript |

Runtime used: Node 24.12.0, npm 11.8.0. The package manifest declares Next.js 16.3.5, React 19.3.0 and TypeScript 7.0.2 ranges. The npm lockfile has 231 package entries, including the root package and optional platform packages.

The first end-to-end attempt was blocked by the sandbox's prohibition on opening a local listening socket. The approved rerun outside that restriction passed. Existing unit and API tests use mock cookies, and the end-to-end tests use HTTP; neither is a substitute for real-device browser testing.

No application fixes were applied, no dependencies installed, and no commits created. Verification used disposable data rather than `app/data`. Next.js regenerated its managed type declaration during the build; its development output paths were regenerated afterward. Existing application edits were retained.

## What the system does

```text
Diner / owner / staff browser
             |
Next.js pages and API route wrappers (src/app)
             |
Five modules: diner, ai, owner, staff, platform
       |                         |
SQLite through node:sqlite       Local Ollama through provider.ts
       |                         |
Menus, users, staff, chats,      One model request at a time;
orders, calls, imports, events   timeouts and output checks
```

The diner scans a restaurant/table URL, browses the multilingual menu, selects an allergy profile, chats, and sends picks. A waiter accepts picks before the kitchen sees them. Orders progress through `picked → new → cooking → ready → served`, with cancellation and recall branches. Accepted orders contribute to a table's bill until a waiter marks them paid.

The owner manages dishes, categories, allergens, staff, hours, FAQs, assistant settings, photo imports, QR codes and insights. The AI answers recognized factual questions from SQLite through fixed templates. Open questions go to Ollama; the returned text and optional dish-card action are checked before display. Model actions cannot directly place orders.

## Findings requiring attention

Priority: **P1** should be addressed before relying on the affected safety/security guarantee; **P2** is a functional or integrity problem to fix next. “Reproduced” means an isolated test exercised the current implementation. “Source finding” means the behavior follows from inspected code but was not independently exercised here.

### 1. P1 — Safety wording can bypass the model output guard

**Reproduced.** `app/src/modules/ai/ai.ts:1030` defines a narrow set of forbidden English phrases, and `checkModelReply` uses it at line 1176.

For an open question, a mocked model returned:

> Mango Sticky Rice is perfectly safe.

`answer()` returned that exact sentence with `usedModel: true` and `answered: true`. The expression catches “is safe” but misses an adjective between the words. This violates AI-3 and the documented rule that a safety claim cannot reach the diner. The example proves a validation gap; it does not measure how often a real model produces that wording.

Expand the checks to cover safety assertions and paraphrases in every supported language, with negative examples to prevent excessive blocking. Retain staff-confirmation messaging and test the new cases adversarially. The documentation should describe the checks as defense in depth, without claiming complete protection from arbitrary natural-language output.

### 2. P1 — A caller can obtain another table's bill by creating picks for that table

**Reproduced.** `app/src/modules/diner/api/orders.ts:28` accepts a caller-selected table and immediately issues a valid receipt. `app/src/modules/diner/api/bill.ts:24` accepts a receipt attached to any unpaid, non-cancelled order, including unaccepted picks, and then returns the entire table's bill.

A test created a served order at table 72, then an anonymous caller submitted one pick for table 72. The receipt returned with that pick allowed the caller to read the pre-existing bill, including a separate meal worth 864 baht. No staff approval or existing table credential was needed.

The receipt is cryptographically unpredictable, but its issuance does not establish table membership. Introduce a table/visit capability, an explicit staff-approved association, or a bill restricted to the receipt's own orders. Choose the intended sharing model first, then enforce it in both issuance and reads. Also test that a receipt from a previous visit cannot regain access to a later visit simply by submitting another order.

### 3. P1 — Concurrent PIN guesses bypass the intended attempt ceiling

**Reproduced.** `app/src/modules/staff/api/login.ts:10` checks the lock before the asynchronous password comparisons at line 15. Wrong attempts are counted only after those comparisons complete.

Twenty-one concurrent wrong PIN requests all reached verification and returned 401. Only a subsequent request returned 429. The default ceiling is five wrong attempts per caller and twenty per restaurant, but an entire concurrent batch passes the initial gate while its counters are unchanged. This weakens protection for low-entropy PINs and consumes bcrypt CPU. The owner login has a similar pre-check/await/count structure and merits the same concurrency review.

Bound in-flight verifications and reserve an attempt before starting expensive work. Preserve the distinction between mistyped credentials, successful sign-ins, and abuse limits. Test concurrent requests, not only sequential failures.

### 4. P2 — Dish updates accept categories belonging to another restaurant

**Reproduced.** `app/src/modules/owner/api/items.ts` checks category ownership on creation. `app/src/modules/owner/api/itemsById.ts:11` reuses the field conversion but omits that ownership check on update.

An owner successfully assigned their dish to a category owned by a second restaurant. Deleting that category later set the first restaurant's dish category to NULL through the foreign key. This can also leave category-filtered menus inconsistent. The reproduction did not demonstrate permission to edit another restaurant's dish.

Apply the same restaurant-scoped category validation to create and update, and add a test for the update path.

### 5. P2 — Order quantities accept fractions and duplicate rows bypass the cap

**Reproduced.** `app/src/modules/diner/api/orders.ts:14` clamps each line numerically to 1–20 but does not require an integer or combine repeated item IDs. A request with the same dish at quantities `1.5`, `20`, and `20` saved all three rows: 41.5 portions of one dish.

Require finite positive integers, normalize duplicate IDs before checking the per-dish maximum, and cap the number of submitted lines. Validate table identifiers too; an empty or arbitrary table string is currently accepted.

**Related source finding:** `Diner.tsx:252` has no in-flight order guard, and the order endpoint has no idempotency key. Fast repeated taps or a retry after a lost response can create duplicate orders. Add a disabled submitting state and server-side replay protection.

### 6. P2 — Chat sessions can be attached to multiple restaurants

**Reproduced.** `app/src/modules/ai/api/chat.ts:38` inserts a client-selected session ID with `INSERT OR IGNORE`. Because `chat_sessions.id` is globally unique, a collision silently keeps the original restaurant's session. The route then inserts messages using the second restaurant's ID under that same session.

Two requests using one session ID at two restaurants returned 200 and produced messages with two restaurant IDs under one session. History reads do include a restaurant predicate, so this test does **not** demonstrate cross-restaurant history disclosure. It does show an inconsistent association affecting session/table/profile analytics and deletion behavior.

Validate that an existing session belongs to the requested restaurant, or issue a fresh server-generated session. Enforce the association consistently at the database boundary.

### 7. P2 — Monthly chat quota disables rule-based safety and factual answers

**Reproduced.** `app/src/modules/ai/api/chat.ts:45` checks the monthly cap before calling `answer()`. After reaching the cap, an allergen question returns only the limit message and a menu action. A test with `chat_cap = 0` confirmed this immediately.

This conflicts with AI_SAFETY rule R10, which says rule answers keep working when the monthly limit is reached. The default cap is 300 user messages per month, and factual questions count too.

Run deterministic answers before applying a model-use quota, or revise the product promise and quota definition. Keep the request-rate limiter separate from the monthly model allowance.

### 8. P2 — Public feedback has no session ownership check

**Reproduced.** `app/src/modules/diner/api/feedback.ts:20` accepts an assistant message ID and restaurant slug without proof that the caller owns that chat. An anonymous request marked an existing message as wrong and flagged it in the owner's insights.

Require a chat capability tied to the message, and rate-limit feedback. A sequential database message ID should not serve as authorization.

### 9. P2 — Browser storage failures can break the diner and its offline fallback

**Source finding.** Several accesses in `app/src/modules/diner/Diner.tsx:162` are outside `try/catch`: language retrieval, menu cache writes, fallback cache retrieval, picks writes, and language writes. The receipt and allergy-profile helpers already handle storage failures more defensively.

A browser that denies storage can throw during mount or an interaction. A full storage quota can turn a successful menu response into a rejected promise; malformed cached JSON can fail during fallback. Wrap access in shared guarded helpers, validate cached shapes, and preserve a usable in-memory menu when persistence fails.

### 10. P2 — Cancelling a swipe can execute a staff action

**Source finding.** `app/src/modules/staff/SwipeCard.tsx:80` connects `onPointerCancel` to `finish()`. That function executes the action if displacement exceeds 88 pixels. A cancelled gesture can therefore take an order, mark it served, or mark a bill paid, depending on the wrapped card.

Separate cancellation from completion: reset visual/pointer state on cancel without invoking the action. Test cancellation after crossing the threshold and confirm physical behavior on a touch device.

### 11. P2 — Prototype documentation and tests no longer describe the rendered prototype

**Source finding.** The README describes a 13-dish Golden Lotus prototype that resets on reload, photo import, and owner login `owner@example.com` / `demo1234`. The current prototype renders the HaChi Kyu menu, uses browser persistence, implements an owner CSV import screen, and declares different client-side demo credentials in `prototype/owner.js:5`.

`prototype/data.js:8` still declares the old `DISH_SEED` and requirement map. `app/tests/prototype.test.ts` validates those declarations and requirement-ID mentions, rather than proving the corresponding screens work. Its ban on the literal `localStorage` does not detect `window['local' + 'Storage']` at `prototype/data.js:52`, or the separate session storage calls. The suite can pass while the documented demonstration is materially different.

Update the guide and sample credentials to the actual prototype, or restore the promised journey. Add behavior tests for the rendered menu, reset, owner sign-in, import flow and requirement navigation. Keep mock credentials clearly distinguished from application credentials.

### 12. P2 — Privacy and analytics labels overstate what is enforced

**Source finding.** `ai/api/chat.ts:54` stores raw diner messages. A free-text message can contain a name, phone number, email, or other personal details even though there are no dedicated columns for them. AI_SAFETY R12's statement “No personal data is stored” is therefore stronger than the implementation. No retention or redaction job was found.

The insights tile says “ANSWERED FROM MENU”, but `platform/api/insights.ts` calculates the proportion of messages marked answered. Successful model replies count too; their origin is not persisted. Likewise, popular-dish totals include unaccepted `picked` orders because they exclude only cancelled orders, which can inflate demand rankings.

Use accurate privacy wording, establish retention/redaction behavior, and persist response provenance if the interface needs a rule/model split. Define whether popularity measures selected, accepted, served, or paid dishes, then query the matching states.

## File groups and their condition

| Area | Analysis |
|---|---|
| `app/src/app/` | Mostly thin page and HTTP wrappers. Home reads restaurant/menu summaries server-side. Owner access is enforced primarily by API sessions and the client shell. The untracked dish-card prototype is included in the production route set. |
| `modules/platform/` | Shared SQLite access, auth, HTTP/client helpers, data normalization, uploads, import, QR and insights. Parameterized values, upload magic-byte checks, restricted served-upload filenames, cookie signatures, and restaurant-scoped queries are positive features. Input schemas and error handling remain inconsistent. |
| `modules/diner/` | Menu, filters, picks, saved dishes, allergy profile, chat and table bill. Translation dictionaries and filter tests are extensive. `Diner.tsx` combines networking, storage, gestures, UI and multiple dialogs in one approximately 60 KB file. |
| `modules/ai/` | Rules, dish matching, multilingual templates, prompt construction, output checks, adaptive token budget, one-at-a-time queue and startup warm-up. `ai.ts` is approximately 130 KB; matching and rule precedence are central complexity risks. |
| `modules/owner/` | Menu CRUD, category management, bulk availability, assistant settings, hours and FAQ. The main dish form validates fields and blocks duplicate submission; some smaller pages lack equivalent error and loading handling. |
| `modules/staff/` | Waiter feed, kitchen columns, polling, sound, swipe shortcuts and order transitions. Server role/state checks are present for order actions and bill settlement. General staff floor/kitchen reads and call closing are available to either staff role; verify that this matches the intended permissions. |
| `app/tests/` | Strong range of rule, API, UI, adversarial, oracle, seed, concurrency and traceability tests. Some tests assert source strings or fixture declarations and cannot establish actual browser behavior or universal safety. The eight new reproductions identify missing cases in an otherwise passing suite. |
| `app/scripts/` | Production/development seeders, large-menu seeding, live evaluation, load testing, and older Python HTTP checks. Seed credentials are guarded in production. Live evals require care because they involve a real server/model; they were not rerun here. |
| `eval/` | Seven question sets totaling 326 entries, thresholds, the demo menu, model comparison tools, saved runs and native-language review sheets. Keyword scoring and saved historical results are useful evidence with a limited domain; they do not prove general model accuracy. |
| `prototype/` | Separate static implementation with its own state, rendering, mock AI and browser persistence. Generated labels stay synchronized with the real app, but behavior, menu data and written instructions have drifted. Treat it as a separate product surface. |
| `windows/` | Beginner-oriented setup/start/stop/reset/check helpers and optional offline model/package distribution. PowerShell was reviewed statically; no Windows host or download installation was exercised here. |
| `design/` | Python generators and Art Deco/Glass canvas HTML references. These are design artifacts, not the current production interface or an alternate backend. |
| `docs/` and PDFs | Substantial requirements, traceability, safety, performance, explanation and course deliverables. Historical results and unfilled team attestations need clear dates/status. The earlier submitted SRS preserves teaching-template material; the corrected version is separately present. |
| `research_notes/` and existing `reports/` research | Useful design rationale and source links. Several observations predate fixes already present, including document language synchronization, staff timestamps/reconnecting state, and inline sold-out controls. They are historical research, not a current defect list. External claims and links were not independently revalidated. |
| Root/deployment/configuration | Dockerfile and Compose build the app with persistent data and local-host Ollama access. CI specifies Linux Node 22/24, Windows, and Docker checks; Pages deploys only the static prototype. This review inspected those workflows but did not run remote CI or Docker. |
| Agent/tooling files | `.codex` and `.github` configure hooks that invoke the bundled Impeccable executable. `.agents`, `.github/skills`, and `.claude` contain installed tooling and duplicate checkouts. Inventory them separately from product code; their presence is not evidence of a product feature. |

## Maintenance and deployment observations

- **Types:** `tsconfig.json` disables strict checking; the DB, generic HTTP body helper, screens and handlers frequently use `any`. Typecheck success currently offers limited protection against malformed request shapes. For example, `name: null` or a non-array allergens value can throw in `itemColumns` rather than produce a controlled 400.
- **Request limits:** calls, orders, menu-open event writes and feedback lack the chat endpoint's abuse limits. Changing arbitrary table strings avoids call deduplication. Bound payload sizes, line counts and write rates at the API/proxy boundary.
- **Money:** prices use SQLite REAL and JavaScript floating-point arithmetic. Integer minor units would avoid fractional rounding surprises if non-whole-baht prices are supported.
- **Database growth:** orders, messages and events accumulate; staff order hydration performs a query per order. Define retention and add query indexes based on measured traffic before increasing deployment size.
- **Backups:** the work plan requests `db:backup`, but no such package script exists. The schema uses WAL, so a raw copy of only a live `shop.db` is not a complete backup procedure. Use a consistent database snapshot and verify restoration.
- **AI capacity:** queue and speed state live within one Node process. Running several instances does not provide a shared global queue or rate limiter. Menu-photo import and warm-up share the queue with chat; import has no queue-wait ceiling, and warm-up can occupy the slot for up to 15 minutes. The stated 120-second import timeout measures model work after waiting, not total request time.
- **Local-only operation:** `OLLAMA_URL` is configurable and not restricted to loopback/private addresses. A local default and the lack of a cloud-provider SDK are not an enforced network boundary. External font stylesheets and optional remote dish photos are separate network dependencies.
- **Authentication UX:** production login still pre-fills development credentials, and home-page demo hints are selected by slug rather than deployment mode. Random production credentials prevent the documented public login from working, but the interface remains misleading.
- **Windows stop:** `windows/stop.ps1` force-stops whichever process owns port 3000, even if it is another application. Record the process started by Shop AI and verify its identity before stopping it. Offline installers are downloaded without verifying their downloaded contents against the checksum manifest.
- **Mobile/accessibility:** Escape handlers, labels, live regions, language attributes and reduced-motion styles are present. Several modal sheets lack modal focus containment/restoration. Some owner grids use fixed inline column layouts. These require keyboard and real-device checks; no new browser visual audit was performed.
- **Lint:** eight warnings cover semantic groups, scrim keyboard interactions, memo dependencies and unused code. They are warnings rather than build failures; the presence of a warning alone does not prove an observable UI bug.
- **Scope:** experiments under `src/app/prototypes` are built into the application. Decide whether the publicly accessible prototype route belongs in a production artifact.

## Documentation and deliverable consistency

1. Update the root README's current test count: it says 540, while this working tree runs 1,242 unit/integration/component tests. Keep dated reports as dated evidence, rather than replacing historical numbers indiscriminately.
2. AI_SAFETY's claim that no wrong safety-critical model answer can reach a diner needs revision in light of finding 1. Its price limitation L2 also predates the additional clause-price check already present in the code.
3. Correct the static-prototype menu, login, persistence and import instructions. Mention-only traceability tests should not be presented as interaction coverage.
4. Reconcile the traceability table's “Windows not tested” wording with the Windows CI job, while distinguishing a configured job from evidence that it has passed recently.
5. Retain one canonical location for the three duplicated course PDFs, or document the copies as intentional submission exports. The hashes confirm byte-identical pairs.
6. Final-report and AI-use documents remain drafts with member attestations and contribution evidence still to complete. These need the team's factual input; they should not be filled by inference from source code.
7. Real-phone load time, owner onboarding time, native review of some language strings, and menu-photo extraction accuracy remain unverified by this review. Existing documentation explicitly records several of these gaps.

## Suggested implementation order

1. Close and regression-test the model safety-wording gap, receipt issuance/access gap, and concurrent authentication limit gap.
2. Correct tenant/category validation, order quantity normalization and replay protection, session association, and feedback authorization.
3. Keep deterministic chat available under the intended quota policy; guard browser persistence and cancelled gestures.
4. Align privacy statements, insights meanings and prototype instructions with actual behavior.
5. Validate the resulting diner, waiter, kitchen and owner flows on real devices, then finish the remaining course evidence and backup/restore procedure.

## Reproduction evidence

Existing-check logs: `/tmp/shop-ai-analysis-tests.log`, `/tmp/shop-ai-analysis-types.log`, `/tmp/shop-ai-analysis-lint.log`, `/tmp/shop-ai-analysis-build.log`, and `/tmp/shop-ai-analysis-e2e.log`.

The isolated harness is `/tmp/shop-ai-analysis-verify/findings.test.ts`, with its own Vitest configuration and temporary database. Its eight assertions confirmed: bill access after self-issuing a receipt, a foreign category association, fractional/duplicate quantities, cross-restaurant session association, forbidden safety wording reaching output, unauthenticated feedback modification, 21 concurrent wrong PIN verifications, and quota blocking of deterministic allergen replies. Log: `/tmp/shop-ai-analysis-findings.log`.

These files are temporary local evidence and were not added to the application suite. No live model, restaurant database or customer account was used for these reproductions. Temporary files may be removed by the operating system; this report records the triggers and observed outcomes independently.
