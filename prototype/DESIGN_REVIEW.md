# Shop AI prototype design review

This exploration changes the standalone `prototype/` and adds a landing page. The production Next.js application is not restyled. Choose a landing direction using the comparison picker before promoting it into the production app.

## Direction and content

Taste-skill v2.1.5 dealt **The split stage**, seed **989760552**. The Table direction carries the persistent image/reading split; Service and Workspace deliberately explore different hierarchy and density through the prototype skill. The app screens use the **Framed sheet** direction. The project's monochrome palette and Helvetica Neue / Thai / Myanmar font support are retained. No directions were redrawn. The generated striped hero treatment was omitted because the existing brand has no stripe; the working menu supplies the visual material instead.

The source inventory is HaChi Kyu, Table 5, its sushi menu and actual prices, Thai/Burmese/English interface labels, browser-shared demo data, diner picks, waiter acceptance, kitchen preparation, owner menu controls, and recipe estimates that require staff confirmation.

**Idea:** On this page, HaChi Kyu's Table 5 becomes the shared point of view connecting the diner, the floor and the kitchen.

**Live interaction:** Select dishes from the reference menu, see their total, switch language, and change the restaurant role being previewed. Preview picks are deliberately separate from the diner order flow. Each role links to its existing working demo.

The copy's argument is: show the menu and its languages; show each person's perspective; explain staff confirmation before preparation; answer practical demo questions; invite the visitor into Table 5. There are no invented testimonials, customer counts or performance claims. The example ticket is illustrative: two Salmon Sushi at ฿96 plus one Miso Soup at ฿42 total ฿234.

## Checks

- Fourteen tests passed across `prototype.test.ts` and `prototype-design.test.ts`.
- `npm run typecheck` passed.
- New landing source and the app design layer passed taste-skill source lint with no findings.
- Browser interaction checks covered all three landing variants at 1440, 768 and 390 pixels, with no page-level horizontal overflow or uncaught JavaScript exceptions.
- Browser checks exercised preview quantities and totals, Thai switching, all four role previews, FAQ disclosure, reduced motion, and opening `index.html` directly from disk.
- The browser journey passed: diner sends picks → waiter accepts → chef starts cooking → chef marks ready. Owner sign-in, section navigation at three widths and a menu edit synchronized through shared demo storage.
- Final rendered inspection: Service and Workspace have no failures; remaining warnings concern the number of type sizes, including interface fragments and the oversized footer wordmark, and the absence of footage. No restaurant footage exists in the supplied assets, so a stock clip was not added.
- The diner screen's final rendered inspection has no failures or warnings. Before the redesign, the same inspector found five failures: a gradient, button shadows, heavy panel shadows, repeated tinted icon containers, and a missing page title.
- Table inspection permits `covered-text` only because the required floating prototype picker can pass over content while scrolling. The picker belongs to the comparison harness, not the product. All actual product overlays and viewport layouts remain checked. Its narrow reading column and lower-resolution reference photographs are the main visual compromises.

Generated screenshots, machine-readable inspection reports and the browser check script are stored locally in `.taste-skill/`, which is excluded from Git. This is a static prototype; there is no production bundler step to validate for these files. No production backend, AI model, payment flow, deployment or assistive-technology audit was run.

## Screenshot critique

### Service, final round

Seen in one second: the Table 5 menu beside “Every table. In good hands.”

Idea: the table connects a multilingual menu and the restaurant team.

Live thing: menu quantities and language, followed by role switching.

Layout words by section: hero=split / food=strip / experience=working preview / handoff=dark statement / questions=disclosures / close=invitation / footer=wordmark.

Scores: design 7.5 · usability 8 · creativity 7 · content 8 → overall **7.6**.

Caps applied: the concept is specific in its menu content and workflow, but the category could reuse its structure; creativity is capped at 7.

Top three problems and fixes:

