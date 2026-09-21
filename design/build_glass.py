# -*- coding: utf-8 -*-
"""Glassmorphism variant of the Shop AI boards (same content as the Art Deco set)."""
import json, pathlib

OUT = pathlib.Path(__file__).parent / "canvas" / "project"
H = "'Outfit','Noto Sans Thai','Noto Sans Myanmar',sans-serif"
Bd = "'Manrope','Noto Sans Thai','Noto Sans Myanmar',sans-serif"
# diner (dark aurora)
BASE, WHITE, SOFT = "#0E1030", "#FFFFFF", "rgba(255,255,255,.76)"
VIOLET, GOLDT = "#6E56FF", "#FFD98A"
# owner (light aurora)
LBASE, NAVY, MUTED = "#EFEBFF", "#191A45", "#4A4A75"
PURP = "#2E2A78"

GLASS_D = ("background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(18px) saturate(150%);"
           "-webkit-backdrop-filter:blur(18px) saturate(150%);box-shadow:0 10px 32px rgba(4,4,40,.4);")
GLASS_L = ("background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.9);backdrop-filter:blur(22px) saturate(140%);"
           "-webkit-backdrop-filter:blur(22px) saturate(140%);box-shadow:0 10px 32px rgba(72,60,150,.16);")

def page(title, w, h, body, bg):
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
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Noto+Sans+Myanmar:wght@400;600&amp;family=Noto+Sans+Thai:wght@400;600&amp;family=Outfit:wght@300;400;500;600&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0;background:{bg}}}
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

def blob(x, y, s, c, op=.7):
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{s}px;height:{s}px;border-radius:50%;'
            f'background:radial-gradient(circle at 50% 50%,{c} 0,rgba(0,0,0,0) 68%);opacity:{op}"></div>')

def dark_bg():
    return (blob(-120, -100, 420, "#7C5CFF", .85) + blob(200, 260, 380, "#12B5D6", .55) +
            blob(-100, 560, 420, "#FF5FA8", .5) + blob(230, 640, 300, "#7C5CFF", .6))

def light_bg(w=1280, h=800):
    return (blob(-160, -140, 620, "#B9A6FF", .9) + blob(w - 520, -120, 560, "#9FEBDA", .8) +
            blob(w - 460, h - 380, 620, "#FFC9B5", .8) + blob(300, h - 300, 520, "#C6B8FF", .7))

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
 "bot": '<rect x="5" y="8" width="14" height="10" rx="2"/><path d="M12 4v4M9 13h.01M15 13h.01"/>',
 "qr": '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h3v3h3M14 20h.01M20 20h.01"/>',
 "chart": '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
 "edit": '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
 "alert": '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
}
def icon(name, s=20, color="currentColor", sw=1.7):
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" aria-hidden="true" style="display:block;flex-shrink:0" fill="none" '
            f'stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>')

def photo(w, h, dark=True, r=14):
    a, b = ("rgba(255,255,255,.22)", "rgba(255,255,255,.06)") if dark else ("rgba(255,255,255,.9)", "rgba(190,175,255,.35)")
    col = SOFT if dark else MUTED
    return (f'<div style="width:{w}px;height:{h}px;flex-shrink:0;box-sizing:border-box;border-radius:{r}px;border:1px solid rgba(255,255,255,{.35 if dark else .9});'
            f'background:linear-gradient(135deg,{a},{b});display:flex;align-items:flex-end;justify-content:center;font:600 10px {Bd};letter-spacing:.14em;color:{col};padding-bottom:5px">PHOTO</div>')

def chip(text, dark=True, tone="n"):
    if dark:
        col = {"n": WHITE, "g": "#9CF0DA", "r": "#FFB4B4", "y": GOLDT}[tone]
        bg = "rgba(255,255,255,.14)"; bd = "rgba(255,255,255,.3)"
    else:
        col = {"n": PURP, "g": "#0B6B57", "r": "#9B1C1C", "y": "#7A4A00"}[tone]
        bg = "rgba(255,255,255,.7)"; bd = "rgba(46,42,120,.25)"
    return (f'<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:{bg};border:1px solid {bd};color:{col};'
            f'font:600 11px {Bd};letter-spacing:.04em;white-space:nowrap">{text}</span>')

