# Shop AI Testing Guide

This document describes the test architecture, execution layers, mock boundaries, environment configuration, and verification procedures for Shop AI.

## Overview & Architecture Layers

The test suite is structured into distinct layers to separate deterministic logic and route safety from end-to-end server flows and live model inference.

```
+-------------------------------------------------------------------------+
|                              test:ai:live                               |
|   (Real built Next.js server + Isolated Temp DB + Real local Ollama)    |
+-------------------------------------------------------------------------+
|                               test:system                               |
| (Real built Next.js server + Isolated Temp DB + Native HTTP Ollama Stub)|
+-------------------------------------------------------------------------+
|                            test:integration                             |
|  (In-process Route Handlers, UI Components, Isolated SQLite DB, Mocks)  |
+-------------------------------------------------------------------------+
|                     test:logic  /  test:ai (subset)                     |
|  (Rule engines, Prompt generation, Guard rails, Invariant assertions)   |
+-------------------------------------------------------------------------+
|                                test:unit                                |
|        (Pure helper functions: i18n, allergens, provider boundary)      |
+-------------------------------------------------------------------------+
```

### Layer Summary

| Layer | Command | Scope & Boundary | Model Dependency |
|---|---|---|---|
| **Unit** | `npm run test:unit` | Pure functions (i18n, diner filters, ingredients) and AI provider queue boundary logic via direct imports. In-memory data, with temporary SQLite available via shared setup where needed. | None (mocked boundary) |
| **Logic** | `npm run test:logic` | Deterministic AI rules, allergy guardrails, recommendation scoring, oracles, offline eval suites, and invariant properties via direct imports and mocked model transport. Uses temporary SQLite where needed. | None (deterministic mock) |
| **Integration** | `npm run test:integration` | Rendered UI screens, route handlers, DB operations, security checks, and chat pipeline flow. | None (HTTP fetch mocked) |
| **AI (Deterministic)** | `npm run test:ai` | Comprehensive AI safety and logic verification: provider, warmup, allergy guards, prompt generation, and eval scenarios. | None (deterministic mock) |
| **System** | `npm run test:system` | Real production Next.js build + HTTP server on ephemeral port, isolated SQLite DB, native `node:http` Ollama stub. | Stubbed (local HTTP stub) |
| **AI Live** | `npm run test:ai:live` | Real production Next.js build + HTTP server, isolated SQLite DB, connects to real local Ollama instance. Proves model invocation (`usedModel === true` in authenticated preview). | Live Ollama required |
| **Full Deterministic** | `npm test` | Runs all deterministic non-e2e test suites via Vitest. | None |
| **Quality Benchmark** | `npm run eval:live` | Evaluates response quality and safety metrics across 30 standard scenarios against a running server. | Live Ollama required |

> [!NOTE]
> Rules and mocked-model guard tests in `test:logic` and `test:ai` provide logic coverage and verify guard boundaries across specified test cases, not real model generation benchmarks. Tests exercise specified cases and guard boundaries; they cannot prove every possible model output safe.

---

## Commands & Usage

All commands are executed from the `app` directory:

```bash
cd app
```

### 1. Pure Unit Tests
```bash
npm run test:unit
```
Runs unit tests for pure helpers (diner filters, language dictionaries, ingredient lookups) and provider queue serialization boundaries.

### 2. Integration Tests
```bash
npm run test:integration
```
Runs integration tests covering UI components, API route handlers (`auth`, `orders`, `menu`, `chat-api`, `staff-calls`), session management, and database interactions against isolated temporary SQLite tables.

### 3. Logic & Invariant Tests
```bash
npm run test:logic
```
Runs deterministic rule engines, guardrails, allergen oracles, prompt generators, and behavioral invariants. Proves that safety-critical facts (prices, allergens, opening hours) never depend on model non-determinism.

### 4. Focused AI Deterministic Suite
```bash
npm run test:ai
```
Runs all deterministic AI-specific suites together without launching end-to-end servers or connecting to live Ollama. Suitable for rapid local verification during AI feature development.

### 5. System Tests (E2E with Ollama Stub)
```bash
npm run test:system
```
Builds the Next.js application (`npm run build`) and runs end-to-end tests (`npm run test:e2e`). This exercises the built server over HTTP with an isolated temporary SQLite database and a native `node:http` Ollama stub. It verifies that when the model is offline or returns unexpected data, the application safely degrades without 500 errors.

