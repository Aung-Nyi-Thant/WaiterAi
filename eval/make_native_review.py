# -*- coding: utf-8 -*-
"""Builds eval/native_review_allergens.html: every Thai and Burmese allergen word and safety sentence the AI uses, for a native
speaker to tick or correct. Words that are NEW compared with a baseline revision (default: main) are highlighted.
Run:  python3 make_native_review.py            (baseline main)      or      python3 make_native_review.py <revision>"""
import html, re, subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
BASE = sys.argv[1] if len(sys.argv) > 1 else "main"
src = (root / "app/src/modules/ai/ai.ts").read_text(encoding="utf-8")
try:
    old = subprocess.run(["git", "show", f"{BASE}:app/src/modules/ai/ai.ts"], cwd=root, capture_output=True, text=True).stdout
except Exception:
    old = ""

def words(text):
    m = re.search(r"const ALLERGEN_WORDS[^{]*\{(.*?)\n\};", text, re.S)
    out = {}
    if not m: return out
    for line in m.group(1).split("\n"):
        k = re.match(r"\s*(\w+):\s*\[(.*)\],?\s*$", line)
        if k: out[k.group(1)] = re.findall(r'"([^"]+)"', k.group(2))
    return out
new_w, old_w = words(src), words(old)
nonascii = lambda w: any(ord(c) > 127 for c in w)
th_re = re.compile(r"[฀-๿]"); my_re = re.compile(r"[က-႟]")
LABEL = {"peanut": "Peanut", "tree_nut": "Tree nuts", "shellfish": "Shellfish / crustaceans", "molluscs": "Molluscs", "fish": "Fish", "egg": "Egg", "milk": "Milk", "soy": "Soy", "gluten": "Gluten", "sesame": "Sesame", "celery": "Celery", "mustard": "Mustard", "sulphites": "Sulphites", "lupin": "Lupin"}
AL_TH = dict(re.findall(r'(\w+): "([^"]+)"', (re.search(r"const AL_TH[^{]*\{(.*?)\};", src, re.S) or [None, ""])[1]))

rows = []
for k in LABEL:
    for lang, rx in (("Thai", th_re), ("Burmese", my_re)):
        ws = [w for w in new_w.get(k, []) if rx.search(w)]
        rows.append((LABEL[k], lang, ws, [w for w in ws if w not in old_w.get(k, [])]))

