---
name: Shop AI — Monochrome Glass concept
description: Figma-only monochrome restaurant UI with precise typography, menu rows and floating glass surfaces.
colors:
  canvas: "#F5F5F5"
  white: "#FFFFFF"
  ink: "#141414"
  secondary: "#626262"
  action: "#151515"
  soft: "#EAEAEA"
  line: "#DEDEDE"
  warning-ink: "#242424"
  warning-surface: "#EEEEEE"
  notice-ink: "#303030"
  notice-surface: "#E8E8E8"
  kitchen-dark: "#111111"
  inverse-secondary: "#D0D0D0"
  sidebar-divider: "#555555"
  shadow: "#000000"
  glass: "rgba(255, 255, 255, 0.94)"
  popover-glass: "rgba(255, 255, 255, 0.98)"
  glass-stroke: "rgba(255, 255, 255, 0.92)"
typography:
  display:
    fontFamily: "Helvetica Neue, Arial, sans-serif"
    fontSize: "35px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 550
    lineHeight: "20px"
  button:
    fontFamily: "Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  navigation:
    fontFamily: "Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 650
rounded:
  checkbox: "5px"
  language: "6px"
  action: "8px"
  search: "9px"
  compact: "10px"
  panel: "12px"
  floating-action: "14px"
  navigation: "16px"
spacing:
  half: "4px"
  base: "8px"
  small: "12px"
  medium: "16px"
  inset: "20px"
  gutter: "24px"
  large: "32px"
  board-gutter: "56px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.action}"
    height: "48px"
  button-soft:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.action}"
    typography: "{typography.button}"
    rounded: "{rounded.action}"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.white}"
    textColor: "{colors.action}"
    typography: "{typography.button}"
    rounded: "{rounded.action}"
    height: "48px"
  search-field:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.search}"
    height: "46px"
    width: "342px"
  language-visual:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.language}"
    width: "50px"
    height: "28px"
  language-popover:
    backgroundColor: "{colors.popover-glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    width: "170px"
    height: "158px"
  allergy-notice:
    backgroundColor: "{colors.notice-surface}"
    textColor: "{colors.notice-ink}"
    rounded: "{rounded.action}"
  diner-navigation:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.secondary}"
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    width: "358px"
    height: "70px"
---

# Design System: Shop AI — Monochrome Glass concept

## Overview

**Creative North Star: "Monochrome Glass"**

A restaurant menu with precise typography and calm utility. Black, white and gray interface chrome makes food photography the content focus. Spacious horizontal dish entries, understated category underlines and a compact language control replace the prior warm direction. AI remains a labelled destination instead of an oversized menu banner. Select floating surfaces carry translucent white and soft offset depth.

This document describes only this directory's current static concept, extracted from `build_design.py`, `screens/*.svg` and preview boards on 22 October 2026. The user's monochrome revision in `SURFACE_BRIEF.md` replaces the previous warm concept. Tokens are normative for these drawings only; they do not authorize a production-app restyle or change root design authority. The root `PRODUCT.md` still constrains allergy handling, multilingual access and staff confirmation.

**Key Characteristics:**

- Achromatic interface chrome; food photographs retain their source color.
- Helvetica Neue hierarchy, menu rows and underlined categories.
- Compact language control with an accessible proposed hit area.
- Floating glass navigation and selected operational surfaces.
- Explicit recipe estimates, allergy uncertainty and staff confirmation.

## Colors

All interface tokens are black, white or gray. `action` fills primary buttons; `ink` is default text; `secondary` is supporting copy. `soft` groups subdued controls. `notice-surface` with `notice-ink` carries allergy context, missing data and stale-menu notices; `warning-surface` with `warning-ink` carries delivery failures, estimated-allergen cautions and late tickets. Their meaning depends on written labels and icons, not hue.

The owner sidebar uses action black, inverse secondary labels, notice ink for selection and sidebar divider for separation. Kitchen dark anchors the kitchen header. White and canvas form the base. Glass, popover glass and glass stroke are separate translucent treatments; shadow is black. The generator retains old internal keys such as `green`, `amber` and `red`, but their current values are achromatic; those names do not imply colored UI.

