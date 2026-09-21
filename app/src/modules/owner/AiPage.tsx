"use client";
import { useState } from "react";
import TestChat from "@/modules/owner/TestChat";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

export default function AiPage() {
  const { restaurant, toast, refresh } = useOwner();
  const [p, setP] = useState(restaurant.persona);
  const [name, setName] = useState(restaurant.name);
  const [city, setCity] = useState(restaurant.city);
  const [err, setErr] = useState("");
  async function save() {
    setErr("");
    try { await api("/api/owner/settings", { method: "PUT", body: { name, city, persona: p } }); toast("Saved."); refresh(); } catch (e: any) { setErr(e.message); }
  }
  return (
    <>
      <div><h1 style={{ fontSize: 40 }}>AI waiter</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>Choose how your assistant sounds, then try it on the right.</p></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="gl r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="grid2" style={{ gap: 12 }}>
            <div><label className="lbl" htmlFor="rn">Restaurant name</label><input id="rn" className="in-l" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="lbl" htmlFor="rc">City</label><input id="rc" className="in-l" value={city} onChange={(e) => setCity(e.target.value)} /></div>
          </div>
          <div><label className="lbl" htmlFor="an">Assistant name</label><input id="an" className="in-l" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div className="grid2" style={{ gap: 12 }}>
            <div><label className="lbl" htmlFor="ag">Waiter voice</label><select id="ag" className="in-l" value={p.gender} onChange={(e) => setP({ ...p, gender: e.target.value as any })}><option value="male">Male (Thai ครับ, Burmese ခင်ဗျာ)</option><option value="female">Female (Thai ค่ะ, Burmese ရှင်)</option></select></div>
            <div><label className="lbl" htmlFor="at">Tone</label><select id="at" className="in-l" value={p.tone} onChange={(e) => setP({ ...p, tone: e.target.value })}><option value="friendly">Friendly</option><option value="formal">Formal</option><option value="playful">Playful</option></select></div>
          </div>
          <div><label className="lbl" htmlFor="gr">Greeting (optional)</label><input id="gr" className="in-l" value={p.greeting} onChange={(e) => setP({ ...p, greeting: e.target.value })} placeholder="Welcome to Golden Lotus! Ask me anything." /></div>
          <label className="check" style={{ alignSelf: "flex-start" }}><input type="checkbox" checked={p.upsell} onChange={(e) => setP({ ...p, upsell: e.target.checked })} />Suggest drinks and desserts</label>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn btn-p" style={{ alignSelf: "flex-start" }} onClick={save}>Save changes</button>
        </div>
        <div className="gl r-xl" style={{ padding: 24 }}><h2 style={{ fontSize: 22, marginBottom: 12 }}>Try it</h2><TestChat slug={restaurant.slug} /></div>
      </div>
    </>
  );
}
