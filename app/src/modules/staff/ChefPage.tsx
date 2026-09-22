"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import { api, usePoll, minutesAgo } from "@/modules/platform/client";

type Kitchen = { me: { name: string }; tickets: { new: any[]; cooking: any[]; ready: any[] }; dishes: { id: number; name: string; available: number }[] };
const COL: [keyof Kitchen["tickets"], string, string, string][] = [["new", "New", "cooking", "Start cooking"], ["cooking", "Cooking", "ready", "Mark ready"], ["ready", "Ready", "served", "Served"]];
// Traffic-light ticket urgency (on time / caution / late), the standard commercial-KDS pattern, so
// staff read status from color at a glance rather than doing timestamp math on every ticket.
const urgencyColor = (mins: number, ready: boolean) => (ready ? null : mins >= 10 ? "#ff6b6b" : mins >= 5 ? "#ffd98a" : "#3ddc97");

export default function Chef() {
  const router = useRouter();
  const [d, setD] = useState<Kitchen | null>(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => { const t = () => setNow(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })); t(); const i = setInterval(t, 15000); return () => clearInterval(i); }, []);
  const load = () => api<Kitchen>("/api/staff/kitchen").then((x) => { setD(x); setErr(""); setLastUpdated(new Date()); }).catch((e) => { if (e.status === 401) router.push("/staff"); else setErr(e.message); });
  usePoll(load, 3000);
  const act = async (id: number, action: string) => { try { await api(`/api/staff/orders/${id}`, { body: { action } }); } catch (e: any) { setErr(e.message); } load(); };
  const toggle = async (id: number, available: boolean) => { await api(`/api/staff/items/${id}`, { body: { available } }); load(); };
  const logout = async () => { await api("/api/auth/logout", { body: {} }); router.push("/staff"); };
  if (!d) return <div className="aurora-d" style={{ padding: 40 }}>{err || "Loading…"}</div>;

  return (
    <div className="aurora-d" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="gd row" style={{ height: 68, borderRadius: 34, padding: "0 26px", justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 14, alignItems: "baseline" }}><h1 style={{ fontSize: 30, fontWeight: 600 }}>Kitchen</h1><span className="eyebrow soft-d">Chef · {d.me.name}</span></div>
        <div className="row" style={{ gap: 20 }}>
          <div className="row" role="status" style={{ gap: 8, font: "700 13px var(--font-b)" }}>
            <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: err ? "#c62828" : "#3ddc97" }} />
            {err ? (lastUpdated ? "RECONNECTING…" : "OFFLINE") : "LIVE"}
            {lastUpdated && <span className="soft-d" style={{ fontWeight: 500 }}>· as of {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <div style={{ font: "500 28px var(--font-h)" }}>{now}</div>
          <button className="btn btn-o btn-icon" onClick={logout} aria-label="Sign out"><Icon name="logout" /></button>
        </div>
      </div>
      <div className="kanban">
        {COL.map(([key, title, next, btn]) => (
          <div key={key} className="col">
            <div className="row" style={{ justifyContent: "space-between", padding: "0 4px" }}><h2 style={{ fontSize: 22, letterSpacing: ".06em" }}>{title}</h2><span className="gd" style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", font: "700 14px var(--font-b)" }}>{d.tickets[key].length}</span></div>
            {d.tickets[key].length === 0 && <div className="gd r-l soft-d" style={{ padding: 18, textAlign: "center" }}>Empty</div>}
            {d.tickets[key].map((o) => {
              const mins = Math.round((Date.now() - new Date(o.updatedAt).getTime()) / 60000);
              const urgency = urgencyColor(mins, key === "ready");
              return (
              <div key={o.id} className="gd r-xl" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, borderLeft: urgency ? `4px solid ${urgency}` : undefined }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}><div style={{ font: "600 30px var(--font-h)" }}>Table {o.table || "?"}</div><div style={{ font: "700 13px var(--font-b)", color: urgency || "rgba(255,255,255,.76)" }}>{minutesAgo(o.updatedAt)}</div></div>
                {o.items.map((i: any, k: number) => <div key={k} className="row" style={{ gap: 10, font: "600 18px var(--font-b)", padding: "3px 0" }}><span style={{ width: 30, color: "var(--gold)" }}>{i.qty}×</span><span>{i.name}</span></div>)}
                {o.allergy && <div className="alert-banner" style={{ margin: "8px 0" }}><Icon name="alert" size={22} /><div>ALLERGY: {o.allergy.toUpperCase()}<br /><span style={{ fontWeight: 500, fontSize: 12 }}>Waiter confirmed with diner</span></div></div>}
                <button className="btn btn-w" style={{ marginTop: 6, minHeight: 48, fontSize: 14 }} onClick={() => act(o.id, next)}>{btn}</button>
              </div>); })}
          </div>
        ))}
        <div className="gd r-xl" style={{ flex: 1, minWidth: 260, padding: "18px 22px" }}>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Sold out today</h2>
          <div className="soft-d" style={{ fontSize: 13, marginBottom: 6 }}>Switch a dish off when the kitchen runs out. Diners and the AI waiter stop offering it at once.</div>
          {d.dishes.map((x) => <div key={x.id} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.18)" }}><span style={{ fontWeight: 500 }}>{x.name}</span>
            <button className={`switch dark ${x.available ? "on" : ""}`} role="switch" aria-checked={!!x.available} aria-label={x.name} onClick={() => toggle(x.id, !x.available)} /></div>)}
        </div>
      </div>
    </div>
  );
}
