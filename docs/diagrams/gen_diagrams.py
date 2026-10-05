# -*- coding: utf-8 -*-
"""Generates the diagram PNGs for the Shop AI oral-exam explanation PDF."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse
from matplotlib.path import Path
import matplotlib.patches as mpatches

NAVY = "#191A45"; PURP = "#2E2A78"; VIOLET = "#6E56FF"; GOLD = "#B8860B"
GREEN = "#1FA68A"; RED = "#C62828"; INK = "#141413"; PANEL = "#F4F2FB"
GREY = "#6B6B85"; LINE = "#3A3670"

plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["svg.fonttype"] = "none"

def box(ax, x, y, w, h, text, fc=PANEL, ec=LINE, tc=INK, fs=10.5, bold=True, lw=1.4, style="round,pad=0.02,rounding_size=0.08"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=style, linewidth=lw, edgecolor=ec, facecolor=fc, zorder=3))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs,
            color=tc, fontweight="bold" if bold else "normal", zorder=4, linespacing=1.4)
    return (x, y, w, h)

def arrow(ax, p1, p2, text="", color=LINE, style="-|>", lw=1.6, rad=0.0, fs=9, tc=GREY, txt_off=(0, 0.12)):
    a = FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=14, linewidth=lw,
                         color=color, zorder=2, connectionstyle=f"arc3,rad={rad}")
    ax.add_patch(a)
    if text:
        mx, my = (p1[0] + p2[0]) / 2 + txt_off[0], (p1[1] + p2[1]) / 2 + txt_off[1]
        ax.text(mx, my, text, ha="center", va="center", fontsize=fs, color=tc, style="italic",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85), zorder=5)

def newfig(w=10, h=7):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, w); ax.set_ylim(0, h); ax.axis("off")
    return fig, ax

def save(fig, name):
    fig.savefig(name, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", name)

# ============================================================ 1. ARCHITECTURE
fig, ax = newfig(11, 7.2)
ax.text(5.5, 6.85, "Shop AI - System Architecture", ha="center", fontsize=15, fontweight="bold", color=NAVY)

# clients row
c1 = box(ax, 0.4, 5.2, 2.3, 1.1, "Diner\n(phone browser)\nno login", fc="#EFEBFF", fs=9.5)
c2 = box(ax, 3.05, 5.2, 2.3, 1.1, "Owner\n(desktop browser)\nemail + password", fc="#EFEBFF", fs=9.5)
c3 = box(ax, 5.7, 5.2, 2.3, 1.1, "Waiter / Chef\n(phone / tablet)\nPIN sign-in", fc="#EFEBFF", fs=9.5)
c4 = box(ax, 8.35, 5.2, 2.25, 1.1, "Printed QR code\non each table", fc="#EFEBFF", fs=9.5)

# server
srv = box(ax, 1.3, 3.1, 8.4, 1.5, "Next.js server  (Node.js)\nPages (React) + API routes, grouped by module:\ndiner · ai · owner · staff · platform", fc="#DCEBFF", fs=10)

# data + ai row
db = box(ax, 1.3, 0.9, 3.6, 1.4, "SQLite database\n(data/shop.db)\n14 tables, one file", fc="#FFE9C6", fs=10)
ai = box(ax, 6.1, 0.9, 3.6, 1.4, "Ollama\n(localhost:11434)\nmodel: gemma4:12b", fc="#DFF5EC", fs=10)

for c in (c1, c2, c3):
    arrow(ax, (c[0] + c[2] / 2, c[1]), (c[0] + c[2] / 2, srv[1] + srv[3]), text="HTTPS / JSON")
arrow(ax, (c4[0] + c4[2] / 2, c4[1]), (c1[0] + c1[2] / 2, c1[1] + c1[3]), text="scan", rad=-0.2, color=GREY, fs=8.5)
arrow(ax, (db[0] + db[2] / 2, db[1] + db[3]), (db[0] + db[2] / 2, srv[1]), text="SQL", tc=GREY)
arrow(ax, (ai[0] + ai[2] / 2, ai[1] + ai[3]), (ai[0] + ai[2] / 2, srv[1]), text="HTTP (local only)", tc=GREY)

ax.text(5.5, 0.15, "Everything runs on one computer: no diner data, chat text or menu ever leaves this machine except to the browser showing it.",
        ha="center", fontsize=9, color=GREY, style="italic")
save(fig, "01-architecture.png")

# ============================================================ 2. ER DIAGRAM
fig, ax = newfig(11.5, 8.3)
ax.text(5.75, 8.05, "Database - 14 tables (simplified)", ha="center", fontsize=15, fontweight="bold", color=NAVY)

users = box(ax, 0.3, 6.7, 2.0, 0.8, "users", fc="#EFEBFF")
rest = box(ax, 3.0, 6.7, 2.3, 0.8, "restaurants", fc="#DCEBFF")
staff = box(ax, 6.0, 6.7, 2.0, 0.8, "staff", fc="#DCEBFF")
cats = box(ax, 8.6, 6.7, 2.3, 0.8, "categories", fc="#DCEBFF")

items = box(ax, 8.6, 5.2, 2.3, 0.8, "menu_items", fc="#FFE9C6")
specials = box(ax, 3.0, 5.2, 2.0, 0.8, "specials", fc="#DCEBFF")
faqs = box(ax, 5.5, 5.2, 1.9, 0.8, "faqs", fc="#DCEBFF")
imports = box(ax, 0.3, 5.2, 2.2, 0.8, "imports", fc="#DCEBFF")

sessions = box(ax, 0.3, 3.7, 2.4, 0.8, "chat_sessions", fc="#DFF5EC")
messages = box(ax, 3.1, 3.7, 2.4, 0.8, "chat_messages", fc="#DFF5EC")
calls = box(ax, 6.0, 3.7, 2.0, 0.8, "calls", fc="#FFE1E1")
events = box(ax, 8.5, 3.7, 2.4, 0.8, "events", fc="#DCEBFF")

orders = box(ax, 3.1, 2.2, 2.2, 0.8, "orders", fc="#FFE1E1")
orditems = box(ax, 5.8, 2.2, 2.4, 0.8, "order_items", fc="#FFE1E1")

rels = [
 (users, rest, "1 owns many"), (rest, cats, "1 has many"), (rest, staff, "1 has many"),
 (rest, items, "1 has many"), (cats, items, "1 has many"),
 (rest, specials, "1 has many"), (rest, faqs, "1 has many"), (rest, imports, "1 has many"),
 (rest, sessions, "1 has many"), (sessions, messages, "1 has many"),
 (rest, calls, "1 has many"), (rest, events, "1 has many"),
 (rest, orders, "1 has many"), (orders, orditems, "1 has many"), (items, orditems, "referenced by"),
]
for a_, b_, label in rels:
    ax1 = a_[0] + a_[2] / 2; ay1 = a_[1]
    bx1 = b_[0] + b_[2] / 2; by1 = b_[1] + b_[3]
    if ay1 < by1:
        ax1, ay1, bx1, by1 = a_[0] + a_[2] / 2, a_[1] + a_[3], b_[0] + b_[2] / 2, b_[1]
    arrow(ax, (ax1, ay1), (bx1, by1), lw=1.1, color="#8A85B8", fs=0)

ax.text(0.3, 1.4, "Key: gold = the menu owners edit · blue = restaurant setup data · green = diner chat · red = live floor/kitchen data",
        fontsize=9.5, color=GREY)
ax.text(0.3, 1.0, "Every table except users carries a restaurant_id (or reaches one through a parent row), so one\nrestaurant's owner or staff can never read or change another restaurant's data.",
        fontsize=9.5, color=GREY)
save(fig, "02-database.png")

# ============================================================ 3. ORDER STATE DIAGRAM
fig, ax = newfig(13.0, 5.0)
ax.text(6.5, 4.72, "Order status flow", ha="center", fontsize=15, fontweight="bold", color=NAVY)
xs = [0.3, 2.95, 5.6, 8.25, 10.9]
bw = 1.85
labels = ["picked\n(diner sent picks)", "new\n(waiter took it)", "cooking\n(chef started)", "ready\n(chef finished)", "served\n(waiter/chef)"]
colors = ["#FFE1E1", "#FFE9C6", "#FFE9C6", "#DFF5EC", "#DCEBFF"]
boxes = []
for x, l, c in zip(xs, labels, colors):
    boxes.append(box(ax, x, 3.05, bw, 1.15, l, fc=c, fs=9.3))
role_actions = ["Take order", "Start cooking", "Mark ready", "Serve"]
for i in range(4):
    arrow(ax, (boxes[i][0] + boxes[i][2], boxes[i][1] + boxes[i][3] / 2),
          (boxes[i + 1][0], boxes[i + 1][1] + boxes[i + 1][3] / 2), text=role_actions[i], fs=8.3, txt_off=(0, 0.22))
cancel = box(ax, 0.3, 1.55, 1.85, 1.0, "cancelled\n(waiter: Dismiss)", fc="#E6E6EF", fs=9)
arrow(ax, (boxes[0][0] + boxes[0][2] / 2, boxes[0][1]), (cancel[0] + cancel[2] / 2, cancel[1] + cancel[3]), fs=0)
ax.text(6.5, 0.85, "The server checks BOTH the current status and the signed-in role before allowing a move -",
        fontsize=9.3, color=GREY, ha="center")
ax.text(6.5, 0.5, "a chef cannot \u201ctake\u201d an order and a waiter cannot \u201cstart cooking\u201d (rejected with an error, not silently ignored).",
        fontsize=9.3, color=GREY, ha="center")
save(fig, "03-order-flow.png")

# ============================================================ 4. AI DECISION FLOW
steps = [
 ("Diner's question arrives", "#EFEBFF", "start"),
 ("Detect language\n(Thai / Burmese / English, by script used)", "#DCEBFF", "step"),
 ("Trying to change the rules?\n(\u201cignore your instructions\u2026\u201d)", "#FFE1E1", "check"),
 ("YES \u2192 Fixed refusal - no rule is changed", "#FFE1E1", "end"),
 ("Names an allergen, or asks\nif a dish is safe / contains one?", "#FFE9C6", "check"),
 ("YES \u2192 Answer built from the allergen\ndata + fixed \u201cconfirm with staff\u201d line", "#FFE9C6", "end"),
 ("Asks for the bill or the staff?", "#DCEBFF", "check"),
 ("YES \u2192 Create a staff call for the table", "#DCEBFF", "end"),
 ("Asks for vegetarian / vegan\n(with or without a budget)?", "#DFF5EC", "check"),
 ("YES \u2192 List only dishes with that tag,\non sale, under the budget", "#DFF5EC", "end"),
 ("Names a specific dish?", "#FFF3D6", "check"),
 ("YES \u2192 Sold out: say so + alternatives.\nPrice / order: answer or add to picks", "#FFF3D6", "end"),
 ("Asks hours, pork, or ingredients?", "#DCEBFF", "check"),
 ("YES \u2192 Answer copied exactly from\nthe restaurant's own data", "#DCEBFF", "end"),
 ("NO to all above: everything else\n(recommend, FAQ, small talk)", "#EDEBFF", "step"),
 ("Language model answers,\nusing ONLY the menu/hours/FAQs given to it", "#EDEBFF", "step"),
 ("Check the model's reply:\nwrong price? claims \u201csafe\u201d? empty?", "#FFE1E1", "check"),
 ("FAILS \u2192 Replace with \u201cplease ask staff\u201d", "#FFE1E1", "end"),
 ("Show the reply to the diner", "#DFF5EC", "final"),
]
gap = 0.22
heights = [ (0.62 if "\n" not in t else 0.86) for t, _, _ in steps ]
total = sum(heights) + gap * (len(steps) - 1)
top_margin, bottom_margin, title_h = 0.5, 0.35, 0.75
fig_h = total + top_margin + bottom_margin + title_h
fig, ax = newfig(9.6, fig_h)
ax.text(4.8, fig_h - 0.35, "AI waiter - how one question is answered", ha="center", fontsize=15, fontweight="bold", color=NAVY)

y = fig_h - title_h - top_margin
pos = {}
for i, ((text, fc, kind), hh) in enumerate(zip(steps, heights)):
    b = box(ax, 2.0, y - hh, 5.5, hh, text, fc=fc, fs=9.2, bold=(kind in ("start", "final")))
    pos[i] = b
    if i > 0:
        prev = pos[i - 1]
        arrow(ax, (prev[0] + prev[2] / 2, prev[1]), (b[0] + b[2] / 2, b[1] + b[3]), fs=0)
    y -= hh + gap

ax.text(0.15, fig_h / 2, "\u201cNO\u201d at every\ncheck falls\nthrough to\nthe next rule.", fontsize=9, color=GREY, ha="left", style="italic")
save(fig, "04-ai-flow.png")

# ============================================================ 5. USE CASE DIAGRAM
fig, ax = newfig(11, 8.2)
ax.text(5.5, 7.95, "Who uses Shop AI, and for what", ha="center", fontsize=15, fontweight="bold", color=NAVY)

def actor(ax, x, y, label):
    ax.add_patch(Ellipse((x, y + 0.55), 0.55, 0.55, fc="#E6E6EF", ec=LINE, lw=1.3, zorder=3))
    ax.plot([x, x], [y + 0.27, y - 0.35], color=LINE, lw=1.3, zorder=3)
    ax.plot([x - 0.35, x + 0.35], [y - 0.05, y - 0.05], color=LINE, lw=1.3, zorder=3)
    ax.plot([x, x - 0.3], [y - 0.35, y - 0.65], color=LINE, lw=1.3, zorder=3)
    ax.plot([x, x + 0.3], [y - 0.35, y - 0.65], color=LINE, lw=1.3, zorder=3)
    ax.text(x, y - 0.9, label, ha="center", fontsize=10, fontweight="bold", color=NAVY)
    return x, y

def usecase(ax, x, y, text, fc="#F4F2FB"):
    ax.add_patch(Ellipse((x, y), 2.5, 0.62, fc=fc, ec=LINE, lw=1.2, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=8.6, color=INK, zorder=4)
    return x, y

diner = actor(ax, 0.6, 6.6, "Diner")
owner = actor(ax, 0.6, 3.9, "Owner")
waiter = actor(ax, 10.3, 6.4, "Waiter")
chef = actor(ax, 10.3, 3.1, "Chef")

uc = {}
uc["menu"] = usecase(ax, 4.0, 7.2, "Browse the menu\n(3 languages)", "#EFEBFF")
uc["chat"] = usecase(ax, 4.0, 6.35, "Ask the AI waiter\n(allergens, prices, hours)", "#EFEBFF")
uc["picks"] = usecase(ax, 4.0, 5.5, "Send picks / call staff", "#EFEBFF")
uc["manage"] = usecase(ax, 4.0, 4.4, "Manage menu, allergens,\nhours, FAQ, AI voice", "#DCEBFF")
uc["import"] = usecase(ax, 4.0, 3.55, "Import a menu from\na photo", "#DCEBFF")
uc["qr"] = usecase(ax, 4.0, 2.7, "Print QR codes", "#DCEBFF")
uc["insights"] = usecase(ax, 4.0, 1.85, "Read insights", "#DCEBFF")
uc["floor"] = usecase(ax, 7.4, 6.9, "See calls & picks,\ntake an order", "#DFF5EC")
uc["soldout1"] = usecase(ax, 7.4, 5.85, "Mark a dish\nsold out", "#DFF5EC")
uc["kitchen"] = usecase(ax, 7.4, 3.9, "Cook & mark\ntickets ready", "#FFE9C6")
uc["soldout2"] = usecase(ax, 7.4, 2.85, "Mark a dish\nsold out", "#FFE9C6")

for k in ("menu", "chat", "picks"):
    arrow(ax, (diner[0] + 0.3, diner[1] - 0.1), (uc[k][0] - 1.25, uc[k][1]), lw=1.0, fs=0, color="#8A85B8")
for k in ("manage", "import", "qr", "insights"):
    arrow(ax, (owner[0] + 0.3, owner[1] - 0.2), (uc[k][0] - 1.25, uc[k][1]), lw=1.0, fs=0, color="#8A85B8")
for k in ("floor", "soldout1"):
    arrow(ax, (waiter[0] - 0.3, waiter[1] - 0.1), (uc[k][0] + 1.25, uc[k][1]), lw=1.0, fs=0, color="#8A85B8")
for k in ("kitchen", "soldout2"):
    arrow(ax, (chef[0] - 0.3, chef[1] - 0.2), (uc[k][0] + 1.25, uc[k][1]), lw=1.0, fs=0, color="#8A85B8")

save(fig, "05-use-cases.png")
print("ALL DONE")
