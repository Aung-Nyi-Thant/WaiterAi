"use client";
import { useEffect, useState } from "react";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

// Full day names are the stored data value (matched against restaurant.hours.closedDays and read
// verbatim by the AI's hoursReply), not just a display label - kept here rather than in i18n.ts so
// a future translation of the checkbox text never risks drifting from what is actually stored.
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export default function HoursPage() {
  const { restaurant, toast, refresh, t } = useOwner();
  const [h, setH] = useState(restaurant.hours);
  const [err, setErr] = useState("");
  const [specials, setSpecials] = useState<any[]>([]);
  const [sp, setSp] = useState({ title: "", text: "", starts_on: "", ends_on: "" });
  const load = () => api<any[]>("/api/owner/specials").then(setSpecials);
  useEffect(() => { load(); }, []);
  async function saveHours() {
    setErr("");
    try { await api("/api/owner/settings", { method: "PUT", body: { hours: h } }); toast(t("hoursSaved")); refresh(); } catch (e: any) { setErr(e.message); }
  }
  async function addSpecial(e: React.FormEvent) {
    e.preventDefault();
    try { await api("/api/owner/specials", { body: { ...sp, active: 1 } }); setSp({ title: "", text: "", starts_on: "", ends_on: "" }); load(); toast(t("specialAdded")); } catch (x: any) { setErr(x.message); }
  }
  const toggleDay = (d: string) => setH({ ...h, closedDays: h.closedDays.includes(d) ? h.closedDays.filter((x) => x !== d) : [...h.closedDays, d] });
  return (
    <>
      <div><h1 style={{ fontSize: 40 }}>{t("hoursTitle")}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{t("hoursSubtitle")}</p></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="gl r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 22 }}>{t("openingHours")}</h2>
          <div className="grid2" style={{ gap: 12 }}>
            <div><label className="lbl" htmlFor="o1">{t("opens")}</label><input id="o1" type="time" className="in-l" value={h.open} onChange={(e) => setH({ ...h, open: e.target.value })} /></div>
            <div><label className="lbl" htmlFor="o2">{t("closes")}</label><input id="o2" type="time" className="in-l" value={h.close} onChange={(e) => setH({ ...h, close: e.target.value })} /></div>
          </div>
          <div><label className="lbl" htmlFor="o3">{t("lastOrder")}</label><input id="o3" type="time" className="in-l" value={h.lastOrder} onChange={(e) => setH({ ...h, lastOrder: e.target.value })} /></div>
          <div><span className="lbl">{t("closedOn")}</span><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{DAYS.map((d) => <label key={d} className="check"><input type="checkbox" checked={h.closedDays.includes(d)} onChange={() => toggleDay(d)} />{d.slice(0, 3)}</label>)}</div></div>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn btn-p" style={{ alignSelf: "flex-start" }} onClick={saveHours}>{t("saveHours")}</button>
        </div>
        <div className="gl r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>{t("specialsTitle")}</h2>
          <form onSubmit={addSpecial} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="lbl" htmlFor="s1">{t("title")}</label><input id="s1" className="in-l" value={sp.title} onChange={(e) => setSp({ ...sp, title: e.target.value })} required /></div>
            <div><label className="lbl" htmlFor="s2">{t("details")}</label><input id="s2" className="in-l" value={sp.text} onChange={(e) => setSp({ ...sp, text: e.target.value })} /></div>
            <div className="grid2" style={{ gap: 12 }}><div><label className="lbl" htmlFor="s3">{t("from")}</label><input id="s3" type="date" className="in-l" value={sp.starts_on} onChange={(e) => setSp({ ...sp, starts_on: e.target.value })} /></div><div><label className="lbl" htmlFor="s4">{t("until")}</label><input id="s4" type="date" className="in-l" value={sp.ends_on} onChange={(e) => setSp({ ...sp, ends_on: e.target.value })} /></div></div>
            <button className="btn btn-p" type="submit" style={{ alignSelf: "flex-start" }}><Icon name="plus" size={18} />{t("addSpecial")}</button>
          </form>
          {specials.map((s) => (
            <div key={s.id} className="row" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid rgba(46,42,120,.15)" }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{s.title}</div><div className="soft-l" style={{ fontSize: 13 }}>{s.text}{(s.starts_on || s.ends_on) && ` · ${s.starts_on || "…"} to ${s.ends_on || "…"}`}</div></div>
              <button className={`switch ${s.active ? "on" : ""}`} role="switch" aria-checked={!!s.active} aria-label={`${s.title} active`} onClick={async () => { await api(`/api/owner/specials/${s.id}`, { method: "PUT", body: { active: s.active ? 0 : 1 } }); load(); }} />
              <button className="btn btn-ol btn-icon btn-sm" style={{ width: 36 }} aria-label={`Delete ${s.title}`} onClick={async () => { await api(`/api/owner/specials/${s.id}`, { method: "DELETE" }); load(); }}><Icon name="trash" size={16} /></button>
            </div>))}
        </div>
      </div>
    </>
  );
}
