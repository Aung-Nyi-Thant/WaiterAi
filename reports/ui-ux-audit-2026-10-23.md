# Shop AI UI and UX audit — 23 October 2026

## Scope

I inspected the running local site at `localhost:3000` in a phone-sized browser and at 1440 × 900 desktop width. The walkthrough covered the diner menu, Ask AI, allergy profile, dish detail and picks; floor-staff feed; kitchen board; and owner menu. I also checked the relevant React/CSS and ran the Impeccable detector against the diner, kitchen and owner menu components. The detector returned no findings; the issues below come from the live task walkthrough and source review. This is a heuristic review, not a usability study with diners or restaurant staff.

## Priority findings

| Priority | Finding and observed evidence | Recommended change |
|---|---|---|
| P0 (local data) | The diner and owner screens say **Golden Lotus Kitchen**, but display the 132-dish HaChi Kyu menu, beginning with `[Coke Combo] Yakisoba with Coke`. The current local database therefore presents the wrong restaurant identity for its menu. This may be a local seed/configuration problem; I did not establish that other installations have it. | Restore a consistent demo dataset before further user testing. Add a data smoke check that restaurant name, slug and menu fixture match. |
| P1 | The owner menu reports **“Allergen data complete 95 of 132 dishes.”** The HaChi Kyu data is based on typical recipes and product information, not the kitchen's verified recipes; `reports/dish-data-research-2026-10-23.md` documents this. “Complete” and **“None listed”** can read as verification. | Introduce a visible status: `Unverified estimate`, `Kitchen verified`, and `Unknown`. Count only kitchen-verified records as complete. Never use a zero-allergen estimate as a safety assurance. |
| P1 | With **gluten** saved in the diner allergy profile, a gluten-containing Yakisoba detail still offers a prominent **“Add to my picks”** button. After adding it, a transient toast names the conflict, but the persistent My picks review only says **“Your allergy profile: gluten”**; it does not say that this selected dish lists gluten. | Show a persistent item-level conflict beside the dish name in the detail and picks review. Put a clear confirmation/ask-staff step before sending a conflicting pick. Preserve staff confirmation before kitchen acceptance. |
| P1 | Opening Ask AI expands five explanatory bullets and suggestion chips above the composer. On the inspected phone viewport, the message input sat below the first screen and required scrolling. | Keep one short safety line in the chat header, place full guidance in a disclosure, and keep the composer visible above the bottom navigation. Focus the field on open when appropriate. |
| P1 | The kitchen shows three large `Empty` panels before **Sold out today**, then a flat list of 132 dish switches without search or grouping. The stock task is several screens of scrolling away from the top. | Collapse empty columns, move stock control to a dedicated searchable section or drawer, group by category, and pin currently sold-out items first. |
| P1 | Thai and Burmese menus still show allergen chips such as **“gluten,” “fish,” “soy”** in English. The Burmese menu also falls back to English for many dish names and descriptions; some interface copy mixes English words such as “Allergens.” | Localize safety-critical allergen terms everywhere, with the local term and optional English in parentheses. Complete or explicitly label untranslated restaurant content; test long Burmese/Thai lines on narrow phones. |
| P2 | The first diner viewport allocates most space to the brand heading, Ask AI, search, categories and allergy profile. Only part of the first dish card is visible, and the initial category is Sets & Combos, including sets whose contents are unknown. | Tighten the header and discovery controls, then put an appealing, well-documented dish or a curated category in the first viewport. Keep AI available as a secondary path. |
| P2 | The live floor feed showed two identical Table 5 picks aged **1147** and **1139 minutes**, while its status was labeled Live. The large raw minute values and duplicate cards undermine confidence in the queue. | Show age as `19 h` or a timestamp after an hour, distinguish stale from new work, and provide an archive/escalation state for old pending picks. Check why the local demo contains duplicate stale items. |
| P2 | The requested black/white/gray visual direction is undercut by the page-wide blue, peach, mint and lavender gradients in `--app-backdrop`. Glass cards, pill shapes and large shadows are repeated across most surfaces, making urgent and ordinary content look similarly weighted. | Limit UI chrome to grayscale, keep food photographs as the controlled source of color, reduce shadows on routine rows, and reserve strong depth for dialogs and primary actions. |
| P2 | The water-motion layer applies 0.5–0.75 second entrances and staggered child animations to panels, pages, cards and chat; the earlier CSS comment promises under 300 ms. The animated surface can delay scanning for frequent staff actions. | Keep the water character for the Ask AI expansion and major transitions. Use short press feedback and immediate status changes for operational controls. Keep the existing reduced-motion support. |

## Strengths to preserve

- The language control is compact, legible and easy to find.
- The diner has an explicit review step and distinguishes picks sent to staff from an accepted order.
- Staff views show connection state, and the application includes reduced-motion and reduced-transparency rules.
- Key actions generally have text labels, not icons alone.

## Suggested implementation order

1. Fix the local restaurant/menu identity and correct allergen verification language.
2. Make the matched-allergen warning persistent through the picks review and sending decision.
3. Bring the Ask AI composer into view on open and simplify its first-run copy.
4. Make kitchen stock control searchable; clean up stale floor-queue states.
5. Finish safety-critical localization, then refine the grayscale visual and motion system.

Reference points: [Nielsen Norman Group usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) emphasize visible status, error prevention and recognition over recall; [W3C WCAG 2.2 status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) explains how dynamic feedback should be announced. I have not claimed a WCAG failure without a full accessibility test.
