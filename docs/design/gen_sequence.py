# -*- coding: utf-8 -*-
"""Sequence diagram for Must FR-3 / FR-4 (send picks -> waiter takes -> chef cooks -> served).
Messages follow the real API: app/src/modules/diner/api (orders) and app/src/modules/staff/api (floor, kitchen, orders).
Run from docs/design/:  python3 gen_sequence.py   -> 07-sequence-fr3-order.png"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

NAVY = "#191A45"; LINE = "#3A3670"; PANEL = "#F4F2FB"; GREY = "#6B6B85"; INK = "#141413"; RED = "#C62828"
plt.rcParams["font.family"] = "DejaVu Sans"

lanes = ["Diner\n(phone browser)", "Next.js server\n(API routes)", "SQLite\n(orders)", "Waiter screen\n(PIN 1111)", "Chef screen\n(PIN 2222)"]
X = [1.2, 4.2, 7.0, 9.8, 12.6]
# (from, to, label, dashed reply?)
msgs = [
    (0, 1, "POST /api/public/{slug}/orders  (items, table, allergy note)", False),
    (1, 2, "check dishes on sale; INSERT order status = picked", False),
    (1, 0, "201: order number, \"waiting for staff\"", True),
    (3, 1, "GET /api/staff/floor  (every 3 s)", False),
    (1, 3, "picks: [the new order + allergy banner]", True),
    (3, 1, "POST /api/staff/orders/{id}  action = take", False),
    (1, 2, "role = waiter and status = picked?  UPDATE status = new", False),
    (4, 1, "GET /api/staff/kitchen  (every 3 s)", False),
    (1, 4, "tickets.new: [the order]", True),
    (4, 1, "POST .../orders/{id}  action = cooking, then ready", False),
    (1, 2, "role = chef; new -> cooking -> ready", False),
    (3, 1, "POST .../orders/{id}  action = served", False),
    (1, 2, "ready -> served", False),
]
H = 1.6 + 0.62 * len(msgs)
fig, ax = plt.subplots(figsize=(14, H))
ax.set_xlim(0, 13.8); ax.set_ylim(0, H); ax.axis("off")
ax.text(6.9, H - 0.25, "Sequence: a diner's order from phone to table (FR-3, FR-4)", ha="center", fontsize=15, fontweight="bold", color=NAVY)
top = H - 0.75
for x, name in zip(X, lanes):
    ax.text(x, top, name, ha="center", va="center", fontsize=10, fontweight="bold", color=INK,
            bbox=dict(boxstyle="round,pad=0.4", fc=PANEL, ec=LINE, lw=1.3))
    ax.plot([x, x], [0.35, top - 0.35], color=GREY, lw=1, ls=(0, (4, 4)), zorder=1)
y = top - 0.8
for a, b, label, reply in msgs:
    if a == b:
        continue
    ax.annotate("", xy=(X[b], y), xytext=(X[a], y),
                arrowprops=dict(arrowstyle="-|>", color=LINE, lw=1.4, ls="--" if reply else "-", mutation_scale=13))
    ax.text((X[a] + X[b]) / 2, y + 0.14, label, ha="center", va="bottom", fontsize=8.6,
            color=GREY if reply else INK, style="italic" if reply else "normal",
            bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none"), zorder=3)
    y -= 0.62
ax.text(6.9, 0.12, "A wrong role or status is refused by the server (403 / 409), e.g. a chef cannot 'take' and a waiter cannot 'cook'.",
        ha="center", fontsize=9, color=RED)
fig.savefig("07-sequence-fr3-order.png", dpi=170, bbox_inches="tight", facecolor="white")
print("wrote 07-sequence-fr3-order.png")
