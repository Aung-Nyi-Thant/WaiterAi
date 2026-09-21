# -*- coding: utf-8 -*-
"""Generates the Art Deco UI boards (.dc.html) + canvas.json for the Shop AI canvas."""
import json, math, datetime, pathlib

OUT = pathlib.Path(__file__).parent / "canvas" / "project"
INK, INK2, INK3 = "#0B1626", "#12233A", "#1B3050"
GOLD, GOLD2, BRONZE = "#D4AF5A", "#EBD592", "#7A5C14"
IVORY, IVORY2, MUTED_D, MUTED_L = "#F5ECD6", "#EADFC2", "#B9B4A3", "#4B4A44"
EMERALD, RUBY, AMBER = "#17695E", "#A83232", "#8A5A00"
D = "'Poiret One','Noto Sans Thai','Noto Sans Myanmar',serif"
B = "'Josefin Sans','Noto Sans Thai','Noto Sans Myanmar',sans-serif"

def page(title, w, h, body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&amp;family=Noto+Sans+Myanmar:wght@400;600&amp;family=Noto+Sans+Thai:wght@400;600&amp;family=Poiret+One&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0;background:{INK}}}
button{{font-family:inherit;cursor:pointer}}
input{{font-family:inherit}}
</style>
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''

def sun(w=220, color=GOLD, op=0.9):
    h = w / 2
    cx, cy = 100, 100
    parts = []
    for i in range(13):
        a = math.pi - i * math.pi / 12
        parts.append(f'<line x1="{cx+22*math.cos(a):.1f}" y1="{cy-22*math.sin(a):.1f}" x2="{cx+96*math.cos(a):.1f}" y2="{cy-96*math.sin(a):.1f}"/>')
    for r in (22, 44, 70, 96):
        parts.append(f'<path d="M{cx-r} {cy} A{r} {r} 0 0 1 {cx+r} {cy}" fill="none"/>')
    return (f'<svg width="{w}" height="{h:.0f}" viewBox="0 0 200 100" aria-hidden="true" style="display:block" '
            f'stroke="{color}" stroke-width="1" opacity="{op}" fill="none">' + "".join(parts) + '</svg>')

def rule(color=GOLD, w="100%"):
    return (f'<div style="display:flex;align-items:center;gap:10px;width:{w}">'
            f'<div style="flex-grow:1;height:1px;background:{color}"></div>'
            f'<div style="width:8px;height:8px;background:{color};transform:rotate(45deg)"></div>'
            f'<div style="flex-grow:1;height:1px;background:{color}"></div></div>')

def corners(color=GOLD, s=14, inset=6):
    """four L-shaped Deco corner ornaments; parent must be position:relative"""
    def c(pos, path):
        return (f'<svg width="{s}" height="{s}" viewBox="0 0 14 14" aria-hidden="true" style="position:absolute;{pos}" '
                f'stroke="{color}" stroke-width="1.5" fill="none"><path d="{path}"/></svg>')
    i = f"{inset}px"
    return (c(f"top:{i};left:{i}", "M1 13V1H13") + c(f"top:{i};right:{i}", "M1 1H13V13") +
            c(f"bottom:{i};left:{i}", "M1 1V13H13") + c(f"bottom:{i};right:{i}", "M13 1V13H1"))

ICONS = {
 "search": '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/>',
 "chat": '<path d="M4 5h16v11H9l-5 4z"/>',
 "bell": '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
 "plus": '<path d="M12 5v14M5 12h14"/>',
 "check": '<path d="M4 12.5l5 5L20 6.5"/>',
 "back": '<path d="M15 5l-7 7 7 7"/>',
 "send": '<path d="M4 12L20 4l-4 16-4-6z"/>',
 "list": '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 "upload": '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
 "clock": '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
 "help": '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
 "bot": '<rect x="5" y="8" width="14" height="10"/><path d="M12 4v4M9 13h.01M15 13h.01"/>',
 "qr": '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h3v3h3M14 20h.01M20 20h.01"/>',
 "chart": '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
 "edit": '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
 "alert": '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
}
def icon(name, s=20, color="currentColor", sw=1.6):
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" aria-hidden="true" style="display:block;flex-shrink:0" '
            f'fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="square" stroke-linejoin="miter">{ICONS[name]}</svg>')

def photo(w, h, dark=True):
    a, b = (INK3, INK2) if dark else (IVORY2, IVORY)
    line = GOLD if dark else BRONZE
    return (f'<div style="width:{w}px;height:{h}px;flex-shrink:0;box-sizing:border-box;border:1px solid {line};'
            f'background:repeating-linear-gradient(45deg,{a} 0,{a} 6px,{b} 6px,{b} 12px);display:flex;align-items:flex-end;'
            f'justify-content:center;font:600 11px {B};letter-spacing:.14em;color:{line};padding-bottom:4px">PHOTO</div>')

