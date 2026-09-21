import json, urllib.request, sys
BASE = "http://localhost:3000/api/public/golden-lotus/chat"
def ask(msg, sid="smoke1", table="5"):
    req = urllib.request.Request(BASE, json.dumps({"message": msg, "sessionId": sid, "table": table, "lang": "en"}).encode(), {"content-type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=180))
qs = json.load(open("../eval/questions.json"))
extra = ["I want to order", "I'll have 2 chicken fried rice and a thai iced tea", "Can I get the bill?", "แนะนำเมนูหน่อย", "What do you recommend?", "Does the stir-fry have any allergens?"]
ok = 0
for q in qs:
    r = ask(q["question"], "s-" + q["id"])
    text = r["reply"]
    import re
    fails = [g for g in q["expect"] if not any(s.lower() in text.lower() for s in g)]
    bad = [p for p in q["forbid"] if re.search(p, text, re.I)]
    status = "PASS" if not fails and not bad else "FAIL"
    ok += status == "PASS"
    print(status, q["id"], r["action"].get("type"), "|", text[:110].replace("\n", " "), "" if status == "PASS" else f"<- missing {fails} forbidden {bad}")
print(f"\n{ok}/{len(qs)} match the eval expectations")
for m in extra:
    r = ask(m, "s-extra")
    print("\n>", m, "\n ", r["action"], "\n ", r["reply"][:200].replace("\n", " "))
