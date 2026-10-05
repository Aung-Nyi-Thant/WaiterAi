"""Builds docs/FINAL_REPORT.pdf from docs/FINAL_REPORT.md (a small subset of Markdown: headings, paragraphs,
quotes, tables, bold, italics, code, links). Run:  python3 docs/make_report_pdf.py   (needs PyMuPDF)."""
import html, re, sys, pathlib
import fitz

here = pathlib.Path(__file__).parent
src = (here / "FINAL_REPORT.md").read_text(encoding="utf-8")


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"&lt;(https?://[^&]+)&gt;", r'<a href="\1">\1</a>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t


out, lines, i = [], src.split("\n"), 0
while i < len(lines):
    ln = lines[i]
    if ln.startswith("# "):
        out.append(f"<h1>{inline(ln[2:])}</h1>")
    elif ln.startswith("## "):
        out.append(f"<h2>{inline(ln[3:])}</h2>")
    elif ln.startswith("> "):
        out.append(f'<p class="note">{inline(ln[2:])}</p>')
    elif ln.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            if not all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
                rows.append(cells)
            i += 1
        i -= 1
        head = rows[0]
        has_head = any(c for c in head)
        tb = "<table>"
        for r_i, r in enumerate(rows):
            if r_i == 0 and not has_head:
                continue
            tag = "th" if (r_i == 0 and has_head) else "td"
            tb += "<tr>" + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in r) + "</tr>"
        out.append(tb + "</table>")
    elif ln.strip():
        out.append(f"<p>{inline(ln)}</p>")
    i += 1

css = """
body { font-family: sans-serif; font-size: 8.6pt; line-height: 1.3; color: #111; }
h1 { font-size: 15pt; margin: 0 0 3pt 0; color: #0b0f19; }
h2 { font-size: 10.5pt; margin: 8pt 0 2pt 0; color: #0b0f19; border-bottom: 0.8pt solid #2d5bff; padding-bottom: 1pt; }
p { margin: 2pt 0 3pt 0; }
p.note { color: #333; font-style: italic; }
table { width: 100%; margin: 3pt 0 4pt 0; }
th { color: #1d4ed8; text-align: left; padding: 2pt 3pt; font-size: 8pt; }
td { padding: 2pt 3pt; vertical-align: top; font-size: 8pt; }
code { font-family: monospace; font-size: 7.6pt; }
a { color: #1d4ed8; }
"""
body = "\n".join(out)
story = fitz.Story(html=f"<html><body>{body}</body></html>", user_css=css)
W, H = fitz.paper_size("a4")
MARGIN = 48
rect = fitz.Rect(MARGIN, MARGIN, W - MARGIN, H - MARGIN)
doc = fitz.DocumentWriter(str(here / "FINAL_REPORT.pdf"))
more = 1
n = 0
while more:
    dev = doc.begin_page(fitz.Rect(0, 0, W, H))
    more, _ = story.place(rect)
    story.draw(dev)
    doc.end_page()
    n += 1
doc.close()
print(f"wrote docs/FINAL_REPORT.pdf, {n} pages")