def tag(text, dark=True, tone="gold"):
    if dark:
        col = {"gold": GOLD2, "green": "#8FD9C8", "red": "#F0A0A0"}[tone]
    else:
        col = {"gold": BRONZE, "green": EMERALD, "red": RUBY}[tone]
    return (f'<span style="display:inline-block;padding:3px 8px;border:1px solid {col};color:{col};'
            f'font:600 11px {B};letter-spacing:.1em;text-transform:uppercase;white-space:nowrap">{text}</span>')

DISHES = [
 ("Shrimp Pad Thai", "ผัดไทยกุ้ง", "ပုစွန် ပတ်ထိုင်း", 120, ["peanut", "shellfish", "egg", "fish"], []),
 ("Chicken Green Curry", "แกงเขียวหวานไก่", "ကြက်သား ဂရင်းကာရီ", 140, ["shellfish"], ["spicy"]),
 ("Tom Yum Goong", "ต้มยำกุ้ง", "တွမ်ယမ်ကွန်း", 180, ["shellfish", "fish"], ["spicy"]),
 ("Vegetable Tofu Stir-fry", "ผัดผักรวมเต้าหู้", "တိုဟူးနှင့် ဟင်းသီးဟင်းရွက်ကြော်", 90, ["soy"], ["vegan"]),
 ("Mango Sticky Rice", "ข้าวเหนียวมะม่วง", "သရက်သီး ကောက်ညှင်းပေါင်း", 100, [], ["vegan"]),
 ("Fresh Spring Rolls", "ปอเปี๊ยะสด", "ဟင်းသီးဟင်းရွက် ကော်ပြန့်စိမ်း", 85, None, []),
 ("Coconut Ice Cream", "ไอศกรีมกะทิ", "အုန်းနို့ ရေခဲမုန့်", 60, ["milk"], []),
]

def fmt_price(p): return f"฿{p}"

# ---------------------------------------------------------------- Board 1: diner menu
def diner_card(d, sold=False):
    en, th, my, price, al, tags = d
    op = "opacity:.5;" if sold else ""
    chips = "".join(tag(a) for a in (al or [])[:3])
    tg = "".join(tag(t, tone="green") for t in tags)
    if sold:
        tg = tag("Sold out today", tone="red")
    return f'''<div style="display:flex;gap:12px;padding:12px;background:{INK2};box-sizing:border-box;outline:1px solid rgba(212,175,90,.55);outline-offset:-4px;position:relative">
{photo(84, 96)}
<div style="{op}display:flex;flex-direction:column;gap:4px;flex-grow:1;min-width:0">
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div style="font:600 16px {B};color:{IVORY};line-height:1.25">{en}</div><div style="font:600 17px {B};color:{GOLD};white-space:nowrap">{fmt_price(price)}</div></div>
<div style="font:400 12px {B};color:{MUTED_D};line-height:1.7">{th} · {my}</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">{tg}{chips}</div>
</div>
</div>'''

