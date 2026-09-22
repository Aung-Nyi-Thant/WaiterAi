"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import { api, usePoll, minutesAgo } from "@/modules/platform/client";

const KIND: Record<string, string> = { bill: "Bill, please", help: "Needs help at the table", other: "Needs the staff" };
type Floor = { me: { name: string; role: string }; calls: any[]; picks: any[]; active: any[]; soldOut: any[]; dishes: any[] };

export default function Waiter() {
  const router = useRouter();
  const [d, setD] = useState<Floor | null>(null);
  const [tab, setTab] = useState<"calls" | "picks" | "ready" | "tables">("calls");
  const [dishesOpen, setDishesOpen] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Nothing stops a signed-in chef from opening this page's URL directly - only the take/dismiss
  // actions were role-checked, so the page looked fully usable and then failed with a confusing 403.
  // Redirect to the screen that matches the session's actual role instead.
  const load = () => api<Floor>("/api/staff/floor").then((x) => { if (x.me.role !== "waiter") { router.push("/staff/chef"); return; } setD(x); setErr(""); setLastUpdated(new Date()); }).catch((e) => { if (e.status === 401) router.push("/staff"); else setErr(e.message); });
  usePoll(load, 3000);
  const act = async (path: string, body?: any) => { try { await api(path, { body: body ?? {} }); } catch (e: any) { setErr(e.message); } load(); };
  const logout = async () => { await api("/api/auth/logout", { body: {} }); router.push("/staff"); };
  if (!d) return <div className="aurora-d" style={{ padding: 40 }}>{err || "Loading…"}</div>;

  const ready = d.active.filter((o) => o.status === "ready");
  const tabs = [["calls", `Calls · ${d.calls.length}`], ["picks", `Picks · ${d.picks.length}`], ["ready", `Ready · ${ready.length}`], ["tables", "Tables"]] as const;
  const tableState = (n: string) => d.calls.some((c) => c.table === n) ? "call" : d.picks.some((o) => o.table === n) ? "picks" : d.active.some((o) => o.table === n) ? "active" : "free";
  const COLOR: any = { call: "#c62828", picks: "#b45309", active: "#1fa68a", free: "rgba(255,255,255,.14)" };

  return (
    <div className="aurora-d">
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 16px 110px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div><h1 style={{ fontSize: 30, fontWeight: 600 }}>Floor</h1><div className="eyebrow soft-d" style={{ marginTop: 4 }}>Waiter · {d.me.name}</div></div>
          <div className="row" style={{ gap: 8 }}>
            {/* Freshness disclosure: the interval (3s) is fine, but staff need to know if what
                they're looking at is live, stale, or the connection dropped - not just a bare dot. */}
            <div className="gd row" role="status" style={{ borderRadius: 999, padding: "8px 14px", gap: 8, font: "700 12px var(--font-b)" }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: err ? "#c62828" : "#3ddc97" }} />
              {err ? (lastUpdated ? "RECONNECTING…" : "OFFLINE") : "LIVE"}
              {lastUpdated && <span className="soft-d" style={{ fontWeight: 500 }}>· as of {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
            <button className="btn btn-o btn-icon" onClick={logout} aria-label="Sign out"><Icon name="logout" /></button>
          </div>
        </div>
        {err && <div className="err-d" role="alert">{err}</div>}
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>{tabs.map(([k, l]) => <button key={k} className={`pill ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>

        {tab === "calls" && (d.calls.length === 0 ? <Empty text="No one is calling." /> : d.calls.map((c) => (
          <div key={c.id} className="gd r-l row" style={{ padding: 12, gap: 12 }}>
            <div className="gd r-m" style={{ width: 52, height: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ font: "600 10px var(--font-b)", letterSpacing: ".1em" }}>TABLE</span><span style={{ font: "600 22px var(--font-h)", lineHeight: 1 }}>{c.table || "?"}</span></div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16 }}>{KIND[c.kind] || KIND.other}</div><div className="soft-d" style={{ fontSize: 13 }}>{minutesAgo(c.createdAt)}</div></div>
            <button className="btn btn-w" onClick={() => act(`/api/staff/calls/${c.id}`)}>Done</button>
          </div>)))}

        {tab === "picks" && (d.picks.length === 0 ? <Empty text="No picks waiting." /> : d.picks.map((o) => (
          <div key={o.id} className="gd r-l" style={{ padding: "12px 16px" }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}><div style={{ font: "600 22px var(--font-h)" }}>Table {o.table || "?"}</div><span className="chip">{{ en: "English", th: "Thai", my: "Burmese" }[o.lang as string]} · {minutesAgo(o.createdAt)}</span></div>
            {o.items.map((i: any, k: number) => <div key={k} className="row" style={{ justifyContent: "space-between", padding: "3px 0", fontWeight: 500 }}><span>{i.qty}× {i.name}</span><b>฿{i.price * i.qty}</b></div>)}
            {o.allergy && <div className="alert-banner" style={{ margin: "8px 0" }}><Icon name="alert" /><div>Diner asked about {o.allergy.toUpperCase()}.<br /><span style={{ fontWeight: 500 }}>Confirm with the kitchen before ordering.</span></div></div>}
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button className="btn btn-w" style={{ flex: 1 }} onClick={() => act(`/api/staff/orders/${o.id}`, { action: "take" })}>Take order</button>
              <button className="btn btn-o" onClick={() => act(`/api/staff/orders/${o.id}`, { action: "later" })}>Dismiss</button>
            </div>
          </div>)))}

        {tab === "ready" && (ready.length === 0 ? <Empty text="Nothing is ready to serve." /> : ready.map((o) => (
          <div key={o.id} className="gd r-l row" style={{ padding: 12, gap: 12 }}>
            <div style={{ flex: 1 }}><div style={{ font: "600 20px var(--font-h)" }}>Table {o.table || "?"}</div><div className="soft-d" style={{ fontSize: 13 }}>{o.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}</div></div>
            <button className="btn btn-w" onClick={() => act(`/api/staff/orders/${o.id}`, { action: "served" })}>Served</button>
          </div>)))}

        {tab === "tables" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => { const s = tableState(n); return (
              <div key={n} className="gd r-l" style={{ height: 76, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLOR[s] }}>
                <b style={{ font: "600 22px var(--font-h)" }}>{n}</b><span style={{ fontSize: 11, opacity: .9 }}>{{ call: "calling", picks: "picks", active: "in kitchen", free: "free" }[s]}</span>
              </div>); })}
          </div>)}
      </div>

      {/* Commercial POS/KDS products (Toast, Square, Checkmate) put the 86 switch directly on the
          item row with no intermediate screen. This expands inline from the summary bar instead of
          opening a separate modal, so marking a dish sold out is one tap plus the toggle, not a
          navigation step - important since touch accuracy drops for staff moving around the floor. */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 20 }}>
        {dishesOpen && (
          <div className="gd r-xl" style={{ width: "calc(100% - 28px)", maxWidth: 452, marginBottom: 8, maxHeight: "42dvh", overflowY: "auto", padding: "14px 16px" }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span className="eyebrow soft-d">Mark dishes sold out</span>
              <button className="btn btn-o btn-icon btn-sm" style={{ width: 32 }} onClick={() => setDishesOpen(false)} aria-label="Close">
                <Icon name="close" size={14} />
              </button>
            </div>
            {d.dishes.map((x) => (
              <div key={x.id} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.14)" }}>
                <span style={{ fontSize: 14 }}>{x.name}</span>
                <button className={`switch dark ${x.available ? "on" : ""}`} role="switch" aria-checked={!!x.available} aria-label={x.name} onClick={() => act(`/api/staff/items/${x.id}`, { available: !x.available })} />
              </div>
            ))}
          </div>
        )}
        <div className="gd" style={{ width: "calc(100% - 28px)", maxWidth: 452, marginBottom: 14, height: 68, borderRadius: 34, display: "flex", alignItems: "center", gap: 12, padding: "0 10px 0 22px" }}>
          <div style={{ flex: 1, minWidth: 0 }}><div className="eyebrow soft-d">Sold out now · {d.soldOut.length}</div><div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.soldOut.map((s) => s.name).join(", ") || "Nothing"}</div></div>
          <button className="btn btn-w" style={{ minHeight: 48 }} aria-expanded={dishesOpen} onClick={() => setDishesOpen((v) => !v)}>{dishesOpen ? "Close" : "Manage"}</button>
        </div>
      </div>
    </div>
  );
}
const Empty = ({ text }: { text: string }) => <div className="gd r-l soft-d" style={{ padding: 24, textAlign: "center" }}>{text}</div>;
