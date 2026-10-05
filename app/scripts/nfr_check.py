"""Measures the non-functional requirements of the SRS against a RUNNING server (no extra packages needed).

  python3 scripts/nfr_check.py nfr1 [BASE] [N]        AI reply time for open questions (NFR-1: 90% within 15 s)
  python3 scripts/nfr_check.py nfr2 [BASE]            menu page data and staff screen refresh time (NFR-2: 3 s)
  python3 scripts/nfr_check.py nfr4 [BASE]            diner flow while the AI is unavailable (NFR-4: fallback within 5 s)
  python3 scripts/nfr_check.py nfr7 [BASE] [MINUTES]  3 diners chatting + 2 staff screens (NFR-7: no errors, AI answer within 30 s)

BASE defaults to http://localhost:3000 (the demo restaurant golden-lotus, waiter PIN 1111).
For nfr4 start the server with the AI switched off, e.g.  OLLAMA_URL=http://127.0.0.1:9 npm start
(or really stop Ollama). Questions are sent with preview:true, so no chat is stored. Exit code 1 = requirement not met.
"""
import http.cookiejar, json, statistics, sys, threading, time, urllib.error, urllib.request

BASE = (sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].startswith("http") else "http://localhost:3000").rstrip("/")
SLUG = "golden-lotus"
OPEN_QUESTIONS = [
    "What would you recommend on a hot day?", "Which dish is good for sharing with friends?", "Tell me about your restaurant.",
    "I'm celebrating a birthday, any suggestion?", "Is the food here good for kids?", "What do you suggest if I like mild food?",
    "ร้านนี้มีอะไรแนะนำสำหรับเด็กไหม", "วันนี้อากาศร้อน อยากกินอะไรเย็นๆ", "มีที่จอดรถไหม", "ဒီနေ့ ပူလွန်းတယ် ဘာသောက်သင့်လဲ",
    "Is there Wi-Fi?", "I am hungry but cannot decide, help me choose.",
]
fails = []


def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  ({info})" if info else ""))
    if not ok:
        fails.append(name)


def client():
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(method, path, body=None, timeout=120):
        req = urllib.request.Request(BASE + path, json.dumps(body).encode() if body is not None else None,
                                     {"content-type": "application/json"} if body is not None else {}, method=method)
        t0 = time.time()
        try:
            r = op.open(req, timeout=timeout)
            code, txt = r.status, r.read()
        except urllib.error.HTTPError as e:
            code, txt = e.code, e.read()
        except Exception as e:  # connection refused, timeout ...
            return 0, {"error": str(e)}, time.time() - t0
        try:
            return code, json.loads(txt), time.time() - t0
        except Exception:
            return code, txt, time.time() - t0
    return call


def ask(call, q):
    return call("POST", f"/api/public/{SLUG}/chat", {"message": q, "preview": True, "table": "5"}, timeout=120)


def pct(xs, p):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(p / 100 * (len(xs) - 1))))]


def nfr1(n):
    call, times, fallback = client(), [], 0
    for i in range(n):
        code, r, dt = ask(call, OPEN_QUESTIONS[i % len(OPEN_QUESTIONS)])
        if code != 200:
            check(f"question {i + 1} answered", False, f"HTTP {code}")
            continue
        times.append(dt)
        fallback += "unavailable" in r["reply"].lower() or "ask the staff" in r["reply"].lower()
    p90 = pct(times, 90)
    print(f"{len(times)} open questions: average {statistics.mean(times):.1f} s, median {statistics.median(times):.1f} s, "
          f"90th percentile {p90:.1f} s, slowest {max(times):.1f} s, {fallback} fallback/refusal replies")
    check("NFR-1 90% of open questions within 15 s", p90 <= 15, f"p90 = {p90:.1f} s")
    check("no reply took longer than the 15 s model limit (plus 1 s)", max(times) <= 16, f"slowest {max(times):.1f} s")


