# Module 5: Data, import, QR, insights, tests and docs
Owners: this module is shared by two members. **Member 2** owns the backend core: `db.ts`, `auth.ts`, `http.ts`, `menu.ts`, `constants.ts`, `api/register|login|logout|ownerMe`, `api/upload*`, `api/import*`. **Member 5** owns `QrPage.tsx`, `InsightsPage.tsx`, `ImportPage.tsx`, `api/qr.ts`, `api/lan.ts`, `api/insights.ts`, and the tests and documents. `client.ts`, `Icon.tsx` and `AuthCard.tsx` are shared: tell the team before you change them.
Requirements: FR-6 (menu import), FR-8 (QR codes), FR-10 (insights), plus the shared base of the app

What it does: the database and its demo data, login and sessions, the shared helpers, photo import, QR codes, insights, and the test scripts and documents.

| File | Purpose |
|---|---|
| `db.ts` | SQLite database: 12 tables, demo restaurant, query helpers |
| `auth.ts` | Password and PIN hashing, signed cookies, owner and staff sessions |
| `http.ts` | JSON response helpers |
| `menu.ts`, `constants.ts` | Shared types, allergen and tag lists, restaurant and menu queries |
| `client.ts`, `Icon.tsx` | Browser helpers (fetch wrapper, polling) and icon set |
| `AuthCard.tsx` | Owner sign-in and register form |
| `ImportPage.tsx`, `api/import*.ts` | Menu photo import: upload, AI reading, review, confirm, name suggestions |
| `QrPage.tsx`, `api/qr.ts`, `api/lan.ts` | QR codes per table and the Wi-Fi address |
| `InsightsPage.tsx`, `api/insights.ts` | What diners asked |
| `api/register.ts`, `api/login.ts`, `api/logout.ts`, `api/ownerMe.ts` | Owner accounts |
| `api/upload.ts`, `api/uploadsServe.ts` | Photo upload and serving |

Member 5 also owns `app/scripts/` (test scripts), `app/README.md` and the documents in `docs/`, except the SRS which Member 2 keeps in sync.

## What I did (each member fills this in)
- 
