# Module 1: Diner web app
Owner: Member 1 · Requirements: FR-1 (menu browsing), FR-3 (picks and staff calls, diner side)

What it does: the public page a diner opens from the table QR code. Menu with categories, search and filters, Thai/Burmese/English switch, dish detail, AI chat window, "My picks", call-staff button, offline copy.

| File | Purpose |
|---|---|
| `Diner.tsx` | The whole diner page (menu, dish detail, picks sheet, chat window) |
| `i18n.ts` | Thai, Burmese and English interface labels and price format |
| `api/menu.ts` | `GET /api/public/<code>/menu` – menu, categories, specials; logs a menu open |
| `api/orders.ts` | `POST .../orders` – "Show to waiter": creates a picked order with the allergens mentioned in chat |
| `api/calls.ts` | `POST .../calls` – call staff (one open call per table and type) |
| `api/feedback.ts` | `POST .../feedback` – thumbs up/down on an AI answer |

The route files in `src/app/api/public/[slug]/` only re-export these handlers (Next.js needs them there).
Depends on: `platform/` (database, menu types, Icon, client helpers).
Tests: the diner parts of `app/scripts/e2e.py`.

## What I did (each member fills this in)
- 
