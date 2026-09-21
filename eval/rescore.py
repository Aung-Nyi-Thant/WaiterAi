#!/usr/bin/env python3
"""Re-apply the current checks to a saved results file (no model runs).
Usage: python3 rescore.py results/<file>.json"""
import json, sys
from pathlib import Path
import run_eval as R

path = Path(sys.argv[1])
data = json.load(open(path))
menu = json.load(open(R.HERE / "menu.json"))
qs = {q["id"]: q for q in json.load(open(R.HERE / "questions.json"))}
models = {}
for r in data["results"]:
    ok, lang_ok, problems = R.check(r["answer"], qs[r["id"]], menu)
    r["pass"], r["lang_ok"], r["problems"] = ok, lang_ok, problems
    models.setdefault(r["model"], []).append(r)
pct = lambda v: "-" if v is None else f"{v:.0%}"
rate = lambda rows: (sum(x["pass"] for x in rows) / len(rows)) if rows else None
lines = ["| Model | Pass | EN | TH | MY | Allergen |", "|---|---|---|---|---|---|"]
for m, rows in models.items():
    lines.append(f"| {m} | {pct(rate(rows))} | " + " | ".join(pct(rate([x for x in rows if x['lang'] == l])) for l in ("en", "th", "my"))
                 + f" | {pct(rate([x for x in rows if x['category'].startswith('allergen')]))} |")
    for x in rows:
        if not x["pass"]:
            print(f"FAIL {m[:20]:20} {x['id']:5} {x['problems']}")
print("\n" + "\n".join(lines))
json.dump(data, open(path.with_name(path.stem + "-rescored.json"), "w"), ensure_ascii=False, indent=1)
