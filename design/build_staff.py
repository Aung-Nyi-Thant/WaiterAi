# -*- coding: utf-8 -*-
"""Waiter (phone) and Chef/kitchen (desktop) boards in Art Deco and Glass."""
import json, pathlib, types

HERE = pathlib.Path(__file__).parent
OUT = HERE / "canvas" / "project"

def load(name, marker):
    src = (HERE / name).read_text(encoding="utf-8")
    src = src[:src.index(marker)]
    ns = {"__file__": str(HERE / name), "__name__": "ns_" + name}
    exec(compile(src, name, "exec"), ns)
    return types.SimpleNamespace(**ns)

D = load("build.py", "# ---------------------------------------------------------------- write")
G = load("build_glass.py", "boards = {")

# ------------------------------------------------------------------ data (sample)
CALLS = [("7", "Bill, please", "2 min ago", True), ("3", "Needs help at the table", "just now", False)]
PICKS = [
 ("5", "Burmese", [("1", "Vegetable Tofu Stir-fry", "฿90"), ("2", "Thai Iced Tea", "฿100")], "peanut"),
 ("9", "English", [("1", "Mango Sticky Rice", "฿100")], None),
]
TICKETS = {
 "NEW": [("5", "1 min", [("1", "Vegetable Tofu Stir-fry"), ("2", "Thai Iced Tea")], "PEANUT", "Start cooking"),
         ("9", "just now", [("1", "Mango Sticky Rice")], None, "Start cooking")],
 "COOKING": [("2", "6 min", [("2", "Chicken Fried Rice"), ("1", "Beef Massaman Curry"), ("1", "Papaya Salad")], "SHELLFISH", "Mark ready"),
             ("11", "3 min", [("1", "Steamed Fish with Lime")], None, "Mark ready")],
 "READY": [("7", "waiting 1 min", [("1", "Grilled Pork Skewers"), ("1", "Thai Iced Tea")], None, "Served")],
}
SOLD = [("Coconut Ice Cream", False), ("Mango Sticky Rice", True), ("Tom Yum Goong", True), ("Steamed Fish with Lime", True), ("Papaya Salad", True)]