def board_diner_menu():
    cards = "".join([diner_card(DISHES[0]), diner_card(DISHES[1]), diner_card(DISHES[3]), diner_card(DISHES[6], sold=True)])
    tabs = "".join(
        f'<div style="padding:14px 4px 12px;margin-right:18px;white-space:nowrap;font:600 13px {B};letter-spacing:.16em;text-transform:uppercase;'
        f'color:{GOLD if i == 0 else MUTED_D};border-bottom:2px solid {GOLD if i == 0 else "transparent"}">{t}</div>'
        for i, t in enumerate(["All", "Mains", "Curries", "Salads", "Desserts", "Drinks"]))
    pills = "".join(
        f'<button type="button" style="width:44px;height:36px;border:1px solid {GOLD};background:{GOLD if a else "transparent"};'
        f'color:{INK if a else GOLD2};font:600 13px {B};letter-spacing:.08em">{t}</button>'
        for t, a in [("TH", False), ("MY", False), ("EN", True)])
    chips = "".join(
        f'<button type="button" style="height:40px;padding:0 14px;border:1px solid {GOLD};background:{GOLD if a else "transparent"};color:{INK if a else GOLD2};'
        f'font:600 13px {B};letter-spacing:.06em;white-space:nowrap">{t}</button>'
        for t, a in [("Vegetarian", False), ("No peanuts", True), ("Under ฿100", False), ("Spicy", False)])
    body = f'''<div style="width:390px;height:844px;position:relative;overflow:hidden;background:{INK};color:{IVORY};font-family:{B};box-sizing:border-box">
<div style="position:absolute;top:0;left:0;right:0;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;padding-bottom:12px;box-sizing:border-box">
<div style="position:absolute;top:0;left:85px">{sun(220, GOLD, .55)}</div>
<div style="position:absolute;top:14px;right:14px;display:flex;gap:6px">{pills}</div>
<div style="position:relative;font:400 36px {D};color:{GOLD};letter-spacing:.18em;line-height:1">GOLDEN LOTUS</div>
<div style="position:relative;font:400 12px {B};color:{IVORY};letter-spacing:.5em">KITCHEN · BANGKOK</div>
<div style="position:relative;width:200px">{rule(GOLD)}</div>
</div>
<div style="position:absolute;top:160px;left:0;right:0;padding:0 16px;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;overflow:hidden;border-bottom:1px solid rgba(212,175,90,.35)">{tabs}</div>
<div style="display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;background:{INK2};border:1px solid {GOLD};color:{GOLD2}">{icon("search", 20, GOLD)}<input aria-label="Search dishes" placeholder="Search dishes" style="flex-grow:1;background:transparent;border:0;outline:0;color:{IVORY};font-size:15px;padding:0"></div>
<div style="display:flex;gap:8px;overflow:hidden">{chips}</div>
<div style="display:flex;flex-direction:column;gap:10px">{cards}</div>
</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:104px;background:linear-gradient(to top,{INK} 62%,rgba(11,22,38,0));display:flex;align-items:flex-end;gap:10px;padding:0 16px 20px;box-sizing:border-box">
<button type="button" style="flex-grow:1;height:52px;display:flex;align-items:center;justify-content:center;gap:10px;background:{GOLD};border:0;color:{INK};font:700 15px {B};letter-spacing:.14em;text-transform:uppercase">{icon("chat", 20, INK)}Ask the waiter</button>
<button type="button" aria-label="Call staff" style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid {GOLD};color:{GOLD}">{icon("bell", 22, GOLD)}</button>
</div>
</div>'''
    return page("Diner menu", 390, 844, body)

# ---------------------------------------------------------------- Board 2: diner chat
def bubble_user(text, my=False):
    lh = "1.9" if my else "1.5"
    return (f'<div style="align-self:flex-end;max-width:290px;padding:10px 14px;background:{GOLD};color:{INK};font:600 15px {B};line-height:{lh}">{text}</div>')

def mini_card(d, added=False):
    en, th, my, price, al, tags = d
    btn = (f'<button type="button" style="height:44px;padding:0 14px;display:flex;align-items:center;gap:6px;background:{GOLD if not added else "transparent"};'
           f'border:1px solid {GOLD};color:{INK if not added else GOLD};font:700 12px {B};letter-spacing:.12em;text-transform:uppercase">'
           f'{icon("check" if added else "plus", 16, INK if not added else GOLD)}{"Added" if added else "Add"}</button>')
    return f'''<div style="display:flex;align-items:center;gap:10px;padding:8px;background:{INK2};outline:1px solid rgba(212,175,90,.55);outline-offset:-3px">
{photo(52, 52)}
<div style="flex-grow:1;min-width:0"><div style="font:600 14px {B};color:{IVORY};line-height:1.3">{en}</div><div style="font:600 15px {B};color:{GOLD}">{fmt_price(price)} {tag("vegan", tone="green")}</div></div>
{btn}
</div>'''