DISHES = [
 ("Shrimp Pad Thai", "ผัดไทยกุ้ง", "ပုစွန် ပတ်ထိုင်း", 120, ["peanut", "shellfish", "egg", "fish"], []),
 ("Chicken Green Curry", "แกงเขียวหวานไก่", "ကြက်သား ဂရင်းကာရီ", 140, ["shellfish"], ["spicy"]),
 ("Tom Yum Goong", "ต้มยำกุ้ง", "တွမ်ယမ်ကွန်း", 180, ["shellfish", "fish"], ["spicy"]),
 ("Vegetable Tofu Stir-fry", "ผัดผักรวมเต้าหู้", "တိုဟူးနှင့် ဟင်းသီးဟင်းရွက်ကြော်", 90, ["soy"], ["vegan"]),
 ("Mango Sticky Rice", "ข้าวเหนียวมะม่วง", "သရက်သီး ကောက်ညှင်းပေါင်း", 100, [], ["vegan"]),
 ("Fresh Spring Rolls", "ปอเปี๊ยะสด", "ဟင်းသီးဟင်းရွက် ကော်ပြန့်စိမ်း", 85, None, []),
 ("Coconut Ice Cream", "ไอศกรีมกะทิ", "အုန်းနို့ ရေခဲမုန့်", 60, ["milk"], []),
]
P = lambda p: f"฿{p}"

# ------------------------------------------------------------ diner menu
def d_card(d, sold=False):
    en, th, my, price, al, tags = d
    op = "opacity:.55;" if sold else ""
    tg = chip("Sold out today", True, "r") if sold else "".join(chip(t, True, "g") for t in tags)
    ch = "".join(chip(a) for a in (al or [])[:3])
    return f'''<div style="{GLASS_D}display:flex;gap:12px;padding:12px;border-radius:22px;box-sizing:border-box">
{photo(84, 96)}
<div style="{op}display:flex;flex-direction:column;gap:4px;flex-grow:1;min-width:0">
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div style="font:600 16px {H};color:{WHITE};line-height:1.25">{en}</div><div style="font:600 17px {H};color:{GOLDT};white-space:nowrap">{P(price)}</div></div>
<div style="font:400 12px {Bd};color:{SOFT};line-height:1.7">{th} · {my}</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">{tg}{ch}</div>
</div></div>'''

def board_diner_menu():
    tabs = "".join(
        f'<div style="padding:0 16px;height:40px;display:flex;align-items:center;border-radius:999px;white-space:nowrap;flex-shrink:0;font:600 13px {Bd};'
        + (f'background:{WHITE};color:{BASE}' if i == 0 else f'background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:{WHITE}') + f'">{t}</div>'
        for i, t in enumerate(["All", "Mains", "Curries", "Salads", "Desserts", "Drinks"]))
    seg = "".join(
        f'<button type="button" style="width:44px;height:36px;border:0;border-radius:999px;background:{WHITE if a else "transparent"};color:{BASE if a else WHITE};font:700 12px {Bd}">{t}</button>'
        for t, a in [("TH", False), ("MY", False), ("EN", True)])
    chips = "".join(
        f'<button type="button" style="height:40px;padding:0 16px;border-radius:999px;flex-shrink:0;white-space:nowrap;font:600 13px {Bd};'
        + (f'background:rgba(110,86,255,.9);border:1px solid rgba(255,255,255,.5);color:{WHITE}' if a else f'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:{WHITE}') + f'">{t}</button>'
        for t, a in [("Vegetarian", False), ("No peanuts", True), ("Under ฿100", False), ("Spicy", False)])
    cards = "".join([d_card(DISHES[0]), d_card(DISHES[1]), d_card(DISHES[3]), d_card(DISHES[6], True)])
    body = f'''<div style="width:390px;height:844px;position:relative;overflow:hidden;background:{BASE};color:{WHITE};font-family:{Bd};box-sizing:border-box">
{dark_bg()}
<div style="position:absolute;top:0;left:0;right:0;padding:18px 16px 0;display:flex;flex-direction:column;gap:12px;box-sizing:border-box">
<div style="display:flex;justify-content:space-between;align-items:center">
<div><div style="font:600 30px {H};letter-spacing:-.01em;line-height:1.1">Golden Lotus</div><div style="font:500 13px {Bd};color:{SOFT};letter-spacing:.14em;text-transform:uppercase">Kitchen · Bangkok</div></div>
<div style="{GLASS_D}border-radius:999px;padding:4px;display:flex">{seg}</div></div>
<div style="{GLASS_D}display:flex;align-items:center;gap:10px;height:52px;padding:0 18px;border-radius:26px;box-sizing:border-box">{icon("search", 20, WHITE)}<input aria-label="Search dishes" placeholder="Search dishes" style="flex-grow:1;background:transparent;border:0;outline:0;color:{WHITE};font-size:15px;padding:0"></div>
<div style="display:flex;gap:8px;overflow:hidden">{tabs}</div>
<div style="display:flex;gap:8px;overflow:hidden">{chips}</div>
<div style="display:flex;flex-direction:column;gap:10px">{cards}</div>
</div>
<div style="{GLASS_D}position:absolute;left:14px;right:14px;bottom:16px;height:72px;border-radius:36px;display:flex;align-items:center;gap:10px;padding:0 10px;box-sizing:border-box">
<button type="button" style="flex-grow:1;height:52px;display:flex;align-items:center;justify-content:center;gap:10px;border:0;border-radius:26px;background:{WHITE};color:{BASE};font:700 15px {Bd}">{icon("chat", 20, BASE)}Ask the waiter</button>
<button type="button" aria-label="Call staff" style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);color:{WHITE}">{icon("bell", 22, WHITE)}</button>
</div></div>'''
    return page("Diner menu (glass)", 390, 844, body, BASE)

