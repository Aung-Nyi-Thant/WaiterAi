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
| Old API checks | `e2e.py`: 38 checks, all passed (including photo import with the real vision model) | `e2e.py` |
| Automated tests | `npm test`: 205 passed; `npm run test:e2e`: 11 passed; `tsc --noEmit` clean; `next build` OK | |

## NOT a valid result: NFR-1 (open questions within 15 s)

`nfr_check.py nfr1 … 100`: average 11.0 s, median 10.7 s, 90th percentile 15.0 s, 29 of 100 answers replaced by the
fallback message because they hit the 15 s limit. **Do not quote this as the system's speed.** During the run another
program was using the same Ollama (a second `next-server` on another port sent a chat request about every 25 s), and
Ollama's log showed prompt reading at 47–113 tokens/s and answers at 7 tokens/s, far below this computer's normal speed.
Earlier the same day, open questions took 3.5–4.8 s on a quiet machine (`eval:live`).

What the run does show, and is worth knowing:

1. **Sharing Ollama hurts a lot.** Gemma re-reads the whole prompt for every request (Ollama log:
   "forcing full prompt re-processing due to lack of cache data (likely due to SWA…)"), and a second user evicts the first
   user's cache. With the 15 s limit, a busy computer turns slow answers into the fallback message.
2. **The prompt is about 1,400 tokens for a 13-dish menu** and grows with the menu. A restaurant with 60+ dishes will
   have a much longer prompt and slower first token. The NFR-1 number is only valid for a small menu; say so in the SRS.
3. **Re-run on a quiet computer** before quoting a number:
   `python3 app/scripts/nfr_check.py nfr1 http://localhost:3000 100` (close other programs that use Ollama first).

## Not done

- NFR-7 (3 diners + 2 staff screens for 10 minutes): not run, because the machine was shared (see above) and the run would
  have disturbed the other program. Run `python3 app/scripts/nfr_check.py nfr7 http://localhost:3000 10` on a quiet computer.
- NFR-3 (owner publishes a first menu within 30 minutes): needs people.
- Phone tests, interviews, native Burmese review: need people.
