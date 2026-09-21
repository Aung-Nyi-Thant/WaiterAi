"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/modules/platform/Icon";
import { api } from "@/modules/platform/client";

type M = { role: "user" | "ai"; text: string; note?: string };
export default function TestChat({ slug }: { slug: string }) {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  async function send(m: string) {
    m = m.trim(); if (!m || busy) return;
    setText(""); setMsgs((x) => [...x, { role: "user", text: m }]); setBusy(true);
    try {
      const r = await api<any>(`/api/public/${slug}/chat`, { body: { message: m, preview: true } });
      const note = r.action?.type !== "none" ? `Action: ${r.action.type}${r.dishes?.length ? " → " + r.dishes.map((d: any) => d.name.en).join(", ") : ""}` : "";
      setMsgs((x) => [...x, { role: "ai", text: r.reply, note }]);
    } catch (e: any) { setMsgs((x) => [...x, { role: "ai", text: e.message }]); }
    setBusy(false);
  }
  const samples = ["Vegetarian dishes under 100 baht", "I'm allergic to peanuts", "What time do you close?", "แนะนำเมนูหน่อย", "ပီဇာ ရှိလား"];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{samples.map((s) => <button key={s} className="pill pill-l" onClick={() => send(s)} style={{ minHeight: 34, fontSize: 12 }}>{s}</button>)}</div>
      <div className="gl r-l" style={{ height: 280, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.length === 0 && <div className="soft-l">Ask anything a diner would ask. Nothing here is saved or counted.</div>}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <div style={{ padding: "8px 14px", borderRadius: 16, background: m.role === "user" ? "var(--purp)" : "rgba(255,255,255,.9)", color: m.role === "user" ? "#fff" : "var(--navy)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{m.text}</div>
            {m.note && <div className="soft-l" style={{ fontSize: 12, marginTop: 2 }}>{m.note}</div>}
          </div>))}
        {busy && <div className="soft-l">Thinking…</div>}
        <div ref={end} />
      </div>
      <form className="row" style={{ gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="in-l" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a diner question" aria-label="Test question" />
        <button className="btn btn-p btn-icon" type="submit" aria-label="Send" disabled={busy}><Icon name="send" /></button>
      </form>
    </div>
  );
}
