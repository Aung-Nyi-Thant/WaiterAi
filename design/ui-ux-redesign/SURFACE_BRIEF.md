# Monochrome glass revision

Scope: Figma concept only; all four roles, diner first. Mode: Operate. User explicitly replaced the warm colored direction with black, white, gray, box shadows, glass feel and a smaller language control. This is the design authority for this revision.

## Direction contract

THESIS: A restaurant menu with precise typography and calm utility. Remove the oversized AI invitation, repeated card grid and decorative hospitality copy.

OWN-WORLD: Neutral #F5F5F5 canvas, #141414 ink, #FFFFFF surfaces, #626262 secondary text and gray notices. Helvetica Neue interface, understated rules, 8 px action corners; translucent floating surfaces with soft offset shadows. Food photographs retain their source color as menu content; interface chrome is strictly achromatic.

STORY: Browse menu rows, inspect portions/estimates, review picks and send them to staff. The menu now includes a compact glass Ask AI bar; its expansion is the user-requested focal interaction. The separate Ask AI destination remains available. Allergies and order confirmation remain explicit.

FIRST VIEWPORT: 390 px diner screen: small Shop AI wordmark, compact EN/chevron control, 35 px restaurant name, table context, a search-shaped Ask AI bar, underlined category tabs, allergy-profile row and spacious horizontal food entries. A floating glass navigation dock anchors four labelled destinations.

FORM: User-pinned monochrome revision, replacing seed 99666df8's prior ceramic direction. Twelve task/state screens and four supporting boards (16 drawings total), including inline AI open/answer states and a motion storyboard. The 50×28 language visual has a proposed centred 56×44 hit area; its three-option anchored menu has 46 px rows.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Glass is drawn using editable translucent shapes and layered vector shadows. Runtime backdrop blur is a specification, not supplied behavior; reduced-transparency uses opaque white. State changes use 150 ms opacity feedback or instant reduced-motion updates. The Figma drawings remain static states and timing notes with no auto-layout library. motion/index.html is a running interaction study with real CSS blur, CSS/WAAPI motion and sample AI replies; it does not change application source or connect to live ordering.


## Liquid motion contract

FOCAL MOMENT: The menu AI bar releases a small drop, then expands downward from its own origin, with a shallow stretch and settle over 480 ms. Exit folds upward in 180 ms. The focal reveal is the explicit user-requested expressive exception; frequent actions remain quick.

CONTINUITY: Navigation crossfades with a 7 px travel and subtle anisotropic scale over 240 ms. The glass dock stays in place. Category indicators retarget with CSS transitions; quantity changes update immediately with 160 ms feedback.

FEEDBACK: All represented product buttons get 160 ms press/release compression and a bounded 280 ms pointer ripple. Add-to-picks count has a 240 ms droplet pop. Language popover 240 ms; dish dialog 300 ms in / 180 ms out. Staff, kitchen and owner controls acknowledge the same way.

BUDGET: CSS transforms/opacity for routine motion; WAAPI for cancelable focal sequences. Border-radius changes are confined to one small overlay. Backdrop blur is static at 16 px; no SVG goo filter, permanent animation loop or full-screen distortion. Loading dots run only during a simulated pending answer.

REDUCED MOTION: Respect the OS preference and the demo selector. Use 120 ms opacity feedback, remove ripple/drop/travel/stretch and stop loading-dot movement. Preserve immediate updates and keyboard focus. No network requests, credentials, persistent records or real staff messages in this study.
