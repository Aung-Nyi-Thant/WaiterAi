# Shop AI UI/UX research

22 October 2026. Secondary desk research and repository review, translated into a Figma concept. No interviews, observed service trials or usability measurements were conducted. Vendor documentation describes available patterns; it does not prove a usability benefit for this restaurant.

## Product evidence

The existing project serves diners, waiters, chefs and owners. The user confirmed all four roles, with mobile diners first, English/Thai/Burmese, allergy warnings and staff-confirmed orders. Sources: root PRODUCT.md, docs/UI_REDESIGN_BRIEF.md, docs/SRS_Shop_AI.md, the application modules and reports/repository-analysis-2026-10-22.md. Menu examples use app/scripts/seed-data/hachi-kyu.json. Its ingredient/allergen data is estimated; this concept must not imply restaurant verification.

## Research translated into design

| Evidence | Shop AI decision | Where to inspect |
|---|---|---|
| Icons can be ambiguous without labels. [NN/g: Icon usability](https://www.nngroup.com/articles/icon-usability/) | Keep visible Menu, Ask AI, My picks and Staff labels. Separate AI questions from human calls. | 01, 03, 09 |
| Perceived responsiveness depends on delay and feedback. [NN/g: Response-time limits](https://www.nngroup.com/articles/response-times-3-important-limits/) | Say “Checking the menu…” and retain alternate actions. Do not invent percentage progress for an unknown wait. | 11 |
| WCAG 2.2 AA target size is 24 CSS px, with defined spacing and other exceptions. [W3C: Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | Choose a stricter project target of 44–56 px for frequent controls. Checkbox labels should activate the whole 44 px row. Small visual icons do not define the hit area. | 01–09, 12 |
| Normal text requires 4.5:1 contrast; large text requires 3:1. [W3C: Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Use deep leaf body text and dark warning text on pale surfaces. Color is paired with a label/icon. | 09, 12 |
| Word boundaries and wrapping vary by script, including languages without spaces between every word. [W3C: Line breaking](https://www.w3.org/International/articles/typography/linebreak.en.html) | Allow growing text containers and script-aware line breaking. Include actual Thai and Myanmar samples rather than assuming Latin metrics. | 12 |
| Written allergy information and discussion with restaurant staff support informed choices. [GOV.UK: Food allergies](https://www.gov.uk/food-allergies) | Display the known/estimated list and missing data explicitly, carry the allergy profile to staff, and never use “safe” reassurance. This is a UX reference; UK legal requirements are not asserted to apply in Thailand. | 02, 04–08, 12 |
| Kitchen systems organize tickets, elapsed time and preparation/handoff states. [Toast: KDS overview](https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html) | Show New, Cooking and Ready, large table numbers, ticket age, allergy notes and one next action. Late tickets have text as well as color. | 08 |
| Availability can be managed directly through a named sold-out state. [Square: Mark items sold out](https://squareup.com/help/au/en/article/8430-mark-items-and-modifiers-as-sold-out) | Keep availability beside each dish; surface unavailable dishes to staff and provide an alternative browsing state for diners. | 06–08, 11 |

These decisions are design inferences from the sources and product context, not measured improvements. The latest user feedback replaces the initial warm palette: interface colors are now strictly black, white and gray, with translucent surfaces, soft offset shadows, sans typography, list-based browsing and a compact language control. Food photos retain their original color as menu content.

Glass in the static vector concept uses translucent white shapes and layered shadows; actual backdrop blur is an implementation specification. For the compact language control, the visual is 50×28 px while the proposed hit area is 56×44 px; the anchored language menu has 46 px rows. Contrast and legibility must be validated against the composited background in implementation; token calculations alone do not establish whole-interface accessibility conformance.

## Role journeys

1. Diner: open table menu → browse/search → inspect portion and recipe estimates → ask AI if useful → review picks and allergy profile → send to staff → see acknowledgment awaiting confirmation.
2. Waiter: scan the floor feed → handle a guest call → review picks/allergy context → take the order → deliver ready dishes.
3. Kitchen: inspect accepted tickets → start preparing → mark ready → recall when necessary. The backend must enforce the state transitions.
4. Owner: review missing allergen data → edit dish information → control availability → preview the assistant. Other existing administrative functions remain navigation destinations, not fully redrawn workflows.

## Proposed validation

Recruit five diners across the supported languages, three floor/kitchen staff and two owners for a small formative study. This is a proposed sample, not a completed study or a statistically representative result.

| Task | Observe | Proposed success condition |
|---|---|---|
| Find a dish under a stated budget and identify its portion | Search/category use, price comprehension | Complete without assistance; correct portion and unit price |
| Set a peanut allergy and assess a dish with missing data | Interpretation of uncertainty and staff handoff | No participant interprets missing data as an allergy guarantee |
| Send two sushi pieces and one soup | Quantity editing, total, expectation after sending | Correct THB 234 total; participant expects staff confirmation |
| Handle a guest call and then a ready ticket | Scan order, missed warnings, action mistakes | Correct table/action; allergy information noticed |
| Find and repair missing owner menu data | Discoverability, edit and availability semantics | Correct dish identified and status understood |

Test on small phones, larger text, Thai/Myanmar content, keyboard/screen reader and a shared kitchen display under service conditions. Check offline menu, lost send acknowledgment, repeated taps, sold-out changes and AI delay. Establish baseline task completion/time first; no numerical improvement is claimed here.

## Limits before implementation

The concept is static. Focus, accessibility semantics, translation accuracy, responsive behavior, live updates and error recovery require implementation testing. Suggested kitchen sounds need a user-controlled setting. Restaurant owners must verify recipes, cross-contact procedures and menu content. Existing repository safety/authorization findings remain separate engineering work; changing UI copy does not fix them.