def board_diner_chat():
    ai_style = f"align-self:flex-start;max-width:320px;padding:12px 14px;background:{IVORY};color:{INK};position:relative;box-sizing:border-box;outline:1px solid {BRONZE};outline-offset:-4px"
    my_reply = ("တိုဟူးနှင့် ဟင်းသီးဟင်းရွက်ကြော် (Vegetable Tofu Stir-fry) ၉၀ ဘတ် ရှိပါတယ်ခင်ဗျာ။ "
                "သရက်သီး ကောက်ညှင်းပေါင်း (Mango Sticky Rice) ၁၀၀ ဘတ် ရှိပါတယ်ခင်ဗျာ။")
    body = f'''<div style="width:390px;height:844px;position:relative;overflow:hidden;background:{INK};color:{IVORY};font-family:{B};box-sizing:border-box;display:flex;flex-direction:column">
<div style="height:92px;flex-shrink:0;position:relative;display:flex;align-items:center;gap:12px;padding:0 14px;box-sizing:border-box;border-bottom:1px solid {GOLD};background:{INK2}">
<div style="position:absolute;top:0;right:20px">{sun(150, GOLD, .4)}</div>
<button type="button" aria-label="Back to menu" style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid {GOLD};color:{GOLD}">{icon("back", 20, GOLD)}</button>
<div style="position:relative"><div style="font:400 26px {D};color:{GOLD};letter-spacing:.14em;line-height:1.1">THE WAITER</div><div style="font:400 12px {B};color:{MUTED_D};letter-spacing:.16em">ASK ABOUT ANY DISH · ANY LANGUAGE</div></div>
</div>
<div style="flex-grow:1;padding:16px;display:flex;flex-direction:column;gap:12px;overflow:hidden">
{bubble_user("သက်သတ်လွတ် စားစရာ ဘတ် ၁၀၀ အောက်မှာ ဘာရှိလဲ", True)}
<div style="{ai_style}">{corners(BRONZE, 12, 5)}<div style="font:400 15px {B};line-height:1.9;padding:2px 2px">{my_reply}</div></div>
<div style="display:flex;flex-direction:column;gap:8px;align-self:flex-start;width:320px">{mini_card(DISHES[3], True)}{mini_card(DISHES[4])}</div>
{bubble_user("Does the stir-fry have any allergens?")}
<div style="{ai_style}">{corners(BRONZE, 12, 5)}
<div style="font:600 12px {B};letter-spacing:.18em;color:{BRONZE};margin-bottom:6px">ALLERGENS · VEGETABLE TOFU STIR-FRY</div>
<div style="display:flex;gap:6px;margin-bottom:8px">{tag("Soy", False, "gold")}</div>
<div style="font:400 15px {B};line-height:1.5">Our kitchen may handle other allergens. Please confirm with the staff before ordering.</div></div>
</div>
<div style="flex-shrink:0;padding:10px 16px;background:{INK3};border-top:1px solid {GOLD};display:flex;align-items:center;gap:10px;box-sizing:border-box">
<div style="flex-grow:1"><div style="font:600 12px {B};letter-spacing:.16em;color:{GOLD2}">MY PICKS · 1 DISH</div><div style="font:400 14px {B};color:{IVORY}">Vegetable Tofu Stir-fry · ฿90</div></div>
<button type="button" style="height:44px;padding:0 16px;background:{GOLD};border:0;color:{INK};font:700 13px {B};letter-spacing:.12em;text-transform:uppercase">Show to waiter</button>
</div>
<div style="flex-shrink:0;padding:12px 16px 20px;background:{INK};display:flex;gap:8px;box-sizing:border-box">
<div style="flex-grow:1;height:48px;display:flex;align-items:center;padding:0 14px;border:1px solid {GOLD};background:{INK2}"><input aria-label="Type your question" placeholder="Type in Thai, Burmese or English" style="width:100%;background:transparent;border:0;outline:0;color:{IVORY};font-size:15px;padding:0"></div>
<button type="button" aria-label="Send" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:{GOLD};border:0;color:{INK}">{icon("send", 22, INK)}</button>
<button type="button" aria-label="Call staff" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid {GOLD};color:{GOLD}">{icon("bell", 22, GOLD)}</button>
</div>
</div>'''
    return page("Diner chat", 390, 844, body)

# ---------------------------------------------------------------- owner shared
def sidebar(active):
    items = [("list", "Menu items"), ("upload", "Import a menu"), ("clock", "Specials & hours"), ("help", "FAQ & rules"),
             ("bot", "AI waiter"), ("qr", "QR codes"), ("chart", "Insights")]
    nav = ""
    for ic, name in items:
        on = name == active
        nav += (f'<a href="#" style="display:flex;align-items:center;gap:12px;height:48px;padding:0 18px;text-decoration:none;box-sizing:border-box;'
                f'color:{GOLD if on else IVORY};background:{INK3 if on else "transparent"};border-left:3px solid {GOLD if on else "transparent"};'
                f'font:{600 if on else 400} 15px {B};letter-spacing:.06em">{icon(ic, 20, GOLD if on else MUTED_D)}{name}</a>')
    return f'''<div style="width:248px;flex-shrink:0;height:100%;background:{INK};color:{IVORY};display:flex;flex-direction:column;box-sizing:border-box;position:relative">
<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px 0 16px">
{sun(120, GOLD, .8)}
<div style="font:400 30px {D};color:{GOLD};letter-spacing:.2em;line-height:1">SHOP AI</div>
<div style="font:400 11px {B};letter-spacing:.34em;color:{MUTED_D}">THE DIGITAL WAITER</div>
<div style="width:150px;margin-top:6px">{rule(GOLD)}</div>
</div>
<div style="display:flex;flex-direction:column;margin-top:8px">{nav}</div>
<div style="margin-top:auto;padding:16px 18px;border-top:1px solid rgba(212,175,90,.4)">
<div style="font:600 14px {B};color:{IVORY}">Golden Lotus Kitchen</div>
<div style="font:400 13px {B};color:{MUTED_D};margin-top:2px">Bangkok · Free plan</div>
<div style="margin-top:10px;height:6px;background:{INK3}"><div style="width:71%;height:6px;background:{GOLD}"></div></div>
<div style="font:400 12px {B};color:{MUTED_D};margin-top:6px">212 of 300 chats this month</div>
</div>
</div>'''