Contrast must be checked against actual composited backgrounds and interactive states in implementation. AA body contrast is the intended requirement. Pale borders alone do not establish control boundaries or focus. Never use a status badge to imply that a dish is allergy-safe.

## Typography

The interface and display stack is **Helvetica Neue, Arial, sans-serif**. The foundations board establishes body 16/24 and labels 13/20. SVG text at 24 px and above uses -0.025em tracking; smaller Latin text uses zero tracking. Explicit SVG baselines are drawing coordinates, not automatic browser line heights.

| Role | Observed treatment |
| --- | --- |
| Restaurant | 35 px / 600; small Shop AI wordmark is 16 px / 650. |
| Task titles | Dish 28 px / 550; sent state 32 px / 550; floor 34 px / 550; owner 38 px / 550. |
| Section title | 24 px / 600; food-row title 18 px / 550. |
| Body / supporting | 16 px / 400; compact secondary text 11–15 px. |
| Controls | Buttons 15 px / 600; pills 13 px / 550; language visual 12 px / 550; popover options 15 px / 400. |
| Navigation | 11 px labels, active 650, inactive 400. |
| Operations | Table numbers 25 px / 650; prices 17–25 px / 600–650. |
| Presentation | Board headings 40–43 px; comparison-board title 58 px. These are not application heading defaults. |

The foundations board proposes Noto Sans Thai and Noto Sans Myanmar for localized implementation. Actual Thai samples are shaped with installed **Thonburi**, Burmese samples with **Noto Sans Myanmar**, then converted to vector glyph outlines. Unicode source remains in `build_design.py` and SVG group titles/labels. Outlines are not editable text fields or evidence of runtime font coverage; the shaping helper does not preserve requested sample weight.

Use live Unicode, language metadata and script-aware font stacks in implementation. Let Thai/Myanmar labels and notices grow vertically. Avoid forced Latin line breaks, clipped diacritics and truncated allergy text. Native-speaker review is required for wording, shaping and numeral conventions. Burmese numerals in the sample are illustrative locale formatting.

## Layout

### Drawn geometry

| Surface | Fixed drawing | Key geometry |
| --- | --- | --- |
| Six diner screens/states | 390 × 900 px | Menu, detail, chat, review, sent and language-open state; 24 px side gutters and 342 px content width. |
| Menu | 390 × 900 px | Search x=24, y=173, 342 × 46; category labels baseline y=253 with 2 px selected underline; allergy row follows the divider at y=272. |
| Dish rows | Full 342 px content span | 112 × 112 px photos at x=24; text begins x=156; first rows begin y=369 and y=520; 44 × 44 px add actions at x=322. The next category continues below the viewport. |
| Navigation dock | 358 × 70 px | x=16, y=814; 16 px radius, four equally spaced icon-and-label destinations, small active dot. |
| Language visual | 50 × 28 px | x=310, y=48; proposed centred 56 × 44 px hit area. |
| Language-open state | 390 × 900 px | 170 × 158 px anchored popover at x=196, y=86; English, Thai and Burmese options on 46 px row pitch. |
| Dish detail | 390 × 900 px | Contained 240 × 192 px reference image; flat body begins y=296; floating action surface x=16, y=801, 358 × 88. |
| Review / sent | 390 × 900 px | Review floating footer x=16, y=782, 358 × 102; sent summary x=24, y=392, 342 × 209. |
| Floor staff | 430 × 932 px | 24 px gutters; 382 px wide picks panel; 44 px action buttons; bottom glass availability panel 398 × 88 at x=16, y=824. |
| Owner | 1440 × 960 px | 224 px sidebar, 76 px header; main x=264, width=1136; table rows 84 px with 60 px thumbnails. |
| Kitchen | 1280 × 900 px | 28 px gutters; three 392 px columns with 24 px gaps; 352 px wide ticket actions. |
| Four supporting boards | 1440 × 960 px each | 56 px outer gutters; explanatory material, not responsive application views. |
| Complete board | 3240 × 4490 px | Thirteen named drawing groups, clipped to their individual viewports. |