# ------------------------------------------------------------ diner chat
def u_bubble(t, my=False):
    return (f'<div style="align-self:flex-end;max-width:290px;padding:11px 16px;border-radius:20px 20px 6px 20px;background:{VIOLET};color:{WHITE};'
            f'font:600 15px {Bd};line-height:{1.9 if my else 1.5};box-shadow:0 8px 20px rgba(60,40,200,.4)">{t}</div>')

def m_card(d, added=False):
    en, th, my, price, al, tags = d
    btn = (f'<button type="button" style="height:44px;padding:0 16px;display:flex;align-items:center;gap:6px;border-radius:22px;'
           + (f'background:transparent;border:1px solid rgba(255,255,255,.6);color:{WHITE}' if added else f'background:{WHITE};border:0;color:{BASE}')
           + f';font:700 13px {Bd}">{icon("check" if added else "plus", 16, WHITE if added else BASE)}{"Added" if added else "Add"}</button>')
    return f'''<div style="{GLASS_D}display:flex;align-items:center;gap:10px;padding:8px;border-radius:20px">
{photo(52, 52, True, 12)}
<div style="flex-grow:1;min-width:0"><div style="font:600 14px {H};line-height:1.3">{en}</div><div style="font:600 15px {H};color:{GOLDT}">{P(price)} {chip("vegan", True, "g")}</div></div>{btn}</div>'''

def board_diner_chat():
    ai = f"{GLASS_D}align-self:flex-start;max-width:320px;padding:12px 16px;border-radius:20px 20px 20px 6px;box-sizing:border-box;"
    my_reply = ("တိုဟူးနှင့် ဟင်းသီးဟင်းရွက်ကြော် (Vegetable Tofu Stir-fry) ၉၀ ဘတ် ရှိပါတယ်ခင်ဗျာ။ "
                "သရက်သီး ကောက်ညှင်းပေါင်း (Mango Sticky Rice) ၁၀၀ ဘတ် ရှိပါတယ်ခင်ဗျာ။")
    body = f'''<div style="width:390px;height:844px;position:relative;overflow:hidden;background:{BASE};color:{WHITE};font-family:{Bd};box-sizing:border-box;display:flex;flex-direction:column">
{dark_bg()}
<div style="position:relative;padding:14px 14px 0;flex-shrink:0">
<div style="{GLASS_D}height:68px;border-radius:34px;display:flex;align-items:center;gap:12px;padding:0 12px;box-sizing:border-box">
<button type="button" aria-label="Back to menu" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);color:{WHITE}">{icon("back", 20, WHITE)}</button>
<div><div style="font:600 19px {H};line-height:1.15">The Waiter</div><div style="font:500 12px {Bd};color:{SOFT}">Ask in Thai, Burmese or English</div></div></div></div>
<div style="position:relative;flex-grow:1;padding:16px;display:flex;flex-direction:column;gap:12px;overflow:hidden">
{u_bubble("သက်သတ်လွတ် စားစရာ ဘတ် ၁၀၀ အောက်မှာ ဘာရှိလဲ", True)}
<div style="{ai}"><div style="font:400 15px {Bd};line-height:1.9">{my_reply}</div></div>
<div style="display:flex;flex-direction:column;gap:8px;align-self:flex-start;width:320px">{m_card(DISHES[3], True)}{m_card(DISHES[4])}</div>
{u_bubble("Does the stir-fry have any allergens?")}
<div style="{ai}"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span style="font:700 11px {Bd};letter-spacing:.14em;color:{GOLDT}">ALLERGENS</span>{chip("Soy", True, "y")}</div>
<div style="font:400 15px {Bd};line-height:1.5">Our kitchen may handle other allergens. Please confirm with the staff before ordering.</div></div>
</div>
<div style="position:relative;padding:0 14px 14px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
<div style="{GLASS_D}border-radius:24px;padding:10px 12px 10px 18px;display:flex;align-items:center;gap:10px;box-sizing:border-box">
<div style="flex-grow:1"><div style="font:700 11px {Bd};letter-spacing:.14em;color:{SOFT}">MY PICKS · 1 DISH</div><div style="font:500 14px {Bd}">Vegetable Tofu Stir-fry · ฿90</div></div>
<button type="button" style="height:44px;padding:0 18px;border:0;border-radius:22px;background:{WHITE};color:{BASE};font:700 13px {Bd}">Show to waiter</button></div>
<div style="display:flex;gap:8px">
<div style="{GLASS_D}flex-grow:1;height:52px;border-radius:26px;display:flex;align-items:center;padding:0 18px;box-sizing:border-box"><input aria-label="Type your question" placeholder="Type in Thai, Burmese or English" style="width:100%;background:transparent;border:0;outline:0;color:{WHITE};font-size:15px;padding:0"></div>
<button type="button" aria-label="Send" style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:{VIOLET};color:{WHITE}">{icon("send", 22, WHITE)}</button>
<button type="button" aria-label="Call staff" style="{GLASS_D}width:52px;height:52px;display:flex;align-items:center;justify-content:center;border-radius:50%;color:{WHITE}">{icon("bell", 22, WHITE)}</button></div></div>
</div>'''
    return page("Diner chat (glass)", 390, 844, body, BASE)