# ================================================================== ART DECO
def deco_waiter():
    d = D
    def call(t, msg, ago, urgent):
        return f'''<div style="display:flex;align-items:center;gap:12px;padding:12px;background:{d.IVORY};color:{d.INK};outline:1px solid {d.BRONZE};outline-offset:-4px;box-sizing:border-box">
<div style="width:52px;height:52px;flex-shrink:0;background:{d.INK};color:{d.GOLD};display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font:600 10px {d.B};letter-spacing:.14em">TABLE</div><div style="font:400 26px {d.D};line-height:1">{t}</div></div>
<div style="flex-grow:1;min-width:0"><div style="font:700 16px {d.B}">{msg}</div><div style="font:400 13px {d.B};color:{d.MUTED_L}">{ago}{" · waiting" if urgent else ""}</div></div>
<button type="button" style="height:44px;padding:0 16px;background:{d.INK};border:0;color:{d.GOLD};font:700 12px {d.B};letter-spacing:.12em;text-transform:uppercase">Done</button></div>'''
    def pick(t, lang, items, allergy):
        rows = "".join(f'<div style="display:flex;justify-content:space-between;font:400 15px {d.B};padding:3px 0"><span>{q}× {n}</span><span style="font-weight:600">{p}</span></div>' for q, n, p in items)
        alert = ""
        if allergy:
            alert = (f'<div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:10px 12px;background:{d.RUBY};color:#FFFFFF">{d.icon("alert", 20, "#FFFFFF")}'
                     f'<div style="font:700 13px {d.B};line-height:1.35">Diner asked about {allergy.upper()}.<br><span style="font-weight:400">Confirm with the kitchen before ordering.</span></div></div>')
        return f'''<div style="padding:12px 14px;background:{d.IVORY};color:{d.INK};outline:1px solid {d.BRONZE};outline-offset:-4px;box-sizing:border-box">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font:400 24px {d.D}">Table {t}</div>{d.tag(lang, False)}</div>
{rows}{alert}
<div style="display:flex;gap:8px;margin-top:8px"><button type="button" style="flex-grow:1;height:44px;background:{d.INK};border:0;color:{d.GOLD};font:700 13px {d.B};letter-spacing:.12em;text-transform:uppercase">Take order</button>
<button type="button" style="height:44px;padding:0 16px;background:transparent;border:1px solid {d.BRONZE};color:{d.BRONZE};font:700 13px {d.B};letter-spacing:.12em;text-transform:uppercase">Later</button></div></div>'''
    tabs = "".join(f'<div style="padding:12px 4px 10px;margin-right:22px;font:600 13px {d.B};letter-spacing:.16em;text-transform:uppercase;color:{d.GOLD if i == 0 else d.MUTED_D};border-bottom:2px solid {d.GOLD if i == 0 else "transparent"}">{t}</div>'
                   for i, t in enumerate(["Calls · 2", "Picks · 2", "Tables"]))
    body = f'''<div style="width:390px;height:844px;position:relative;overflow:hidden;background:{d.INK};color:{d.IVORY};font-family:{d.B};box-sizing:border-box">
<div style="height:104px;position:relative;display:flex;align-items:flex-end;justify-content:space-between;padding:0 16px 10px;box-sizing:border-box">
<div style="position:absolute;top:0;left:120px">{d.sun(150, d.GOLD, .4)}</div>
<div style="position:relative"><div style="font:400 34px {d.D};color:{d.GOLD};letter-spacing:.16em;line-height:1">FLOOR</div><div style="font:400 12px {d.B};letter-spacing:.3em;color:{d.MUTED_D}">WAITER · GOLDEN LOTUS</div></div>
<div style="position:relative;display:flex;align-items:center;gap:8px;font:600 12px {d.B};color:{d.GOLD2}"><div style="width:10px;height:10px;background:#3DDC97"></div>LIVE</div></div>
<div style="padding:0 16px"><div style="display:flex;border-bottom:1px solid rgba(212,175,90,.35)">{tabs}</div></div>
<div style="padding:12px 16px 0;display:flex;flex-direction:column;gap:10px">{"".join(call(*c) for c in CALLS)}{pick(*PICKS[0])}{pick(*PICKS[1])}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:88px;background:{d.INK3};border-top:1px solid {d.GOLD};display:flex;align-items:center;gap:12px;padding:0 16px;box-sizing:border-box">
<div style="flex-grow:1"><div style="font:600 11px {d.B};letter-spacing:.16em;color:{d.GOLD2}">SOLD OUT NOW · 1</div><div style="font:400 14px {d.B}">Coconut Ice Cream</div></div>
<button type="button" style="height:48px;padding:0 16px;background:{d.GOLD};border:0;color:{d.INK};font:700 13px {d.B};letter-spacing:.12em;text-transform:uppercase">Mark a dish</button></div></div>'''
    return d.page("Waiter floor", 390, 844, body)