### 6. Live AI Model Tests (Isolated E2E)
```bash
npm run test:ai:live
```
Builds the production Next.js application and runs `vitest.ai-live.config.mts`. This suite:
- Spawns its own isolated server and fresh temporary database.
- Connects to a real running Ollama instance with the designated model.
- Explicitly awaits production `warmUpPrompt` from the Vitest process using the isolated restaurant prompt, with automatic child startup warm-up disabled to avoid prompt eviction races. This verifies warmed inference through real Next HTTP rather than child startup warm-up lifecycle; existing warmup unit suites cover prompt equivalence.
- Asserts that open queries reach the model and return valid answers with proof of provenance (`usedModel === true` in authenticated preview, no stored chats).
- Does **not** run in default `npm test` or automated CI. If Ollama is unreachable or the model is missing, the suite fails fast with clear error instructions instead of silently skipping.

### 7. Live Model Evaluation Benchmark
```bash
npm run eval:live
```
Evaluates conversational quality and adherence across the 30 standardized evaluation prompts.
- **Distinction from `test:ai:live`**: `eval:live` evaluates benchmark score thresholds (defined in `eval/thresholds.json`) against a running development or preview server. It normally requires owner-authenticated preview credentials so queries are not persisted or counted against quotas; unauthenticated stored-chat runs require `EVAL_ALLOW_STORED=1` on disposable data. By contrast, `test:ai:live` is a self-contained automated test suite that manages its own build, server lifecycle, and ephemeral database, validating `usedModel === true` in authenticated preview without stored chats.

---

## Actual vs. Mocked Boundary

Understanding the boundaries tested at each layer prevents confusing simulated behavior with live integration:

| Component | `test:unit` / `test:logic` | `test:integration` | `test:system` | `test:ai:live` |
|---|---|---|---|---|
| **Next.js Server** | None (direct import) | None (in-process handler) | Real built Next.js server | Real built Next.js server |
| **HTTP Transport** | None (mocked model transport where needed) | Simulated / mock fetch | Real loopback HTTP sockets | Real loopback HTTP sockets |
| **Database** | Direct imports / temporary SQLite where needed (shared Vitest setup; some legacy tests load seed fixtures) | Isolated SQLite (`tests/setup.ts`) | Ephemeral SQLite in the OS temporary directory (`os.tmpdir()`) | Ephemeral SQLite in the OS temporary directory (`os.tmpdir()`) |
| **Ollama Service** | Mocked in-memory | Mocked fetch boundary | Native Node HTTP stub | Real local Ollama daemon |
| **Guards & Parsers**| Real code | Real code | Real code | Real code |

---

## Runtime Environment & Ollama Overrides

### System Requirements
- **Node.js**: `v22.13.0` or higher (uses native SQLite via `node:sqlite`).
- **Ollama**: Required only for `test:ai:live` and `eval:live`.

### Ollama Configuration
By default, Shop AI connects to:
- `OLLAMA_URL`: `http://localhost:11434`
- `OLLAMA_MODEL`: `gemma4:12b`

To override these settings across platforms without relying on shell-specific `export` syntax:

**POSIX shells (Linux / macOS):**
```bash
OLLAMA_URL="http://127.0.0.1:11434" OLLAMA_MODEL="gemma4:12b" npm run test:ai:live
```

**Windows PowerShell:**
```powershell
$env:OLLAMA_URL="http://127.0.0.1:11434"; $env:OLLAMA_MODEL="gemma4:12b"; npm run test:ai:live
```

**Cross-platform file-based configuration:**
Note that `.env.local` is not automatically read by Vitest when running `vitest.ai-live.config.mts` (which does not use `loadEnv`), and while `next build` reads `.env.local`, it does not export variables into the parent Vitest process. Keep explicit shell environment variables as shown above for standard usage. If invoking file-based configuration directly via Node with an installed Vitest entry point after building:
```bash
npm run build
node --env-file=.env.local ./node_modules/vitest/vitest.mjs run --config vitest.ai-live.config.mts
```

---

## Why Real-Output Assertions Use Invariants

Large language models are probabilistic and non-deterministic. Word phrasing, token counts, and sentence structure vary with model versions, quantization, and temperatures.

For tests interacting with a real model (`test:ai:live`), tests assert **invariants** rather than brittle exact string matches:

1. **Provenance & Source Metadata**: The response must contain evidence that the model was invoked (`usedModel === true` in authenticated preview, no stored chats).
2. **Grounding & Catalog Consistency**: Any dish names or dish IDs returned in recommendation cards must exist in the active restaurant's database menu.
3. **Safety & Price Integrity**:
   - The AI must never invent prices differing from database prices.
   - If a diner has registered an allergen profile, recommended dishes must not conflict with that profile, and unverified recipes must require staff confirmation.
   - Guardrails must intercept prompt injection attempts without executing arbitrary instructions.