SENT = [
  ("Staff-confirm line (end of every allergy answer)", "กรุณายืนยันกับพนักงานก่อนสั่งอาหารครับ", "ဝန်ထမ်းကို မေးမြန်းပေးပါခင်ဗျာ။"),
  ("Allergy it cannot confirm (new rule: an allergy that is not one of the 14, or no dish named)", "ยืนยันสารก่อภูมิแพ้ให้ไม่ได้ครับ บอกชื่อเมนูหรือสารที่แพ้ได้เลยครับ", "Allergens ကို အတည်မပြုနိုင်ပါဘူးခင်ဗျာ။ ဟင်းလျာနာမည် ဒါမှမဟုတ် ဓာတ်မတည့်တဲ့အရာ (ဥပမာ peanut) ကို ပြောပေးပါခင်ဗျာ။"),
  ("'Dishes that list X' (allergen found)", "เมนูที่มี … ได้แก่ …ครับ", "… ပါဝင်တဲ့ ဟင်းလျာတွေကတော့ … ဖြစ်ပါတယ်ခင်ဗျာ။"),
  ("'No dish lists X'", "ไม่มีเมนูที่ระบุว่ามี …ครับ", "… ပါဝင်တယ်လို့ ဖော်ပြထားတဲ့ ဟင်းလျာ မရှိပါဘူးခင်ဗျာ။"),
  ("Allergen data not provided for a dish", "ยังไม่มีข้อมูลสารก่อภูมิแพ้ของ: …ครับ", "… အတွက် Allergen အချက်အလက် မရှိပါဘူးခင်ဗျာ။"),
  ("Button the AI points to after an order ('Send to staff')", "กด \"ให้พนักงานดู\" เมื่อพร้อมสั่ง", "(none: the Burmese reply does not mention the button)"),
]
e = html.escape
parts = ["""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Allergen words: native-speaker review</title>
<style>body{font:15px/1.5 -apple-system,'Noto Sans Thai','Noto Sans Myanmar',sans-serif;max-width:980px;margin:24px auto;padding:0 16px;color:#141413}
h1{font-size:22px}h2{margin-top:30px;font-size:17px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d6d3e6;padding:8px 10px;vertical-align:top;text-align:left}
th{background:#f4f2fb}.new{background:#fff2c2;border-radius:4px;padding:1px 5px;margin:2px 3px 2px 0;display:inline-block}.old{background:#eef;border-radius:4px;padding:1px 5px;margin:2px 3px 2px 0;display:inline-block}
.note{background:#f4f2fb;padding:10px 14px;border-radius:8px}input[type=text]{width:100%;box-sizing:border-box;font:inherit;padding:5px}label{white-space:nowrap}button{font:inherit;padding:8px 14px}pre{background:#f4f2fb;padding:12px;white-space:pre-wrap}</style></head><body>
<h1>Shop AI: allergen words and safety sentences (Thai and Burmese)</h1>
<p class="note">For each row choose <b>OK</b>, <b>Wrong</b> or <b>Missing words</b> and write the correction. <span class="new">Yellow</span> = added recently and never reviewed. <span class="old">Blue</span> = already in use.
These words are how the AI recognises that a diner names an allergen. A word that is missing is not dangerous: the AI then says it <i>cannot confirm</i> and sends the diner to the staff. A word that is <b>wrong</b> could make it answer about the wrong allergen, so those matter most.
When done, press <b>Copy my answers</b> and paste them back.</p>
<h2>1. Allergen words</h2><table><tr><th>Allergen</th><th>Language</th><th>Words the AI looks for</th><th>Verdict</th><th>Correction / words to add</th></tr>"""]
for i, (name, lang, ws, nw) in enumerate(rows):
    cells = " ".join(f'<span class="{"new" if w in nw else "old"}">{e(w)}</span>' for w in ws) or "<i>none yet</i>"
    parts.append(f'<tr data-k="{e(name)} / {lang}"><td>{e(name)}</td><td>{lang}</td><td>{cells}</td><td><label><input type="radio" name="r{i}" value="OK"> OK</label> <label><input type="radio" name="r{i}" value="Wrong"> Wrong</label> <label><input type="radio" name="r{i}" value="Missing"> Missing words</label></td><td><input type="text"></td></tr>')
parts.append('</table><h2>2. Allergen names shown to Thai diners</h2><table><tr><th>Allergen</th><th>Thai name used in answers</th><th>Verdict</th><th>Correction</th></tr>')
for j, (k, label) in enumerate(LABEL.items()):
    parts.append(f'<tr data-k="Thai name: {e(label)}"><td>{e(label)}</td><td>{e(AL_TH.get(k, "(English)"))}</td><td><label><input type="radio" name="t{j}" value="OK"> OK</label> <label><input type="radio" name="t{j}" value="Wrong"> Wrong</label></td><td><input type="text"></td></tr>')
parts.append('</table><p>Burmese answers keep the English allergen name on purpose (reviewed earlier).</p><h2>3. Sentences the AI says</h2><table><tr><th>Where</th><th>Thai</th><th>Burmese</th><th>Verdict</th><th>Correction</th></tr>')
for j, (where, th, my) in enumerate(SENT):
    parts.append(f'<tr data-k="Sentence: {e(where)}"><td>{e(where)}</td><td>{e(th)}</td><td>{e(my)}</td><td><label><input type="radio" name="s{j}" value="OK"> OK</label> <label><input type="radio" name="s{j}" value="Wrong"> Wrong</label></td><td><input type="text"></td></tr>')
parts.append('''</table><p><button onclick="out()">Copy my answers</button></p><pre id="o"></pre>
<script>function out(){var t=[];document.querySelectorAll('tr[data-k]').forEach(function(r){var v=r.querySelector('input[type=radio]:checked'),c=r.querySelector('input[type=text]').value;if(v||c)t.push(r.dataset.k+': '+(v?v.value:'-')+(c?' | '+c:''))});var s=t.join('\\n')||'(nothing filled in)';document.getElementById('o').textContent=s;if(navigator.clipboard)navigator.clipboard.writeText(s)}</script></body></html>''')
out = root / "eval/native_review_allergens.html"
out.write_text("".join(parts), encoding="utf-8")
print("wrote", out.relative_to(root), "rows:", len(rows), "new words:", sum(len(r[3]) for r in rows))
for r in rows:
    if r[3]: print("  NEW", r[0], r[1], r[3])
