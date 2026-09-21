"""End-to-end API check for Shop AI. Run with the dev server up:  python3 scripts/e2e.py"""
import json, sys, urllib.request, urllib.error, http.cookiejar, uuid, io, os
BASE = "http://localhost:3000"
fails = []
def client():
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    def call(method, path, body=None, raw=None, headers=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        h = dict(headers or {})
        if body is not None: h["content-type"] = "application/json"
        req = urllib.request.Request(BASE + path, data, h, method=method)
        try:
            r = op.open(req, timeout=300); code, txt = r.status, r.read()
        except urllib.error.HTTPError as e:
            code, txt = e.code, e.read()
        try: return code, json.loads(txt)
        except Exception: return code, txt
    return call
def check(name, cond, info=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  {info}" if not cond else ""))
    if not cond: fails.append(name)

owner, waiter, chef, diner, anon = client(), client(), client(), client(), client()

# ---- owner auth
c, _ = anon("GET", "/api/owner/items"); check("owner API needs login", c == 401)
c, r = owner("POST", "/api/auth/login", {"email": "demo@shop.ai", "password": "wrong"}); check("wrong password rejected", c == 401)
c, r = owner("POST", "/api/auth/login", {"email": "demo@shop.ai", "password": "demo1234"}); check("owner login", c == 200 and r["slug"] == "golden-lotus")
c, r = owner("GET", "/api/owner/me"); check("owner me", c == 200 and r["restaurant"]["name"].startswith("Golden"))

# ---- items CRUD
c, r = owner("POST", "/api/owner/items", {"category_id": 2, "name": {"en": "Test Noodles", "th": "", "my": ""}, "price": 75, "allergens": ["egg"], "tags": ["vegetarian"]}); check("create item", c == 200, r)
iid = r.get("id")
c, r = owner("POST", "/api/owner/items", {"name": {"en": ""}, "price": 5}); check("blank name rejected", c == 400)
c, r = owner("POST", "/api/owner/items", {"name": {"en": "X"}, "price": -5}); check("negative price rejected", c == 400)
c, r = owner("PUT", f"/api/owner/items/{iid}", {"price": 80, "available": False}); check("update item", c == 200)
c, items = owner("GET", "/api/owner/items"); t = next(i for i in items if i["id"] == iid)
check("item saved", t["price"] == 80 and t["available"] is False and t["allergens"] == ["egg"], t)
c, r = owner("PUT", "/api/owner/items/99999", {"price": 1}); check("unknown item 404", c == 404)
c, r = owner("DELETE", f"/api/owner/items/{iid}"); check("delete item", c == 200)

# ---- categories, faqs, specials, staff
c, r = owner("POST", "/api/owner/categories", {"name_en": "Soups", "name_th": "ซุป", "name_my": ""}); check("create category", c == 200); cid = r["id"]
c, r = owner("PUT", f"/api/owner/categories/{cid}", {"name_en": "Soups & broths"}); check("rename category", c == 200)
c, r = owner("DELETE", f"/api/owner/categories/{cid}"); check("delete category", c == 200)
c, r = owner("POST", "/api/owner/faqs", {"q": "Do you have a kids menu?", "a": "Yes, ask the staff."}); check("create faq", c == 200); fid = r["id"]
c, r = owner("POST", "/api/owner/faqs", {"q": "", "a": ""}); check("empty faq rejected", c == 400)
c, r = owner("POST", "/api/owner/specials", {"title": "Chef special", "text": "Steamed fish", "active": 1}); check("create special", c == 200); sid = r["id"]
c, r = owner("POST", "/api/owner/staff", {"name": "Test Waiter", "role": "waiter", "pin": "12"}); check("short PIN rejected", c == 400)
c, r = owner("POST", "/api/owner/staff", {"name": "Test Waiter", "role": "waiter", "pin": "4321"}); check("create staff", c == 200); stid = r["id"]
c, r = owner("GET", "/api/owner/staff"); check("staff list hides PIN hashes", c == 200 and all("pin_hash" not in x for x in r))
c, r = owner("GET", "/api/owner/nothing"); check("unknown resource 404", c == 404)

# ---- settings: hours flow into the AI answer
c, r = owner("PUT", "/api/owner/settings", {"hours": {"open": "09:00", "close": "23:00", "lastOrder": "22:30", "closedDays": []}}); check("save hours", c == 200)
c, r = owner("PUT", "/api/owner/settings", {"hours": {"open": "9am", "close": "23:00", "lastOrder": "22:30"}}); check("bad time rejected", c == 400)
c, r = diner("POST", "/api/public/golden-lotus/chat", {"message": "What time do you close?", "sessionId": "e2e-1", "table": "3"}); check("AI reads new hours", "09:00-23:00" in r["reply"] and "22:30" in r["reply"], r)
owner("PUT", "/api/owner/settings", {"hours": {"open": "10:00", "close": "22:00", "lastOrder": "21:30", "closedDays": []}})
c, r = owner("PUT", "/api/owner/settings", {"persona": {"name": "Lotus", "gender": "female", "tone": "friendly", "greeting": "", "upsell": False, "rules": ""}}); check("save persona", c == 200)
c, r = diner("POST", "/api/public/golden-lotus/chat", {"message": "ร้านปิดกี่โมง", "sessionId": "e2e-1", "table": "3"}); check("female voice in Thai", r["reply"].rstrip().endswith("ค่ะ"), r["reply"])
owner("PUT", "/api/owner/settings", {"persona": {"name": "The Waiter", "gender": "male", "tone": "friendly", "greeting": "", "upsell": True, "rules": ""}})
owner("DELETE", f"/api/owner/faqs/{fid}"); owner("DELETE", f"/api/owner/specials/{sid}"); owner("DELETE", f"/api/owner/staff/{stid}")

# ---- QR and LAN
c, svg = owner("GET", "/api/owner/qr?table=4&base=http://192.168.1.5:3000"); check("QR svg", c == 200 and b"<svg" in svg)
c, r = owner("GET", "/api/owner/lan"); check("LAN urls", c == 200 and "urls" in r)

# ---- diner flow
c, r = diner("GET", "/api/public/golden-lotus/menu?open=1"); check("public menu", c == 200 and len(r["items"]) >= 13)
c, r = diner("GET", "/api/public/nope/menu"); check("unknown restaurant 404", c == 404)
c, r = diner("POST", "/api/public/golden-lotus/chat", {"message": "I'm allergic to peanuts", "sessionId": "e2e-order", "table": "9"}); check("allergy chat", "peanut" in r["reply"].lower() and "staff" in r["reply"].lower())
c, r = diner("POST", "/api/public/golden-lotus/calls", {"table": "9", "kind": "bill"}); check("call staff", c == 200)
c, r2 = diner("POST", "/api/public/golden-lotus/calls", {"table": "9", "kind": "bill"}); check("duplicate call reused", r2["id"] == r["id"])
c, r = diner("POST", "/api/public/golden-lotus/orders", {"table": "9", "lang": "my", "sessionId": "e2e-order", "items": [{"id": 4, "qty": 1}, {"id": 10, "qty": 2}, {"id": 11, "qty": 1}]}); check("send picks (sold-out dish ignored)", c == 200); oid = r["id"]
c, r = diner("POST", "/api/public/golden-lotus/orders", {"table": "9", "items": []}); check("empty order rejected", c == 400)
c, r = diner("POST", "/api/public/golden-lotus/orders", {"table": "9", "items": [{"id": 11, "qty": 1}]}); check("only sold-out dish rejected", c == 400)

# ---- staff flow
c, r = anon("GET", "/api/staff/floor"); check("staff API needs login", c == 401)
c, r = waiter("POST", "/api/staff/login", {"slug": "golden-lotus", "pin": "0000"}); check("wrong PIN rejected", c == 401)
c, r = waiter("POST", "/api/staff/login", {"slug": "golden-lotus", "pin": "1111"}); check("waiter login", c == 200 and r["role"] == "waiter")
c, r = chef("POST", "/api/staff/login", {"slug": "golden-lotus", "pin": "2222"}); check("chef login", c == 200 and r["role"] == "chef")
c, fl = waiter("GET", "/api/staff/floor"); pick = next((o for o in fl["picks"] if o["id"] == oid), None)
check("waiter sees pick with allergy", pick is not None and "peanut" in pick["allergy"] and len(pick["items"]) == 2, pick)
check("waiter sees bill call", any(x["table"] == "9" and x["kind"] == "bill" for x in fl["calls"]))
c, r = chef("POST", f"/api/staff/orders/{oid}", {"action": "take"}); check("chef cannot take order", c == 403)
c, r = waiter("POST", f"/api/staff/orders/{oid}", {"action": "cooking"}); check("waiter cannot start cooking", c == 403)
c, r = waiter("POST", f"/api/staff/orders/{oid}", {"action": "take"}); check("waiter takes order", c == 200)
c, r = waiter("POST", f"/api/staff/orders/{oid}", {"action": "take"}); check("cannot take twice", c == 409)
c, k = chef("GET", "/api/staff/kitchen"); check("kitchen sees new ticket", any(o["id"] == oid for o in k["tickets"]["new"]))
c, r = chef("POST", f"/api/staff/orders/{oid}", {"action": "ready"}); check("cannot skip cooking", c == 409)
c, r = chef("POST", f"/api/staff/orders/{oid}", {"action": "cooking"}); check("chef starts cooking", c == 200)
c, r = chef("POST", f"/api/staff/orders/{oid}", {"action": "ready"}); check("chef marks ready", c == 200)
c, fl = waiter("GET", "/api/staff/floor"); check("waiter sees ready order", any(o["id"] == oid and o["status"] == "ready" for o in fl["active"]))
c, r = waiter("POST", f"/api/staff/orders/{oid}", {"action": "served"}); check("waiter serves", c == 200)
call = next(x for x in fl["calls"] if x["table"] == "9"); c, r = waiter("POST", f"/api/staff/calls/{call['id']}"); check("close call", c == 200)
c, r = chef("POST", "/api/staff/items/10", {"available": False}); check("chef marks sold out", c == 200)
c, r = diner("POST", "/api/public/golden-lotus/chat", {"message": "Can I have the Thai iced tea?", "sessionId": "e2e-2", "table": "1"}); check("AI knows sold-out state at once", "sold out" in r["reply"].lower(), r["reply"])
chef("POST", "/api/staff/items/10", {"available": True})

# ---- insights
c, r = owner("GET", "/api/owner/insights?days=7"); check("insights", c == 200 and r["questions"] > 0 and len(r["topics"]) > 0 and r["opens"] >= 1, r)
c, r = diner("POST", "/api/public/golden-lotus/feedback", {"messageId": 1, "value": -1}); check("feedback", c == 200)

# ---- register a second restaurant, isolation
other = client(); email = f"t{uuid.uuid4().hex[:6]}@example.com"
c, r = other("POST", "/api/auth/register", {"email": email, "password": "short", "restaurantName": "X"}); check("short password rejected", c == 400)
c, r = other("POST", "/api/auth/register", {"email": email, "password": "longenough1", "restaurantName": "Test Café", "city": "Chiang Mai"}); check("register", c == 200 and r["slug"] == "test-caf", r)
c, items = other("GET", "/api/owner/items"); check("new restaurant starts empty", c == 200 and items == [])
c, r = other("PUT", "/api/owner/items/1", {"price": 1}); check("cannot edit another restaurant's dish", c == 404)
c, r = other("POST", "/api/auth/register", {"email": email, "password": "longenough1", "restaurantName": "Again"}); check("duplicate email rejected", c == 409)

# ---- import (vision model): build a menu picture and send it
try:
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (900, 700), "#f6efe0"); d = ImageDraw.Draw(img)
    f1 = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 44); f2 = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    d.text((300, 30), "LOTUS CAFE", fill="#222", font=f1)
    y = 130
    for name, price in [("Green Curry", 150), ("Pad See Ew", 110), ("Mango Smoothie", 65), ("Crispy Spring Rolls", 90), ("Iced Lemon Tea", 45)]:
        d.text((90, y), name, fill="#222", font=f2); d.text((680, y), str(price), fill="#222", font=f2); y += 90
    buf = io.BytesIO(); img.save(buf, "PNG"); png = buf.getvalue()
    bd = uuid.uuid4().hex
    body = (f"--{bd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"menu.png\"\r\nContent-Type: image/png\r\n\r\n").encode() + png + f"\r\n--{bd}--\r\n".encode()
    c, r = owner("POST", "/api/owner/import", raw=body, headers={"content-type": f"multipart/form-data; boundary={bd}"})
    names = [i["name"].lower() for i in r.get("items", [])] if c == 200 else []
    check("photo import finds dishes", c == 200 and any("curry" in n for n in names) and len(names) >= 4, r if c != 200 else names)
    prices = {i["name"].lower(): i["price"] for i in r.get("items", [])} if c == 200 else {}
    check("photo import reads prices", prices.get("green curry") == 150 or 150 in prices.values(), prices)
    if c == 200:
        c2, r2 = owner("POST", "/api/owner/import/confirm", {"importId": r["importId"], "items": r["items"]}); check("confirm import", c2 == 200 and r2["added"] == len(r["items"]), r2)
        c3, it = owner("GET", "/api/owner/items"); check("imported dishes have unknown allergens", all(i["allergens"] is None for i in it if i["name"]["en"] in [x["name"] for x in r["items"]]))
        for i in it:
            if i["name"]["en"] in [x["name"] for x in r["items"]] and i["id"] > 13: owner("DELETE", f"/api/owner/items/{i['id']}")
except ImportError:
    print("SKIP import test (Pillow missing)")

print(f"\n{'ALL PASSED' if not fails else str(len(fails)) + ' FAILED: ' + ', '.join(fails)}")
sys.exit(1 if fails else 0)