def topbar(crumb, show_buttons=True):
    btns = ""
    if show_buttons:
        btns = (f'<button type="button" style="height:44px;padding:0 18px;display:flex;align-items:center;gap:8px;background:transparent;border:1px solid {INK};color:{INK};font:600 13px {B};letter-spacing:.12em;text-transform:uppercase">{icon("bot", 18, INK)}Test the assistant</button>'
                f'<button type="button" style="height:44px;padding:0 20px;background:{INK};border:0;color:{GOLD};font:700 13px {B};letter-spacing:.14em;text-transform:uppercase">Publish changes</button>')
    return (f'<div style="height:72px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid {BRONZE};box-sizing:border-box">'
            f'<div style="font:400 13px {B};letter-spacing:.2em;text-transform:uppercase;color:{MUTED_L}">{crumb}</div><div style="display:flex;gap:10px">{btns}</div></div>')

def owner_page(title, active, crumb, inner, buttons=True):
    body = f'''<div style="width:1280px;height:800px;display:flex;overflow:hidden;background:{IVORY};color:{INK};font-family:{B};box-sizing:border-box">
{sidebar(active)}
<div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;position:relative">
{topbar(crumb, buttons)}
{inner}
</div>
</div>'''
    return page(title, 1280, 800, body)

def toggle(on):
    return (f'<div style="display:flex;align-items:center;gap:8px;font:600 13px {B};color:{EMERALD if on else RUBY}">'
            f'<div style="width:44px;height:24px;background:{EMERALD if on else "#B9B1A0"};position:relative;box-sizing:border-box">'
            f'<div style="position:absolute;top:3px;{"right" if on else "left"}:3px;width:18px;height:18px;background:{IVORY}"></div></div>{"On sale" if on else "Sold out"}</div>')

# ---------------------------------------------------------------- Board 3: dashboard
def board_dashboard():
    rows = ""
    for i, d in enumerate(DISHES):
        en, th, my, price, al, tags = d
        if al is None:
            chips = tag("Not provided", False, "red")
        elif not al:
            chips = tag("None listed", False, "gold")
        else:
            chips = "".join(tag(a, False) for a in al)
        tg = "".join(tag(t, False, "green") for t in tags)
        rows += f'''<div style="display:flex;align-items:center;height:60px;padding:0 20px;gap:16px;border-bottom:1px solid rgba(122,92,20,.3);box-sizing:border-box;background:{"#FBF5E4" if i % 2 == 0 else "transparent"}">
<div style="width:300px;display:flex;align-items:center;gap:12px">{photo(40, 40, False)}<div><div style="font:600 15px {B}">{en}</div><div style="font:400 12px {B};color:{MUTED_L};line-height:1.7">{th} · {my}</div></div></div>
<div style="width:80px;font:600 16px {B}">{fmt_price(price)}</div>
<div style="width:300px;display:flex;gap:5px;flex-wrap:wrap">{chips}</div>
<div style="width:110px;display:flex;gap:5px">{tg}</div>
<div style="width:130px">{toggle(d[0] != "Coconut Ice Cream")}</div>
<button type="button" aria-label="Edit {en}" style="margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid {BRONZE};color:{BRONZE}">{icon("edit", 18, BRONZE)}</button>
</div>'''
    tabs = "".join(
        f'<div style="padding:12px 4px;margin-right:24px;font:600 13px {B};letter-spacing:.16em;text-transform:uppercase;color:{INK if i == 0 else MUTED_L};border-bottom:2px solid {BRONZE if i == 0 else "transparent"}">{t}</div>'
        for i, t in enumerate(["All · 13", "Mains", "Curries", "Salads", "Desserts", "Drinks"]))
    segs = "".join(f'<div style="width:20px;height:10px;background:{BRONZE if i < 12 else "transparent"};border:1px solid {BRONZE};box-sizing:border-box"></div>' for i in range(13))
    inner = f'''<div style="padding:24px 36px 0;display:flex;flex-direction:column;gap:14px;flex-grow:1;min-height:0">
<div style="display:flex;justify-content:space-between;align-items:flex-end">
<div><div style="font:400 46px {D};letter-spacing:.06em;line-height:1">Menu items</div><div style="font:400 15px {B};color:{MUTED_L};margin-top:6px">What diners see, and what the AI waiter is allowed to say.</div></div>
<div style="position:relative;padding:14px 18px;background:#FBF5E4;outline:1px solid {BRONZE};outline-offset:-4px;width:330px;box-sizing:border-box">{corners(BRONZE, 10, 4)}
<div style="font:600 12px {B};letter-spacing:.18em;color:{BRONZE}">ALLERGEN DATA</div>
<div style="font:600 17px {B};margin:2px 0 8px">12 of 13 dishes complete</div>
<div style="display:flex;gap:3px">{segs}</div>
<div style="font:400 12px {B};color:{MUTED_L};margin-top:6px">Fresh Spring Rolls has no allergen info yet.</div></div>
</div>
<div style="display:flex;border-bottom:1px solid {BRONZE}">{tabs}</div>
<div style="display:flex;padding:0 20px;height:36px;align-items:center;gap:16px;font:600 12px {B};letter-spacing:.16em;color:{MUTED_L};background:{IVORY2}">
<div style="width:352px">DISH</div><div style="width:80px">PRICE</div><div style="width:300px">ALLERGENS</div><div style="width:110px">TAGS</div><div style="width:130px">TODAY</div></div>
<div style="display:flex;flex-direction:column;border-top:1px solid {BRONZE}">{rows}</div>
</div>'''
    return owner_page("Owner dashboard", "Menu items", "Menu / All dishes", inner)

