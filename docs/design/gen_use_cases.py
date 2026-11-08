# -*- coding: utf-8 -*-
"""Use-case diagram that matches the SRS (Team18_M2_SRS, section 5): 4 actors, UC-1..UC-10, UC-6 includes UC-5.
Run:  python3 gen_use_cases.py   ->  06-use-cases-srs.png"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyBboxPatch, Circle, FancyArrowPatch

NAVY = "#191A45"; LINE = "#3A3670"; INK = "#141413"
plt.rcParams["font.family"] = "DejaVu Sans"
fig, ax = plt.subplots(figsize=(15.6, 9.4)); ax.set_xlim(-0.2, 15.6); ax.set_ylim(-2.5, 9.4); ax.axis("off")
ax.text(7.8, 9.05, "Shop AI: use cases (SRS section 5)", ha="center", fontsize=17, fontweight="bold", color=NAVY)

ax.add_patch(FancyBboxPatch((2.1, 0.7), 11.8, 7.8, boxstyle="round,pad=0.02,rounding_size=0.15", fc="#FAF9FE", ec=LINE, lw=1.8, zorder=0))
ax.text(2.6, 8.15, "Shop AI", fontsize=13, fontweight="bold", color=NAVY, va="center")

COL = {"diner": ("#EDE9FE", "UC-1"), "staff": ("#DDF3EA", ""), "owner": ("#DBEAFE", "")}
def uc(x, y, label, fc, w=3.0, h=1.05, fs=10):
    ax.add_patch(Ellipse((x, y), w, h, fc=fc, ec=LINE, lw=1.6, zorder=3))
    ax.text(x, y, label, ha="center", va="center", fontsize=fs, color=INK, zorder=4, linespacing=1.25)
    return (x, y)
U = {
  1: uc(4.3, 7.0, "UC-1\nBrowse the menu", "#EDE9FE"),
  2: uc(4.3, 5.85, "UC-2\nAsk the AI waiter", "#EDE9FE"),
  3: uc(4.3, 4.45, "UC-3\nSend picks or\ncall staff", "#EDE9FE", h=1.2),
  4: uc(10.6, 5.85, "UC-4\nTake and cook\nan order", "#DDF3EA", h=1.2),
}
for i, (n, lab) in enumerate([(5, "Manage menu\nand allergens"), (6, "Import a\nmenu photo"), (7, "Set hours, FAQ\nand AI voice"), (8, "Print\nQR codes"), (9, "Manage\nstaff"), (10, "Read\ninsights")]):
    U[n] = uc(3.1 + i * 1.95, 2.2, f"UC-{n}\n{lab}", "#DBEAFE", w=1.55, h=1.55, fs=8.4)

def actor(x, y, name):
    ax.add_patch(Circle((x, y + 0.55), 0.22, fc="#E6E6F0", ec=LINE, lw=1.8, zorder=3))
    ax.plot([x, x], [y + 0.33, y - 0.25], color=LINE, lw=1.8); ax.plot([x - 0.35, x + 0.35], [y + 0.15, y + 0.15], color=LINE, lw=1.8)
    ax.plot([x, x - 0.3], [y - 0.25, y - 0.75], color=LINE, lw=1.8); ax.plot([x, x + 0.3], [y - 0.25, y - 0.75], color=LINE, lw=1.8)
    ax.text(x, y - 1.05, name, ha="center", fontsize=12, fontweight="bold", color=NAVY)
    return (x, y + 0.1)
def link(a, b, dashed=False, label=""):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-" if not dashed else "-|>", mutation_scale=13, lw=1.4, color="#6F6BA8", ls="--" if dashed else "-", zorder=2, shrinkA=2, shrinkB=2))
    if label: ax.text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.22, label, ha="center", fontsize=9, style="italic", color=LINE, bbox=dict(fc="#FAF9FE", ec="none", pad=1))

diner = actor(0.7, 5.6, "Diner")
waiter = actor(14.7, 6.6, "Waiter"); chef = actor(14.7, 4.6, "Chef")
owner = actor(7.8, -0.45, "Owner")
for n in (1, 2, 3): link(diner, (U[n][0] - 1.5, U[n][1]))
link(waiter, (U[4][0] + 1.5, U[4][1])); link(chef, (U[4][0] + 1.5, U[4][1]))
for n in (5, 6, 7, 8, 9, 10): link(owner, (U[n][0], U[n][1] - 0.78))
ax.add_patch(FancyArrowPatch((U[6][0] - 0.78, U[6][1]), (U[5][0] + 0.78, U[5][1]), arrowstyle="-|>", mutation_scale=14, lw=1.8, color="#4B47A0", ls="--", zorder=4, shrinkA=0, shrinkB=0))
ax.text((U[5][0] + U[6][0]) / 2, 3.2, "<<include>>", ha="center", fontsize=9, style="italic", color=LINE)
ax.text(7.8, -2.25, "Actors: Diner (no login), Owner (email + password), Waiter and Chef (PIN).", ha="center", fontsize=9.5, color="#55557A")
fig.savefig("06-use-cases-srs.png", dpi=150, bbox_inches="tight", facecolor="white")
print("saved 06-use-cases-srs.png")