def deco_chef():
    d = D
    def ticket(t, ago, items, allergy, btn):
        rows = "".join(f'<div style="display:flex;gap:10px;font:600 18px {d.B};padding:3px 0"><span style="width:30px;color:{d.BRONZE}">{q}×</span><span>{n}</span></div>' for q, n in items)
        alert = ""
        if allergy:
            alert = (f'<div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:8px 12px;background:{d.RUBY};color:#FFFFFF">{d.icon("alert", 22, "#FFFFFF")}'
                     f'<div style="font:700 14px {d.B};letter-spacing:.04em">ALLERGY: {allergy}<br><span style="font-weight:400;font-size:12px">Waiter confirmed with diner</span></div></div>')
        return f'''<div style="padding:12px 14px;background:{d.IVORY};color:{d.INK};outline:1px solid {d.BRONZE};outline-offset:-4px;box-sizing:border-box;display:flex;flex-direction:column;gap:4px">
<div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font:400 34px {d.D};line-height:1">Table {t}</div><div style="font:700 13px {d.B};color:{d.MUTED_L}">{ago}</div></div>
{rows}{alert}
<button type="button" style="margin-top:6px;height:48px;background:{d.INK};border:0;color:{d.GOLD};font:700 14px {d.B};letter-spacing:.14em;text-transform:uppercase">{btn}</button></div>'''
    cols = ""
    for name, tk in TICKETS.items():
        cols += f'''<div style="width:296px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;justify-content:space-between;align-items:center;padding:0 2px 8px;border-bottom:1px solid {d.GOLD}"><div style="font:400 26px {d.D};color:{d.GOLD};letter-spacing:.14em">{name}</div><div style="font:700 14px {d.B};color:{d.GOLD2}">{len(tk)}</div></div>
{"".join(ticket(*t) for t in tk)}</div>'''
    sold = "".join(
        f'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid rgba(212,175,90,.25)"><div style="font:400 15px {d.B}">{n}</div>'
        f'<div style="display:flex;align-items:center;gap:8px;font:700 12px {d.B};color:{"#8FD9C8" if on else "#F0A0A0"}"><div style="width:44px;height:24px;background:{"#17695E" if on else "#5A5A66"};position:relative"><div style="position:absolute;top:3px;{"right" if on else "left"}:3px;width:18px;height:18px;background:{d.IVORY}"></div></div></div></div>'
        for n, on in SOLD)
    body = f'''<div style="width:1280px;height:800px;position:relative;overflow:hidden;background:{d.INK};color:{d.IVORY};font-family:{d.B};box-sizing:border-box;display:flex;flex-direction:column">
<div style="height:88px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid {d.GOLD};background:{d.INK2};box-sizing:border-box">
<div style="position:absolute;top:0;left:520px">{d.sun(240, d.GOLD, .3)}</div>
<div style="position:relative;display:flex;align-items:baseline;gap:18px"><div style="font:400 44px {d.D};color:{d.GOLD};letter-spacing:.18em;line-height:1">KITCHEN</div><div style="font:400 13px {d.B};letter-spacing:.3em;color:{d.MUTED_D}">GOLDEN LOTUS · CHEF</div></div>
<div style="position:relative;display:flex;align-items:center;gap:22px"><div style="font:600 13px {d.B};color:{d.GOLD2};letter-spacing:.14em;display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;background:#3DDC97"></div>LIVE</div>
<div style="font:400 32px {d.D};color:{d.IVORY};letter-spacing:.08em">18:42</div></div></div>
<div style="flex-grow:1;min-height:0;display:flex;gap:24px;padding:20px 28px;box-sizing:border-box">
<div style="display:flex;gap:20px">{cols}</div>
<div style="flex-grow:1;min-width:0;padding:16px 18px;background:{d.INK2};outline:1px solid rgba(212,175,90,.55);outline-offset:-4px;box-sizing:border-box;position:relative">{d.corners(d.GOLD, 12, 5)}
<div style="font:400 24px {d.D};color:{d.GOLD};letter-spacing:.14em;margin-bottom:4px">SOLD OUT TODAY</div><div style="font:400 13px {d.B};color:{d.MUTED_D};margin-bottom:6px">Switch a dish off when the kitchen runs out. Diners and the AI waiter stop offering it at once.</div>{sold}</div>
</div></div>'''
    return d.page("Kitchen display", 1280, 800, body)

