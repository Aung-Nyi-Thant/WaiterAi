# Monochrome glass design handoff

[Open the separate Figma redesign page](https://www.figma.com/design/I8QdPoylgnQLxNT9FlyAWJ/Shop-AI?node-id=60-8). Page: **UI UX Redesign · Restaurant Studio**. The original Page 1 and application source were not changed by this redesign work.

## Delivered

Nine task/state screens: diner menu, dish detail, AI conversation, review picks, sent-to-staff acknowledgment, waiter floor feed, owner menu, kitchen board and an open compact language chooser. Four supporting boards: design foundations, research decisions, loading/recovery states and language/allergy samples. [Research](RESEARCH.md), [design rules](DESIGN.md), [local gallery](index.html) and [complete SVG board](shop-ai-redesign-board.svg) accompany the Figma page.

Visual direction: strictly black/white/gray interface chrome, Helvetica Neue typography, quiet rules and horizontal menu rows. Floating navigation and selected surfaces use translucent white with soft vector shadows. The old colored AI banner and card grid are removed. Food photographs retain their original colors as menu content. The compact EN/chevron control is 50×28 px visually, with a proposed 56×44 px hit area; the anchored English/Thai/Burmese menu uses 46 px rows.

## Editing and fidelity

The board was imported as grouped vector/shape layers and English text, with embedded dish photographs. It is not a flattened screenshot. Thai/Myanmar sample lettering uses shaped vector outlines so it renders reliably; the original Unicode remains in SVG title/aria-label attributes and build_design.py. Replace these outlines with native text using suitable Noto fonts when building a reusable Figma library; have a native speaker review translations.

The imported concept has no component variants, token bindings, auto-layout or wired prototype connections. Glass depth is drawn with editable translucent shapes and layered vector shadows. Actual 16 px backdrop blur is specified for implementation, not supplied as interactive runtime behavior; reduced-transparency uses opaque white. The design foundations board and local token documentation specify the intended system. Mobile menus imply a scrolling content area above persistent navigation; the board clips each screen to its stated viewport. These drawings do not demonstrate actual scrolling or responsive reflow.

## Product details to preserve

- A diner sends picks to staff; “Sent to staff” is an acknowledgment, not a confirmed order.
- Ask AI, Call staff and Send to staff are separate actions.
- Allergy profiles travel with picks and accepted tickets. Missing or estimated ingredient data never becomes an assurance of safety.
- Salmon Sushi is THB 96 per piece; the reference photo shows more than one piece. Two pieces plus a THB 42 soup total THB 234.
- Counts, table numbers, ticket times, service status and warning totals are illustrative scenario data. Menu names and prices come from the project seed; recipes still require restaurant verification.
- Frequent controls target at least 44 px. Every allergy label row is one 44 px hit area in implementation; the checkbox square is only its visual mark.

## Review and next implementation work

Independent fresh finish review of this monochrome revision: **ship at concept scope**. The bounded follow-up confirmed estimated allergen provenance is visible before quick-add and the owner banner no longer asserts unsupported filtering guarantees. Production accessibility, live behavior, runtime blur and translations were outside the review.

Before production: build reusable components and auto-layout, wire and test flows, adapt larger text/small screens, implement keyboard/focus/screen-reader behavior, validate menu/allergy data and enforce existing order authorization/state rules. No application implementation or deployment is included in this delivery.

## Sources and reproduction

Public food photographs are the URLs already recorded in app/scripts/seed-data/hachi-kyu.json; see assets/provenance.json. They are reference assets, not a new rights grant for public marketing. Other raster files are local renders of the authored SVG drawings. No generated imagery was used.

Run `python3 design/ui-ux-redesign/build_design.py` on the current macOS environment to regenerate SVGs, PNG previews and gallery. The generator uses PyMuPDF and CoreText/Quartz for native-script shaping. Source SVGs retain editable geometry; do not substitute PNG previews as the Figma deliverable.