# ------------------------------------------------------------ owner shared
def sidebar(active):
    items = [("list", "Menu items"), ("upload", "Import a menu"), ("clock", "Specials & hours"), ("help", "FAQ & rules"),
             ("bot", "AI waiter"), ("qr", "QR codes"), ("chart", "Insights")]
    nav = ""
    for ic, name in items:
        on = name == active
        nav += (f'<a href="#" style="display:flex;align-items:center;gap:12px;height:46px;padding:0 16px;border-radius:14px;text-decoration:none;box-sizing:border-box;'
                + (f'background:{PURP};color:{WHITE};font:600 15px {Bd}' if on else f'color:{NAVY};font:500 15px {Bd}')
                + f'">{icon(ic, 20, WHITE if on else PURP)}{name}</a>')
    return f'''<div style="{GLASS_L}width:248px;flex-shrink:0;height:100%;display:flex;flex-direction:column;padding:22px 14px 18px;box-sizing:border-box;border-radius:28px;color:{NAVY}">
<div style="display:flex;align-items:center;gap:10px;padding:0 6px 22px"><div style="width:40px;height:40px;border-radius:12px;background:{PURP};color:{WHITE};display:flex;align-items:center;justify-content:center;font:600 20px {H}">S</div>
<div><div style="font:600 20px {H};line-height:1.1">Shop AI</div><div style="font:500 12px {Bd};color:{MUTED}">The digital waiter</div></div></div>
<div style="display:flex;flex-direction:column;gap:4px">{nav}</div>
<div style="margin-top:auto;padding:14px;border-radius:18px;background:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.9)">
<div style="font:700 14px {Bd}">Golden Lotus Kitchen</div><div style="font:500 13px {Bd};color:{MUTED};margin-top:2px">Bangkok · Free plan</div>
<div style="margin-top:10px;height:6px;border-radius:3px;background:rgba(46,42,120,.15)"><div style="width:71%;height:6px;border-radius:3px;background:{PURP}"></div></div>
<div style="font:500 12px {Bd};color:{MUTED};margin-top:6px">212 of 300 chats this month</div></div>
</div>'''

def topbar(crumb, buttons=True):
    b = ""
    if buttons:
        b = (f'<button type="button" style="height:44px;padding:0 18px;display:flex;align-items:center;gap:8px;border-radius:22px;background:rgba(255,255,255,.6);border:1px solid rgba(46,42,120,.3);color:{PURP};font:700 13px {Bd}">{icon("bot", 18, PURP)}Test the assistant</button>'
             f'<button type="button" style="height:44px;padding:0 22px;border:0;border-radius:22px;background:{PURP};color:{WHITE};font:700 13px {Bd}">Publish changes</button>')
    return (f'<div style="height:60px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 4px 0 8px;box-sizing:border-box">'
            f'<div style="font:600 13px {Bd};color:{MUTED};letter-spacing:.08em;text-transform:uppercase">{crumb}</div><div style="display:flex;gap:10px">{b}</div></div>')

