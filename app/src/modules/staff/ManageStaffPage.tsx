"use client";
import { useEffect, useState } from "react";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

export default function StaffPage() {
  const { restaurant, toast, t } = useOwner();
  const [staff, setStaff] = useState<any[]>([]);
  const [f, setF] = useState({ name: "", role: "waiter", pin: "" });
  const [err, setErr] = useState("");
  const load = () => api<any[]>("/api/owner/staff").then(setStaff);
  // biome-ignore lint/correctness/useExhaustiveDependencies: loads once on mount
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/owner/staff", { body: f }); setF({ name: "", role: "waiter", pin: "" }); load(); toast(t("staffAdded")); } catch (x: any) { setErr(x.message); }
  }
  async function reset(s: any) {
    const pin = prompt(`${t("newPinFor")} ${s.name} ${t("pinDigitRange")}`);
    if (!pin) return;
    try { await api(`/api/owner/staff/${s.id}`, { method: "PUT", body: { pin } }); toast(t("pinChanged")); } catch (x: any) { toast(x.message); }
  }
  return (
    <>
      <div><h1 style={{ fontSize: 40 }}>{t("staffTitle")}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{t("staffSubtitle")} <b>/staff</b> {t("withPin")} <b>{restaurant.slug}</b></p></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <form onSubmit={add} className="sa-plate r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>{t("addTeamMember")}</h2>
          <div><label className="lbl" htmlFor="sn">{t("name")}</label><input id="sn" className="in-l" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div className="grid2" style={{ gap: 12 }}>
            <div><label className="lbl" htmlFor="sr">{t("role")}</label><select id="sr" className="in-l" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="waiter">{t("waiter")}</option><option value="chef">{t("chef")}</option></select></div>
            <div><label className="lbl" htmlFor="sp">{t("pinDigits")}</label><input id="sp" className="in-l" inputMode="numeric" pattern="\d{4,8}" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} required /></div>
          </div>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn btn-p" style={{ alignSelf: "flex-start" }} type="submit"><Icon name="plus" size={18} />{t("add")}</button>
        </form>
        <div className="sa-plate r-xl" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>{t("team")}</h2>
          {staff.map((s) => (
            <div key={s.id} className="row" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{s.name}</div><span className="chip chip-l">{s.role}</span></div>
              <button type="button" className="btn btn-ol btn-sm" onClick={() => reset(s)}>{t("changePin")}</button>
              <button type="button" className="btn btn-ol btn-icon btn-sm" style={{ width: 36 }} aria-label={`${t("removeStaff")} ${s.name}`} onClick={async () => { if (confirm(`${t("removeStaffConfirm")} ${s.name}?`)) { await api(`/api/owner/staff/${s.id}`, { method: "DELETE" }); load(); } }}><Icon name="trash" size={16} /></button>
            </div>))}
        </div>
      </div>
    </>
  );
}
