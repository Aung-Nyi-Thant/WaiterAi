# Performance measurements (SRS NFR-P1, NFR-P3, NFR-P4)

Measured on 2026-10-05 with `app/scripts/load-test.mts` (`npm run load-test`) against the production build (`npm run build && npm start`) on **one MacBook (Apple Silicon)** with `gemma4:12b` through Ollama. The "diners" are simulated clients on the same computer, so these numbers show what the **server** does. They do **not** include a phone's browser, Wi-Fi, or rendering time. Repeat them on the restaurant's real computer before relying on them.

Each simulated diner opens the page and the menu, asks three rule-based questions (price, allergy, hours), sends picks and asks for the bill; with `--ai` it also asks one open question ("What would you recommend on a hot day?"). All diners start at the same time.

## Everything except the AI model (rule-based answers, pages, orders)

30 diners at once: 0 errors, 0.2 s for all of them.

| Step | Median | 95th percentile | Slowest |
|---|---|---|---|
| Diner page `/r/<slug>` | 49 ms | 51 ms | 63 ms |
| Menu API | 11 ms | 36 ms | 37 ms |
| Chat: price / allergy / hours (rules) | 17–22 ms | 22–61 ms | 44–79 ms |
| Send picks | 18 ms | 20 ms | 37 ms |
| Bill | 14 ms | 16 ms | 28 ms |

- **NFR-P2** (rule answers within 1 s): met by a wide margin (also asserted in `tests/ai-rules.test.ts`).
- **NFR-P3** (menu page usable within 3 s on a local network): the server answers the page in about 50 ms and the menu in about 15 ms, even with 30 diners at once. The time in the phone's browser was not measured.

## NFR-1: 100 open questions, one at a time (the SRS target is 90% within 15 s)

`npm run load-test -- --ai-questions 100`: one diner asks 25 different open questions (recommendations, FAQ-style questions, dishes not on the menu, in English, Thai and Burmese) four times over, with the model loaded, on an otherwise idle computer.

| Result | |
|---|---|
| Errors | 0 |
| Median | **5.5 s** |
| 90th percentile | **10.7 s** |
| Slowest | 12.5 s |
| Answered within 15 s | **100 of 100** |

**NFR-1 is met** on this laptop. Rule-based answers (allergens, prices, hours, orders, the bill) take milliseconds.

**Measure on an idle computer.** The model and the app share one machine. A first run of this same test, taken while other heavy work (a build, the full test suite, a browser) ran at the same time, gave a median of 12.6 s and only 63% within 15 s. The same 25 questions on the idle computer gave a median of 5.3 s and 96% within 15 s. In a restaurant, keep other heavy programs off the server computer.

## AI answers to open questions (the language model), one short question and concurrent diners

| Situation | Total for all diners | Median wait | Slowest wait |
|---|---|---|---|
| 1 diner, model already loaded (3 runs) | 4.7–5.6 s | 4.7–5.6 s | 5.6 s |
| 3 diners at once, model loaded, **before** the queue | 32.5 s | 21.4 s | 32.4 s |
| 3 diners at once, model loaded, **with the queue** | 15.9 s | 10.3 s | 15.9 s |
| 3 diners at once, model **not loaded** (cold start), before the queue | 53.2 s | 43.4 s | 53.2 s |
| 3 diners at once, model **not loaded**, with the queue | 28.6 s | 23.6 s | 28.5 s |
| 10 diners at once, model loaded, before the queue | 90.3 s | 70.7 s | 90.0 s |
| 10 diners at once, model loaded, with the queue | 85.9 s | 42.5 s | 85.9 s |

What this means:

- **NFR-P1** (an open question answered within 15 s): **met for one diner at a time** (about 5 s). With 3 at once the slowest waits about 16 s, just over the target; the first answer after the model was unloaded takes about 22 s because the model has to load; with the 15 s model limit that diner gets the "AI unavailable" message instead (the model is kept loaded for 12 hours by default, `OLLAMA_KEEP_ALIVE`, so ask one question when opening the restaurant). With 10 at once the last diner waits about 86 s.
- **NFR-P4** (at least 3 simultaneous diners): met in the sense that all diners were served, with 0 errors, in every run.
- **The queue.** Running several questions in parallel made a local model slower overall (3 at once: 32 s, versus about 15 s one after another). The SRS says one answer is processed at a time (§2.2); `ai/provider.ts` serves open questions first come, first served and gives up on a request that would wait too long, so the diner gets the normal "AI unavailable, browse the menu or call the staff" message instead of a very long wait. The model is kept loaded for 12 hours (`OLLAMA_KEEP_ALIVE`) so the first diner after a quiet period is not sent to the fallback.
- **Capacity.** One laptop answers about one open question every 5 s, so the AI cannot serve a busy dining room in real time. This is the limit stated in the project's limits; it is why rule-based answers (which take milliseconds and need no model) handle everything safety-critical. More capacity needs a faster computer or a GPU server.
- **Warming the model.** Ask one question after starting the app (or before opening the restaurant) so the first diner does not pay the 22 s load time.

## The SRS capacity target (3 diners, 2 staff screens, 10 minutes)

The SRS (M2 PDF, NFR-7) asks for 3 diners chatting at the same time with 2 staff screens for 10 minutes, no errors, every AI answer within 30 seconds. Run: `npm run load-test -- --diners 3 --staff 2 --minutes 10 --ai` (waiter and chef PINs in `LOAD_WAITER_PIN` / `LOAD_CHEF_PIN`), on an idle computer.

| Result over 10 minutes | |
|---|---|
| Errors | **0** (about 1,500 requests) |
| AI answers | 93; median **9.8 s**, 95th percentile 15.2 s, slowest **17.4 s** |
| Rule-based chat, pages, menu, picks, bill | medians 3–6 ms, slowest 104 ms |
| Waiter and chef screens polling every 3 s (200 polls each) | median 2–4 ms, slowest 39 ms |

**Met:** no errors and every AI answer well under 30 s. Read it as a stress test: each simulated diner asked an open question every 10–15 s, which is much more than a real diner does, so the queue was rarely empty. (A first run of this test while the computer was also busy with other work took up to 29.4 s per answer, just under the limit, which shows how much a busy server computer matters.)

## Not measured

- Page load and rendering on a real phone over Wi-Fi.
- A restaurant's real computer (these are one developer laptop's numbers).
- Photo-import accuracy and time on real menu photos (needs real photos).
- The "owner publishes a first menu within 30 minutes" target (NFR-U3; needs real owners).