def owner_page(title, active, crumb, inner, buttons=True):
    body = f'''<div style="width:1280px;height:800px;position:relative;overflow:hidden;background:{LBASE};color:{NAVY};font-family:{Bd};box-sizing:border-box">
{light_bg()}
<div style="position:absolute;inset:0;display:flex;gap:20px;padding:20px;box-sizing:border-box">
{sidebar(active)}
<div style="flex-grow:1;min-width:0;display:flex;flex-direction:column">
{topbar(crumb, buttons)}
{inner}
</div></div></div>'''
    return page(title, 1280, 800, body, LBASE)

def toggle(on):
    return (f'<div style="display:flex;align-items:center;gap:8px;font:700 13px {Bd};color:{"#0B6B57" if on else "#9B1C1C"}">'
            f'<div style="width:44px;height:26px;border-radius:13px;background:{"#1FA68A" if on else "rgba(46,42,120,.3)"};position:relative"><div style="position:absolute;top:3px;{"right" if on else "left"}:3px;width:20px;height:20px;border-radius:50%;background:{WHITE}"></div></div>{"On sale" if on else "Sold out"}</div>')

# ------------------------------------------------------------ owner menu
def board_dashboard():
    rows = ""
    for i, d in enumerate(DISHES):
        en, th, my, price, al, tags = d
        chips = chip("Not provided", False, "r") if al is None else (chip("None listed", False, "y") if not al else "".join(chip(a, False) for a in al))
        tg = "".join(chip(t, False, "g") for t in tags)
        rows += f'''<div style="display:flex;align-items:center;height:60px;padding:0 20px;gap:16px;border-bottom:1px solid rgba(46,42,120,.12);box-sizing:border-box">
<div style="width:300px;display:flex;align-items:center;gap:12px">{photo(40, 40, False, 10)}<div><div style="font:700 15px {Bd}">{en}</div><div style="font:400 12px {Bd};color:{MUTED};line-height:1.7">{th} · {my}</div></div></div>
<div style="width:80px;font:700 16px {H}">{P(price)}</div>
<div style="width:280px;display:flex;gap:5px;flex-wrap:wrap">{chips}</div>
<div style="width:100px;display:flex;gap:5px">{tg}</div>
<div style="width:130px">{toggle(en != "Coconut Ice Cream")}</div>
<button type="button" aria-label="Edit {en}" style="margin-left:auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:rgba(255,255,255,.7);border:1px solid rgba(46,42,120,.25);color:{PURP}">{icon("edit", 18, PURP)}</button></div>'''
    tabs = "".join(
        f'<div style="padding:0 16px;height:40px;display:flex;align-items:center;border-radius:999px;font:600 13px {Bd};'
        + (f'background:{PURP};color:{WHITE}' if i == 0 else f'background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.9);color:{NAVY}') + f'">{t}</div>'
        for i, t in enumerate(["All · 13", "Mains", "Curries", "Salads", "Desserts", "Drinks"]))
    segs = "".join(f'<div style="flex:1;height:8px;border-radius:4px;background:{"#1FA68A" if i < 12 else "rgba(46,42,120,.18)"}"></div>' for i in range(13))
    inner = f'''<div style="display:flex;flex-direction:column;gap:16px;flex-grow:1;min-height:0">
<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px">
<div><div style="font:600 40px {H};letter-spacing:-.01em;line-height:1.05">Menu items</div><div style="font:400 15px {Bd};color:{MUTED};margin-top:6px">What diners see, and what the AI waiter is allowed to say.</div></div>
<div style="{GLASS_L}width:320px;padding:14px 18px;border-radius:20px;box-sizing:border-box"><div style="font:700 12px {Bd};letter-spacing:.12em;color:{MUTED}">ALLERGEN DATA</div>
<div style="font:700 17px {Bd};margin:2px 0 10px">12 of 13 dishes complete</div><div style="display:flex;gap:3px">{segs}</div>
<div style="font:400 12px {Bd};color:{MUTED};margin-top:8px">Fresh Spring Rolls has no allergen info yet.</div></div></div>
<div style="display:flex;gap:8px">{tabs}</div>
<div style="{GLASS_L}border-radius:24px;overflow:hidden;display:flex;flex-direction:column">
<div style="display:flex;padding:0 20px;height:40px;align-items:center;gap:16px;font:700 12px {Bd};letter-spacing:.12em;color:{MUTED};background:rgba(255,255,255,.45)">
<div style="width:352px">DISH</div><div style="width:80px">PRICE</div><div style="width:280px">ALLERGENS</div><div style="width:100px">TAGS</div><div style="width:130px">TODAY</div></div>
{rows}</div></div>'''
    return owner_page("Owner dashboard (glass)", "Menu items", "Menu / All dishes", inner)

