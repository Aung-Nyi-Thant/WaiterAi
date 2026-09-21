"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useOwner } from "@/components/OwnerShell";
import { api } from "@/lib/client";

export default function StaffPage() {
  const { restaurant, toast } = useOwner();
  const [staff, setStaff] = useState<any[]>([]);
  const [f, setF] = useState({ name: "", role: "waiter", pin: "" });
  const [err, setErr] = useState("");
  const load = () => api<any[]>("/api/owner/staff").then(setStaff);
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/owner/staff", { body: f }); setF({ name: "", role: "waiter", pin: "" }); load(); toast("Staff added."); } catch (x: any) { setErr(x.message); }
  }
  async function reset(s: any) {
    const pin = prompt(`New PIN for ${s.name} (4 to 8 digits)`);
    if (!pin) return;
    try { await api(`/api/owner/staff/${s.id}`, { method: "PUT", body: { pin } }); toast("PIN changed."); } catch (x: any) { toast(x.message); }
  }
  return (
    <>
      <div><h1 style={{ fontSize: 40 }}>Staff</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>Waiters and chefs sign in at <b>/staff</b> with a PIN. Restaurant code: <b>{restaurant.slug}</b></p></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <form onSubmit={add} className="gl r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>Add a team member</h2>
          <div><label className="lbl" htmlFor="sn">Name</label><input id="sn" className="in-l" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div className="grid2" style={{ gap: 12 }}>
            <div><label className="lbl" htmlFor="sr">Role</label><select id="sr" className="in-l" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="waiter">Waiter</option><option value="chef">Chef</option></select></div>
            <div><label className="lbl" htmlFor="sp">PIN (4 to 8 digits)</label><input id="sp" className="in-l" inputMode="numeric" pattern="\d{4,8}" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} required /></div>
          </div>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn btn-p" style={{ alignSelf: "flex-start" }} type="submit"><Icon name="plus" size={18} />Add</button>
        </form>
        <div className="gl r-xl" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Team</h2>
          {staff.map((s) => (
            <div key={s.id} className="row" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid rgba(46,42,120,.15)" }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{s.name}</div><span className="chip chip-l">{s.role}</span></div>
              <button className="btn btn-ol btn-sm" onClick={() => reset(s)}>Change PIN</button>
              <button className="btn btn-ol btn-icon btn-sm" style={{ width: 36 }} aria-label={`Remove ${s.name}`} onClick={async () => { if (confirm(`Remove ${s.name}?`)) { await api(`/api/owner/staff/${s.id}`, { method: "DELETE" }); load(); } }}><Icon name="trash" size={16} /></button>
            </div>))}
        </div>
      </div>
    </>
  );
}
