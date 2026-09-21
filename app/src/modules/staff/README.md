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
- 