1. The first tablet hero wrapped to three lines (`service/tablet-fold.jpg`). The tablet now stacks the introduction and menu, preserving a two-line title.
2. Inherited app navigation distorted the comparison picker (`service/desktop-fold.jpg`). App navigation rules are now scoped to `#app`.
3. The first page repeated its menu without enough independent imagery (`service/desktop-page-01.jpg`). A short food strip now carries four existing reference photographs.

Remaining compromise: Service is the longest version; the secondary menu preview repeats content in order to make role comparison useful.

### Table, final round

Seen in one second: the HaChi Kyu food mosaic and a restaurant-led introduction.

Idea: keep the food present while the visitor reads the service story.

Live thing: role and menu preview in the reading column.

Layout words by section: hero=sticky split / experience=vertical preview / handoff=statement / questions=list / close=invitation / footer=wordmark.

Scores: design 7 · usability 7.5 · creativity 7 · content 8 → overall **7.3**.

Caps applied: the floating comparison picker is a sanctioned prototype overlay; the food references limit image fidelity. Creativity is capped at 7.

Top three problems and fixes:

1. The tablet photo field had too much empty ground (`table/tablet-fold.jpg`). Its minimum height is reduced at tablet widths.
2. The mobile handoff paragraph was too large for three lines (`table/mobile-page-01.jpg`). It now uses the mobile statement size of 24px.
3. The outer photo inset did not align with the page frame (`table/desktop-fold.jpg`). It now uses the same outer gutter as the navigation.

Remaining compromise: the narrow reading column uses more vertical space, and enlarging 256px reference images reveals their resolution.

### Workspace, final round

Seen in one second: the connected service headline and role controls.

Idea: let the visitor work through each side of the table immediately.

Live thing: the role switcher and functioning menu preview.

Layout words by section: hero=compact introduction / experience=workspace / food=strip / handoff=statement / questions=disclosures / close=invitation / footer=wordmark.

Scores: design 7.5 · usability 8 · creativity 6.5 · content 8 → overall **7.5**.

Caps applied: a familiar product-demo composition; creativity remains 6.5.

Top three problems and fixes:

1. The role preview needed an explicit real destination. Each perspective links to the relevant diner, staff or owner journey.
2. Replacing a role panel could lose keyboard focus. Focus returns to the selected role control after rendering.
3. On phones the preview competed with the introduction. It now stacks below a shorter introduction and uses full-width controls.

Remaining compromise: less restaurant atmosphere than Table, and the full preview requires scrolling on a phone.

## Images and design-hook triage

All six photographs are existing repository assets copied from `design/ui-ux-redesign/assets/`. Their original source URLs and hashes are recorded in `assets/provenance.json`; a footer credit links to that file. They are menu reference images, not newly commissioned photography. No generated images or newly sourced footage are used.

| Reference image | Source | Creator / license supplied by project |
|---|---|---|
| Salmon Sushi | HaChi Kyu menu / Wongnai | Not supplied |
| Seared Salmon Sushi | HaChi Kyu menu / Wongnai | Not supplied |
| Tuna Sushi | HaChi Kyu menu / Wongnai | Not supplied |
| Edamame | HaChi Kyu menu / Wongnai | Not supplied |
| Gyoza | HaChi Kyu menu / Wongnai | Not supplied |
| Miso Soup | HaChi Kyu menu / Wongnai | Not supplied |

Confirm reference-image reuse rights before a public launch. Other menu photos still rely on the original remote host; when unavailable, the existing category-icon fallback remains. Those icons are fallback states, not replacement product photography.

The design hook's warm colored shadow/glow finding was fixed in the original prototype CSS: resting shadow tokens were cleared, the warm language-control shadow removed, and yellow focus glows replaced by visible outlines. The specified comparison picker's neutral shadow remains intentionally. A source-lint comment on `backdrop-filter: none` documents removal of inherited blur; it does not enable a visual effect.

The later `overused-font=Helvetica` warning is an intentional exception scoped to `prototype/design.css` in `.impeccable/config.json`. Helvetica Neue follows the existing typography tokens in `design/ui-ux-redesign/DESIGN.md`. Other values, files and detector rules remain active; no glow finding is suppressed.
