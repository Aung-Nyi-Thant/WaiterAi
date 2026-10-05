# Module 1: Diner web app
Owner: Member 1 · Requirements: FR-1 (menu browsing), FR-3 (picks and staff calls, diner side)

What it does: the public page a diner opens from the table QR code. Menu with categories, search and filters, Thai/Burmese/English switch, dish detail, AI chat window, "My picks", call-staff button, the table bill, offline copy, and the **allergy profile**.

**Allergy profile.** The diner chooses their allergies once ("My allergies" under the search box, all 14 allergens). It is kept only on the phone (`localStorage`, no account, no name) and is sent with every chat message and every order. Effects: the diner's allergens are marked in red (with a warning sign, never colour alone) on dish cards and the dish sheet, listed first so they are never hidden behind "+2"; dishes with no allergen data are marked too; a "Without my allergens" filter appears; adding a dish that clashes shows a warning (the diner may still pick it); the AI applies it to every answer; and the chef's ticket shows the allergens and the dish lines that clash. The profile never makes a dish "safe": every answer ends with "confirm with the staff".

| File | Purpose |
|---|---|
| `Diner.tsx` | The whole diner page (menu, dish detail, picks sheet, chat window) |
| `i18n.ts` | Thai, Burmese and English interface labels and price format |
| `api/menu.ts` | `GET /api/public/<code>/menu` – menu, categories, specials; logs a menu open |
| `api/orders.ts` | `POST .../orders` – "Send to staff": creates a picked order with the allergy profile and the allergens mentioned in chat, flags each dish line that clashes (`flag`: the allergens it lists, or `unknown`), and saves the phone's receipt code |
| `api/bill.ts` | `GET .../bill?t=<table>&r=<receipt>` – the table's running bill, only for a phone that sent picks from that table |
| `api/calls.ts` | `POST .../calls` – call staff (one open call per table and type) |
| `api/feedback.ts` | `POST .../feedback` – thumbs up/down on an AI answer |

The route files in `src/app/api/public/[slug]/` only re-export these handlers (Next.js needs them there).
Depends on: `platform/` (database, menu types, Icon, client helpers).
Tests: the diner parts of `app/scripts/e2e.py`.

## What I did (each member fills this in)
- 
