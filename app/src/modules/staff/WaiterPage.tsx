"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import SwipeCard from "@/modules/staff/SwipeCard";
import { beep } from "@/modules/staff/beep";
import { api, usePoll, minutesAgo } from "@/modules/platform/client";
import { ALLERGEN_LABEL } from "@/modules/platform/constants";

const KIND: Record<string, string> = { bill: "Bill, please", help: "Needs help at the table", other: "Needs the staff" };
type Bill = { table: string; lines: { name: string; qty: number; price: number }[]; total: number; pending: { name: string; qty: number; price: number }[]; inKitchen: number; asked: boolean };
type Floor = { me: { name: string; role: string }; calls: any[]; picks: any[]; active: any[]; bills: Bill[]; soldOut: any[]; dishes: any[] };

export default function Waiter() {
  const router = useRouter();
  const [d, setD] = useState<Floor | null>(null);
  const [tab, setTab] = useState<"feed" | "bills" | "tables">("feed");
  const [dishesOpen, setDishesOpen] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // A chef's login lands them on /staff/chef, but nothing stops a stale tab or a typed
  // URL from opening this waiter-only page while their session is actually "chef" - the
  // action buttons below would then always 403 (they're role-gated server-side). Catch
  // that here and send them to the page that matches who they actually are.
  const load = () => api<Floor>("/api/staff/floor").then((x) => {
    if (x.me.role !== "waiter") { router.push("/staff/chef"); return; }
    setD(x); setErr(""); setLastUpdated(new Date());
  }).catch((e) => { if (e.status === 401) router.push("/staff"); else setErr(e.message); });
  usePoll(load, 3000);
    const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!d) return;
    const ids = [...d.calls.map((c) => `call-${c.id}`), ...d.picks.map((o) => `pick-${o.id}`)];
    if (seen.current && ids.some((id) => !seen.current!.has(id))) beep();
    seen.current = new Set(ids);
  }, [d]);
  const act = async (path: string, body?: any) => { try { await api(path, { body: body ?? {} }); } catch (e: any) { setErr(e.message); } load(); };
  const logout = async () => { await api("/api/auth/logout", { body: {} }); router.push("/staff"); };
  if (!d) return <div className="sa-app" data-theme="night" style={{ padding: 40 }}>{err || "Loading…"}</div>;

  const ready = d.active.filter((o) => o.status === "ready");
  // One priority-sorted feed instead of separate Calls/Picks/Ready tabs: a call could sit
  // unnoticed while the staff member is looking at Picks. Calls come first (someone is waiting
  // right now), then new picks, then food that's ready to serve - nothing to navigate to,
  // it's just "everything that needs me," in the order it needs me.
  const feedCount = d.calls.length + d.picks.length + ready.length;
  const tabs = [["feed", `Feed · ${feedCount}`], ["bills", `Bills · ${d.bills.length}`], ["tables", "Tables"]] as const;
  const billOf = (n: string) => d.bills.find((b) => b.table === n);
  const tableState = (n: string) => d.calls.some((c) => c.table === n) ? "calling" : d.picks.some((o) => o.table === n) ? "picks" : d.active.some((o) => o.table === n) ? "kitchen" : "free";
  const STATE_WORD: Record<string, string> = { calling: "Calling", picks: "Picks", kitchen: "Kitchen", free: "Free" };
  // Call slips hang in longest-wait-first order, and turn urgent (cherry band + flag) after 5 minutes.
  const waited = (at: string) => Math.round((Date.now() - new Date(at).getTime()) / 60000);
  const calls = [...d.calls].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="sa-app" data-theme="night">
      <div className="staff-wrap">
        <div className="staff-head">
          <div><h1>Floor</h1><div className="staff-head__meta">Floor staff · {d.me.name}</div></div>
          <div className="row" style={{ gap: 8 }}>
            {/* Freshness disclosure: the interval (3s) is fine, but staff need to know if what
                they're looking at is live, stale, or the connection dropped - not just a bare dot. */}
            <div className="staff-live" role="status">
              <span className={`sa-status ${err ? "sa-status--offline" : "sa-status--live"}`}>{err ? (lastUpdated ? "Reconnecting" : "Offline") : "Live"}</span>
              {lastUpdated && <span>{lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
            <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={logout} aria-label="Sign out"><Icon name="logout" /></button>
          </div>
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="sa-tabs staff-tabs">{tabs.map(([k, l]) => <button type="button" key={k} className="sa-tab" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>

        {tab === "feed" && feedCount === 0 && <Empty text="Nothing needs you right now." />}
        {tab === "feed" && calls.length > 0 && (
          <div className="sa-rail">
            {calls.map((c) => {
              const mins = waited(c.createdAt); const long = mins >= 5;
              // A "bill, please" call IS that table's bill: settling it marks the bill paid and
              // closes the call together, so one table never ends up with two separate bills.
              const b = c.kind === "bill" ? billOf(c.table) : undefined;
              const resolve = () => (b ? act(`/api/staff/bills/${encodeURIComponent(c.table)}`) : act(`/api/staff/calls/${c.id}`));
              return (
              <SwipeCard key={`call-${c.id}`} onSwipeRight={resolve} rightLabel={b ? "Mark paid" : "Done"}>
                <div className={`sa-call${long ? " sa-call--urgent" : ""}`}>
                  <div className="sa-call__table"><small>Table</small><b>{c.table || "?"}</b></div>
                  <div><p className="sa-call__why">{(KIND[c.kind] || KIND.other).toUpperCase()}{b && <> · ฿{b.total}</>}</p><p className={`sa-call__wait${long ? " sa-call__wait--long" : ""}`}>{mins < 1 ? "Just called" : `Waiting ${mins} min`}</p></div>
                  <button type="button" className="sa-btn sa-btn--ok sa-btn--sm" onClick={resolve}><Icon name="check" />{b ? "Mark paid" : "Done"}</button>
                </div>
              </SwipeCard>); })}
          </div>
        )}
        {tab === "feed" && d.picks.map((o) => (
          <SwipeCard key={`pick-${o.id}`} onSwipeRight={() => act(`/api/staff/orders/${o.id}`, { action: "take" })} onSwipeLeft={() => act(`/api/staff/orders/${o.id}`, { action: "later" })} rightLabel="Take order" leftLabel="Dismiss">
            <article className="sa-ticket">
              <div className="sa-ticket__head"><div className="sa-ticket__table">T{o.table || "?"}</div><div className="sa-ticket__meta">{{ en: "English", th: "Thai", my: "Burmese" }[o.lang as string]} · {minutesAgo(o.createdAt)}<br /><span className="sa-status sa-status--new">Picks</span></div></div>
              <ul className="sa-ticket__lines">{o.items.map((i: any, k: number) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: read-only list of order lines (the same dish can appear twice), never reordered
                <li key={k}><b>{i.qty}×</b><span>{i.name} <LineFlag flag={i.flag} /></span><span className="sa-ticket__price">฿{i.price * i.qty}</span></li>
              ))}</ul>
              {o.allergy && <AllergyBanner allergen={o.allergy} note="Confirm with the kitchen before ordering." />}
              <div className="sa-ticket__actions">
                <button type="button" className="sa-btn sa-btn--staff" onClick={() => act(`/api/staff/orders/${o.id}`, { action: "take" })}>Take order</button>
                <button type="button" className="sa-btn sa-btn--quiet" onClick={() => act(`/api/staff/orders/${o.id}`, { action: "later" })}>Dismiss</button>
              </div>
            </article>
          </SwipeCard>
        ))}
        {tab === "feed" && ready.map((o) => (
          <SwipeCard key={`ready-${o.id}`} onSwipeRight={() => act(`/api/staff/orders/${o.id}`, { action: "served" })} rightLabel="Served">
            <article className="sa-ticket sa-ticket--ready">
              <div className="sa-ticket__head"><div className="sa-ticket__table">T{o.table || "?"}</div><div className="sa-ticket__meta">#{o.id}<br /><span className="sa-status sa-status--ready">Ready</span></div></div>
              <ul className="sa-ticket__lines">{o.items.map((i: any, k: number) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: read-only list of order lines (the same dish can appear twice), never reordered
                <li key={k}><b>{i.qty}×</b><span>{i.name} <LineFlag flag={i.flag} /></span></li>
              ))}</ul>
              <button type="button" className="sa-btn sa-btn--ok sa-btn--block" onClick={() => act(`/api/staff/orders/${o.id}`, { action: "served" })}><Icon name="check" />Served</button>
            </article>
          </SwipeCard>
        ))}

        {tab === "bills" && d.bills.length === 0 && <Empty text="No open bills." />}
        {tab === "bills" && d.bills.map((b) => (
          <article key={b.table} className={`sa-ticket${b.asked ? " sa-ticket--cooking" : ""}`}>
            <div className="sa-ticket__head">
              <div className="sa-ticket__table">T{b.table || "?"}</div>
              <div className="sa-ticket__meta">{b.asked && <><span className="sa-status sa-status--cooking">Bill asked</span><br /></>}To pay<br /><span className="sa-price">฿ {b.total}</span></div>
            </div>
            <ul className="sa-ticket__lines">{b.lines.map((l) => <li key={`${l.name}|${l.price}`}><b>{l.qty}×</b><span>{l.name}</span><span className="sa-ticket__price">฿{l.qty * l.price}</span></li>)}</ul>
            {b.inKitchen > 0 && <p className="staff-head__meta" style={{ margin: "0 0 12px" }}>{b.inKitchen} {b.inKitchen === 1 ? "dish is" : "dishes are"} not served yet.</p>}
            {b.pending.length > 0 && <p className="staff-head__meta" style={{ margin: "0 0 12px" }}>Not in the total: picks waiting in the feed ({b.pending.reduce((s, l) => s + l.qty, 0)} dishes).</p>}
            <button type="button" className="sa-btn sa-btn--ok sa-btn--block" onClick={() => act(`/api/staff/bills/${encodeURIComponent(b.table)}`)}><Icon name="check" />Mark paid · ฿ {b.total}</button>
          </article>
        ))}

        {tab === "tables" && (
          <div className="sa-floor">
            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => { const s = tableState(n); return (
              <div key={n} className={`sa-table sa-table--${s} sa-table-static`} role="img" aria-label={`Table ${n}, ${STATE_WORD[s]}${billOf(n) ? `, owes ฿${billOf(n)!.total}` : ""}`}>{n}<small>{STATE_WORD[s]}</small>{billOf(n) && <small>฿{billOf(n)!.total}</small>}</div>); })}
          </div>)}
      </div>

      {/* Commercial POS/KDS products (Toast, Square, Checkmate) put the 86 switch directly on the
          item row with no intermediate screen. This expands inline from the summary bar instead of
          opening a separate modal, so marking a dish sold out is one tap plus the toggle, not a
          navigation step - important since touch accuracy drops for staff moving around the floor. */}
      <div className="sold-dock">
        {dishesOpen && (
          <div className="sold-dock__panel">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span className="sa-label">Sold out today</span>
              <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={() => setDishesOpen(false)} aria-label="Close"><Icon name="close" size={16} /></button>
            </div>
            <SoldOutList dishes={d.dishes} onToggle={(x) => act(`/api/staff/items/${x.id}`, { available: !x.available })} />
          </div>
        )}
        <div className="sold-dock__bar">
          <div style={{ flex: 1, minWidth: 0 }}><div className="sa-label">Sold out now · {d.soldOut.length}</div><div className="sa-ticket-font" style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.soldOut.map((s) => s.name).join(", ") || "Nothing"}</div></div>
          <button type="button" className="sa-btn sa-btn--sm" aria-expanded={dishesOpen} onClick={() => setDishesOpen((v) => !v)}>{dishesOpen ? "Close" : "Manage"}</button>
        </div>
      </div>
    </div>
  );
}
const Empty = ({ text }: { text: string }) => <div className="sa-plate sa-empty">{text}</div>;

