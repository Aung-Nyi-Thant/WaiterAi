# Module 3: Owner back office
Owner: Member 3 · Requirements: FR-5 (menu and allergen management), FR-7 (hours, specials, FAQ, AI voice)

What it does: the owner's pages for dishes, categories, allergens, tags, photos, sold-out switch, opening hours, specials, FAQ, shop rules and the AI waiter's voice, plus the side menu and the "Test the assistant" panel.

| File | Purpose |
|---|---|
| `OwnerShell.tsx` | Side menu, top bar, sign-out, chat quota, test-assistant window |
| `MenuPage.tsx` | Menu items table, dish form, categories |
| `HoursPage.tsx` | Opening hours and specials |
| `FaqPage.tsx` | FAQ and shop rules |
| `AiPage.tsx` | Restaurant name, AI voice, tone, greeting, test chat |
| `TestChat.tsx` | Chat box that tries the AI without saving anything |
| `crud.ts` | Generic create/read/update/delete for categories, FAQs, specials, staff |
| `api/items.ts`, `api/itemsById.ts` | Dish list, create, update, delete (with validation) |
| `api/resource.ts`, `api/resourceItem.ts` | Generic routes that use `crud.ts` |
| `api/settings.ts` | Restaurant name, hours, AI voice settings |

Page routes in `src/app/owner/*/page.tsx` only re-export these components.
Tests: the owner parts of `app/scripts/e2e.py`.

## What I did (each member fills this in)
- 