# ---------------------------------------------------------------- Board 4: import review
def board_import():
    def step(n, name, state):
        on = state == "on"; done = state == "done"
        bg = GOLD if on else (INK if done else "transparent")
        fg = INK if on else (GOLD if done else MUTED_L)
        return (f'<div style="display:flex;align-items:center;gap:10px"><div style="width:32px;height:32px;transform:rotate(45deg);background:{bg};border:1px solid {INK};'
                f'display:flex;align-items:center;justify-content:center"><div style="transform:rotate(-45deg);font:700 14px {B};color:{fg}">{n}</div></div>'
                f'<div style="margin-left:6px;font:{700 if on else 400} 13px {B};letter-spacing:.16em;text-transform:uppercase;color:{INK if on else MUTED_L}">{name}</div></div>')
    stepper = (f'<div style="display:flex;align-items:center;gap:20px">{step("1", "Upload", "done")}<div style="width:60px;height:1px;background:{BRONZE}"></div>'
               f'{step("2", "Review", "on")}<div style="width:60px;height:1px;background:{BRONZE}"></div>{step("3", "Publish", "off")}</div>')
    def field(w, label, val, flag=False):
        col = AMBER if flag else BRONZE
        return (f'<div style="width:{w}px"><div style="font:600 11px {B};letter-spacing:.14em;color:{MUTED_L};margin-bottom:3px">{label}</div>'
                f'<div style="height:40px;display:flex;align-items:center;padding:0 10px;box-sizing:border-box;background:#FBF5E4;border:{"2px dashed" if flag else "1px solid"} {col};font:400 15px {B}">{val}</div></div>')
    def row(n, en, price, cat, flag=None):
        chip = tag("Check price", False, "red") if flag == "price" else (tag("Check name", False, "red") if flag == "name" else tag("Looks right", False, "green"))
        return f'''<div style="display:flex;align-items:flex-end;gap:12px;padding:12px 14px;background:{"#FFF6DA" if flag else "#FBF5E4"};outline:1px solid {AMBER if flag else "rgba(122,92,20,.4)"};outline-offset:-3px">
<div style="width:26px;height:26px;background:{INK};color:{GOLD};display:flex;align-items:center;justify-content:center;font:700 13px {B};flex-shrink:0">{n}</div>
{field(250, "DISH NAME", en, flag == "name")}{field(90, "PRICE ฿", price, flag == "price")}{field(120, "CATEGORY", cat)}
<div style="margin-left:auto;padding-bottom:8px">{chip}</div></div>'''
    lines = "".join(f'<div style="display:flex;justify-content:space-between;gap:14px"><div style="height:8px;background:#B7AC8B;width:{w}%"></div><div style="height:8px;background:#B7AC8B;width:14%"></div></div>' for w in (52, 66, 44, 58, 70, 48, 62))
    def mark(n, top):
        return f'<div style="position:absolute;left:-14px;top:{top}px;width:28px;height:28px;background:{GOLD};color:{INK};display:flex;align-items:center;justify-content:center;font:700 13px {B};transform:rotate(45deg)"><div style="transform:rotate(-45deg)">{n}</div></div>'
    orig = f'''<div style="width:400px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
<div style="font:600 12px {B};letter-spacing:.18em;color:{BRONZE}">YOUR PHOTO · PAGE 1 OF 2</div>
<div style="position:relative;height:520px;background:#DDD0AE;border:1px solid {BRONZE};padding:34px 34px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;overflow:hidden">
<div style="font:400 24px {D};text-align:center;letter-spacing:.1em;color:#5B4A1B">MENU PHOTO</div>
{lines}
{mark("1", 90)}{mark("2", 150)}{mark("3", 214)}
<div style="position:absolute;left:0;right:0;top:78px;height:32px;border:2px solid {GOLD};box-sizing:border-box;margin:0 14px"></div>
{lines}
</div></div>'''
    inner = f'''<div style="padding:22px 36px 0;display:flex;flex-direction:column;gap:14px;flex-grow:1;min-height:0">
<div style="display:flex;justify-content:space-between;align-items:center">
<div><div style="font:400 44px {D};letter-spacing:.06em;line-height:1">Check your menu</div><div style="font:400 15px {B};color:{MUTED_L};margin-top:6px">The AI read 14 dishes from your photo. Fix anything that looks wrong.</div></div>
{stepper}</div>
{rule(BRONZE)}
<div style="display:flex;gap:28px;min-height:0">
{orig}
<div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:10px">
<div style="display:flex;justify-content:space-between;align-items:center"><div style="font:600 12px {B};letter-spacing:.18em;color:{BRONZE}">FOUND 14 DISHES · 3 NEED A CHECK</div>
<div style="display:flex;gap:6px"><span style="font:600 12px {B};color:{MUTED_L};letter-spacing:.1em;align-self:center;margin-right:4px">NAMES IN</span>{tag("EN", False)}{tag("TH", False)}{tag("MY", False)}</div></div>
{row("1", "Shrimp Pad Thai", "120", "Mains")}
{row("2", "Chicken Green Curry", "14O", "Curries", "price")}
{row("3", "Tom Yum Goong", "180", "Curries")}
{row("4", "Veg. Tofu Stirfy", "90", "Mains", "name")}
<div style="font:400 13px {B};color:{MUTED_L};margin-top:2px">Photo unclear? The letter O in "14O" looks like a zero. Thai and Burmese names are added by AI and marked for your review.</div>
</div></div>
</div>
<div style="height:76px;flex-shrink:0;margin:0 -36px;padding:0 36px;background:{INK};display:flex;align-items:center;justify-content:space-between">
<div style="font:400 14px {B};color:{IVORY};letter-spacing:.04em;display:flex;align-items:center;gap:10px">{icon("alert", 20, GOLD)}Nothing goes live until you confirm.</div>
<div style="display:flex;gap:10px"><button type="button" style="height:44px;padding:0 18px;background:transparent;border:1px solid {GOLD};color:{GOLD};font:600 13px {B};letter-spacing:.12em;text-transform:uppercase">Add a missing dish</button>
<button type="button" style="height:44px;padding:0 22px;background:{GOLD};border:0;color:{INK};font:700 13px {B};letter-spacing:.14em;text-transform:uppercase">Confirm &amp; publish</button></div>
</div>
</div>'''
    return owner_page("Import review", "Import a menu", "Import / Review", inner, buttons=False)