// A dish line that clashes with the diner's allergy profile: the allergens the dish lists, or "unknown" when the dish has no allergen data.
export function LineFlag({ flag }: { flag?: string }) {
  if (!flag) return null;
  const text = flag === "unknown" ? "Allergen data missing" : flag.split(",").map((a) => ALLERGEN_LABEL[a] || a).join(", ");
  return <span className="sa-tag sa-tag--alert" title="Clashes with the diner's allergy profile">⚠ {text}</span>;
}

// The design system's allergy banner: caution-sign yellow, the allergen in big type. Never dismissible.
export function AllergyBanner({ allergen, note }: { allergen: string; note: string }) {
  return (
    <div className="sa-allergy" role="alert">
      <span className="sa-allergy__sign" aria-hidden="true"><span>!</span></span>
      <div className="sa-allergy__txt"><span className="sa-allergy__kicker">Allergy</span><strong>{allergen.charAt(0).toUpperCase() + allergen.slice(1)}</strong><span>{note}</span></div>
    </div>
  );
}

// Sold-out switches: on (cherry) means the dish is sold out today, as the label says.
export function SoldOutList({ dishes, onToggle }: { dishes: { id: number; name: string; available: number | boolean }[]; onToggle: (d: { id: number; available: number | boolean }) => void }) {
  return (
    <div className="sold-list">
      {dishes.map((x) => (
        <label key={x.id} className="sa-switch">
          <input type="checkbox" checked={!x.available} onChange={() => onToggle(x)} aria-label={`${x.name}: sold out today`} />
          <span className="sa-switch__track" />
          <span style={{ flex: 1 }}>{x.name}</span>
        </label>
      ))}
    </div>
  );
}