def nfr2():
    call, menu, staff = client(), [], []
    for _ in range(20):
        c, _, dt = call("GET", f"/api/public/{SLUG}/menu")
        menu.append(dt if c == 200 else 99)
    c, _, _ = call("POST", "/api/staff/login", {"slug": SLUG, "pin": "1111"})
    check("waiter can sign in", c == 200)
    for _ in range(20):
        c, _, dt = call("GET", "/api/staff/floor")
        staff.append(dt if c == 200 else 99)
    check("NFR-2 menu data within 3 s", max(menu) <= 3, f"avg {statistics.mean(menu) * 1000:.0f} ms, max {max(menu) * 1000:.0f} ms (server side, no phone)")
    check("NFR-2 staff screen data within 3 s (screens poll every 3 s)", max(staff) <= 3, f"avg {statistics.mean(staff) * 1000:.0f} ms, max {max(staff) * 1000:.0f} ms")


def nfr4():
    call = client()
    c, r, dt = call("GET", f"/api/public/{SLUG}/menu")
    check("menu still opens", c == 200 and len(r["items"]) > 0, f"{dt * 1000:.0f} ms")
    item = next(i for i in r["items"] if i["available"])
    c, r, dt = call("POST", f"/api/public/{SLUG}/orders", {"table": "44", "items": [{"id": item["id"], "qty": 1}]})
    check("picks can still be sent", c == 200, f"{dt * 1000:.0f} ms")
    c, r, dt = call("POST", f"/api/public/{SLUG}/calls", {"table": "44", "kind": "help"})
    check("staff can still be called", c == 200, f"{dt * 1000:.0f} ms")
    c, r, dt = ask(call, OPEN_QUESTIONS[0])
    check("chat shows the fallback message", c == 200 and "unavailable" in r["reply"].lower(), (r.get("reply", "") if isinstance(r, dict) else "")[:70])
    check("NFR-4 fallback within 5 s", dt <= 5, f"{dt:.1f} s")
    c, r, dt = ask(call, "What time do you close?")
    check("rule-based answers still work without the AI", c == 200 and "22:00" in r["reply"], f"{dt * 1000:.0f} ms")
    c, r, dt = ask(call, "I'm allergic to peanuts")
    check("allergy answers still work without the AI", c == 200 and "confirm with the staff" in r["reply"].lower(), f"{dt * 1000:.0f} ms")


def nfr7(minutes):
    stop, errors, ai_times, polls = time.time() + minutes * 60, [], [], [0]
    lock = threading.Lock()

    def diner(k):
        call, i = client(), k
        while time.time() < stop:
            code, r, dt = ask(call, OPEN_QUESTIONS[i % len(OPEN_QUESTIONS)])
            i += 3
            with lock:
                if code != 200:
                    errors.append(f"diner {k}: HTTP {code}")
                else:
                    ai_times.append(dt)
            time.sleep(2)

    def staff(k):
        call = client()
        if call("POST", "/api/staff/login", {"slug": SLUG, "pin": "1111"})[0] != 200:
            errors.append(f"staff {k}: sign-in failed")
            return
        while time.time() < stop:
            code, _, dt = call("GET", "/api/staff/floor")
            with lock:
                polls[0] += 1
                if code != 200 or dt > 3:
                    errors.append(f"staff {k}: floor HTTP {code} in {dt:.1f} s")
            time.sleep(3)

    ts = [threading.Thread(target=diner, args=(k,)) for k in range(3)] + [threading.Thread(target=staff, args=(k,)) for k in range(2)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    print(f"{minutes} min: {len(ai_times)} AI answers, {polls[0]} staff screen refreshes, {len(errors)} errors"
          + (f"; AI answers avg {statistics.mean(ai_times):.1f} s, 90th pct {pct(ai_times, 90):.1f} s, slowest {max(ai_times):.1f} s" if ai_times else ""))
    check("NFR-7 no errors with 3 diners and 2 staff screens", not errors, "; ".join(errors[:3]))
    check("NFR-7 every AI answer within 30 s", bool(ai_times) and max(ai_times) <= 30, f"slowest {max(ai_times):.1f} s" if ai_times else "no answers")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else ""
    nums = [a for a in sys.argv[2:] if not a.startswith("http")]
    if what == "nfr1": nfr1(int(nums[0]) if nums else 30)
    elif what == "nfr2": nfr2()
    elif what == "nfr4": nfr4()
    elif what == "nfr7": nfr7(float(nums[0]) if nums else 10)
    else: sys.exit(__doc__)
    print("\nALL PASSED" if not fails else f"\n{len(fails)} FAILED: " + ", ".join(fails))
    sys.exit(1 if fails else 0)