4. **Side-Effect Boundaries**: MODEL-generated actions cannot create orders or staff calls. Deterministic explicit or urgent staff intents intentionally create calls, but live open questions assert no operational side effects (no orders, order items, or staff calls created).

---

## Data Isolation & Fallback Guarantees

### Data Isolation
- Automated tests **never** write to or modify `app/data/shop.db` or overwrite demo seeds.
- Integration tests run inside temporary SQLite transactions or isolated database files initialized in `tests/setup.ts`.
- System and live tests spin up fresh SQLite databases located in temporary paths (the OS temporary directory via `os.tmpdir()`), ensuring complete isolation between test runs and development databases.

### Expected Fallback Behavior
The application guarantees high availability for restaurant operations even when AI services fail:
- When Ollama is unreachable, returns HTTP errors, or takes longer than the timeout threshold (15 seconds), the API catches the failure and returns a friendly, localized fallback response.
- The HTTP response status remains `200` to prevent diner UI crashes.
- Menu browsing, orders, bill requests, staff calls, and deterministic allergy checking remain fully operational regardless of Ollama status.

---

## Last Verified: 9 Nov 2026

The test suite and quality checks were verified on Node `v24.12.0` (macOS `arm64`) against a real local Ollama instance running `gemma4:12b`.

### Verification Results

| Command | Files | Tests | Result | Notes |
|---|---|---|---|---|
| `npm run test:unit` | 8 | 108 | Passed | Pure helpers, diner filters, i18n dictionaries, provider boundary. |
| `npm run test:integration` | 31 | 478 | Passed | Route handlers, UI components, DB operations, chat pipeline flow. |
| `npm run test:logic` | 20 | 598 | Passed | Deterministic AI rules, allergy guardrails, recommendation scoring, oracles, offline evals. |
| `npm run test:ai` | 30 | 749 | Passed | Focused deterministic AI safety & logic verification (no live Ollama). |
| `npm test` | 81 | 1459 | Passed | Full deterministic non-E2E test suite (0 skipped). |
| `npm run test:system` | 3 | 33 | Passed | Production Next.js build + HTTP server + ephemeral DB + native HTTP Ollama stub. |
| `npm run test:ai:live` | 1 | 4 | Passed | Production Next.js build + real local `gemma4:12b` (~49s); covers live EN/TH/MY responses and grounded rules. |
| `npm run typecheck` | — | — | Exit 0 | TypeScript project typecheck clean. |
| `npm run lint` | 250 | — | Exit 0 | 7 existing warnings, 0 errors. |

> [!NOTE]
> **Named groups overlap and must not be summed.** The commands above target overlapping subsets of files (e.g., `test:ai` includes files from `test:unit`, `test:integration`, and `test:logic`). Only `npm test` represents the aggregate deterministic suite (81 files, 1459 tests).

### Boundary Isolation & Prerequisites

- **Isolated Live Suite vs. System Stub**:
  - `npm run test:system` runs against a native `node:http` Ollama stub (`app/tests/e2e/ollamaStub.ts`) ensuring predictable offline fallback and degradation testing.
  - `npm run test:ai:live` tests actual model execution via `app/tests/e2e/ai-model.live.test.ts`. It never runs in default `npm test` or automated CI.
  - **Prerequisite Check**: When the model service is unreachable (e.g. running with `OLLAMA_URL=http://127.0.0.1:9`), the suite exits with code 1:
    `Live AI prerequisite failed ... never skips or substitutes a stub`
    This exit 1 reflects a prerequisite configuration failure rather than a failing product test or passing model assertion.
- **Empty Translated-Name Price-Guard Hang Fix & Regression**:
  - Addressed a hang where `wrongPrice()` in `app/src/modules/ai/ai.ts` would loop infinitely when evaluating items with empty translated names (`name.th = ""` / `name.my = ""`). Adding `if (!n) continue;` resolved the infinite search loop.
  - An active regression test in `app/tests/logic/ai-invariants.test.ts` exercises direct model answers with unnormalized empty translated names to ensure termination without hanging.
- **Scope & Guarantees**:
  - Tests verify defined guard boundaries, invariant rules, and catalog consistency. They do not fabricate coverage percentages or guarantee absolute model output accuracy across arbitrary natural language prompts.

