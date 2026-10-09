"use client";
import { useState } from "react";
import TestChat from "@/modules/owner/TestChat";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

export default function AiPage() {
  const { restaurant, toast, refresh, t } = useOwner();
  const [p, setP] = useState(restaurant.persona);
  const [name, setName] = useState(restaurant.name);
  const [city, setCity] = useState(restaurant.city);
  const [err, setErr] = useState("");
  async function save() {
    setErr("");
    try { await api("/api/owner/settings", { method: "PUT", body: { name, city, persona: p } }); toast(t("saved")); refresh(); } catch (e: any) { setErr(e.message); }
  }
  return (
    <>
      <div><h1 style={{ fontSize: 40 }}>{t("aiWaiterTitle")}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{t("aiWaiterSubtitle")}</p></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="sa-plate r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="grid2" style={{ gap: 12 }}>
            <div><label className="lbl" htmlFor="rn">{t("restaurantName")}</label><input id="rn" className="in-l" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="lbl" htmlFor="rc">{t("city")}</label><input id="rc" className="in-l" value={city} onChange={(e) => setCity(e.target.value)} /></div>
          </div>
          <div><label className="lbl" htmlFor="an">{t("assistantName")}</label><input id="an" className="in-l" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div className="grid2" style={{ gap: 12 }}>
            <div><label className="lbl" htmlFor="ag">{t("waiterVoice")}</label><select id="ag" className="in-l" value={p.gender} onChange={(e) => setP({ ...p, gender: e.target.value as any })}><option value="male">{t("maleVoice")}</option><option value="female">{t("femaleVoice")}</option></select></div>
            <div><label className="lbl" htmlFor="at">{t("tone")}</label><select id="at" className="in-l" value={p.tone} onChange={(e) => setP({ ...p, tone: e.target.value })}><option value="friendly">{t("friendly")}</option><option value="formal">{t("formal")}</option><option value="playful">{t("playful")}</option></select></div>
          </div>
          <div><label className="lbl" htmlFor="gr">{t("greetingOptional")}</label><input id="gr" className="in-l" value={p.greeting} onChange={(e) => setP({ ...p, greeting: e.target.value })} placeholder={t("greetingPlaceholder")} /></div>
          <label className="check" style={{ alignSelf: "flex-start" }}><input type="checkbox" checked={p.upsell} onChange={(e) => setP({ ...p, upsell: e.target.checked })} />{t("suggestDrinksDesserts")}</label>
          {err && <div className="err" role="alert">{err}</div>}
          <button type="button" className="btn btn-p" style={{ alignSelf: "flex-start" }} onClick={save}>{t("saveChanges")}</button>
        </div>
        <div className="sa-plate r-xl" style={{ padding: 24 }}><h2 style={{ fontSize: 22, marginBottom: 12 }}>{t("tryIt")}</h2><TestChat slug={restaurant.slug} /></div>
      </div>
    </>
  );
}
