"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/modules/platform/client";

export default function InsightsPage() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<any>(null);  
  const exportCSV = () => {
    if (!d) return;
    const rows: string[][] = [
      ["Section", "Name", "Value"],
      ["Summary", "Period (days)", String(days)],
      ["Summary", "Chats", String(d.sessions)],
      ["Summary", "Tables", String(d.tables)],
      ["Summary", "Questions", String(d.questions)],
      ["Summary", "Answered (%)", String(d.answeredPct ?? "")],
      ["Summary", "Unanswered", String(d.unanswered)],
      ["Summary", "Menu Opens", String(d.opens)],
      ...d.topics.map((t: any) => [
        "Most Asked",
        t.label,
        String(t.n),
      ]),
      ...d.langs.map((l: any) => [
        "Languages",
        l.lang,
        String(l.n),
      ]),
      ...d.topDishes.map((t: any) => [
        "Most Ordered Dishes",
        t.name,
        String(t.n),
      ]),
      ...d.topQuestions.map((q: any) => [
        "Repeated Questions",
        q.text,
        String(q.n),
      ]),
      ...d.cannot.map((c: any) => [
        "Could Not Answer",
        c.text,
        String(c.n),
      ]),
    ];
    const escapeCSV = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;
    const csv =
      "\uFEFF" +
      rows
        .map((row) => row.map(escapeCSV).join(","))
        .join("\r\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shop-ai-insights-${days}-days.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  useEffect(() => { api(`/api/owner/insights?days=${days}`).then(setD); }, [days]);
  if (!d) return <div className="soft-l">Loading…</div>;
  const max = Math.max(1, ...d.topics.map((t: any) => t.n));
  const totalLang = d.langs.reduce((s: number, l: any) => s + l.n, 0) || 1;
  const LN: any = { th: "Thai", my: "Burmese", en: "English" }, LC: any = { th: "var(--teal)", my: "var(--cherry)", en: "var(--ink)" };
  const Tile = ({ label, value, sub }: any) => <div className="sa-plate r-l" style={{ padding: "14px 18px" }}><div className="eyebrow soft-l">{label}</div><div style={{ font: "600 38px var(--font-h)", lineHeight: 1.15 }}>{value}</div><div className="soft-l" style={{ fontSize: 13 }}>{sub}</div></div>;
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ fontSize: 40 }}>What diners asked</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>What people wanted, and what you could not answer.</p></div>
        
        <div className="row" style={{ gap: 6 }}>
          {[1, 7, 30].map((n) => (
            <button
              type="button"
              key={n}
              className={`pill pill-l ${days === n ? "on" : ""}`}
              onClick={() => setDays(n)}
            >
              {n === 1 ? "Today" : `${n} days`}
            </button>
          ))}
          <button
            type="button"
            className="pill pill-l"
            onClick={exportCSV}
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="grid4">
        <Tile label="CHATS" value={d.sessions} sub={`${d.tables} tables · ${d.questions} questions`} />
        <Tile label="ANSWERED FROM MENU" value={d.answeredPct === null ? "—" : `${d.answeredPct}%`} sub={`${d.unanswered} sent to staff`} />
        <Tile label="COULD NOT ANSWER" value={d.unanswered} sub="add FAQs to fix" />
        <Tile label="MENU OPENS" value={d.opens} sub="from QR scans" />
      </div>
      {d.questions === 0 && <div className="sa-plate r-l soft-l" style={{ padding: 20 }}>No chats in this period yet. Open the diner menu and ask the AI a few questions, then come back.</div>}
      <div className="grid2" style={{ alignItems: "start", gridTemplateColumns: "1.35fr 1fr" }}>
        <div className="sa-plate r-xl" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="eyebrow soft-l">Most asked</div>
          {d.topics.length === 0 && <div className="soft-l">Nothing yet.</div>}
          {d.topics.map((t: any) => (
            <div key={t.topic} className="row" style={{ gap: 12 }}><div style={{ width: 200, fontWeight: 500 }}>{t.label}</div>
              <div style={{ flex: 1, height: 20, borderRadius: 10, background: "var(--surface-sunk)", boxShadow: "var(--well)" }}><div style={{ width: `${(t.n / max) * 100}%`, height: 20, borderRadius: 10, background: "var(--teal)" }} /></div><b style={{ width: 36, textAlign: "right" }}>{t.n}</b></div>))}
          <div style={{ marginTop: 8 }}><div className="eyebrow soft-l" style={{ marginBottom: 8 }}>Languages</div>
            <div style={{ display: "flex", height: 28, borderRadius: 14, overflow: "hidden", background: "var(--surface-sunk)", boxShadow: "var(--well)" }}>{d.langs.map((l: any) => <div key={l.lang} style={{ width: `${(l.n / totalLang) * 100}%`, background: LC[l.lang], color: "#fff", font: "700 13px var(--font-b)", display: "flex", alignItems: "center", paddingLeft: 12, whiteSpace: "nowrap" }}>{LN[l.lang]} {Math.round((l.n / totalLang) * 100)}%</div>)}</div></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {d.unmet && (
            <div className="r-xl" style={{ padding: "20px 24px", background: "var(--ink)", color: "var(--surface-card)", boxShadow: "var(--lift-1)", borderTop: "6px solid var(--mustard)" }}>
              <div className="eyebrow" style={{ color: "var(--mustard)" }}>Unmet demand</div>
              <div style={{ font: "600 42px var(--font-h)", lineHeight: 1.1, marginTop: 2 }}>{d.unmet.asked} {d.unmet.asked === 1 ? "question" : "questions"}</div>
              <div style={{ margin: "0 0 12px" }}>about vegetarian or vegan food, and your menu lists {d.unmet.listed} such {d.unmet.listed === 1 ? "dish" : "dishes"}.</div>
              <Link className="btn btn-p" href="/owner/menu">Add a vegetarian dish</Link></div>)}
          <div className="sa-plate r-xl" style={{ padding: "18px 24px" }}>
            <div className="eyebrow soft-l" style={{ marginBottom: 4 }}>Could not answer</div>
            {d.cannot.length === 0 && <div className="soft-l" style={{ padding: "8px 0" }}>Nothing unanswered. Nice.</div>}
            {d.cannot.map((c: any) => <div key={c.text} className="row" style={{ justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}><div style={{ fontWeight: 500 }}>{c.text}{c.n > 1 && <span className="soft-l"> ×{c.n}</span>}</div><Link className="btn btn-ol btn-sm" href={`/owner/faq?q=${encodeURIComponent(c.text)}`}>Add FAQ</Link></div>)}
          </div>
          {d.flagged.length > 0 && <div className="sa-plate r-xl" style={{ padding: "18px 24px" }}><div className="eyebrow soft-l" style={{ marginBottom: 4 }}>Answers diners marked “not right”</div>{d.flagged.map((f: any) => <div key={f.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>{f.answer}</div>)}</div>}
        </div>
      </div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="sa-plate r-xl" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="eyebrow soft-l">Allergies your diners have</div>
          {d.allergyProfiles.length === 0 && <div className="soft-l">No diner has set an allergy profile in this period.</div>}
          {d.allergyProfiles.map((a: any) => (
            <div key={a.allergen} className="row" style={{ justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 600 }}>{a.label}</div>
              <div style={{ textAlign: "right" }}>
                <b>{a.diners}</b> {a.diners === 1 ? "diner" : "diners"} · <span style={a.dishes < 3 ? { color: "var(--cherry-text)", fontWeight: 700 } : undefined}>{a.dishes} {a.dishes === 1 ? "dish fits" : "dishes fit"}{a.dishes < 3 ? " ⚠" : ""}</span>
              </div>
            </div>))}
          {d.allergensAsked.length > 0 && <>
            <div className="eyebrow soft-l" style={{ marginTop: 8 }}>Allergens diners asked about in the chat</div>
            <div className="soft-l">{d.allergensAsked.map((a: any) => `${a.label} ×${a.n}`).join(" · ")}</div>
          </>}
          {d.noAllergenData.length > 0 && (
            <div className="sa-notice" role="status" style={{ marginTop: 8 }}>
              <div style={{ flex: 1 }}><b>{d.noAllergenData.length} {d.noAllergenData.length === 1 ? "dish has" : "dishes have"} no allergen data</b> ({d.noAllergenData.slice(0, 4).join(", ")}{d.noAllergenData.length > 4 ? "…" : ""}). The AI never suggests these to a diner with an allergy profile, so they are hidden from them.</div>
              <Link className="btn btn-ol btn-sm" href="/owner/menu">Fill in</Link>
            </div>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="sa-plate r-xl" style={{ padding: "18px 24px" }}>
            <div className="eyebrow soft-l" style={{ marginBottom: 4 }}>Most ordered dishes</div>
            {d.topDishes.length === 0 && <div className="soft-l" style={{ padding: "8px 0" }}>No orders in this period yet.</div>}
            {d.topDishes.map((t: any) => <div key={t.name} className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}><span style={{ fontWeight: 500 }}>{t.name}</span><b>{t.n}×</b></div>)}
          </div>
          <div className="sa-plate r-xl" style={{ padding: "18px 24px" }}>
            <div className="eyebrow soft-l" style={{ marginBottom: 4 }}>Questions asked again and again</div>
            {d.topQuestions.length === 0 && <div className="soft-l" style={{ padding: "8px 0" }}>No question was asked more than once.</div>}
            {d.topQuestions.map((q: any) => <div key={q.text} className="row" style={{ justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)" }}><span style={{ fontWeight: 500 }}>{q.text}</span><b>×{q.n}</b></div>)}
          </div>
        </div>
      </div>
    </>
  );
}