The foundations board states an 8 px rhythm. Recurring values include 4, 8, 12, 16, 20, 24 and 32 px; exact positions include optical and content-specific exceptions.

### Responsive guidance — proposed, not demonstrated

Do not scale the whole SVG as an app interface. Preserve readable text and minimum hit areas while allowing rows to grow. On very narrow screens reduce image footprint or stack row content when needed; keep portion, estimate, price and add action associated. Let categories scroll or wrap accessibly rather than compressing text.

Reserve scroll padding for floating docks and footers, safe areas and the keyboard; content visible behind a dock in the drawing must remain reachable by scrolling. Chat needs keyboard-aware composer placement. Keep the language menu anchored within the viewport and let localized options expand as necessary. Reflow the owner sidebar/table into accessible narrow-screen navigation and labelled rows. Validate kitchen horizontal scrolling or a single-stage view with users. **No responsive application breakpoints are established.** The gallery's 600 px preview rule is not an app breakpoint.

## Elevation & Depth

Glass is **simulated in vectors**, not implemented backdrop blur. `Canvas.glass` draws a white surface at 94% opacity, or 98% for the language popover, with a 92% white stroke and a white top highlight. It places **28 low-opacity black rounded layers** behind the surface: for step 28 down to 1, growth is `step × 0.5 px`, vertical offset is 5 px and opacity is `0.004 + 0.002 × (1 - step / 29)²`. This geometry gives importable soft depth; it is not a native Figma effect or a single CSS shadow token.

The proposed runtime treatment adds **16 px backdrop blur**. It is not supplied by the SVG import or the static previews. Sidecar snippets approximate the vector depth with CSS shadows for documentation only. Use glass at overlap/floating surfaces, retaining opaque text and controls. Reduced transparency uses opaque white with readable boundaries; verify legibility over the actual content. No gradients are established.

## Shapes

Primary actions and prominent warning blocks use 8 px corners; photos use 8 px; search glass 9 px; compact quantity/popover/ticket surfaces 10 px; supporting panels 12 px; floating action surfaces 14 px; the navigation dock 16 px. The compact language visual uses 6 px and the 24 px visual checkbox uses 5 px. Status pills use half their height. Some existing drawing exceptions remain, including the 12 px chat-send corner and 10 px review thumbnails. Icons use a 24-unit source grid with rounded 1.7-unit strokes, usually rendered at 16–24 px.

## Components

### Actions and targets

Primary buttons use action black/white, soft buttons soft gray/action black, and outline buttons white/action black with a 1 px line. Default height is 48 px; task variants range from 44 to 54 px. Labels state results: Ask AI, Call staff, Send to staff, Take order, Start preparing and Mark ready.

Menu/result add targets are 44 × 44 px; chat send is 44 × 52 px; owner Test the assistant is 44 px high. Quantity controls are 44 px high, but each minus/plus region needs an individual 44 × 44 px hit area when implemented. Small back, overflow, feedback and row icons also need accessible names and adequate targets.

The allergy board shows a 24 × 24 px visual checkbox on 44 px row pitch. Make the **entire labelled row at least 44 px high and interactive**, with a real checkbox and associated label. Smaller status pills are labels, not proof of adequate interactive targets.

Hover, focus, pressed and disabled states are not drawn. Recommended runtime treatment uses visible black focus outlines with offset, restrained hover/pressed feedback, and truthful progress labels. Do not fabricate confirmation before acknowledgement. Sidecar snippets illustrate proposed semantic controls and interaction styling; they are not the application or a Figma component library.

### Menu, categories and search

Horizontal dish rows replace the repeated card grid. Keep name, portion, **Est. fish / Est. soy** style estimate labels, price and add action together. Food photos retain source color. Detail labels the reference photo and one-piece pricing; ingredients/allergens remain estimates when derived from seed data. Chat answers and owner table also explicitly identify estimates.

