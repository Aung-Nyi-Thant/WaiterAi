"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function InsightsPage() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/api/owner/insights?days=${days}`).then(setD); }, [days]);
  if (!d) return <div className="soft-l">Loading…</div>;
  const max = Math.max(1, ...d.topics.map((t: any) => t.n));
  const totalLang = d.langs.reduce((s: number, l: any) => s + l.n, 0) || 1;
  const LN: any = { th: "Thai", my: "Burmese", en: "English" }, LC: any = { th: "var(--purp)", my: "#1fa68a", en: "#b45309" };
  const Tile = ({ label, value, sub }: any) => <div className="gl r-l" style={{ padding: "14px 18px" }}><div className="eyebrow soft-l">{label}</div><div style={{ font: "600 38px var(--font-h)", lineHeight: 1.15 }}>{value}</div><div className="soft-l" style={{ fontSize: 13 }}>{sub}</div></div>;
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ fontSize: 40 }}>What diners asked</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>What people wanted, and what you could not answer.</p></div>
        <div className="row" style={{ gap: 6 }}>{[1, 7, 30].map((n) => <button key={n} className={`pill pill-l ${days === n ? "on" : ""}`} onClick={() => setDays(n)}>{n === 1 ? "Today" : `${n} days`}</button>)}</div>
      </div>
      <div className="grid4">
        <Tile label="CHATS" value={d.sessions} sub={`${d.tables} tables · ${d.questions} questions`} />
        <Tile label="ANSWERED FROM MENU" value={d.answeredPct === null ? "—" : `${d.answeredPct}%`} sub={`${d.unanswered} sent to staff`} />
        <Tile label="COULD NOT ANSWER" value={d.unanswered} sub="add FAQs to fix" />
        <Tile label="MENU OPENS" value={d.opens} sub="from QR scans" />
      </div>
      {d.questions === 0 && <div className="gl r-l soft-l" style={{ padding: 20 }}>No chats in this period yet. Open the diner menu and ask the AI a few questions, then come back.</div>}
      <div className="grid2" style={{ alignItems: "start", gridTemplateColumns: "1.35fr 1fr" }}>
        <div className="gl r-xl" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="eyebrow soft-l">Most asked</div>
          {d.topics.length === 0 && <div className="soft-l">Nothing yet.</div>}
          {d.topics.map((t: any) => (
            <div key={t.topic} className="row" style={{ gap: 12 }}><div style={{ width: 200, fontWeight: 500 }}>{t.label}</div>
              <div style={{ flex: 1, height: 20, borderRadius: 10, background: "rgba(46,42,120,.12)" }}><div style={{ width: `${(t.n / max) * 100}%`, height: 20, borderRadius: 10, background: "var(--purp)" }} /></div><b style={{ width: 36, textAlign: "right" }}>{t.n}</b></div>))}
          <div style={{ marginTop: 8 }}><div className="eyebrow soft-l" style={{ marginBottom: 8 }}>Languages</div>
            <div style={{ display: "flex", height: 28, borderRadius: 14, overflow: "hidden", background: "rgba(46,42,120,.12)" }}>{d.langs.map((l: any) => <div key={l.lang} style={{ width: `${(l.n / totalLang) * 100}%`, background: LC[l.lang], color: "#fff", font: "700 13px var(--font-b)", display: "flex", alignItems: "center", paddingLeft: 12, whiteSpace: "nowrap" }}>{LN[l.lang]} {Math.round((l.n / totalLang) * 100)}%</div>)}</div></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {d.unmet && (
            <div className="r-xl" style={{ padding: "20px 24px", background: "linear-gradient(135deg, rgba(46,42,120,.92), rgba(110,86,255,.85))", border: "1px solid rgba(255,255,255,.5)", color: "#fff" }}>
              <div className="eyebrow" style={{ color: "var(--gold)" }}>Unmet demand</div>
              <div style={{ font: "600 42px var(--font-h)", lineHeight: 1.1, marginTop: 2 }}>{d.unmet.asked} {d.unmet.asked === 1 ? "question" : "questions"}</div>
              <div style={{ margin: "0 0 12px" }}>about vegetarian or vegan food, and your menu lists {d.unmet.listed} such {d.unmet.listed === 1 ? "dish" : "dishes"}.</div>
              <Link className="btn btn-w" href="/owner/menu">Add a vegetarian dish</Link></div>)}
          <div className="gl r-xl" style={{ padding: "18px 24px" }}>
            <div className="eyebrow soft-l" style={{ marginBottom: 4 }}>Could not answer</div>
            {d.cannot.length === 0 && <div className="soft-l" style={{ padding: "8px 0" }}>Nothing unanswered. Nice.</div>}
            {d.cannot.map((c: any, i: number) => <div key={i} className="row" style={{ justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(46,42,120,.12)" }}><div style={{ fontWeight: 500 }}>{c.text}{c.n > 1 && <span className="soft-l"> ×{c.n}</span>}</div><Link className="btn btn-ol btn-sm" href={`/owner/faq?q=${encodeURIComponent(c.text)}`}>Add FAQ</Link></div>)}
          </div>
          {d.flagged.length > 0 && <div className="gl r-xl" style={{ padding: "18px 24px" }}><div className="eyebrow soft-l" style={{ marginBottom: 4 }}>Answers diners marked “not right”</div>{d.flagged.map((f: any) => <div key={f.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(46,42,120,.12)", fontSize: 14 }}>{f.answer}</div>)}</div>}
        </div>
      </div>
    </>
  );
}
