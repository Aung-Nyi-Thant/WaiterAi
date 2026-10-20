"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/modules/platform/Icon";
import DishPhoto from "@/modules/platform/DishPhoto";
import Presence from "@/modules/platform/Presence";
import { api, useEscape } from "@/modules/platform/client";
import { tr, priceLabel, chatLineHeight } from "@/modules/diner/i18n";
import { clash, filterMenu } from "@/modules/diner/filters";
import { allergensIn, ingredientList, splitIngredients } from "@/modules/platform/ingredients";
import type { Item, Category, Lang } from "@/modules/platform/menu";
import { ALLERGENS, allergenName, cleanProfile } from "@/modules/platform/constants";

type Menu = { restaurant: { name: string; city: string; currency: string; hours: any; persona: { name: string; gender: string; greeting: string } }; categories: Category[]; items: Item[]; specials: { id: number; title: string; text: string }[] };
type Msg = { id: string; role: "user" | "assistant"; text: string; lead?: string; ingredients?: string[]; dishes?: Item[]; topic?: string; messageId?: number; rated?: number; answered?: boolean };
type Pick = { id: number; qty: number };
type BillLine = { name: string; qty: number; price: number };
type Bill = { table: string; lines: BillLine[]; total: number; pending: BillLine[]; asked: boolean };

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
// The receipt code the SERVER issued with this phone's first picks for this table (not an account, no personal data). It lets the
// phone see its table's bill; the phone cannot make one up. "" until picks have been sent.
const receiptMemo = new Map<string, string>();
const receiptKey = (slug: string, table: string) => `receipt:${slug}:${table}`;
const getReceipt = (slug: string, table: string): string => {
  try { return localStorage.getItem(receiptKey(slug, table)) || ""; } catch { return receiptMemo.get(receiptKey(slug, table)) || ""; }
};
const saveReceipt = (slug: string, table: string, code: string) => {
  receiptMemo.set(receiptKey(slug, table), code);
  try { localStorage.setItem(receiptKey(slug, table), code); } catch {}
};

