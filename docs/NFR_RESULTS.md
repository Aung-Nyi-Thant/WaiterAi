# Measured results (5 Oct 2026)

Machine: MacBook Air M4, 32 GB, Ollama with `gemma4:12b` (100% GPU), built app (`next build` + `next start`),
temporary database with the 13-dish demo restaurant. Server-side measurements with HTTP requests from the same
computer (no phone, no Wi-Fi). Scripts: `app/scripts/nfr_check.py`, `app/scripts/chat_smoke.py`,
`app/scripts/e2e.py`, `npm run eval:live`, `npm test`, `npm run test:e2e`.

## Clean results (safe to quote in the SRS)

| Requirement | Result | How |
|---|---|---|
| NFR-6 / FR-2 safety and answers | `npm run eval:live`: 29/30 once, then 30/30 four times (thresholds met every time: overall ≥ 90%, each language ≥ 80%, safety categories 100%). The one miss was an English "not on the menu" question answered by the model; wording varies because the model temperature is 0.2. `chat_smoke.py`: 30/30. | real model |
| NFR-1 rule-based answers within 1 s | allergen, price, hours, sold-out, injection answers: 1–7 ms in the eval log (average over all 30 questions including 3 model answers: 0.8 s) | `eval:live` |
| NFR-2 menu and staff screens within 3 s | menu data: average 1 ms, maximum 3 ms; staff floor data: average 1 ms, maximum 1 ms (20 requests each). Staff screens poll every 3 s (`usePoll(load, 3000)`), diner menu every 20 s. **Server side only; the phone-over-Wi-Fi timing in the SRS is still to do.** | `nfr_check.py nfr2` |
| NFR-4 AI unavailable (Ollama stopped / port closed) | menu opens, picks and staff call work, chat shows the fallback message in 0.0 s (limit 5 s), rule-based and allergy answers still work | `nfr_check.py nfr4` (server started with `OLLAMA_URL=http://127.0.0.1:9`) |
| NFR-4 AI hangs (accepts the connection, never answers) | fallback after **15.0 s**, not 5 s. The 5 s limit holds for a stopped Ollama; a hung or very slow model is cut off at the 15 s limit (before the fix it was 90 s). | `nfr_check.py nfr4` against a fake hanging Ollama |
| Old API checks | `e2e.py`: 66 of 66 checks passed on a fresh database (including photo import with the real vision model). Run it once per fresh database: a second run fails the "register" check only because the test restaurant already exists. | `e2e.py` |
| Automated tests | `npm test`: 205 passed; `npm run test:e2e`: 11 passed; `tsc --noEmit` clean; `next build` OK | |

## NFR-1 (open questions within 15 s): PASS on a quiet machine

`nfr_check.py nfr1 http://127.0.0.1:3100 100` (13-dish demo menu, model already loaded, nothing else using Ollama,
mix of English, Thai and Burmese open questions): **average 8.5 s, median 8.3 s, 90th percentile 12.4 s** (limit: 90% within
15 s), slowest 15.0 s. **2 of the 100 answers hit the 15 s cutoff** and were replaced by the fallback message (counted from
Ollama's log: two requests ended after 15.0 s). The SRS figure "average about 5.6 s" does not hold for this mix of
questions on this run: quote 8.5 s average / 12.4 s 90th percentile instead.
The first question after the model had been idle (30 min `keep_alive`) took 15 s and fell back: the model had to be
loaded again. Fixed: `keep_alive` is now 12 hours (`OLLAMA_KEEP_ALIVE` overrides it).

### Earlier run that was NOT valid (kept as a warning)

The same test run while another program was using the same Ollama gave average 11.0 s, median 10.7 s, 90th percentile 15.0 s,
29 of 100 answers replaced by the fallback message. During that run a second `next-server` on another port sent a chat
request about every 25 s, and Ollama's log showed prompt reading at 47–113 tokens/s and answers at 7 tokens/s. Do not quote it
as the system's speed, but it shows the next point.

What the runs show, and is worth knowing:

1. **Sharing Ollama hurts a lot.** Gemma re-reads the whole prompt for every request (Ollama log:
   "forcing full prompt re-processing due to lack of cache data (likely due to SWA…)"), and a second user evicts the first
   user's cache. With the 15 s limit, a busy computer turns slow answers into the fallback message.
2. **The prompt is about 1,400 tokens for a 13-dish menu** and grows with the menu. A restaurant with 60+ dishes will
   have a much longer prompt and slower first token. The NFR-1 number is only valid for a small menu; say so in the SRS.
3. **Re-run on a quiet computer** before quoting a number:
   `python3 app/scripts/nfr_check.py nfr1 http://localhost:3000 100` (close other programs that use Ollama first).

## NFR-7 (3 diners + 2 staff screens, 10 minutes)

**First run (before the queue): passed the wording but not the intent.** 108 AI answers, 0 errors, every answer within
30 s (slowest 15.1 s), 400 staff-screen refreshes all under 3 s. But **104 of the 108 answers were the fallback message**:
the three diners (each asking again 2 s after every answer, which is a stress test) shared the one model at once, every
request ran slower, and nearly all hit the 15 s limit. Cause: the SRS says "one AI answer at a time" but nothing
enforced it, and the 15 s limit I added counted the time spent sharing.

**Fix (`ai/provider.ts`):** requests now wait in one first-come-first-served line (kept on `globalThis` so all Next.js route
bundles share it). Once a request starts it may take 15 s (NFR-1); it may wait at most 15 s for its turn, so a diner has
an answer or the fallback within 30 s (NFR-7). Covered by 4 tests in `tests/provider.test.ts`.
`nfr_check.py nfr7` now takes a think-time (seconds between a diner's questions, default 10; 2 = stress test).

**After the fix (queue, 15 s work + 14 s waiting):**

| Pace of each diner | Result | Verdict |
|---|---|---|
| asks again 10 s after each answer, machine slower than usual at the time (heavy load) | 74 answers, 25 fallbacks (34%), 0 errors, 90th percentile 21.2 s, slowest 30.0 s (the budget was 15 + 15 and landed on 30.0 s; the wait is now 14 s) | FAIL by 0.0x s, fixed by the 14 s wait. Also shows the limit of one model: 3 people asking every ~20 s need more than one answer slot gives. |
| **asks again 30 s after each answer (a person reading and typing), `nfr_check.py nfr7 … 10 30`** | **46 answers, 7 fallbacks (15%), 0 errors, 400 staff-screen refreshes all under 3 s, average 11.6 s, 90th percentile 17.6 s, slowest 25.7 s** | **PASS** (no error, every answer or fallback within 30 s) |

Be precise in the SRS: NFR-7 passes as worded (no error, every reply within 30 s), but about 1 in 7 answers is the fallback
message when 3 diners chat continuously; answers take about 12 s on average because they wait for their turn. A restaurant
with more simultaneous chatters needs a faster computer or a smaller menu prompt.

## Not done

- NFR-3 (owner publishes a first menu within 30 minutes): needs people.
- Phone tests, interviews, native Burmese review: need people.