# ------------------------------------------------------------ import review
def board_import():
    def step(n, name, s):
        on, done = s == "on", s == "done"
        bg = PURP if on else ("#1FA68A" if done else "rgba(255,255,255,.6)")
        fg = WHITE if (on or done) else MUTED
        return (f'<div style="display:flex;align-items:center;gap:8px"><div style="width:32px;height:32px;border-radius:50%;background:{bg};border:1px solid rgba(46,42,120,.25);color:{fg};display:flex;align-items:center;justify-content:center;font:700 14px {Bd}">{n}</div>'
                f'<div style="font:{700 if on else 500} 14px {Bd};color:{NAVY if on else MUTED}">{name}</div></div>')
    stepper = f'<div style="display:flex;align-items:center;gap:14px">{step("1","Upload","done")}<div style="width:40px;height:2px;background:rgba(46,42,120,.25)"></div>{step("2","Review","on")}<div style="width:40px;height:2px;background:rgba(46,42,120,.25)"></div>{step("3","Publish","off")}</div>'
    def field(w, label, val, flag=False):
        return (f'<div style="width:{w}px"><div style="font:700 11px {Bd};letter-spacing:.1em;color:{MUTED};margin-bottom:3px">{label}</div>'
                f'<div style="height:40px;display:flex;align-items:center;padding:0 12px;box-sizing:border-box;border-radius:12px;background:rgba(255,255,255,.8);border:{"2px dashed #B45309" if flag else "1px solid rgba(46,42,120,.25)"};font:500 15px {Bd}">{val}</div></div>')
    def row(n, en, price, cat, flag=None):
        c = chip("Check price", False, "r") if flag == "price" else (chip("Check name", False, "r") if flag == "name" else chip("Looks right", False, "g"))
        return f'''<div style="{GLASS_L}display:flex;align-items:flex-end;gap:12px;padding:12px 14px;border-radius:18px;box-sizing:border-box{";background:rgba(255,240,205,.75)" if flag else ""}">
<div style="width:28px;height:28px;border-radius:50%;background:{PURP};color:{WHITE};display:flex;align-items:center;justify-content:center;font:700 13px {Bd};flex-shrink:0;margin-bottom:6px">{n}</div>
{field(240, "DISH NAME", en, flag == "name")}{field(90, "PRICE ฿", price, flag == "price")}{field(120, "CATEGORY", cat)}<div style="margin-left:auto;padding-bottom:9px">{c}</div></div>'''
    lines = "".join(f'<div style="display:flex;justify-content:space-between;gap:14px"><div style="height:8px;border-radius:4px;background:rgba(46,42,120,.28);width:{w}%"></div><div style="height:8px;border-radius:4px;background:rgba(46,42,120,.28);width:14%"></div></div>' for w in (52, 66, 44, 58, 70, 48, 62))
    def mark(n, top):
        return f'<div style="position:absolute;left:10px;top:{top}px;width:26px;height:26px;border-radius:50%;background:{PURP};color:{WHITE};display:flex;align-items:center;justify-content:center;font:700 12px {Bd}">{n}</div>'
    orig = f'''<div style="width:400px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
<div style="font:700 12px {Bd};letter-spacing:.12em;color:{MUTED}">YOUR PHOTO · PAGE 1 OF 2</div>
<div style="{GLASS_L}position:relative;height:500px;border-radius:24px;padding:36px 40px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;overflow:hidden">
<div style="font:600 22px {H};text-align:center;color:{MUTED}">MENU PHOTO</div>{lines}
{mark("1", 88)}{mark("2", 132)}{mark("3", 178)}
<div style="position:absolute;left:44px;right:12px;top:76px;height:34px;border:2px solid {PURP};border-radius:10px;box-sizing:border-box"></div>{lines}</div></div>'''
    inner = f'''<div style="display:flex;flex-direction:column;gap:14px;flex-grow:1;min-height:0">
<div style="display:flex;justify-content:space-between;align-items:center;gap:20px">
<div><div style="font:600 38px {H};letter-spacing:-.01em;line-height:1.05">Check your menu</div><div style="font:400 15px {Bd};color:{MUTED};margin-top:6px">The AI read 14 dishes from your photo. Fix anything that looks wrong.</div></div>{stepper}</div>
<div style="display:flex;gap:24px;min-height:0">
{orig}
<div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:10px">
<div style="display:flex;justify-content:space-between;align-items:center"><div style="font:700 12px {Bd};letter-spacing:.12em;color:{MUTED}">FOUND 14 DISHES · 3 NEED A CHECK</div>
<div style="display:flex;gap:6px;align-items:center"><span style="font:700 11px {Bd};color:{MUTED};letter-spacing:.1em;margin-right:4px">NAMES IN</span>{chip("EN", False)}{chip("TH", False)}{chip("MY", False)}</div></div>
{row("1", "Shrimp Pad Thai", "120", "Mains")}{row("2", "Chicken Green Curry", "14O", "Curries", "price")}{row("3", "Tom Yum Goong", "180", "Curries")}{row("4", "Veg. Tofu Stirfy", "90", "Mains", "name")}
<div style="font:400 13px {Bd};color:{MUTED}">Photo unclear? The letter O in "14O" looks like a zero. Thai and Burmese names are added by AI and marked for your review.</div>
</div></div>
<div style="{GLASS_L}margin-top:auto;height:68px;border-radius:34px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 24px;box-sizing:border-box">
<div style="display:flex;align-items:center;gap:10px;font:600 14px {Bd}">{icon("alert", 20, "#B45309")}Nothing goes live until you confirm.</div>
<div style="display:flex;gap:10px"><button type="button" style="height:44px;padding:0 20px;border-radius:22px;background:rgba(255,255,255,.7);border:1px solid rgba(46,42,120,.3);color:{PURP};font:700 13px {Bd}">Add a missing dish</button>
<button type="button" style="height:44px;padding:0 24px;border:0;border-radius:22px;background:{PURP};color:{WHITE};font:700 13px {Bd}">Confirm &amp; publish</button></div></div>
</div>'''
    return owner_page("Import review (glass)", "Import a menu", "Import / Review", inner, buttons=False)