export default function Diner({ slug }: { slug: string }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [table, setTable] = useState("");
  const [cat, setCat] = useState<number | 0>(0);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ veg: false, noPeanut: false, u100: false, spicy: false, mine: false });
  // The allergy profile: chosen once, kept only on this phone, sent with every chat message and order.
  const [profile, setProfile] = useState<string[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => { try { setProfile(cleanProfile(JSON.parse(localStorage.getItem("allergyProfile") || "[]"))); } catch {} }, []);
  const changeProfile = (next: string[]) => { setProfile(next); try { localStorage.setItem("allergyProfile", JSON.stringify(next)); } catch {} if (!next.length) setF((x) => ({ ...x, mine: false })); };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(f).filter(Boolean).length;
  const [picks, setPicks] = useState<Pick[]>([]);
  const [detail, setDetail] = useState<Item | null>(null);
  const linkedDish = useRef(false);                       // an address with ?dish=<id> (the home page's dish strip) opens that dish once the menu is here
  const [picksOpen, setPicksOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState<{ m: string; warn: boolean } | null>(null);
  const [ringing, setRinging] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ table: string; items: { name: string; qty: number; price: number }[]; total: number } | null>(null);
  useEscape(() => setPicksOpen(false), picksOpen);
  useEscape(() => setBillOpen(false), billOpen);
  useEscape(() => setProfileOpen(false), profileOpen);
  useEscape(() => setConfirmedOrder(null), !!confirmedOrder);
  const [sessionId] = useState(() => uid());
  // The chat's messages live here, not in Chat: closing the chat unmounts Chat, and the conversation must still be there when it is reopened.
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const t = (k: string) => tr(lang, k);
  // One timer for the toast: a new message restarts it (the first message's timer used to cut the second one short), and leaving the page stops it.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const say = (m: string, warn = false) => { setToast({ m, warn }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600); };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const heroRef = useRef<HTMLDivElement>(null);
  // The chat now expands in place inside the hero card instead of covering the screen;
  // scroll it into view so it's visible no matter where the diner opened it from
  // (the hero card itself, a quick-ask chip, or a dish's "Ask about this dish" button).
  useEffect(() => { if (chatOpen) heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [chatOpen]);

  // The "AI cursor": when the assistant adds dishes to picks on its own, a small on-screen
  // cursor visibly scrolls to and "clicks" each dish's real Add button instead of the items
  // just silently appearing - makes the AI's actions legible, like watching a waiter work.
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean; clicking: boolean }>({ x: 0, y: 0, visible: false, clicking: false });
  async function aiAdd(ids: number[], qtyMap?: Record<number, number>) {
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    if (reduceMotion || !ids.length) { ids.forEach((id) => { addPick(id, qtyMap?.[id] || 1); }); return; }
    for (const id of ids) {
      const el = document.querySelector<HTMLElement>(`[data-add-btn="${id}"]`);
      if (!el) { addPick(id, qtyMap?.[id] || 1); continue; }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await wait(380);
      const r = el.getBoundingClientRect();
      // The cursor's own hotspot (the SVG's pointed tip) sits a few px in from the
      // element's top-left, not centered - offset the landing point to match.
      setCursor({ x: r.left + r.width * 0.35, y: r.top + r.height * 0.3, visible: true, clicking: false });
      await wait(560);
      setCursor((c) => ({ ...c, clicking: true }));
      el.classList.add("ai-target-flash");
      addPick(id, qtyMap?.[id] || 1);
      setTimeout(() => el.classList.remove("ai-target-flash"), 500);
      await wait(380);
      setCursor((c) => ({ ...c, clicking: false }));
    }
    await wait(300);
    setCursor((c) => ({ ...c, visible: false }));
  }

  // first load: language, table, cached menu, picks
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const paramTable = sp.get("t");
    if (paramTable) {
      setTable(paramTable);
      try { sessionStorage.setItem(`table:${slug}`, paramTable); } catch {}
    } else {
      try { setTable(sessionStorage.getItem(`table:${slug}`) || ""); } catch { setTable(""); }
    }
    const saved = localStorage.getItem("lang") as Lang | null;
    const nav = navigator.language.toLowerCase();
    setLang(saved && ["en", "th", "my"].includes(saved) ? saved : nav.startsWith("th") ? "th" : nav.startsWith("my") ? "my" : "en");
    try { setPicks(JSON.parse(localStorage.getItem(`picks:${slug}`) || "[]")); } catch {}
    api<Menu>(`/api/public/${slug}/menu?open=1`)
      .then((m) => { setMenu(m); localStorage.setItem(`menu:${slug}`, JSON.stringify(m)); })
      .catch((e) => {
        const cached = localStorage.getItem(`menu:${slug}`);
        if (cached) { setMenu(JSON.parse(cached)); setOffline(true); } else setError(e.message);
      });
  }, [slug]);
  useEffect(() => { localStorage.setItem(`picks:${slug}`, JSON.stringify(picks)); }, [picks, slug]);
  // WCAG 3.1.1: the page's language attribute must match what is actually on screen, not just React state.
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    if (!menu || linkedDish.current) return;
    linkedDish.current = true;
    const id = Number(new URLSearchParams(location.search).get("dish"));
    const it = id ? menu.items.find((x) => x.id === id) : undefined;
    if (it) setDetail(it);
  }, [menu]);

  // keep sold-out state fresh
  useEffect(() => {
    const i = setInterval(() => { if (!document.hidden) api<Menu>(`/api/public/${slug}/menu`).then((m) => { setMenu(m); setOffline(false); }).catch(() => {}); }, 10000);   // SRS FR-1/FR-4: a sold-out change shows within 20 s, so poll twice as often
    return () => clearInterval(i);
  }, [slug]);

  // The table's running bill: what everyone at this table has ordered and what it owes so far.
  // Only a phone that has sent picks from this table gets the bill: the server checks the receipt code
  // that was saved with those picks, so other tables' bills cannot be read by trying table numbers.
  const loadBill = () => {
    const receipt = table ? getReceipt(slug, table) : "";
    if (receipt) api<Bill>(`/api/public/${slug}/bill?t=${encodeURIComponent(table)}&r=${encodeURIComponent(receipt)}`).then(setBill).catch(() => {});
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: polling is set up once per table; loadBill is recreated on every render
  useEffect(() => {
    loadBill();
    const i = setInterval(() => { if (!document.hidden) loadBill(); }, 20000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, table]);

  const chooseLang = (l: Lang) => { setLang(l); localStorage.setItem("lang", l); };
  const nm = (i: Item) => i.name[lang] || i.name.en;
  const byId = useMemo(() => new Map((menu?.items || []).map((i) => [i.id, i])), [menu]);

  const shown = useMemo(() => {
    if (!menu) return [];
    return filterMenu(menu.items, { cat, q, f, profile });
  }, [menu, cat, q, f, profile]);

  const addPick = (id: number, qty = 1) => setPicks((p) => (p.some((x) => x.id === id) ? p.map((x) => (x.id === id ? { ...x, qty: Math.min(20, x.qty + qty) } : x)) : [...p, { id, qty }]));
  const removePick = (id: number) => setPicks((p) => p.filter((x) => x.id !== id));
  // "Added: X" and, when the dish lists one of the diner's allergens (or has no allergen data), a warning. The diner may still pick it.
  const addMsg = (i: Item): [string, boolean] => { const c = clash(i, profile); return [`${t("added")}: ${i.name[lang] || i.name.en}${c === "unknown" ? ` · ${t("allergenUnknown")}` : c ? ` · ${c.map((a) => allergenName(a, lang)).join(", ")} ${t("conflictToast")}` : ""}`, !!c]; };
  const valid = picks.filter((p) => byId.get(p.id)?.available);
  const total = valid.reduce((s, p) => s + p.qty, 0);

  async function callStaff() {
    setRinging(true); setTimeout(() => setRinging(false), 1000);
    try { await api(`/api/public/${slug}/calls`, { body: { table, kind: "help" } }); say(t("staffCalled")); } catch (e: any) { say(e.message); }
  }
  async function askForBill() {
    // Show the request straight away so a second tap can't send it again while the call is on its way.
    setBill((b) => (b ? { ...b, asked: true } : b));
    try { await api(`/api/public/${slug}/calls`, { body: { table, kind: "bill" } }); say(t("billAsked")); } catch (e: any) { say(e.message); }
    loadBill();
  }
  // Opens the chat and immediately asks it a question, reusing the same "ask" event
  // the dish Detail modal already dispatches for its "Ask about this dish" button.
  const askQuick = (question: string) => {
    setChatOpen(true);
    setTimeout(() => window.dispatchEvent(new CustomEvent("ask", { detail: question })), 50);
  };
  async function sendPicks() {
    try {
      const itemsSent = valid.map((p) => { const it = byId.get(p.id)!; return { name: nm(it), qty: p.qty, price: it.price * p.qty }; });
      const orderTotal = itemsSent.reduce((s, i) => s + i.price, 0);
      const sent = await api<{ receipt?: string }>(`/api/public/${slug}/orders`, { body: { table, lang, sessionId, receipt: getReceipt(slug, table), profile, items: valid } });
      if (sent.receipt) saveReceipt(slug, table, sent.receipt);
      setPicks([]);
      setPicksOpen(false);
      setConfirmedOrder({ table: table || "-", items: itemsSent, total: orderTotal });
      say(t("sent")); loadBill();
    } catch (e: any) { say(e.message); }
  }

  if (error) return <div className="sa-app"><div className="diner diner-pad" style={{ paddingTop: 48 }}><div className="sa-plate" style={{ padding: 24 }}><h2>Menu not found</h2><p className="muted">{error}</p></div></div></div>;
  if (!menu) return <div className="sa-app"><div className="diner" style={{ paddingTop: 80, textAlign: "center" }}><div className="dots"><span /><span /><span /></div></div></div>;

  const hasFilters = activeFilterCount > 0;
  const shownBill: Bill = bill ?? { table, lines: [], total: 0, pending: [], asked: false };
  return (
    <div className="sa-app">
      <div className="diner">
        <header className="sa-sign">
          <div className="sa-sign__row">
            <span className="sa-logo" aria-hidden="true">ShopAI</span>
            <div className="sa-sign__id">
              <h1 className="sa-sign__name">{menu.restaurant.name}</h1>
              <p className="sa-sign__meta">{[menu.restaurant.city, table ? `${t("table")} ${table}` : ""].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> would bring its default browser styling into the design */}
          <div className="sa-lang" role="group" aria-label="Language">
            {(["th", "my", "en"] as Lang[]).map((l) => <button type="button" key={l} onClick={() => chooseLang(l)} aria-pressed={lang === l}>{l.toUpperCase()}</button>)}
          </div>
        </header>

        <div className="diner-pad">
          {offline && <div className="sa-notice" role="status" style={{ marginTop: 16 }}><Icon name="wifiOff" size={22} /><span>{t("offline")}</span></div>}

          <div className="sa-plate hero-ai" ref={heroRef}>
            {chatOpen ? (
              <div className="hero-ai__head">
                <div className="sa-msg__who"><Icon name="sparkles" size={16} />{menu.restaurant.persona.name || t("theWaiter")}</div>
                <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" aria-label={t("close")} onClick={() => setChatOpen(false)}><Icon name="close" size={18} /></button>
              </div>
            ) : (
              <>
                <div className="hero-ai__kicker"><Icon name="sparkles" size={16} />{t("heroEyebrow")}</div>
                <button type="button" className="hero-ai__ask" onClick={() => setChatOpen(true)} aria-label={t("askWaiter")}>
                  <Icon name="sparkles" size={20} />
                  <span style={{ flex: 1 }}>{t("heroPlaceholder")}<span className="hero-cursor" aria-hidden="true" /></span>
                </button>
                <div className="hero-ai__chips">
                  {(profile.length ? ["heroChip1", "heroChip2", "chipMyAllergies"] : ["heroChip1", "heroChip2", "heroChip3"]).map((k) => <button type="button" key={k} className="sa-chip" onClick={() => askQuick(t(k))}>{t(k)}</button>)}
                </div>
              </>
            )}
            <div className={`hero-expand${chatOpen ? " open" : ""}`}>
              <div className="hero-expand-inner">
                {chatOpen && <Chat slug={slug} table={table} lang={lang} sessionId={sessionId} msgs={msgs} setMsgs={setMsgs} profile={profile} addMsg={addMsg} menu={menu} t={t} onClose={() => setChatOpen(false)} addPick={addPick} aiAdd={aiAdd} say={say} picksCount={total} sendPicks={sendPicks} callStaff={() => callStaff()} />}
              </div>
            </div>
          </div>

          <div className="diner-search" style={{ marginTop: 16 }}>
            <Icon name="search" />
            <input className="sa-input" aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} />
          </div>
          {profile.length > 0 && (
            <p className="sa-label" style={{ margin: "12px 0 0", display: "flex", alignItems: "center", gap: 6 }}><Icon name="alert" size={16} />{t("myAllergies")}: {profile.map((a) => allergenName(a, lang)).join(", ")}</p>
          )}
        </div>

        {/* Category access stays reachable while scrolling a long menu; the less-used dietary filters
            collapse behind a toggle so they don't permanently take up space on a 390px phone. */}
        <div className="diner-sticky">
          <nav className="sa-tabs" aria-label={t("all")}>
            <button type="button" className="sa-tab" aria-pressed={!cat} onClick={() => setCat(0)}>{t("all")}</button>
            {menu.categories.map((c) => <button type="button" key={c.id} className="sa-tab" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name[lang]}</button>)}
            <button type="button" className="sa-chip" aria-expanded={filtersOpen} aria-controls="diner-filters" aria-pressed={filtersOpen || hasFilters} onClick={() => setFiltersOpen((v) => !v)}>
              <Icon name="filter" size={16} />{t("filters")}{hasFilters ? ` · ${activeFilterCount}` : ""}
            </button>
          </nav>
          {filtersOpen && (
            <div id="diner-filters" className="diner-filters">
              {(["veg", "noPeanut", "u100", "spicy", ...(profile.length ? ["mine"] : [])] as (keyof typeof f)[]).map((k) => (
                <button type="button" key={k} className="sa-chip" aria-pressed={f[k]} onClick={() => setF({ ...f, [k]: !f[k] })}>{f[k] && <Icon name="check" size={16} />}{t({ veg: "vegetarian", noPeanut: "noPeanuts", u100: "under100", spicy: "spicy", mine: "mine" }[k])}</button>
              ))}
            </div>
          )}
        </div>

        <div className="diner-pad diner-list" style={{ paddingTop: 16 }}>
          {menu.specials.length > 0 && (
            <div className="sa-plate diner-special" style={{ padding: "12px 16px", background: "var(--mustard-soft)" }}>
              <div className="sa-flourish">{t("specials")}</div>
              <div className="sa-display" style={{ fontSize: 18, lineHeight: "24px" }}>{menu.specials[0].title}</div>
              {menu.specials[0].text && <div className="muted" style={{ fontSize: 14 }}>{menu.specials[0].text}</div>}
            </div>
          )}
          {shown.length === 0 && <div className="sa-plate sa-empty">{t("none")}</div>}
          {shown.map((i, n) => <DishCard key={i.id} n={n} item={i} lang={lang} profile={profile} onOpen={() => setDetail(i)} onAdd={() => { addPick(i.id); say(...addMsg(i)); }} t={t} />)}
        </div>
      </div>

      <div className="diner-dock">
        <div className="diner-dock__inner">
          {total > 0 && (
            <div className="picks-bar">
              <button type="button" className="sa-plain picks-bar__open" onClick={() => setPicksOpen(true)} aria-haspopup="dialog">
                <div className="sa-label">{t("myPicks")} · <span key={total} className="sa-bump">{total}</span> {total === 1 ? t("dish") : t("dishes")}</div>
                <div className="picks-bar__line">{valid.map((p) => `${p.qty > 1 ? p.qty + "× " : ""}${nm(byId.get(p.id)!)}`).join(", ")}</div>
              </button>
              <button type="button" className="sa-btn sa-btn--staff sa-btn--sm" onClick={sendPicks}><Icon name="send" />{t("showToWaiter")}</button>
            </div>
          )}
          {/* The navigation pill. The menu and the AI are views of this page; allergies and the bill open sheets; the bell calls the staff. */}
          <nav className="diner-nav" aria-label={t("navMenu")}>
            <button type="button" className={chatOpen ? "" : "on"} onClick={() => { setChatOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span><Icon name="menu" size={22} /></span><span className="nav-label">{t("navMenu")}</span></button>
            <button type="button" aria-haspopup="dialog" aria-label={profile.length ? `${t("myAllergies")}: ${profile.map((a) => allergenName(a, lang)).join(", ")}` : t("setAllergies")} onClick={() => setProfileOpen(true)}>
              <span><Icon name="alert" size={22} />{profile.length > 0 && <span className="nav-badge">{profile.length}</span>}</span><span className="nav-label">{t("navAllergy")}</span>
            </button>
            <button type="button" className={`nav-ai${chatOpen ? " on" : ""}`} aria-pressed={chatOpen} onClick={() => setChatOpen((v) => !v)}><span><Icon name="sparkles" size={26} /></span><span className="nav-label">{t("navAi")}</span></button>
            <button type="button" aria-haspopup="dialog" aria-label={bill && bill.lines.length > 0 ? `${t("tableBill")} ${priceLabel(lang, bill.total)}` : t("tableBill")} onClick={() => { loadBill(); setBillOpen(true); }}><span><Icon name="receipt" size={22} /></span><span className="nav-label">{bill && bill.lines.length > 0 ? priceLabel(lang, bill.total) : t("tableBill")}</span></button>
            <button type="button" className={ringing ? "is-ringing" : ""} onClick={callStaff}><span><Icon name="bell" size={22} /></span><span className="nav-label">{t("callStaff")}</span></button>
          </nav>
        </div>
      </div>

      <Presence>{detail && <Detail item={detail} lang={lang} profile={profile} t={t} onClose={() => setDetail(null)} onAdd={(qty = 1) => { addPick(detail.id, qty); say(...addMsg(detail)); setDetail(null); }} onAsk={() => { setDetail(null); setChatOpen(true); setTimeout(() => window.dispatchEvent(new CustomEvent("ask", { detail: `${nm(detail)}?` })), 50); }} />}</Presence>
      <Presence>{picksOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        <div className="sheet-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setPicksOpen(false); }}>
          <section className="sa-picks" role="dialog" aria-label={t("myPicks")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
              <h3 className="sa-display" style={{ margin: 0, fontSize: 24 }}>{t("myPicks")}</h3>
              <div className="row" style={{ gap: 12 }}>
                {table && <span className="sa-ticket-font muted" style={{ fontSize: 13 }}>{t("table")} {table}</span>}
                <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={() => setPicksOpen(false)} aria-label={t("close")}><Icon name="close" size={18} /></button>
              </div>
            </div>
            {valid.length === 0 ? <div className="muted" style={{ marginBottom: 12 }}>{t("picksEmpty")}</div> : (
              <div className="sa-picks__slip">
                {valid.map((p) => { const it = byId.get(p.id)!; return (
                  <div key={p.id} className="sa-picks__row" style={{ alignItems: "center" }}>
                    <span>{nm(it)}<br /><span style={{ fontWeight: 400, fontSize: 14 }}>{priceLabel(lang, it.price * p.qty)}</span></span>
                    <span className="sa-qty">
                      {p.qty > 1
                        ? <button type="button" aria-label="-" onClick={() => setPicks((x) => x.map((y) => (y.id === p.id ? { ...y, qty: y.qty - 1 } : y)))}>−</button>
                        : <button type="button" className="sa-qty__del" aria-label={t("remove")} onClick={() => removePick(p.id)}><Icon name="trash" size={16} /></button>}
                      <span key={p.qty} className="sa-tick">{p.qty}</span>
                      <button type="button" aria-label="+" onClick={() => addPick(p.id)}>+</button>
                    </span>
                  </div>); })}
              </div>
            )}
            {valid.length > 0 && <button type="button" className="sa-btn sa-btn--staff sa-btn--block" onClick={() => { setPicksOpen(false); sendPicks(); }}><Icon name="send" />{t("showToWaiter")} · {priceLabel(lang, valid.reduce((s, p) => s + p.qty * (byId.get(p.id)?.price || 0), 0))}</button>}
          </section>
        </div>
      )}</Presence>
      <Presence>{profileOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        // biome-ignore lint/a11y/useKeyWithClickEvents: same as above, the keyboard way is Escape
        <div className="sheet-back" onClick={() => setProfileOpen(false)}>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: this only stops clicks inside the dialog from reaching the backdrop */}
          <section className="sa-picks" role="dialog" aria-label={t("myAllergies")} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
              <h3 className="sa-display" style={{ margin: 0, fontSize: 24 }}>{t("myAllergies")}</h3>
              <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={() => setProfileOpen(false)} aria-label={t("close")}><Icon name="close" size={18} /></button>
            </div>
            <p className="muted" style={{ fontSize: 14, margin: "0 0 12px" }}>{t("profileHelp")}</p>
            {/* all 14 allergens must be visible at once, so the chips wrap (the filter row scrolls sideways) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {ALLERGENS.map((a) => (
                <button type="button" key={a} className="sa-chip" aria-pressed={profile.includes(a)} onClick={() => changeProfile(profile.includes(a) ? profile.filter((x) => x !== a) : [...profile, a])}>
                  {profile.includes(a) && <Icon name="check" size={16} />}{allergenName(a, lang)}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 12 }}>
              {profile.length > 0 && <button type="button" className="sa-btn sa-btn--quiet" onClick={() => changeProfile([])}>{t("clearAll")}</button>}
              <button type="button" className="sa-btn sa-btn--staff sa-btn--block" onClick={() => setProfileOpen(false)}><Icon name="check" />{t("done")}</button>
            </div>
          </section>
        </div>
      )}</Presence>
      <Presence>{billOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        <div className="sheet-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setBillOpen(false); }}>
          <section className="sa-picks" role="dialog" aria-label={t("tableBill")}>
            {/* the table's bill, or an empty one while nothing has been sent from this phone */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
              <h3 className="sa-display" style={{ margin: 0, fontSize: 24 }}>{t("tableBill")}</h3>
              <div className="row" style={{ gap: 12 }}>
                <span className="sa-ticket-font muted" style={{ fontSize: 13 }}>{t("table")} {table}</span>
                <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={() => setBillOpen(false)} aria-label={t("close")}><Icon name="close" size={18} /></button>
              </div>
            </div>
            {shownBill.lines.length === 0 ? <div className="muted" style={{ marginBottom: 12 }}>{t("billEmpty")}</div> : (
              <div className="sa-picks__slip">
                {shownBill.lines.map((l) => <div key={`${l.name}|${l.price}`} className="sa-picks__row"><span>{l.qty}× {l.name}</span><span>{priceLabel(lang, l.qty * l.price)}</span></div>)}
                <div className="sa-picks__row bill-total"><span>{t("billTotal")}</span><span>{priceLabel(lang, shownBill.total)}</span></div>
              </div>
            )}
            {shownBill.pending.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p className="sa-sheet__label" style={{ marginTop: 0 }}>{t("billPending")}</p>
                <div className="sa-ticket-font muted" style={{ fontSize: 14 }}>{shownBill.pending.map((l) => `${l.qty}× ${l.name}`).join(", ")}</div>
              </div>
            )}
            {shownBill.lines.length > 0 && (shownBill.asked
              ? <button type="button" className="sa-btn sa-btn--block" disabled><Icon name="check" />{t("billRequested")}</button>
              : <button type="button" className="sa-btn sa-btn--staff sa-btn--block" onClick={() => { setBillOpen(false); askForBill(); }}><Icon name="bell" />{t("askBill")}</button>)}
          </section>
        </div>
      )}</Presence>
      <Presence>{confirmedOrder && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        <div className="sheet-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setConfirmedOrder(null); }}>
          <section className="sa-picks" role="dialog" aria-label={t("sent")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="sa-tag sa-tag--veg" style={{ fontSize: 14 }}><Icon name="check" size={16} />{t("sent")}</span>
              </div>
              <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={() => setConfirmedOrder(null)} aria-label={t("close")}><Icon name="close" size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span className="sa-ticket-font" style={{ fontSize: 16, fontWeight: 700 }}>{t("table")} {confirmedOrder.table}</span>
            </div>
            <div className="sa-picks__slip" style={{ marginBottom: 16 }}>
              {confirmedOrder.items.map((i, idx) => (
                <div key={`${i.name}-${idx}`} className="sa-picks__row">
                  <span>{i.qty}× {i.name}</span>
                  <span>{priceLabel(lang, i.price)}</span>
                </div>
              ))}
              <div className="sa-picks__row bill-total">
                <span>{t("billTotal")}</span>
                <span>{priceLabel(lang, confirmedOrder.total)}</span>
              </div>
            </div>
            <button type="button" className="sa-btn sa-btn--staff sa-btn--block" onClick={() => setConfirmedOrder(null)}>
              <Icon name="check" />{t("done")}
            </button>
          </section>
        </div>
      )}</Presence>
      {toast && <div className={`toast${toast.warn ? " toast--warn" : ""}`} role="status">{toast.warn && <Icon name="alert" size={18} />}<span>{toast.m}</span></div>}
      {cursor.visible && (
        <>
          <div className="aiCursorTrail" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} aria-hidden="true" />
          <div className={`aiCursor${cursor.clicking ? " clicking" : ""}`} style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" className="aiCursorArrow" aria-hidden="true">
              <path d="M3 2 L3 17 L7 13.5 L10 20.5 L12.5 19.3 L9.3 12.7 L15 12.7 Z" fill="var(--teal)" stroke="var(--surface-card)" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

const DIET: Record<string, string> = { vegan: "sa-tag--veg", vegetarian: "sa-tag--veg", spicy: "sa-tag--spicy" };

// The allergens a dish lists. The ones in the diner's profile come first and are marked, so they are never hidden behind "+2".
function AllergenTags({ item, t, profile, max = 3 }: { item: Item; t: (k: string) => string; profile: string[]; max?: number }) {
  if (item.allergens === null) return <span className={`sa-tag sa-tag--unknown${profile.length ? " sa-tag--alert" : ""}`}>{profile.length > 0 && <Icon name="alert" size={13} />}{t("allergenUnknown")}</span>;
  const sorted = [...item.allergens].sort((a, b) => Number(profile.includes(b)) - Number(profile.includes(a)));
  const shownN = Math.max(max, sorted.filter((a) => profile.includes(a)).length);
  const extra = sorted.length - shownN;
  return <>{sorted.slice(0, shownN).map((a) => profile.includes(a)
    ? <span key={a} className="sa-tag sa-tag--alert" title={t("yourAllergen")}><Icon name="alert" size={13} />{a.replace("_", " ")}</span>
    : <span key={a} className="sa-tag">{a.replace("_", " ")}</span>)}{extra > 0 && <span className="sa-tag">+{extra}</span>}</>;
}

function Plate({ item }: { item: Item }) {
  return <DishPhoto src={item.photo_url} />;
}

// The ingredients one by one, as a list of small pills, instead of one long line. An ingredient whose name points at an allergen of the diner's
// profile is red with a warning sign; one that points at another allergen the dish lists is marked quietly. Never colour alone: the marked pills
// carry an icon, and a note under the list says what the marks mean. Used in the dish sheet and in the AI's answer to "what's in it?".
function IngredientPills({ list, en, listed, profile, t, label }: { list: string[]; en?: string[]; listed: string[] | null; profile: string[]; t: (k: string) => string; label?: boolean }) {
  if (!list.length) return null;
  // the allergen hint reads the name in the shown language and in English (the English line is what the owner keeps complete)
  const marks = list.map((name, i) => { const hits = [...new Set([...allergensIn(name), ...(en && en.length === list.length ? allergensIn(en[i]) : [])])]; return { name, mine: hits.some((a) => profile.includes(a)), other: hits.some((a) => (listed || []).includes(a)) }; });
  const anyMine = marks.some((m) => m.mine), anyOther = marks.some((m) => !m.mine && m.other);
  return (
    <>
      {label && <p className="sa-sheet__label">{t("ingredients")}<span className="sa-ing-count">{list.length}</span></p>}
      <ul className="sa-ing" aria-label={t("ingredients")}>
        {marks.map((m) => (
          <li key={m.name} className={`sa-ing__item${m.mine ? " sa-ing__item--mine" : m.other ? " sa-ing__item--allergen" : ""}`}>
            {m.mine ? <Icon name="alert" size={14} /> : m.other ? <span className="sa-ing__dot" aria-hidden="true" /> : null}{m.name}
          </li>
        ))}
      </ul>
      {(anyMine || anyOther) && (
        <p className="sa-ing__note">
          {anyMine && <span><Icon name="alert" size={14} />{t("ingYours")}</span>}
          {anyOther && <span><span className="sa-ing__dot" aria-hidden="true" />{t("ingAllergen")}</span>}
        </p>
      )}
    </>
  );
}

function DishCard({ item, lang, profile, onOpen, onAdd, t, n = 0 }: { item: Item; lang: Lang; profile: string[]; onOpen: () => void; onAdd: () => void; t: (k: string) => string; n?: number }) {
  const nm = item.name[lang] || item.name.en;
  const other = [...new Set((["th", "my", "en"] as Lang[]).filter((l) => l !== lang).map((l) => item.name[l]).filter((n) => n && n !== nm))];   // a dish with no Burmese name has its English one there: show it once
  return (
    <article className={`sa-plate sa-dish sa-in${item.available ? "" : " sa-dish--soldout"}${clash(item, profile) ? " sa-dish--conflict" : ""}`} style={{ animationDelay: `${Math.min(n, 7) * 30}ms` }}>
      <Plate item={item} />
      {!item.available && <span className="sa-stamp">{t("soldOut")}</span>}
      <div className="sa-dish__body">
        {/* The name's button stretches over the whole card, so tapping anywhere opens the dish. */}
        <h3 className="sa-dish__name"><button type="button" onClick={onOpen}>{nm}</button></h3>
        {other.length > 0 && <p className="sa-dish__alt">{other.join(" · ")}</p>}
        <div className="sa-dish__tags">
          {item.tags.filter((x) => DIET[x]).slice(0, 2).map((x) => <span key={x} className={`sa-tag ${DIET[x]}`}>{x}</span>)}
          <AllergenTags item={item} t={t} profile={profile} />
        </div>
        <div className="sa-dish__foot">
          <span className="sa-price">{priceLabel(lang, item.price)}</span>
          {item.available
            ? <button type="button" className="sa-btn sa-btn--special sa-add" onClick={onAdd} aria-label={`${t("add")} ${nm}`} data-add-btn={item.id}><Icon name="plus" /></button>
            : <button type="button" className="sa-btn sa-btn--sm" disabled>{t("soldOut")}</button>}
        </div>
      </div>
    </article>
  );
}

function Detail({ item, lang, profile, t, onClose, onAdd, onAsk }: { item: Item; lang: Lang; profile: string[]; t: (k: string) => string; onClose: () => void; onAdd: (qty: number) => void; onAsk: () => void }) {
  useEscape(onClose);
  const [qty, setQty] = useState(1);
  const nm = item.name[lang] || item.name.en;
  const other = [...new Set((["th", "my", "en"] as Lang[]).filter((l) => l !== lang).map((l) => item.name[l]).filter((n) => n && n !== nm))];   // a dish with no Burmese name has its English one there: show it once
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
    <div className="sheet-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="sa-sheet" role="dialog" aria-label={nm}>
        <div className="sa-sheet__grab" />
        <button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm sheet-close" onClick={onClose} aria-label={t("close")}><Icon name="close" size={18} /></button>
        <div className="sa-sheet__hero"><Plate item={item} /></div>
        <div className="sa-sheet__body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}><h3>{nm}</h3><span className="sa-price">{priceLabel(lang, item.price)}</span></div>
          {other.length > 0 && <p className="sa-dish__alt">{other.join(" · ")}</p>}
          {item.desc[lang] && <p style={{ margin: "8px 0 0" }}>{item.desc[lang]}</p>}
          <p className="sa-sheet__label">{t("allergens")}</p>
          <div className="sa-dish__tags">{item.allergens && item.allergens.length === 0 ? <span className="sa-tag">{t("allergenNone")}</span> : <AllergenTags item={item} t={t} profile={profile} max={20} />}</div>
          <IngredientPills list={ingredientList(item, lang)} en={splitIngredients(item.ingredients)} listed={item.allergens} profile={profile} t={t} label />
          {item.available && (
            <div className="detail-qty" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, margin: "16px 0 0" }}>
              <span className="sa-qty">
                <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span key={qty} className="sa-tick">{qty}</span>
                <button type="button" aria-label="Increase quantity" disabled={qty >= 20} onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
              </span>
              <span className="sa-price" style={{ fontSize: 20 }}>{priceLabel(lang, item.price * qty)}</span>
            </div>
          )}
          <div className="sa-sheet__actions">
            <button type="button" className="sa-btn sa-btn--ai" onClick={onAsk}><Icon name="sparkles" />{t("askWaiter")}</button>
            {item.available ? (
              <button type="button" className="sa-btn sa-btn--special" onClick={() => onAdd(qty)}>
                <Icon name="plus" />{t("add")}{qty > 1 ? ` · ${priceLabel(lang, item.price * qty)}` : ""}
              </button>
            ) : (
              <button type="button" className="sa-btn" disabled>{t("soldOut")}</button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
// After this many consecutive replies the AI could not answer from the restaurant's own data, the
// chat proactively offers to call staff instead of waiting for the diner to notice the bell icon.
const ESCALATE_AFTER_MISSES = 2;
const REASON_KEYS = { wrong: "reasonWrong", confused: "reasonConfused", allergen: "reasonAllergen" } as const;

// How many unanswered assistant replies are at the end of the history: a reopened chat that already had trouble shows the same "call staff?" offer.
function trailingMisses(list: Msg[]): number {
  let n = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].role !== "assistant") continue;
    if (list[i].answered === false) n++; else break;
  }
  return n;
}