# ================================================================== GLASS
def glass_waiter():
    g = G
    def call(t, msg, ago, urgent):
        return f'''<div style="{g.GLASS_D}display:flex;align-items:center;gap:12px;padding:12px;border-radius:22px;box-sizing:border-box">
<div style="width:52px;height:52px;flex-shrink:0;border-radius:16px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font:600 10px {g.Bd};letter-spacing:.1em">TABLE</div><div style="font:600 24px {g.H};line-height:1">{t}</div></div>
<div style="flex-grow:1;min-width:0"><div style="font:700 16px {g.Bd}">{msg}</div><div style="font:400 13px {g.Bd};color:{g.SOFT}">{ago}{" · waiting" if urgent else ""}</div></div>
<button type="button" style="height:44px;padding:0 18px;border:0;border-radius:22px;background:{g.WHITE};color:{g.BASE};font:700 13px {g.Bd}">Done</button></div>'''
    def pick(t, lang, items, allergy):
        rows = "".join(f'<div style="display:flex;justify-content:space-between;font:500 15px {g.Bd};padding:3px 0"><span>{q}× {n}</span><span style="font-weight:700">{p}</span></div>' for q, n, p in items)
        alert = ""
        if allergy:
            alert = (f'<div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:10px 12px;border-radius:14px;background:#C62828;color:#FFFFFF">{g.icon("alert", 20, "#FFFFFF")}'
                     f'<div style="font:700 13px {g.Bd};line-height:1.35">Diner asked about {allergy.upper()}.<br><span style="font-weight:500">Confirm with the kitchen before ordering.</span></div></div>')
        return f'''<div style="{g.GLASS_D}padding:12px 16px;border-radius:22px;box-sizing:border-box">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font:600 22px {g.H}">Table {t}</div>{g.chip(lang)}</div>
{rows}{alert}
<div style="display:flex;gap:8px;margin-top:8px"><button type="button" style="flex-grow:1;height:44px;border:0;border-radius:22px;background:{g.WHITE};color:{g.BASE};font:700 13px {g.Bd}">Take order</button>
<button type="button" style="height:44px;padding:0 18px;border-radius:22px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.4);color:{g.WHITE};font:700 13px {g.Bd}">Later</button></div></div>'''
    tabs = "".join(
        f'<div style="padding:0 16px;height:40px;display:flex;align-items:center;border-radius:999px;font:600 13px {g.Bd};'
        + (f'background:{g.WHITE};color:{g.BASE}' if i == 0 else f'background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:{g.WHITE}') + f'">{t}</div>'
        for i, t in enumerate(["Calls · 2", "Picks · 2", "Tables"]))
    body = f'''<div style="width:390px;height:844px;position:relative;overflow:hidden;background:{g.BASE};color:{g.WHITE};font-family:{g.Bd};box-sizing:border-box">
{g.dark_bg()}
<div style="position:relative;padding:18px 16px 0;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font:600 30px {g.H};line-height:1.1">Floor</div><div style="font:500 13px {g.Bd};color:{g.SOFT};letter-spacing:.14em;text-transform:uppercase">Waiter · Golden Lotus</div></div>
<div style="{g.GLASS_D}border-radius:999px;padding:8px 14px;display:flex;align-items:center;gap:8px;font:700 12px {g.Bd}"><div style="width:9px;height:9px;border-radius:50%;background:#3DDC97"></div>LIVE</div></div>
<div style="display:flex;gap:8px">{tabs}</div>
{"".join(call(*c) for c in CALLS)}{pick(*PICKS[0])}{pick(*PICKS[1])}</div>
<div style="{g.GLASS_D}position:absolute;left:14px;right:14px;bottom:14px;height:68px;border-radius:34px;display:flex;align-items:center;gap:12px;padding:0 10px 0 22px;box-sizing:border-box">
<div style="flex-grow:1"><div style="font:700 11px {g.Bd};letter-spacing:.12em;color:{g.SOFT}">SOLD OUT NOW · 1</div><div style="font:500 14px {g.Bd}">Coconut Ice Cream</div></div>
<button type="button" style="height:48px;padding:0 20px;border:0;border-radius:24px;background:{g.WHITE};color:{g.BASE};font:700 13px {g.Bd}">Mark a dish</button></div></div>'''
    return g.page("Waiter floor (glass)", 390, 844, body, g.BASE)