# ------------------------------------------------------------ insights
def board_insights():
    def tile(label, value, sub):
        return (f'<div style="{GLASS_L}flex:1;padding:14px 18px;border-radius:20px;box-sizing:border-box"><div style="font:700 12px {Bd};letter-spacing:.1em;color:{MUTED}">{label}</div>'
                f'<div style="font:600 38px {H};line-height:1.15">{value}</div><div style="font:400 13px {Bd};color:{MUTED}">{sub}</div></div>')
    def bar(label, n, mx=86):
        return (f'<div style="display:flex;align-items:center;gap:12px"><div style="width:230px;font:500 15px {Bd}">{label}</div>'
                f'<div style="flex-grow:1;height:20px;border-radius:10px;background:rgba(46,42,120,.12)"><div style="width:{n/mx*100:.0f}%;height:20px;border-radius:10px;background:{PURP}"></div></div>'
                f'<div style="width:36px;text-align:right;font:700 15px {Bd}">{n}</div></div>')
    un = "".join(f'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(46,42,120,.12)"><div style="font:500 15px {Bd}">{q}</div>'
                 f'<button type="button" style="height:44px;padding:0 16px;border-radius:22px;background:rgba(255,255,255,.7);border:1px solid rgba(46,42,120,.3);color:{PURP};font:700 12px {Bd};white-space:nowrap">Add FAQ</button></div>'
                 for q in ["Do you have a kids menu?", "Can I book a table for 10?", "Is there halal food?"])
    lang = (f'<div style="display:flex;height:28px;border-radius:14px;overflow:hidden"><div style="width:46%;background:{PURP};color:{WHITE};font:700 13px {Bd};display:flex;align-items:center;padding-left:12px">Thai 46%</div>'
            f'<div style="width:31%;background:#1FA68A;color:{WHITE};font:700 13px {Bd};display:flex;align-items:center;padding-left:12px">Burmese 31%</div>'
            f'<div style="width:23%;background:#B45309;color:{WHITE};font:700 13px {Bd};display:flex;align-items:center;padding-left:12px">English 23%</div></div>')
    inner = f'''<div style="display:flex;flex-direction:column;gap:16px;flex-grow:1;min-height:0">
<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font:600 40px {H};letter-spacing:-.01em;line-height:1.05">What diners asked</div><div style="font:400 15px {Bd};color:{MUTED};margin-top:6px">Last 7 days · what people wanted, and what you could not answer.</div></div>{chip("Sample data", False, "y")}</div>
<div style="display:flex;gap:14px">{tile("CHATS", "412", "across 96 tables")}{tile("ANSWERED FROM MENU", "94%", "23 handed to staff")}{tile("COULD NOT ANSWER", "19", "add FAQs to fix")}{tile("MENU OPENS", "1,236", "from QR scans")}</div>
<div style="display:flex;gap:20px;min-height:0">
<div style="{GLASS_L}flex:1.35;padding:20px 24px;border-radius:24px;display:flex;flex-direction:column;gap:14px;box-sizing:border-box">
<div style="font:700 12px {Bd};letter-spacing:.12em;color:{MUTED}">MOST ASKED</div>
{bar("Vegetarian options", 86)}{bar("Allergens (peanut, shellfish)", 74)}{bar("Prices", 61)}{bar("Opening hours", 44)}{bar("How spicy is it?", 38)}
<div style="margin-top:8px"><div style="font:700 12px {Bd};letter-spacing:.12em;color:{MUTED};margin-bottom:8px">LANGUAGES</div>{lang}</div></div>
<div style="flex:1;display:flex;flex-direction:column;gap:16px">
<div style="padding:20px 24px;border-radius:24px;background:linear-gradient(135deg,rgba(46,42,120,.92),rgba(110,86,255,.85));border:1px solid rgba(255,255,255,.5);color:{WHITE};box-shadow:0 10px 32px rgba(72,60,150,.3);box-sizing:border-box">
<div style="font:700 12px {Bd};letter-spacing:.12em;color:{GOLDT}">UNMET DEMAND</div>
<div style="font:600 42px {H};line-height:1.1;margin-top:2px">47 people</div>
<div style="font:400 15px {Bd};line-height:1.5;margin-bottom:12px">asked for vegan dishes, and your menu lists only two.</div>
<button type="button" style="height:44px;padding:0 20px;border:0;border-radius:22px;background:{WHITE};color:{PURP};font:700 13px {Bd}">Add a vegan dish</button></div>
<div style="{GLASS_L}padding:18px 24px;border-radius:24px;box-sizing:border-box"><div style="font:700 12px {Bd};letter-spacing:.12em;color:{MUTED};margin-bottom:4px">COULD NOT ANSWER</div>{un}</div>
</div></div></div>'''
    return owner_page("Insights (glass)", "Insights", "Insights / This week", inner)