function Chat({ slug, table, lang, sessionId, msgs, setMsgs, profile, addMsg, menu, t, onClose, addPick, aiAdd, say, picksCount, sendPicks, callStaff }: any) {
  const persona = menu.restaurant.persona;
  // the greeting only the first time the chat is ever opened; a reopened chat already has its messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once when the chat opens
  useEffect(() => { if (msgs.length === 0) setMsgs([{ id: "hello", role: "assistant", text: persona.greeting || t("hello") }]); }, []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setMissCount] = useState(() => trailingMisses(msgs));
  const [escalate, setEscalate] = useState(() => trailingMisses(msgs) >= ESCALATE_AFTER_MISSES);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Scroll only the message list itself, never scrollIntoView() on an inner marker - that
  // drags every scrollable ancestor (including the whole page) into view too, which used
  // to yank the page past the chat and down into the dish list on every new message.
  // biome-ignore lint/correctness/useExhaustiveDependencies: msgs and busy are the triggers (scroll to the newest message), not values read inside
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  // The chat now expands in place (not a modal dialog covering the page), so there's no
  // tab-trap: the diner can still reach the rest of the menu. Just move focus in on open,
  // back to whatever they tapped on close, and let Escape collapse the panel.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => previouslyFocused.current?.focus?.();
  }, []);
  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  async function send(message: string) {
    message = message.trim();
    if (!message || busy) return;
    setText(""); setReasonFor(null);
    setMsgs((m) => [...m, { id: uid(), role: "user", text: message }]);
    setBusy(true);
    try {
      const r = await api<any>(`/api/public/${slug}/chat`, { body: { message, sessionId, table, lang, profile } });
      const answered = r.answered !== false;
      setMsgs((m) => [...m, { id: uid(), role: "assistant", text: r.reply, lead: r.lead, ingredients: r.ingredients, dishes: r.dishes, topic: r.action?.type === "show_dishes" ? "dishes" : undefined, messageId: r.messageId, answered }]);
      setMissCount((n) => { const next = answered ? 0 : n + 1; setEscalate(next >= ESCALATE_AFTER_MISSES); return next; });
      const a = r.action || {};
      if (a.type === "add_to_picks") aiAdd(a.ids || [], a.qty);
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
    // biome-ignore lint/a11y/noStaticElementInteractions: this container only receives the Escape key and focus (see onPanelKeyDown); it is not a control
    <div className="chat-inline" ref={dialogRef} tabIndex={-1} onKeyDown={onPanelKeyDown}>
      <div ref={logRef} className="sa-chat" role="log" aria-live="polite" aria-atomic="false">
        <div className="muted" style={{ fontSize: 13, textAlign: "center" }}>{t("askAny")}</div>
        {msgs.map((m) => m.role === "user" ? (
          <div key={m.id} className="sa-msg sa-msg--me" style={{ lineHeight: chatLineHeight(lang) }}>{m.text}</div>
        ) : (
          <div key={m.id} className="sa-msg sa-msg--ai" style={{ lineHeight: chatLineHeight(lang) }}>
            <div className="sa-msg__who"><Icon name="sparkles" size={14} />{persona.name || t("theWaiter")}</div>
            {m.ingredients?.length ? m.lead : m.text}
            {m.ingredients?.length ? (() => { const dish = m.dishes?.[0] && (byId.get(m.dishes[0].id) || m.dishes[0]); return <IngredientPills list={m.ingredients} en={dish ? splitIngredients(dish.ingredients) : undefined} listed={dish ? dish.allergens : null} profile={profile} t={t} />; })() : null}
            {m.dishes && m.dishes.length > 0 && m.dishes.map((d) => { const cur = byId.get(d.id) || d; const name = cur.name[lang] || cur.name.en; return (
              <div key={d.id} className="sa-mini">
                <DishPhoto src={cur.photo_url} />
                <div className="sa-mini__txt">{name}<br /><span className="sa-dish__alt">{priceLabel(lang, cur.price)}</span></div>
                <button type="button" className="sa-btn sa-btn--special sa-btn--sm sa-btn--icon" aria-label={`${t("add")} ${name}`} onClick={() => { addPick(cur.id); say(...addMsg(cur)); }}><Icon name="plus" /></button>
              </div>); })}
            {m.messageId && (
              <>
                <div className="sa-msg__rate">
                  <button type="button" aria-label={t("helpful")} aria-pressed={m.rated === 1} onClick={() => rateUp(m)}><Icon name="thumbUp" size={16} /></button>
                  <button type="button" aria-label={t("notHelpful")} aria-pressed={m.rated === -1} onClick={() => setReasonFor(reasonFor === m.id ? null : m.id)}><Icon name="thumbDown" size={16} /></button>
                </div>
                {reasonFor === m.id && (
                  // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would bring its default browser styling into the design
                  <div className="chat-reasons" role="group" aria-label={t("reasonPrompt")}>
                    {(Object.keys(REASON_KEYS) as (keyof typeof REASON_KEYS)[]).map((r) => <button type="button" key={r} className="sa-chip" onClick={() => submitReason(m, r)}>{t(REASON_KEYS[r])}</button>)}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {busy && (
          <div className="sa-msg sa-msg--ai" role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="dots" aria-hidden="true"><span /><span /><span /></span>
            <span>{t("thinking")}</span>
          </div>
        )}
        {escalate && (
          <div className="chat-escalate" role="status" aria-live="polite">
            <Icon name="alert" />
            <div style={{ flex: 1 }}>{t("escalate")}</div>
            <button type="button" className="sa-btn sa-btn--staff sa-btn--sm" onClick={() => { callStaff(); setEscalate(false); }}>{t("escalateCall")}</button>
          </div>
        )}
        {followUps.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {followUps.map((c) => <button type="button" key={c} className="sa-chip" onClick={() => send(c)}>{c}</button>)}
          </div>
        )}
      </div>
      {picksCount > 0 && <div style={{ padding: "0 12px 12px", background: "var(--surface-page)" }}><button type="button" className="sa-btn sa-btn--staff sa-btn--block sa-btn--sm" onClick={() => { sendPicks(); }}><Icon name="send" />{t("showToWaiter")} · {picksCount}</button></div>}
      <form className="sa-composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="sa-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("typeQ")} aria-label={t("typeQ")} maxLength={500} />
        <button className="sa-btn sa-btn--ai sa-btn--icon" type="submit" aria-label="Send" disabled={busy || !text.trim()}><Icon name="send" /></button>
      </form>
    </div>
  );
}
