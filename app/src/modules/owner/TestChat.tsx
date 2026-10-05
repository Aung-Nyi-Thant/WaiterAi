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
  // biome-ignore lint/correctness/useExhaustiveDependencies: msgs and busy are the triggers (scroll to the newest message), not values read inside
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{samples.map((s) => <button type="button" key={s} className="sa-chip" onClick={() => send(s)} style={{ minHeight: 36, fontSize: 13 }}>{s}</button>)}</div>
      <div className="r-l" style={{ background: "var(--surface-page)", border: "1px solid var(--line)", height: 280, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.length === 0 && <div className="soft-l">Ask anything a diner would ask. Nothing here is saved or counted.</div>}
        {msgs.map((m, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat log that is never reordered
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "86%", display: "flex", flexDirection: "column" }}>
            <div className={`sa-msg ${m.role === "user" ? "sa-msg--me" : "sa-msg--ai"}`} style={{ maxWidth: "100%", lineHeight: 1.7 }}>{m.text}</div>
            {m.note && <div className="soft-l" style={{ fontSize: 12, marginTop: 2 }}>{m.note}</div>}
          </div>))}
        {busy && <div className="soft-l">Thinking…</div>}
        <div ref={end} />
      </div>
      <form className="row" style={{ gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="sa-input" style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a diner question" aria-label="Test question" />
        <button className="sa-btn sa-btn--ai sa-btn--icon" type="submit" aria-label="Send" disabled={busy}><Icon name="send" /></button>
      </form>
    </div>
  );
}