# ---------------------------------------------------------------- Board 5: insights
def board_insights():
    def tile(label, value, sub):
        return (f'<div style="flex:1;position:relative;padding:14px 18px;background:#FBF5E4;outline:1px solid {BRONZE};outline-offset:-4px;box-sizing:border-box">{corners(BRONZE, 10, 4)}'
                f'<div style="font:600 12px {B};letter-spacing:.16em;color:{BRONZE}">{label}</div><div style="font:400 40px {D};line-height:1.15">{value}</div><div style="font:400 13px {B};color:{MUTED_L}">{sub}</div></div>')
    def bar(label, n, mx=86):
        return (f'<div style="display:flex;align-items:center;gap:12px"><div style="width:230px;font:400 15px {B}">{label}</div>'
                f'<div style="flex-grow:1;height:22px;background:{IVORY2}"><div style="width:{n/mx*100:.0f}%;height:22px;background:{INK}"></div></div>'
                f'<div style="width:36px;text-align:right;font:600 15px {B}">{n}</div></div>')
    unanswered = "".join(
        f'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(122,92,20,.3)"><div style="font:400 15px {B}">{q}</div>'
        f'<button type="button" style="height:44px;padding:0 14px;background:transparent;border:1px solid {BRONZE};color:{BRONZE};font:700 12px {B};letter-spacing:.12em;text-transform:uppercase;white-space:nowrap">Add FAQ</button></div>'
        for q in ["Do you have a kids menu?", "Can I book a table for 10?", "Is there halal food?"])
    lang = (f'<div style="display:flex;height:26px"><div style="width:46%;background:{INK};color:{GOLD};font:600 13px {B};display:flex;align-items:center;padding-left:8px">Thai 46%</div>'
            f'<div style="width:31%;background:{EMERALD};color:{IVORY};font:600 13px {B};display:flex;align-items:center;padding-left:8px">Burmese 31%</div>'
            f'<div style="width:23%;background:{BRONZE};color:{IVORY};font:600 13px {B};display:flex;align-items:center;padding-left:8px">English 23%</div></div>')
    inner = f'''<div style="padding:22px 36px 0;display:flex;flex-direction:column;gap:16px;flex-grow:1;min-height:0">
<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font:400 46px {D};letter-spacing:.06em;line-height:1">What diners asked</div><div style="font:400 15px {B};color:{MUTED_L};margin-top:6px">Last 7 days · what people wanted, and what you could not answer.</div></div>{tag("Sample data", False)}</div>
<div style="display:flex;gap:14px">{tile("CHATS", "412", "across 96 tables")}{tile("ANSWERED FROM MENU", "94%", "23 handed to staff")}{tile("COULD NOT ANSWER", "19", "add FAQs to fix")}{tile("MENU OPENS", "1,236", "from QR scans")}</div>
<div style="display:flex;gap:24px;min-height:0">
<div style="flex:1.35;padding:18px 22px;background:#FBF5E4;outline:1px solid {BRONZE};outline-offset:-4px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;position:relative">{corners(BRONZE, 10, 4)}
<div style="font:600 12px {B};letter-spacing:.18em;color:{BRONZE}">MOST ASKED</div>
{bar("Vegetarian options", 86)}{bar("Allergens (peanut, shellfish)", 74)}{bar("Prices", 61)}{bar("Opening hours", 44)}{bar("How spicy is it?", 38)}
<div style="margin-top:8px"><div style="font:600 12px {B};letter-spacing:.18em;color:{BRONZE};margin-bottom:8px">LANGUAGES</div>{lang}</div>
</div>
<div style="flex:1;display:flex;flex-direction:column;gap:16px">
<div style="padding:18px 22px;background:{INK};color:{IVORY};position:relative;box-sizing:border-box">{corners(GOLD, 12, 5)}
<div style="font:600 12px {B};letter-spacing:.18em;color:{GOLD}">UNMET DEMAND</div>
<div style="font:400 44px {D};color:{GOLD};line-height:1.1;margin-top:2px">47 people</div>
<div style="font:400 15px {B};line-height:1.5;margin-bottom:12px">asked for vegan dishes, and your menu lists only two.</div>
<button type="button" style="height:44px;padding:0 18px;background:{GOLD};border:0;color:{INK};font:700 13px {B};letter-spacing:.14em;text-transform:uppercase">Add a vegan dish</button></div>
<div style="padding:18px 22px;background:#FBF5E4;outline:1px solid {BRONZE};outline-offset:-4px;box-sizing:border-box;position:relative">{corners(BRONZE, 10, 4)}
<div style="font:600 12px {B};letter-spacing:.18em;color:{BRONZE};margin-bottom:4px">COULD NOT ANSWER</div>{unanswered}</div>
</div></div></div>'''
    return owner_page("Insights", "Insights", "Insights / This week", inner)

