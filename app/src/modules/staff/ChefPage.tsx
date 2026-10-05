"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import SwipeCard from "@/modules/staff/SwipeCard";
import { AllergyBanner, LineFlag, SoldOutList } from "@/modules/staff/WaiterPage";
import { api, usePoll, minutesAgo } from "@/modules/platform/client";

type Kitchen = { me: { name: string; role: string }; tickets: { new: any[]; cooking: any[]; ready: any[] }; dishes: { id: number; name: string; available: number }[] };
const COL: [keyof Kitchen["tickets"], string, string, string][] = [["new", "New", "cooking", "Start cooking"], ["cooking", "Cooking", "ready", "Mark ready"], ["ready", "Ready", "served", "Served"]];
// A ticket turns late (cherry timer + flag) after 10 minutes in the same column.
const LATE_AFTER_MIN = 10;

export default function Chef() {
  const router = useRouter();
  const [d, setD] = useState<Kitchen | null>(null);
  const [err, setErr] = useState("");
  const [now, setNow] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => { const t = () => setNow(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })); t(); const i = setInterval(t, 15000); return () => clearInterval(i); }, []);
  // Same issue as the waiter page in reverse: a waiter's role landing on this chef-only
  // screen would see cooking/ready buttons that always 403 (role-gated server-side).
  const load = () => api<Kitchen>("/api/staff/kitchen").then((x) => {
    if (x.me.role !== "chef") { router.push("/staff/waiter"); return; }
    setD(x); setErr(""); setLastUpdated(new Date());
  }).catch((e) => { if (e.status === 401) router.push("/staff"); else setErr(e.message); });
  usePoll(load, 3000);
  const act = async (id: number, action: string) => { try { await api(`/api/staff/orders/${id}`, { body: { action } }); } catch (e: any) { setErr(e.message); } load(); };
  const toggle = async (id: number, available: boolean) => { await api(`/api/staff/items/${id}`, { body: { available } }); load(); };
  const logout = async () => { await api("/api/auth/logout", { body: {} }); router.push("/staff"); };
  if (!d) return <div className="sa-app" data-theme="night" style={{ padding: 40 }}>{err || "Loading…"}</div>;

  return (
    <div className="sa-app kitchen" data-theme="night">
      <div className="sa-plate kitchen-bar">
        <div className="row" style={{ gap: 14, alignItems: "baseline" }}><h1 style={{ fontSize: 32 }}>Kitchen</h1><span className="staff-head__meta">Chef · {d.me.name}</span></div>
        <div className="row" style={{ gap: 20 }}>
          <div className="staff-live" role="status">
            <span className={`sa-status ${err ? "sa-status--offline" : "sa-status--live"}`}>{err ? (lastUpdated ? "Reconnecting" : "Offline") : "Live"}</span>
            {lastUpdated && <span>as of {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <div className="kitchen-clock">{now}</div>
          <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={logout} aria-label="Sign out"><Icon name="logout" /></button>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="kanban">
        {COL.map(([key, title, next, btn]) => (
          <div key={key} className="col">
            <div className="col-head"><h2>{title}</h2><span className={`col-count col-count--${key}`}>{d.tickets[key].length}</span></div>
            {d.tickets[key].length === 0 && <div className="sa-plate sa-empty">Empty</div>}
            {d.tickets[key].map((o) => {
              const mins = Math.round((Date.now() - new Date(o.updatedAt).getTime()) / 60000);
              const late = key !== "ready" && mins >= LATE_AFTER_MIN;
              return (
              <SwipeCard key={o.id} onSwipeRight={() => act(o.id, next)} rightLabel={`${btn} →`} rightColor={key === "new" ? "var(--cherry)" : "var(--ok)"}>
                <article className={`sa-ticket${key === "cooking" ? " sa-ticket--cooking" : key === "ready" ? " sa-ticket--ready" : ""}`}>
                  <div className="sa-ticket__head">
                    <div className="sa-ticket__table">T{o.table || "?"}</div>
                    <div className="sa-ticket__meta">#{o.id}<br /><span className={`sa-timer${late ? " sa-timer--late" : ""}`}>{minutesAgo(o.updatedAt)}</span></div>
                  </div>
                  <ul className="sa-ticket__lines">{o.items.map((i: any, k: number) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: read-only list of order lines (the same dish can appear twice), never reordered
                    <li key={k}><b>{i.qty}×</b><span>{i.name} <LineFlag flag={i.flag} /></span></li>
                  ))}</ul>
                  {o.allergy && <AllergyBanner allergen={o.allergy} note="Staff confirmed with the diner. Check before cooking." />}
                  <button type="button" className={`sa-btn sa-btn--lg sa-btn--block ${key === "new" ? "sa-btn--staff" : "sa-btn--ok"}`} onClick={() => act(o.id, next)}>{key !== "new" && <Icon name="check" />}{btn}</button>
                </article>
              </SwipeCard>); })}
          </div>
        ))}
        <div className="sa-plate sold-panel">
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>Sold out today</h2>
          <p className="muted" style={{ fontSize: 14, margin: "0 0 8px" }}>Switch a dish on when the kitchen runs out. Diners and the AI stop offering it at once.</p>
          <SoldOutList dishes={d.dishes} onToggle={(x) => toggle(x.id, !x.available)} />
        </div>
      </div>
    </div>
  );
}
