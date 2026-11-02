# 9/10 roadmap: implementation progress

This records what was completed in code on 29 October 2026 against `roadmap-to-9-of-10-2026-10-29.md`. It is not a claim that the project has reached 9/10. Restaurant records, native-language review and a real pilot are still release gates.

| Area | Completed in the repo | Remaining evidence before release |
|---|---|---|
| Allergy suggestions | AI and diner filters require a current restaurant-verified list; estimated or missing lists are excluded. Direct picks and staff tickets still show warnings. Model prompt and output guard follow the same rule. | A chef or owner must check each real recipe, supplier label, substitution and cross-contact plan. Current public menus: Golden Lotus 0/13 verified; HaChi Kyu 0/132 verified. |
| Recipe record | Owner verification requires a private check note and stores who/when. Older checkbox-only verified rows are downgraded. Edits and 180 days expire a check. | Actual restaurant staff must fill and sign off the notes; the app cannot validate the contents of a note. |
| Allergy handoff | Waiter and chef each acknowledge before an allergy order advances; the API blocks missing acknowledgments and records timestamps. | Observe the conversation and preparation on actual shifts. |
| Privacy | README and diner copy describe stored raw chat. Messages expire after 30 days on chat/owner use; owner can export and delete restaurant-scoped history. | Schedule daily `db:prune-chat`; decide order retention; purge or separately govern backup copies containing older chat. |
| Recovery | `db:backup` snapshots SQLite with `VACUUM INTO`, secret and uploads, hashes files and checks integrity. `db:restore` restores only into a new directory. An isolated restore test passes. | Run a real restore drill on the deployment machine and verify login, photos, orders and bills. Set protected backup storage and retention. |
| UI and UX | Diner empty states explain that allergy filters need checked data and offer staff help. Owner shows verified coverage and privacy controls. Waiter and chef checkpoints are explicit. The existing monochrome glass and reduced-motion styling remains. | Visual browser inspection, keyboard/screen reader review and observed diner/staff/owner tasks on actual devices. The browser access host was unavailable during this run. |
| AI quality | Rules, prompt and evaluation expectations were updated for verified-only allergy recommendations. The 13- and 132-dish identities were smoke checked. Live `gemma4:12b` evaluation passed 28/30 curated and 34/34 natural-language cases. | Review cold-start latency, fix the Burmese out-of-menu evaluator wording, then run a larger held-out set with native-language judging and varied menu data. |

## Verification

| Check | Result |
|---|---:|
| Unit and integration tests | 1,311/1,311 passed (73 files) |
| System tests | 23/23 passed (2 files) |
| Production build | Passed |
| TypeScript | Passed |
| Lint | Passed with 9 existing warnings |
| Backup/restore fixture | Passed: database, upload, secret and overwrite refusal |
| Public menu identity | Golden Lotus 13 dishes, HaChi Kyu 132 dishes; both HTTP 200 |
| Live Ollama evaluation | 28/30 curated (93%); 34/34 natural language (100%); both met thresholds |
| Visual browser review | Not run: computer-use browser host unavailable |

The curated run had one 15-second cold-model timeout and one Burmese out-of-menu response that appears semantically correct but missed the evaluator's expected words. The latter remains recorded as a failed automated case pending native review. Results are in `eval/results/live-latest.md` and `eval/results/live-questions_natural.md`.

## Current assessment

**7.8/10 overall** as a provisional product rating; **8.5/10** for a demo and **6.8/10** for live restaurant readiness. AI responses rate **8.2/10** on the current evidence: 62/64 automated live cases passed, including all 34 natural-language cases, but the cold-start timeout and limited native review matter. The overall score remains below 9/10 because neither menu has restaurant-verified allergen records, no observed usability pilot has been completed, and retention/backup operations have not been proven on the deployment machine.

The operator and research checklist is in `docs/PILOT_RUNBOOK.md`. The next sequence is restaurant recipe checks, daily retention and backup schedule, deployment restore drill, native-language and accessibility review, larger held-out model evaluation, then an observed pilot.