# ---------------------------------------------------------------- write
boards = {
 "Diner-Menu.dc.html": (board_diner_menu(), 0, 0, 390, 844, "Diner · Menu"),
 "Diner-Chat.dc.html": (board_diner_chat(), 470, 0, 390, 844, "Diner · Chat"),
 "Owner-Menu.dc.html": (board_dashboard(), 0, 1300, 1280, 800, "Owner · Menu items"),
 "Owner-Import.dc.html": (board_import(), 1360, 1300, 1280, 800, "Owner · Import review"),
 "Owner-Insights.dc.html": (board_insights(), 2720, 1300, 1280, 800, "Owner · Insights"),
}
canvas = {
 "v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")},
 "title": "Shop AI Art Deco UI", "launch": {"view": "canvas"}, "pages": [],
 "boards": {}, "order": [], "notes": {
   "n1": {"x": 0, "y": -300, "text": "Diner: phone, no login", "kind": "title1", "maxW": 860},
   "n2": {"x": 0, "y": 1000, "text": "Owner dashboard: desktop", "kind": "title1", "maxW": 4000}},
 "designSystems": []}
for name, (html, x, y, w, h, title) in boards.items():
    (OUT / name).write_text(html, encoding="utf-8")
    canvas["boards"][name] = {"x": x, "y": y, "w": w, "h": h, "title": title}
    canvas["order"].append(name)
(OUT / "canvas.json").write_text(json.dumps(canvas, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", len(boards), "boards")
