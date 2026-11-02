# Shop AI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The confirmed design scope covers all four existing roles, with the mobile diner journey first: diners opening a table QR menu without an account, floor staff responding to calls and picks on a phone, chefs preparing accepted orders on a kitchen screen, and owners managing the restaurant on a larger screen.

## Product Purpose

Help small restaurants answer repeated menu questions in Thai, Burmese and English while keeping diners, floor staff and the kitchen connected. Diners browse, ask, choose and send picks; staff confirm orders before preparation.

## Operating Context

The existing Next.js/React application uses SQLite and a local Ollama model. Recognized factual questions use database-backed templates; model-generated open answers are checked. The 2026-10-22 repository analysis records remaining safety and authorization defects; the UI must not imply those guarantees are stronger than implemented.

## Capabilities and Constraints

- Preserve Thai/Burmese/English and the existing allergy-profile behavior.
- Preserve the difference between Ask AI, Call staff and Send to staff.
- Never label a dish safe or allergen-free. Unknown allergen data stays unknown.
- A diner sends picks; a waiter accepts them before the kitchen receives an order.
- Preserve menu management, availability, photo import with review, QR codes, staff management, hours, FAQs and insights.
- Existing data includes the Golden Lotus demonstration and the HaChi Kyu menu. HaChi Kyu ingredient/allergen details are estimates, not restaurant-verified recipes.
- The current task builds the main application's public landing page in source. The user chose a Service composition with a clear product introduction and a primary action that opens the restaurant menu; the old standalone prototype is outside this task.

## Brand Commitments

Keep the Shop AI product name. The user requests a clean, modern, restaurant-oriented and creative visual improvement. The latest revision explicitly requires black, white and gray UI, box shadows, a glass feel, a smaller language control and a less generic composition. This replaces the earlier warm colored concept.

## Evidence on Hand

Existing app modules and tests, README, docs/SRS_Shop_AI.md, docs/UI_REDESIGN_BRIEF.md, reports/repository-analysis-2026-10-22.md, menu seed data, and an existing Figma Shop AI file inspected in the desktop editor. Research for the redesign is secondary desk research; no diner/staff usability interviews have been conducted in this task.

## Product Principles

- Show the menu and the next action without requiring a chat.
- Keep AI and human staff handoffs explicit.
- Carry allergy context through selection and staff preparation.
- Give each role the information needed for its immediate task.
- Describe availability and response delays honestly.

## Accessibility & Inclusion

The repository brief requires WCAG AA contrast, controls at least 44 CSS pixels, visible focus, reduced motion/transparency, and Thai/Myanmar font support. Design for text expansion and script-aware wrapping; preserve labels alongside navigation icons.
