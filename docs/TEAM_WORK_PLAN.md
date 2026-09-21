# Team work plan: 5 members, 5 parts

Each member owns one folder in `app/src/modules/` and does real tasks on it. Files in `app/src/app/` are thin wrappers (Next.js needs them there) that re-export the module code, so the work happens inside the module folders. Each module has a README with its file list and a "What I did" section that the member fills in. Every task below is a GitHub Issue: copy the title into a new Issue, assign the member, and label it with the FR it relates to.
Fill in the names in the first table.

| Member | Name | GitHub account | Part |
|---|---|---|---|
| 1 | (fill in) | Tharathon47 | Diner web app (FR-1, FR-3 diner side) |
| 2 | (fill in) | chawakron50-lab | AI waiter (FR-2) |
| 3 | (fill in) | noeysasi | Owner back office (FR-5, FR-7) |
| 4 | Natthanon Wongsai | wujieiei | Staff and orders (FR-4, FR-9) |
| 5 | Aung Nyi Thant | Aung-Nyi-Thant | Data, import, QR, insights, tests and docs (FR-6, FR-8, FR-10) |

The assignment above was a first proposal. Swap parts if the team agrees, and update this table and the Issue assignees.

## Member 1: Diner web app
Folder: `app/src/modules/diner/` (read its README.md first)
1. Check every Thai and Burmese label in `i18n.ts` with a native speaker and fix the wrong ones.
2. Test the diner page on 3 different phones and fix layout problems; list them in the Pull Request.
3. Measure the time the menu takes to load on Wi-Fi with 13 dishes (NFR-2) and write the numbers in `docs/`.
4. Add a "quantity" control on the dish detail sheet (add 2 at once).
5. Add an order confirmation message that shows the table number and the dishes sent.
6. Add a simple test to `app/scripts/e2e.py` for the picks flow with quantities.

## Member 2: AI waiter
Folder: `app/src/modules/ai/` and `eval/` (read the README.md first)
1. Add 15 new questions (5 per language) to `eval/questions.json`, including halal and spicy questions, and report the pass rate.
2. Add a rule for "spicy" questions that lists dishes tagged spicy (Thai, Burmese, English sentences).
3. Improve the Thai sentences in `ai.ts` with a Thai speaker and add tests for them.
4. Measure the AI answer time for 100 open questions and write the result for NFR-1.
5. Add a test that the model reply is replaced when it contains a wrong price or the word "safe".
6. Add a "halal" tag question handler (dishes tagged halal) using the same pattern as pork.

## Member 3: Owner back office
Folder: `app/src/modules/owner/` (read its README.md first)
1. Add a "duplicate dish" button on the menu items page.
2. Add a search box and a "missing allergen data" filter to the menu items table.
3. Add a bulk action: mark all dishes in a category sold out / on sale.
4. Add validation messages under each field of the dish form (not only one error at the bottom).
5. Add a preview of the Thai and Burmese name of a dish on the diner card inside the dish form.
6. Add tests to `app/scripts/e2e.py` for categories and specials with dates.

## Member 4: Staff and orders
Folder: `app/src/modules/staff/` (read its README.md first)
1. Add a short sound alert on the waiter and chef screens when a new call or ticket arrives.
2. Add a "recall" button so the chef can move a Ready ticket back to Cooking (server rules and a test).
3. Show "waiting time" colours on the waiter Picks tab (yellow after 5 minutes, red after 10).
4. Run the 3-phone + 2-staff-screen load test for 10 minutes (NFR-7) and write the results.
5. Make the Tables tab show the number of open calls and dishes per table.
6. Add tests for the new order rules to `app/scripts/e2e.py`.

## Member 5: Data, import, QR, insights, tests and docs
Folder: `app/src/modules/platform/`, plus `app/scripts/` and `docs/` (read its README.md first)
1. Write a step-by-step install guide (Mac and Windows) and test it on a clean computer.
2. Add a database backup script (`npm run db:backup`) that copies `shop.db` with a date in the file name.
3. Test photo import with 5 different real menu photos and record accuracy in `docs/` (target 90%).
4. Add an "export insights to CSV" button.
5. Add a QR page option to print a table-tent layout (QR + restaurant name).
6. Keep `docs/SRS_Shop_AI.md` and the traceability matrix in sync with the code and add screenshots.

## Everyone
- Review at least 2 Pull Requests from other members.
- Add your part to the AI usage log if you used an AI tool.
- Prepare a 3-minute explanation of your part for the oral exam: what it does, which files, one bug you fixed.