def glass_chef():
    g = G
    def ticket(t, ago, items, allergy, btn):
        rows = "".join(f'<div style="display:flex;gap:10px;font:600 18px {g.Bd};padding:3px 0"><span style="width:30px;color:{g.GOLDT}">{q}×</span><span>{n}</span></div>' for q, n in items)
        alert = ""
        if allergy:
            alert = (f'<div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:8px 12px;border-radius:14px;background:#C62828;color:#FFFFFF">{g.icon("alert", 22, "#FFFFFF")}'
                     f'<div style="font:700 14px {g.Bd}">ALLERGY: {allergy}<br><span style="font-weight:500;font-size:12px">Waiter confirmed with diner</span></div></div>')
        return f'''<div style="{g.GLASS_D}padding:14px 16px;border-radius:24px;box-sizing:border-box;display:flex;flex-direction:column;gap:4px">
<div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font:600 30px {g.H};line-height:1.1">Table {t}</div><div style="font:700 13px {g.Bd};color:{g.SOFT}">{ago}</div></div>
{rows}{alert}
<button type="button" style="margin-top:6px;height:48px;border:0;border-radius:24px;background:{g.WHITE};color:{g.BASE};font:700 14px {g.Bd}">{btn}</button></div>'''
    cols = ""
    for name, tk in TICKETS.items():
        cols += f'''<div style="width:296px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px"><div style="font:600 22px {g.H};letter-spacing:.08em">{name.title()}</div><div style="{g.GLASS_D}width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 14px {g.Bd}">{len(tk)}</div></div>
{"".join(ticket(*t) for t in tk)}</div>'''
    sold = "".join(
        f'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.18)"><div style="font:500 15px {g.Bd}">{n}</div>'
        f'<div style="width:46px;height:26px;border-radius:13px;background:{"#1FA68A" if on else "rgba(255,255,255,.28)"};position:relative"><div style="position:absolute;top:3px;{"right" if on else "left"}:3px;width:20px;height:20px;border-radius:50%;background:{g.WHITE}"></div></div></div>'
        for n, on in SOLD)
    body = f'''<div style="width:1280px;height:800px;position:relative;overflow:hidden;background:{g.BASE};color:{g.WHITE};font-family:{g.Bd};box-sizing:border-box">
{g.blob(-160, -140, 620, "#7C5CFF", .8)}{g.blob(700, -200, 560, "#12B5D6", .5)}{g.blob(-100, 480, 600, "#FF5FA8", .45)}{g.blob(860, 420, 520, "#7C5CFF", .6)}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:20px 28px;gap:16px;box-sizing:border-box">
<div style="{g.GLASS_D}height:68px;flex-shrink:0;border-radius:34px;display:flex;align-items:center;justify-content:space-between;padding:0 26px;box-sizing:border-box">
<div style="display:flex;align-items:baseline;gap:14px"><div style="font:600 30px {g.H}">Kitchen</div><div style="font:500 13px {g.Bd};color:{g.SOFT};letter-spacing:.14em">GOLDEN LOTUS · CHEF</div></div>
<div style="display:flex;align-items:center;gap:20px"><div style="display:flex;align-items:center;gap:8px;font:700 13px {g.Bd}"><div style="width:9px;height:9px;border-radius:50%;background:#3DDC97"></div>LIVE</div><div style="font:500 28px {g.H}">18:42</div></div></div>
<div style="flex-grow:1;min-height:0;display:flex;gap:24px">
<div style="display:flex;gap:20px">{cols}</div>
<div style="{g.GLASS_D}flex-grow:1;min-width:0;padding:18px 22px;border-radius:28px;box-sizing:border-box;align-self:flex-start">
<div style="font:600 22px {g.H};margin-bottom:4px">Sold out today</div><div style="font:400 13px {g.Bd};color:{g.SOFT};margin-bottom:6px">Switch a dish off when the kitchen runs out. Diners and the AI waiter stop offering it at once.</div>{sold}</div>
</div></div></div>'''
    return g.page("Kitchen display (glass)", 1280, 800, body, g.BASE)

new = {
 "Waiter-Floor.dc.html": (deco_waiter(), "deco", 940, 0, 390, 844, "Waiter · Floor"),
 "Chef-Kitchen.dc.html": (deco_chef(), "deco", 4080, 1300, 1280, 800, "Chef · Kitchen display"),
 "Glass-Waiter-Floor.dc.html": (glass_waiter(), "glass", 940, 0, 390, 844, "Glass · Waiter floor"),
 "Glass-Chef-Kitchen.dc.html": (glass_chef(), "glass", 4080, 1300, 1280, 800, "Glass · Chef kitchen"),
}
cv = json.loads((HERE / "canvas.server.json").read_text(encoding="utf-8"))
for n, (html, page, x, y, w, h, t) in new.items():
    (OUT / n).write_text(html, encoding="utf-8")
    cv["boards"][n] = {"x": x, "y": y, "w": w, "h": h, "title": t, "page": page}
    if n not in cv["order"]:
        cv["order"].append(n)
for k, (text, mw) in {"n1": ("Phones: diner and waiter", 1330), "n2": ("Desktop: owner and kitchen", 5360),
                      "g1": ("Glass phones: diner and waiter", 1330), "g2": ("Glass desktop: owner and kitchen", 5360)}.items():
    cv["notes"][k]["text"] = text
    cv["notes"][k]["maxW"] = mw
(OUT / "canvas.json").write_text(json.dumps(cv, ensure_ascii=False, indent=1), encoding="utf-8")
print("ok")
