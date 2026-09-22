"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/modules/platform/Icon";
import { api } from "@/modules/platform/client";
import { tr, priceLabel, chatLineHeight } from "@/modules/diner/i18n";
import type { Item, Category, Lang } from "@/modules/platform/menu";

type Menu = { restaurant: { name: string; city: string; currency: string; hours: any; persona: { name: string; gender: string; greeting: string } }; categories: Category[]; items: Item[]; specials: { id: number; title: string; text: string }[] };
type Msg = { id: string; role: "user" | "assistant"; text: string; dishes?: Item[]; topic?: string; messageId?: number; rated?: number; answered?: boolean };
type Pick = { id: number; qty: number };

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function Diner({ slug }: { slug: string }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [table, setTable] = useState("");
  const [cat, setCat] = useState<number | 0>(0);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ veg: false, noPeanut: false, u100: false, spicy: false });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(f).filter(Boolean).length;
  const [picks, setPicks] = useState<Pick[]>([]);
  const [detail, setDetail] = useState<Item | null>(null);
  const [picksOpen, setPicksOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sessionId, setSessionId] = useState(() => uid());
  // Chat history lives here, one level up from the Chat component, so closing the chat sheet
  // (chatOpen -> false) unmounts Chat but does not lose the conversation: reopening it remounts
  // Chat with these same messages passed back in as a prop.
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const t = (k: string) => tr(lang, k);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  // first load: language, table, cached menu, picks
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    setTable(sp.get("t") || "");
    const saved = localStorage.getItem("lang") as Lang | null;
    const nav = navigator.language.toLowerCase();
    setLang(saved && ["en", "th", "my"].includes(saved) ? saved : nav.startsWith("th") ? "th" : nav.startsWith("my") ? "my" : "en");
    try { setPicks(JSON.parse(localStorage.getItem(`picks:${slug}`) || "[]")); } catch {}
    // Reuse the same session (and its history) across visits to this restaurant on this phone,
    // the same way picks and the chosen language already are, instead of starting a fresh session
    // (and an empty chat) on every page load.
    const savedSession = localStorage.getItem(`chat-session:${slug}`);
    if (savedSession) setSessionId(savedSession); else localStorage.setItem(`chat-session:${slug}`, sessionId);
    try { setMsgs(JSON.parse(localStorage.getItem(`chat:${slug}`) || "[]")); } catch {}
    api<Menu>(`/api/public/${slug}/menu?open=1`)
      .then((m) => { setMenu(m); localStorage.setItem(`menu:${slug}`, JSON.stringify(m)); })
      .catch((e) => {
        const cached = localStorage.getItem(`menu:${slug}`);
        if (cached) { setMenu(JSON.parse(cached)); setOffline(true); } else setError(e.message);
      });
  }, [slug]);
  useEffect(() => { localStorage.setItem(`picks:${slug}`, JSON.stringify(picks)); }, [picks, slug]);
  // Skip writing an empty array: on first mount msgs starts empty for one tick before the load
  // effect above restores any cached history, and writing here first would erase that history.
  useEffect(() => { if (msgs.length) localStorage.setItem(`chat:${slug}`, JSON.stringify(msgs)); }, [msgs, slug]);
  // WCAG 3.1.1: the page's language attribute must match what is actually on screen, not just React state.
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // keep sold-out state fresh
  useEffect(() => {
    const i = setInterval(() => { if (!document.hidden) api<Menu>(`/api/public/${slug}/menu`).then((m) => { setMenu(m); setOffline(false); }).catch(() => {}); }, 20000);
    return () => clearInterval(i);
  }, [slug]);

  const chooseLang = (l: Lang) => { setLang(l); localStorage.setItem("lang", l); };
  const nm = (i: Item) => i.name[lang] || i.name.en;
  const byId = useMemo(() => new Map((menu?.items || []).map((i) => [i.id, i])), [menu]);

  const shown = useMemo(() => {
    if (!menu) return [];
    const needle = q.trim().toLowerCase();
    return menu.items.filter((i) =>
      (!cat || i.category_id === cat) &&
      (!needle || Object.values(i.name).some((n) => n.toLowerCase().includes(needle))) &&
      (!f.veg || i.tags.includes("vegetarian") || i.tags.includes("vegan")) &&
      (!f.noPeanut || (i.allergens !== null && !i.allergens.includes("peanut"))) &&
      (!f.u100 || i.price < 100) && (!f.spicy || i.tags.includes("spicy")));
  }, [menu, cat, q, f]);

  const addPick = (id: number, qty = 1) => setPicks((p) => (p.some((x) => x.id === id) ? p.map((x) => (x.id === id ? { ...x, qty: Math.min(20, x.qty + qty) } : x)) : [...p, { id, qty }]));
  const removePick = (id: number) => setPicks((p) => p.filter((x) => x.id !== id));
  const valid = picks.filter((p) => byId.get(p.id)?.available);
  const total = valid.reduce((s, p) => s + p.qty, 0);

  async function callStaff() {
    try { await api(`/api/public/${slug}/calls`, { body: { table, kind: "help" } }); say(t("staffCalled")); } catch (e: any) { say(e.message); }
  }
  async function sendPicks() {
    try {
      await api(`/api/public/${slug}/orders`, { body: { table, lang, sessionId, items: valid } });
      setPicks([]); say(t("sent"));
    } catch (e: any) { say(e.message); }
  }

  if (error) return <div className="aurora-d"><div className="diner"><div className="gd r-xl" style={{ padding: 24, marginTop: 40 }}><h2>Menu not found</h2><p className="soft-d">{error}</p></div></div></div>;
  if (!menu) return <div className="aurora-d"><div className="diner" style={{ paddingTop: 80, textAlign: "center" }}><div className="dots"><span /><span /><span /></div></div></div>;

  return (
    <div className="aurora-d">
      <div className="diner">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 600 }}>{menu.restaurant.name.replace(/ Kitchen$/, "")}</h1>
            <div className="soft-d eyebrow" style={{ marginTop: 4 }}>{menu.restaurant.name.endsWith("Kitchen") ? `${t("kitchen")} · ` : ""}{menu.restaurant.city}{table ? ` · ${t("table")} ${table}` : ""}</div>
          </div>
          <div className="gd" style={{ borderRadius: 999, padding: 4, display: "flex" }} role="group" aria-label="Language">
            {(["th", "my", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => chooseLang(l)} aria-pressed={lang === l} style={{ width: 44, height: 36, border: 0, borderRadius: 999, background: lang === l ? "#fff" : "transparent", color: lang === l ? "#0e1030" : "#fff", font: "700 12px var(--font-b)" }}>{l.toUpperCase()}</button>
            ))}
          </div>
        </header>
        {offline && <div className="gd r-m soft-d" style={{ marginTop: 12, padding: "8px 14px", fontSize: 13 }}>{t("offline")}</div>}

        <div className="gd row" style={{ marginTop: 16, height: 52, padding: "0 18px", borderRadius: 26, gap: 10 }}>
          <Icon name="search" />
          <input aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "#fff", padding: 0 }} />
        </div>
        {/* Category access stays reachable while scrolling a long menu; the less-used dietary filters
            collapse behind a toggle so they don't permanently take up space on a 390px phone. */}
        <div style={{ position: "sticky", top: 0, zIndex: 5, margin: "0 -16px", padding: "10px 16px 4px", background: "linear-gradient(to bottom, rgba(14,16,48,.96) 75%, rgba(14,16,48,.75))", backdropFilter: "blur(6px)" }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            <button className={`pill ${!cat ? "on" : ""}`} onClick={() => setCat(0)}>{t("all")}</button>
            {menu.categories.map((c) => <button key={c.id} className={`pill ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.name[lang]}</button>)}
            <button className={`pill ${filtersOpen ? "on" : ""}`} aria-expanded={filtersOpen} aria-controls="diner-filters" onClick={() => setFiltersOpen((v) => !v)}>
              <Icon name="filter" size={14} />{t("filters")}{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </button>
          </div>
          {filtersOpen && (
            <div id="diner-filters" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0 2px" }}>
              {([["veg", "vegetarian"], ["noPeanut", "noPeanuts"], ["u100", "under100"], ["spicy", "spicy"]] as const).map(([k, label]) => (
                <button key={k} className={`pill ${f[k] ? "on" : ""}`} aria-pressed={f[k]} onClick={() => setF({ ...f, [k]: !f[k] })}>{t(label)}</button>
              ))}
            </div>
          )}
        </div>

        {menu.specials.length > 0 && <div className="gd r-l" style={{ padding: "12px 16px", marginBottom: 12 }}><div className="eyebrow chip-y" style={{ color: "var(--gold)" }}>{t("specials")}</div><div style={{ fontWeight: 700 }}>{menu.specials[0].title}</div>{menu.specials[0].text && <div className="soft-d">{menu.specials[0].text}</div>}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.length === 0 && <div className="gd r-l soft-d" style={{ padding: 20, textAlign: "center" }}>{t("none")}</div>}
          {shown.map((i) => <DishCard key={i.id} item={i} lang={lang} onOpen={() => setDetail(i)} onAdd={() => { addPick(i.id); say(`${t("added")}: ${nm(i)}`); }} t={t} />)}
        </div>
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: "100%", maxWidth: 480, padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 10, pointerEvents: "auto" }}>
          {total > 0 && (
            <div className="gd r-xl" style={{ padding: "10px 12px 10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setPicksOpen(true)} style={{ flex: 1, textAlign: "left", background: "transparent", border: 0, color: "#fff", padding: 0 }}>
                <div className="eyebrow soft-d">{t("myPicks")} · {total} {total === 1 ? t("dish") : t("dishes")}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{valid.map((p) => `${p.qty > 1 ? p.qty + "× " : ""}${nm(byId.get(p.id)!)}`).join(", ").slice(0, 60)}</div>
              </button>
              <button className="btn btn-w" onClick={sendPicks}>{t("showToWaiter")}</button>
            </div>
          )}
          <div className="gd" style={{ borderRadius: 36, height: 72, display: "flex", alignItems: "center", gap: 10, padding: "0 10px" }}>
            <button className="btn btn-w" style={{ flex: 1, height: 52, borderRadius: 26, fontSize: 15 }} onClick={() => setChatOpen(true)}><Icon name="chat" />{t("askWaiter")}</button>
            <button className="btn btn-o btn-icon" style={{ width: 52, height: 52, minHeight: 52 }} aria-label={t("callStaff")} onClick={callStaff}><Icon name="bell" size={22} /></button>
          </div>
        </div>
      </div>

      {detail && <Detail item={detail} lang={lang} t={t} onClose={() => setDetail(null)} onAdd={() => { addPick(detail.id); say(`${t("added")}: ${nm(detail)}`); setDetail(null); }} onAsk={() => { setDetail(null); setChatOpen(true); setTimeout(() => window.dispatchEvent(new CustomEvent("ask", { detail: `${nm(detail)}?` })), 50); }} />}
      {chatOpen && <Chat slug={slug} table={table} lang={lang} sessionId={sessionId} menu={menu} t={t} onClose={() => setChatOpen(false)} addPick={addPick} say={say} picksCount={total} sendPicks={sendPicks} callStaff={() => callStaff()} msgs={msgs} setMsgs={setMsgs} />}
      {picksOpen && (
        <div className="modal-back" style={{ alignItems: "flex-end" }} onClick={() => setPicksOpen(false)}>
          <div className="gd r-xl" role="dialog" aria-label={t("myPicks")} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, padding: 20, background: "rgba(30,26,90,.88)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 24 }}>{t("myPicks")}</h2><button className="btn btn-o btn-icon" onClick={() => setPicksOpen(false)} aria-label={t("close")}><Icon name="close" /></button></div>
            {valid.length === 0 && <div className="soft-d">{t("picksEmpty")}</div>}
            {valid.map((p) => { const it = byId.get(p.id)!; return (
              <div key={p.id} className="row" style={{ gap: 10 }}>
                <div style={{ flex: 1, fontWeight: 600 }}>{nm(it)}<div className="soft-d" style={{ fontWeight: 400 }}>{priceLabel(lang, it.price)}</div></div>
                <button className="btn btn-o btn-icon btn-sm" aria-label="-" onClick={() => setPicks((x) => x.map((y) => (y.id === p.id ? { ...y, qty: Math.max(1, y.qty - 1) } : y)))}>−</button>
                <b style={{ width: 20, textAlign: "center" }}>{p.qty}</b>
                <button className="btn btn-o btn-icon btn-sm" aria-label="+" onClick={() => addPick(p.id)}>+</button>
                <button className="btn btn-o btn-icon btn-sm" aria-label={t("remove")} onClick={() => removePick(p.id)}><Icon name="trash" size={16} /></button>
              </div>); })}
            {valid.length > 0 && <button className="btn btn-w" onClick={() => { setPicksOpen(false); sendPicks(); }}>{t("showToWaiter")}</button>}
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function AllergenChips({ item, t, max = 3 }: { item: Item; t: (k: string) => string; max?: number }) {
  if (item.allergens === null) return <span className="chip chip-y">{t("allergenUnknown")}</span>;
  return <>{item.allergens.slice(0, max).map((a) => <span key={a} className="chip">{a.replace("_", " ")}</span>)}</>;
}

function DishCard({ item, lang, onOpen, onAdd, t }: { item: Item; lang: Lang; onOpen: () => void; onAdd: () => void; t: (k: string) => string }) {
  const nm = item.name[lang] || item.name.en;
  const other = (["th", "my"] as Lang[]).filter((l) => l !== lang).map((l) => item.name[l]).filter((n) => n && n !== nm);
  return (
    <div className="gd" style={{ borderRadius: 22, padding: 12, display: "flex", gap: 12 }}>
      <button onClick={onOpen} aria-label={nm} style={{ display: "flex", gap: 12, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, color: "inherit", padding: 0 }}>
        {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: 84, height: 96, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} /> : <div className="photo photo-d" style={{ width: 84, height: 96, borderRadius: 14 }}>PHOTO</div>}
        <div style={{ opacity: item.available ? 1 : 0.55, display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <div style={{ font: "600 16px var(--font-h)", lineHeight: 1.25 }}>{nm}</div>
            <div style={{ font: "600 17px var(--font-h)", color: "var(--gold)", whiteSpace: "nowrap" }}>{priceLabel(lang, item.price)}</div>
          </div>
          <div className="soft-d" style={{ fontSize: 12, lineHeight: 1.7 }}>{other.join(" · ")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            {!item.available && <span className="chip chip-r">{t("soldOut")}</span>}
            {item.tags.filter((x) => x === "vegan" || x === "vegetarian" || x === "spicy").slice(0, 2).map((x) => <span key={x} className="chip chip-g">{x}</span>)}
            <AllergenChips item={item} t={t} />
          </div>
        </div>
      </button>
      {item.available && <button className="btn btn-o btn-icon" style={{ alignSelf: "flex-end" }} onClick={onAdd} aria-label={`${t("add")} ${nm}`}><Icon name="plus" /></button>}
    </div>
  );
}

function Detail({ item, lang, t, onClose, onAdd, onAsk }: { item: Item; lang: Lang; t: (k: string) => string; onClose: () => void; onAdd: () => void; onAsk: () => void }) {
  const nm = item.name[lang] || item.name.en;
  return (
    <div className="modal-back" onClick={onClose} style={{ alignItems: "flex-end" }}>
      <div className="gd r-xl" role="dialog" aria-label={nm} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, padding: 20, background: "rgba(30,26,90,.85)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><h2 style={{ fontSize: 26 }}>{nm}</h2><div style={{ font: "600 20px var(--font-h)", color: "var(--gold)", marginTop: 4 }}>{priceLabel(lang, item.price)}</div></div>
          <button className="btn btn-o btn-icon" onClick={onClose} aria-label={t("close")}><Icon name="close" /></button>
        </div>
        {item.photo_url && <img src={item.photo_url} alt="" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 16 }} />}
        {item.desc[lang] && <p style={{ margin: 0 }} className="soft-d">{item.desc[lang]}</p>}
        <div><div className="eyebrow soft-d" style={{ marginBottom: 6 }}>{t("allergens")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{item.allergens && item.allergens.length === 0 ? <span className="chip">{t("allergenNone")}</span> : <AllergenChips item={item} t={t} max={20} />}</div></div>
        {item.ingredients && <div><div className="eyebrow soft-d" style={{ marginBottom: 4 }}>{t("ingredients")}</div><div className="soft-d">{item.ingredients}</div></div>}
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {item.available ? <button className="btn btn-w" onClick={onAdd}><Icon name="plus" />{t("add")}</button> : <span className="chip chip-r">{t("soldOut")}</span>}
          <button className="btn btn-o" onClick={onAsk}><Icon name="chat" />{t("askAbout")}</button>
        </div>
      </div>
    </div>
  );
}

// After this many consecutive replies the AI could not answer from the restaurant's own data, the
// chat proactively offers to call staff instead of waiting for the diner to notice the bell icon.
const ESCALATE_AFTER_MISSES = 2;
const REASON_KEYS = { wrong: "reasonWrong", confused: "reasonConfused", allergen: "reasonAllergen" } as const;
// How many consecutive unanswered assistant replies sit at the end of the history right now - used
// to restore the escalation banner correctly when reopening a chat that already had misses in it,
// instead of always starting fresh and looking like the AI's earlier trouble was forgotten.
function trailingMisses(list: Msg[]): number {
  let n = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].role !== "assistant") continue;
    if (list[i].answered === false) n++; else break;
  }
  return n;
}

function Chat({ slug, table, lang, sessionId, menu, t, onClose, addPick, say, picksCount, sendPicks, callStaff, msgs, setMsgs }: any) {
  const persona = menu.restaurant.persona;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [missCount, setMissCount] = useState(() => trailingMisses(msgs));
  const [escalate, setEscalate] = useState(() => trailingMisses(msgs) >= ESCALATE_AFTER_MISSES);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  // Seed the greeting only the very first time this diner ever opens the chat; a reopen (or a
  // restored session from localStorage) already has messages and should not get a second greeting.
  useEffect(() => {
    if (msgs.length === 0) setMsgs([{ id: "hello", role: "assistant", text: persona.greeting || t("hello") }]);
  }, []);

  // W3C WAI-ARIA dialog pattern: move focus into the dialog on open, and back to whatever the diner
  // was on (the "Ask the waiter" button, a dish's "Ask about this dish" button, etc.) on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => previouslyFocused.current?.focus?.();
  }, []);
  function onDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, textarea, [tabindex]:not([tabindex="-1"])'));
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  async function send(message: string) {
    message = message.trim();
    if (!message || busy) return;
    setText(""); setReasonFor(null);
    setMsgs((m) => [...m, { id: uid(), role: "user", text: message }]);
    setBusy(true);
    try {
      const r = await api<any>(`/api/public/${slug}/chat`, { body: { message, sessionId, table, lang } });
      const answered = r.answered !== false;
      setMsgs((m) => [...m, { id: uid(), role: "assistant", text: r.reply, dishes: r.dishes, topic: r.action?.type === "show_dishes" ? "dishes" : undefined, messageId: r.messageId, answered }]);
      setMissCount((n) => { const next = answered ? 0 : n + 1; setEscalate(next >= ESCALATE_AFTER_MISSES); return next; });
      const a = r.action || {};
      if (a.type === "add_to_picks") (a.ids || []).forEach((id: number) => addPick(id, a.qty?.[id] || 1));
      if (a.type === "show_menu") setTimeout(onClose, 900);
      if (a.type === "call_staff") say(t("staffCalled"));
    } catch { setMsgs((m) => [...m, { id: uid(), role: "assistant", text: t("errorSend") }]); }
    setBusy(false);
  }
  useEffect(() => {
    const h = (e: any) => send(e.detail);
    window.addEventListener("ask", h);
    return () => window.removeEventListener("ask", h);
  });
  async function rateUp(m: Msg) {
    setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, rated: 1 } : y)));
    if (m.messageId) api(`/api/public/${slug}/feedback`, { body: { messageId: m.messageId, value: 1 } }).then(() => say(t("thanks"))).catch(() => {});
  }
  async function submitReason(m: Msg, reason: keyof typeof REASON_KEYS) {
    setReasonFor(null);
    setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, rated: -1 } : y)));
    if (m.messageId) api(`/api/public/${slug}/feedback`, { body: { messageId: m.messageId, value: -1, reason } }).then(() => say(t("thanks"))).catch(() => {});
  }
  const byId = new Map<number, Item>(menu.items.map((i: Item) => [i.id, i]));
  const last = msgs[msgs.length - 1];
  const lastQuestion = [...msgs].reverse().find((m) => m.role === "user")?.text.toLowerCase();
  const followUps = !busy && last?.role === "assistant" ? [t("chips1"), t("chips2"), t("chips3")].filter((c) => c.toLowerCase() !== lastQuestion) : [];

  return (
    <div className="chat-sheet aurora-d" onKeyDown={onDialogKeyDown}>
      <div className="chat-inner" ref={dialogRef} role="dialog" aria-modal="true" aria-label={persona.name || t("theWaiter")} tabIndex={-1}>
        <div style={{ padding: "14px 14px 0" }}>
          <div className="gd row" style={{ height: 68, borderRadius: 34, padding: "0 12px", gap: 12 }}>
            <button className="btn btn-o btn-icon" style={{ borderRadius: "50%" }} onClick={onClose} aria-label={t("back")}><Icon name="back" /></button>
            <div style={{ flex: 1 }}><div style={{ font: "600 19px var(--font-h)", lineHeight: 1.15 }}>{persona.name || t("theWaiter")}</div><div className="soft-d" style={{ fontSize: 12 }}>{t("askAny")}</div></div>
            <button className="btn btn-o btn-icon" style={{ borderRadius: "50%" }} onClick={callStaff} aria-label={t("callStaff")}><Icon name="bell" /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }} role="log" aria-live="polite" aria-atomic="false">
          {msgs.map((m) => (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div className={m.role === "user" ? "bubble-u" : "bubble-a gd"} style={{ lineHeight: chatLineHeight(lang) }}>{m.text}</div>
              {m.dishes && m.dishes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 330 }}>
                  {m.dishes.map((d) => { const cur = byId.get(d.id) || d; return (
                    <div key={d.id} className="gd row" style={{ borderRadius: 20, padding: 8, gap: 10 }}>
                      {cur.photo_url ? <img src={cur.photo_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover" }} /> : <div className="photo photo-d" style={{ width: 52, height: 52 }}>PHOTO</div>}
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "600 14px var(--font-h)", lineHeight: 1.3 }}>{cur.name[lang] || cur.name.en}</div><div style={{ font: "600 15px var(--font-h)", color: "var(--gold)" }}>{priceLabel(lang, cur.price)}</div></div>
                      <button className="btn btn-w btn-sm" style={{ minHeight: 44 }} onClick={() => { addPick(cur.id); say(`${t("added")}: ${cur.name[lang] || cur.name.en}`); }}><Icon name="plus" size={16} />{t("add")}</button>
                    </div>); })}
                </div>
              )}
              {m.role === "assistant" && m.messageId && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-o btn-icon btn-sm" style={{ width: 36, opacity: m.rated === 1 ? 1 : 0.6 }} aria-label={t("helpful")} aria-pressed={m.rated === 1} onClick={() => rateUp(m)}><Icon name="thumbUp" size={16} /></button>
                    <button className="btn btn-o btn-icon btn-sm" style={{ width: 36, opacity: m.rated === -1 ? 1 : 0.6 }} aria-label={t("notHelpful")} aria-pressed={m.rated === -1} onClick={() => setReasonFor(reasonFor === m.id ? null : m.id)}><Icon name="thumbDown" size={16} /></button>
                  </div>
                  {reasonFor === m.id && (
                    <div role="group" aria-label={t("reasonPrompt")} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(Object.keys(REASON_KEYS) as (keyof typeof REASON_KEYS)[]).map((r) => (
                        <button key={r} className="pill" style={{ minHeight: 32, fontSize: 12 }} onClick={() => submitReason(m, r)}>{t(REASON_KEYS[r])}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="bubble-a gd" role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="dots" aria-hidden="true"><span /><span /><span /></span>
              <span>{t("thinking")}</span>
            </div>
          )}
          {escalate && (
            <div className="gd r-l" role="status" aria-live="polite" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="alert" />
              <div style={{ flex: 1, fontSize: 14 }}>{t("escalate")}</div>
              <button className="btn btn-w btn-sm" onClick={() => { callStaff(); setEscalate(false); }}>{t("escalateCall")}</button>
            </div>
          )}
          {followUps.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {followUps.map((c) => <button key={c} className="pill" onClick={() => send(c)}>{c}</button>)}
            </div>
          )}
          <div ref={end} />
        </div>
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {picksCount > 0 && <button className="btn btn-w" onClick={() => { sendPicks(); }}>{t("myPicks")} · {picksCount} → {t("showToWaiter")}</button>}
          <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input className="in gd" style={{ borderRadius: 26, height: 52 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("typeQ")} aria-label={t("typeQ")} maxLength={500} />
            <button className="btn btn-v btn-icon" style={{ width: 52, height: 52, borderRadius: "50%" }} type="submit" aria-label="Send" disabled={busy || !text.trim()}><Icon name="send" size={22} /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
