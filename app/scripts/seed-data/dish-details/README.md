# HaChi Kyu dish details

The prototype's menu (`prototype/data.js`) has each dish's name, price, category and photo, and a short ingredient list that was a guess.
This folder holds what was researched on top of that: what each dish is made of, a description, Burmese names, and where each claim comes from.
`scripts/make-hachi-kyu-seed.mts` merges the two into `../hachi-kyu.json`, which the seed script loads.

## What is and is not known

Nobody publishes this restaurant's recipes (a search for the restaurant and for its set names found nothing). So every dish is described **as it is
usually made**, from recipe and product-label pages for that dish, not as this kitchen makes it. The FAQ that the seed adds says so, and the AI
quotes it. Where a sauce, a dressing, a set or a house recipe is not known, the dish says so and its allergens are stored as **not provided**,
never as "none". This follows `docs/AI_SAFETY.md` R3.

## Files

- `components.json` has the building blocks (`sushirice`, `soysauce`, `tempurabatter`, `crabstick` ...). Each has its name in English, Thai and
  Burmese, the allergens a typical version contains, `vegetarian`, `pork`, `unknown` where relevant, and `basis`: which source (`S1` ...) supports
  it. The sources are listed at the top of the file with their links.
- `sashimi-sushi.json` and `kitchen.json` describe each dish by its English name: `parts` (the components it is made of), `desc` in English and
  Thai, an optional Burmese name `name_my`, `spice` and `tags`.

## How a dish is built

- Its ingredient lines (English, Thai, Burmese) are its parts in order. A part with no name (`unknownpart`) only marks "not everything is listed".
- Its allergens are the **union** of its parts' allergens. If any part is `unknown`, the allergens are `null` (not provided).
- `contains_pork` comes from a part marked `pork`; `vegetarian` only when every part is marked vegetarian and nothing is unknown.
- A Burmese name is left empty where it is not certain; the app then shows the English one. Burmese descriptions are not written: the English
  description is shown. A native speaker should extend both.

## Changing it

Edit the JSON here, then run `node --experimental-strip-types --no-warnings scripts/make-hachi-kyu-seed.mts` (`--check` only compares). The tests
(`tests/hachi-kyu.test.ts`) check that every dish has details, every part exists and has a listed source, a dish's allergens are exactly the union of its
parts', and `unknown` dishes are `null`. To load the result into a database: `npm run db:seed:hachi` (a second restaurant) or
`npm run db:seed:hachi:into` (add to Golden Lotus) with `-- --replace` to remove the restaurant's current dishes first.