Categories are text tabs with a 2 px active underline, not filled chips. Search is a 342 × 46 px glass surface with a 9 px radius. Use real input labels and accessible names in implementation. The menu contains no oversized AI banner: Ask AI is retained in the dock, on dish detail and in contextual entry points.

### Compact language switcher

The closed EN/chevron visual is 50 × 28 px, with a proposed centred **56 × 44 px hit area**. The open drawing anchors a 170 × 158 px, 98%-white popover below it. Three options use 46 px rows; a check identifies English. It is not a full-screen modal.

Actual open/close behavior, selection persistence, focus management, keyboard navigation, outside dismissal and language reflow remain implementation work. Keep a visible and accessible current-language name; native script samples are outlined in the drawing. Preserve both the compact visual and the larger hit region.

### Workspaces and confirmation

Diner dock labels are Menu, Ask AI, My picks and Staff; active state uses darker text/icon and a small dot. Floor staff separates calls, unaccepted picks and ready dishes. Owner navigation preserves menu import, insights, hours/specials, FAQ/rules, AI settings, QR and staff; only menu content is drawn. The owner notice says **Missing information stays unknown. Confirm recipes with your kitchen.** It does not claim guaranteed exclusion from AI recommendations. Kitchen groups accepted orders into New, Cooking and Ready with table, elapsed age, quantities and persistent allergy notes.

Review and sent drawings total **2 × Salmon Sushi at THB 96 + 1 × Miso Soup at THB 42 = THB 234**, across three items. Sending acknowledges receipt by staff, while staff must still confirm. Take order is the floor-staff acceptance point before preparation. The sent state is not a confirmed restaurant order. Illustrative live timestamps do not establish working connections.

### Recovery, uncertainty and access

| Drawn state | Intended later behavior |
| --- | --- |
| Checking the menu… | Truthful processing feedback; keep browsing and staff help available; never stream unvalidated claims or fake percentages. |
| Showing a saved menu | Explain stale prices/availability; reconnect before sending. |
| No dishes match | Clear search/filters while retaining allergy context. |
| Could not confirm delivery | Explain picks may already have arrived; check with staff before retrying; reconcile delivery and prevent duplicates in implementation. |
| Allergen information missing | Preserve unknown status and offer staff help; missing data is not absence of allergens. |
| Sold out today | Explain unavailability and offer available alternatives; runtime must enforce availability. |
| Profile conflict | Name the listed allergen, preserve warning/context, and carry it to staff without safe/allergen-free claims. |

These are static examples. Networking, AI validation, persistence, authorization, availability enforcement, delivery reconciliation and duplicate protection are not implemented by this artifact. Existing repository defects remain implementation work. Proposed motion is 150 ms opacity feedback with instant reduced-motion updates; drawings contain no animation. Use appropriate live announcements, visible keyboard focus and zoom-safe text; test with assistive technology and native-language users.

## Do's and Don'ts

- **Do** keep interface chrome achromatic and food imagery in its source color.
- **Do** keep food, portions, estimates, price and the next action readable without requiring chat.
- **Do** preserve compact language visuals with the proposed larger hit area.
- **Do** retain allergy uncertainty and staff confirmation across every handoff.
- **Do** use live Unicode and vertically growing localized text in implementation.
- **Do** reserve content clearance for floating surfaces and test actual responsive layouts.
- **Don't** reintroduce the superseded warm palette, serif headings or oversized AI menu banner.
- **Don't** describe estimates as verified recipes, unknowns as absent allergens or dishes as allergy-safe.
- **Don't** treat sent picks as confirmed orders or retry uncertain delivery blindly.
- **Don't** claim vector glass supplies backdrop blur, native Figma effects or working interaction.
- **Don't** treat this concept as authority to change production app styling.
- **Don't** describe imported vectors as Auto Layout, reusable component instances, variants or a wired prototype.

The artifact contains **thirteen drawings: nine task/state screens and four supporting boards**. UI geometry is vector content with embedded raster food photos; English text may remain editable after import while native Thai/Myanmar samples are glyph outlines with Unicode retained in source. There is no Auto Layout library, reusable Figma component system, prototype wiring or complete state coverage. Unshown routes remain outside this concept.
