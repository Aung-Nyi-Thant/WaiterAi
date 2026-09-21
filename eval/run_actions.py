#!/usr/bin/env python3
"""Tests WHEN the AI asks the app to show the menu / dishes / picks / staff.
Usage: python3 run_actions.py [--models gemma4:12b]"""
import argparse, json, re
import run_eval as R

# (question, expected action type, dish ids that must be included, ids that must NOT be included)
CASES = [
 ("Show me the menu", "show_menu", [], []),
 ("I want to order", "show_menu", [], []),
 ("What do you recommend for vegetarians?", "show_dishes", ["veg_stirfry"], ["pork_skewers", "pad_thai"]),
 ("How much is the Massaman?", "show_dishes", ["massaman"], []),
 ("I'll have the chicken fried rice and a Thai iced tea", "add_to_picks", ["chicken_rice", "thai_tea"], []),
 ("Can I get the bill?", "call_staff", [], []),
 ("What time do you open?", "none", [], []),
 ("Do you have pizza?", "none", [], []),
 ("Can I have the coconut ice cream?", "show_dishes", [], ["coconut_ice"]),
 ("Hello", "none", [], []),
 ("ขอดูเมนูหน่อย", "show_menu", [], []),
 ("ขอสั่งข้าวผัดไก่หนึ่งจาน", "add_to_picks", ["chicken_rice"], []),
 ("เช็คบิลด้วย", "call_staff", [], []),
 ("จอดรถได้ไหม", "none", [], []),
 ("မီနူး ပြပါ", "show_menu", [], []),
 ("ကြက်သား ထမင်းကြော် တစ်ပွဲ မှာမယ်", "add_to_picks", ["chicken_rice"], []),
 ("ငွေရှင်းမယ်", "call_staff", [], []),
 ("Wi-Fi ရှိလား", "none", [], []),
]

def parse(raw, valid):
    m = re.search(r"ACTION:\s*(.*)$", raw.strip(), re.S)
    if not m:
        return None, "no ACTION line"
    txt = m.group(1).strip()
    if txt.lower().startswith("none"):
        return {"type": "none"}, None
    try:
        a = json.loads(txt.splitlines()[0])
    except Exception:
        return None, "bad JSON: " + txt[:60]
    bad = [i for i in a.get("ids", []) if i not in valid]
    return a, ("unknown ids: %s" % bad if bad else None)

ap = argparse.ArgumentParser()
ap.add_argument("--models", nargs="+", default=["gemma4:12b"])
args = ap.parse_args()
menu = json.load(open(R.HERE / "menu.json"))
system = R.SYSTEM_TEMPLATE.format(name=menu["restaurant"], currency=menu["currency"],
                                  data=json.dumps(menu, ensure_ascii=False))
valid = {i["id"] for i in menu["items"]}
report = []
for model in args.models:
    R.chat(model, system, "Hello")
    ok = 0
    for q, typ, need, forbid in CASES:
        raw = R.chat(model, system, q)["message"]["content"]
        a, err = parse(raw, valid)
        prob = [err] if err else []
        if a:
            if a.get("type") != typ: prob.append(f"type {a.get('type')} != {typ}")
            ids = a.get("ids", [])
            prob += [f"missing {i}" for i in need if i not in ids]
            prob += [f"should not include {i}" for i in forbid if i in ids]
        ok += not prob
        print(f"{'PASS' if not prob else 'FAIL'} {q[:38]:38} -> {a} {prob if prob else ''}", flush=True)
        report.append({"model": model, "question": q, "raw": raw, "action": a, "problems": prob})
    print(f"\n{model}: {ok}/{len(CASES)} correct\n")
json.dump(report, open(R.HERE / "results" / "actions.json", "w"), ensure_ascii=False, indent=1)
