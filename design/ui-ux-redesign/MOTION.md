# Liquid glass motion study

Open [the interactive prototype](http://127.0.0.1:4178/motion/) while the local preview server is running. Source: motion/index.html, motion/motion.css and motion/motion.js. A direct file opening also works for the self-contained demo and relative dish images.

The latest brief asks for water-like feedback throughout the monochrome UI, especially a search-shaped Ask AI bar that opens downwards. The live study implements those interactions. Figma contains the closed menu, expanded AI, answered AI and a timing storyboard; those drawings are not a wired motion prototype.

| Action | Motion | Duration |
|---|---|---|
| Press a product button | Gentle horizontal compression/vertical give; soft pointer ripple | 160 ms press/release; ripple 280 ms |
| Open menu AI | One drop travels from bar toward panel; panel stretches from the top and settles | Drop 300 ms; panel 480 ms |
| Close menu AI | Fold/fade toward the trigger | 180 ms |
| Switch destination | Shallow 7 px travel, anisotropic stretch, crossfade; dock remains anchored | 240 ms |
| Change category | Active underline retargets; menu content settles | Indicator 240 ms; content 200 ms |
| Add dish / change quantity | Immediate count update, small droplet pop or number settle | 240 / 160 ms |
| Open language menu | Expand from the upper-right trigger, then settle | 240 ms |
| Open / dismiss dish | Shallow sheet emergence; reverse path on dismissal | 300 / 180 ms |
| Send picks, call staff, update availability or kitchen stage | Immediate simulated state update plus the shared press/feedback language | 160–300 ms |
| Reduced motion | Opacity feedback; no ripple, drop, travel or stretching | 120 ms |

The 480 ms AI reveal is the focal expressive exception requested by the user. The form and choices become interactive immediately; the animation does not postpone state changes. Hover is limited to fine pointers. The OS reduced-motion preference always wins, including when the demo's “Liquid motion” option is selected. “Half speed” is a review tool, not a proposed product control.

Glass uses static 16 px backdrop blur, translucent white and offset shadows. Routine animations use CSS transitions; cancelable sequences use the Web Animations API. Rapid open/close retargets from the current transform and opacity, with sequence guards preventing an older close from hiding a reopened panel. No full-screen distortion or expensive SVG goo filter is applied. The native HTML dialog supplies focus containment; the language menu uses the native Popover API. The AI panel is a nonmodal disclosure with Escape/close and focus return.

The demo represents diner menu, inline AI, dish details, picks, staff call, language selection, category/search, plus floor, kitchen and owner action examples. Its AI answers are canned illustrative examples, its service actions are simulated, and its small translation samples are not a fully localized application. It makes no network calls, sends no real orders/messages and does not replace production source.

Implementation references: [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API), [native Popover](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover), [reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). These describe platform behavior, not proof that this prototype has passed a production accessibility or performance audit.

Run `python3 -m http.server 4178 --bind 127.0.0.1 --directory design/ui-ux-redesign` from the repository root to reopen the study. The local-only server exposes this design directory, not the app or credentials.
