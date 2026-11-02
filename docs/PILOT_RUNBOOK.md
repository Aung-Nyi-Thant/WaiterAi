# Shop AI pilot readiness and verification

The demo menu is research based. Its allergen lists are estimates. A real restaurant must check its recipes, ingredient packaging, substitutions and preparation before offering allergy-profile suggestions. The code now requires a restaurant check for those suggestions; it cannot inspect a kitchen.

## Research that shaped the release gates

- The [UK Food Standards Agency's guidance for non-prepacked food](https://www.food.gov.uk/business-guidance/allergen-information-for-non-prepacked-foods-best-practice-voluntary-information) recommends current recipe and ingredient records, supplier checks, staff access to those records, and a conversation when consumers ask about allergens. This is a design benchmark, not a statement of Thai legal requirements.
- [WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) adds focus visibility and target-size requirements. Its [animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) supports reduced-motion controls for nonessential motion. The liquid-glass design must keep readable text and visible focus without motion.
- [SQLite documents `VACUUM INTO`](https://www.sqlite.org/lang_vacuum.html) as a consistent snapshot of a live database. The backup script uses it, checks integrity and hashes the snapshot files.
- The [NIST AI Risk Management Framework resource center](https://airc.nist.gov/) emphasizes testing, evaluation, verification and validation. Our saved scores measure only the question sets used; the live model and new holdout questions still need a fresh run.

## Before a diner pilot

| Gate | Person and evidence | Pass condition |
|---|---|---|
| Restaurant identity | Owner compares `/r/<slug>` with the printed menu and table QR codes | Names, prices, availability, photos and QR destinations match the actual restaurant. Demo restaurants remain demo only. |
| Each dish's allergen data | Chef or owner checks current recipe/version, supplier labels, substitutions and cross-contact; enters a note in Owner → Menu before ticking verified | Every live dish has a current check or stays clearly estimated/unknown. A check expires after 180 days or an ingredient/list edit. |
| Allergy handoff | Waiter discusses the allergy with the diner and kitchen; chef checks recipe, labels and cross-contact | Both confirmations appear before the order can enter the kitchen; timestamps are recorded on the order. A checkbox is an acknowledgment, not proof of food safety. |
| Thai and Burmese | Native speakers review diner, staff and AI fixed sentences, including allergy and privacy wording | No wording implies a dish is guaranteed safe. Record corrections in the app and rerun tests. |
| Diner and staff usability | Test the tasks below on a phone and the actual staff devices | No critical allergy or order handoff error; at least 90% task completion without help, measured per role and language. These are proposed pilot thresholds, not achieved results. |
| Accessibility | Keyboard, screen reader, 200% text, reduced motion and contrast checks on the four roles | Focus stays visible, targets are usable, motion is optional, all information remains readable. Automated tests alone do not establish WCAG conformance. |
| AI quality | Run live evaluation against the chosen local Ollama model on both 13 and 132 dish menus, then a new holdout set | No unsafe allergy claim or invented price/dish; meet `eval/thresholds.json` on each language. Review failures manually. |
| Privacy and recovery | Operator schedules cleanup and backup, then restores to a new `DATA_DIR` | No raw chat older than 30 days in the live database or retained backups; restored menu, uploads, login and order flow work. |

### Usability tasks

Ask at least five diners in each supported language to find a dish, change language, set an allergy profile, ask AI about a dish, review uncertainty, send picks and call staff. Ask a waiter to handle an allergy order and a chef to check and start it. Ask the owner to verify a recipe with evidence, correct a price, export chat and locate the deletion control. Observe without coaching; record task completion, hesitation, misread allergen status and any wrong tap. Test a 13-dish and 132-dish menu.

## Operations

From `app/`, with the production `DATA_DIR` set:

```sh
npm run db:prune-chat
npm run db:backup
npm run db:restore -- /absolute/path/to/snapshot-... /absolute/path/to/new-restored-data
```

Schedule `db:prune-chat` daily and run it before each scheduled backup. Chat requests and owner insights also prune expired raw messages, at most once an hour per server process. The owner can download or delete the restaurant's chat history from Insights. Orders are separate and still need a restaurant-specific retention policy.

`db:backup` writes a restricted snapshot under `BACKUP_DIR` (default: `shop-ai-backups` beside `DATA_DIR`) with `shop.db`, `secret`, uploads and a checksum manifest. Store backups on protected storage. Remove backups that contain raw chats after 30 days, or use a separate controlled retention and deletion process before promising the 30-day policy. The script does not automatically delete backups. Backup and upload copying are not one atomic transaction; avoid upload changes during a scheduled snapshot.

`db:restore` refuses to overwrite an existing directory. Stop the app, restore to a new directory, inspect it, then start the app with `DATA_DIR` pointing there. Verify owner and staff login, menu photos, one test order and bill. Keep the original data until the restore has passed. The automated test covers an isolated database, upload and secret; it is not a production restore drill.

## Evaluation commands

`npm run eval:live -- --write` uses the 13-dish demo; `EVAL_QUESTIONS=questions_natural.json npm run eval:live -- --write` runs everyday wording. Run the sushi set against `/r/hachi-kyu` with `EVAL_SLUG=hachi-kyu EVAL_QUESTIONS=sushi_menu_questions.json npm run eval:live -- --write`. The script uses owner preview mode so test questions are not stored as diner chats. Run only while the chosen Ollama model is serving, and compare results with the prior baseline and a new holdout set. A score on a set used to develop the rules is not a deployment claim.
