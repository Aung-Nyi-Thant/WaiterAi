# Shop AI UI and UX improvement — 23 October 2026

## Design direction

The interface now follows a monochrome restaurant menu: black type, warm white and gray surfaces, food photography as the main source of color, fine separators, and restrained glass on controls and floating panels. Dish cards are editorial rows instead of repeated translucent tiles. The compact language control and water-like motion remain, but frequent transitions are shorter.

This work responds to the [live UI/UX audit](ui-ux-audit-2026-10-23.md). It covers the diner, floor, kitchen, and owner paths in the production React app. It is a heuristic redesign, not a usability study with diners or restaurant staff.

## Research translated into decisions

| Evidence | Design decision |
|---|---|
| [Nielsen Norman Group's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) emphasize visible status, error prevention, and recognition. | Put a matched allergen beside its dish in the detail and picks review; label old floor picks; make sold-out dishes and counts immediately visible. |
| [NN/g on confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/) recommends confirmation for serious consequences and clear, specific wording. | Send a pick with a matched or unknown allergen through an explicit review with “Send for staff to check.” Staff still confirm orders before the kitchen receives them. |
| [W3C focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) addresses focused controls hidden by persistent UI. | Shorten the first Ask AI explanation to one visible safety line and keep the longer guidance in a disclosure, reducing the chance that the composer is pushed beneath the mobile navigation. |
| [W3C animation from interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions) and [reduced-motion technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html) support purposeful, optional motion. | Keep the drop expansion for Ask AI and shorter press/page feedback. Preserve reduced-motion rules for page, sheet, and AI transitions. |
| The project's [dish research report](dish-data-research-2026-10-23.md) describes typical-recipe estimates rather than verified kitchen recipes. | Replace “allergen data complete” and “none listed” in the owner UI with “entries recorded” and “no allergens recorded,” plus recipe/label verification guidance. |

## Implemented changes

| Area | Change |
|---|---|
| Diner menu | Neutral page background, simpler dish rows and tags, tighter title/AI/search spacing, and a smaller language button. Thai allergen chips use the existing Thai allergen names. |
| Dish and picks | Matched or unknown allergen data stays visible in the detail and on each affected pick. The floating send action opens review for these picks. Review has an item-specific warning and a staff-check action; a failed send leaves the review open. |
| Ask AI | A short safety sentence is shown first; the full explanation opens on demand. Chat space is capped so its composer appears sooner on a phone. |
| Floor and kitchen | Sold-out control has search, counts, sold-out-first ordering, and progressive disclosure of the available list. Old picks are labeled and shown in hours. Empty kitchen columns show brief text; a completely empty board uses one explanatory panel. |
| Owner menu | Allergen meter describes recorded entries, not safety verification. Empty data no longer implies that a dish has no allergens, and the form asks staff to check recipes and supplier labels. |
| Motion | Most frequent page and sheet entrances now finish in roughly 0.3–0.4 seconds. Reduced-motion behavior remains. |

## Verification

| Check | Result |
|---|---|
| Full Vitest suite | 1,268 passed across 66 files |
| System suite | 23 passed across 2 files |
| TypeScript | Passed |
| Production build | Passed |
| Biome lint | Passed with five existing warnings, no errors |
| Browser visual review | Local app returned 200 and loaded in Chrome, but the computer-use screenshot returned a blank image; the final pixels could not be inspected reliably in this session. |

## Remaining decisions

- The local database currently shows a HaChi Kyu menu beneath the Golden Lotus Kitchen identity. It may be intentional demo seeding; changing owner data without confirmation would risk data loss. Align the restaurant name and menu before moderated testing.
- The allergen entries are research-based estimates until the kitchen checks actual recipes, substitutions, and supplier labels. The UI now avoids claiming verification, but the data model does not yet distinguish verified, estimated, and unknown entries.
- Burmese allergen chip names remain English in the existing product convention. The new Burmese safety sentences and long-line layouts still need native-speaker review and a visual pass on narrow phones.
- The floor now identifies old picks, but the local duplicate pending picks require an operational decision on archiving or escalation.
