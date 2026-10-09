# Module 4: Staff and orders
Owner: Member 4 · Requirements: FR-4 (waiter and kitchen screens), FR-9 (staff accounts)

What it does: PIN sign-in for waiters and chefs, the waiter "Floor" screen (calls, picks with allergy banners, ready orders, tables, sold-out), the chef "Kitchen" screen (New / Cooking / Ready), the order status rules, and the owner's staff management page.

| File | Purpose |
|---|---|
| `StaffLogin.tsx` | PIN pad sign-in |
| `WaiterPage.tsx` | Waiter floor screen (refreshes every 3 s) |
| `ChefPage.tsx` | Kitchen screen with sold-out panel |
| `ManageStaffPage.tsx` | Owner page to add staff, change PINs, remove staff |
| `orders.ts` | Reads orders with their items and open calls |
| `api/login.ts`, `api/me.ts` | Staff sign-in and session check |
| `api/floor.ts`, `api/kitchen.ts` | Data for the two screens |
| `api/orders.ts` | Order status changes: picked to new to cooking to ready to served, with role and step checks (403 / 409) |
| `api/calls.ts` | Close a staff call |
| `api/items.ts` | Mark a dish sold out or on sale |

Tests: the staff and order parts of `app/scripts/e2e.py`.

## What I did (each member fills this in)
- Ran the NFR-7 load test (3 diners + 2 staff screens, 10 minutes) with `npm run load-test -- --diners 3 --staff 2 --minutes 10 --ai` on an idle computer. Results are in `docs/PERFORMANCE.md`.
- Result: 0 errors in about 1,500 requests. 93 AI answers: median 9.8 s, 95th percentile 15.2 s, slowest 17.4 s (target: every answer within 30 s).
- Waiter and chef screens (polling every 3 s, 200 polls each): median 2-4 ms, slowest 39 ms.
- Rule-based chat, pages, menu, picks and bill: medians 3-6 ms, slowest 104 ms.
- Verdict: NFR-7 met (no errors, every AI answer under 30 s). This was a stress test: each simulated diner asked an open question every 10-15 s, more than a real diner would.
- Limits: tested on one developer laptop with simulated diners on the same computer. Page load on a real phone over Wi-Fi was not measured. 