boards = {
 "Glass-Diner-Menu.dc.html": (board_diner_menu(), 0, 0, 390, 844, "Glass · Diner menu"),
 "Glass-Diner-Chat.dc.html": (board_diner_chat(), 470, 0, 390, 844, "Glass · Diner chat"),
 "Glass-Owner-Menu.dc.html": (board_dashboard(), 0, 1300, 1280, 800, "Glass · Owner menu items"),
 "Glass-Owner-Import.dc.html": (board_import(), 1360, 1300, 1280, 800, "Glass · Owner import review"),
 "Glass-Owner-Insights.dc.html": (board_insights(), 2720, 1300, 1280, 800, "Glass · Owner insights"),
}
for n, (html, *_r) in boards.items():
    (OUT / n).write_text(html, encoding="utf-8")

cv = json.loads((OUT / "canvas.server.json").read_text(encoding="utf-8"))
cv["title"] = "Shop AI UI: Art Deco and Glass"
cv["pages"] = [{"id": "deco", "name": "Art Deco"}, {"id": "glass", "name": "Glass"}]
for k, b in cv["boards"].items():
    b["page"] = "deco"
for n, (html, x, y, w, h, t) in boards.items():
    cv["boards"][n] = {"x": x, "y": y, "w": w, "h": h, "title": t, "page": "glass"}
    cv["order"].append(n)
for k, n in list(cv["notes"].items()):
    n["page"] = "deco"
cv["notes"]["g1"] = {"x": 0, "y": -300, "text": "Glass: diner, phone", "kind": "title1", "maxW": 860, "page": "glass"}
cv["notes"]["g2"] = {"x": 0, "y": 1000, "text": "Glass: owner dashboard, desktop", "kind": "title1", "maxW": 4000, "page": "glass"}
(OUT / "canvas.json").write_text(json.dumps(cv, ensure_ascii=False, indent=1), encoding="utf-8")
print("ok", len(boards))
