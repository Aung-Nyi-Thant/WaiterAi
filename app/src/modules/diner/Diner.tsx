"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/modules/platform/Icon";
import DishPhoto from "@/modules/platform/DishPhoto";
import Presence from "@/modules/platform/Presence";
import { dropInto } from "@/modules/platform/WaterFx";
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

// A row that scrolls sideways (the categories, the filters) also scrolls with a mouse: the wheel moves it, and it can be dragged. A touch screen needs neither.
// A drag that moved is not a click, so the chip under the pointer is not pressed by letting go.
function useSideScroll(ref: React.RefObject<HTMLElement | null>, ready: boolean) {
  useEffect(() => {
    const el = ready ? ref.current : null;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;      // at an end: the page scrolls as usual
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    let startX = 0, startLeft = 0, dragging = false, moved = false;
    const onDown = (e: PointerEvent) => { if (e.pointerType !== "mouse" || e.button !== 0) return; dragging = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; el.classList.add("is-dragging"); }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => { dragging = false; el.classList.remove("is-dragging"); };
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => { el.removeEventListener("wheel", onWheel); el.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); el.removeEventListener("click", onClick, true); };
  }, [ref, ready]);
}

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
  // Saved dishes (the heart on a card): kept only on this phone, per restaurant, like the picks.
  const [favs, setFavs] = useState<number[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const toggleFav = (id: number) => setFavs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const activeFilterCount = Object.values(f).filter(Boolean).length + (savedOnly ? 1 : 0);
  const [langOpen, setLangOpen] = useState(false);
  useEscape(() => setLangOpen(false), langOpen);
  const searchRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  useSideScroll(tabsRef, !!menu);
  // The line under the chosen category: it slides to the new one like water finding its level (the far edge arrives a beat later, so it stretches on the way).
  const [blob, setBlob] = useState<{ left: number; width: number } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: cat, lang and the menu are the triggers (the chosen tab, its text width, the tabs themselves)
  useEffect(() => {
    const bar = tabsRef.current;
    if (!bar) return;
    const measure = () => { const on = bar.querySelector<HTMLElement>(".sa-tab[aria-pressed=\"true\"]"); setBlob(on ? { left: on.offsetLeft, width: on.offsetWidth } : null); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    for (const kid of Array.from(bar.children)) ro.observe(kid);
    return () => ro.disconnect();
  }, [cat, lang, menu]);
  // the chosen category slides into view (a category far to the right is chosen from the AI or a link as well)
  // biome-ignore lint/correctness/useExhaustiveDependencies: cat is the trigger
  useEffect(() => { const bar = tabsRef.current; const on = bar?.querySelector<HTMLElement>('[aria-pressed="true"]'); if (bar && on) bar.scrollTo?.({ left: on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2, behavior: "smooth" }); }, [cat]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [detail, setDetail] = useState<Item | null>(null);
  const linkedDish = useRef(false);                       // an address with ?dish=<id> (the home page's dish strip) opens that dish once the menu is here
  const [picksOpen, setPicksOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // the AI bar drops open at the top of the menu: bring it into view whatever opened it (the bar, the Ask AI tab, a dish's "Ask AI", an AI answer)
  useEffect(() => { if (chatOpen) heroRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }, [chatOpen]);
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
    try { setFavs(JSON.parse(localStorage.getItem(`favs:${slug}`) || "[]")); } catch {}
    api<Menu>(`/api/public/${slug}/menu?open=1`)
      .then((m) => { setMenu(m); localStorage.setItem(`menu:${slug}`, JSON.stringify(m)); })
      .catch((e) => {
        const cached = localStorage.getItem(`menu:${slug}`);
        if (cached) { setMenu(JSON.parse(cached)); setOffline(true); } else setError(e.message);
      });
  }, [slug]);
  useEffect(() => { localStorage.setItem(`picks:${slug}`, JSON.stringify(picks)); }, [picks, slug]);
  useEffect(() => { try { localStorage.setItem(`favs:${slug}`, JSON.stringify(favs)); } catch {} }, [favs, slug]);
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
    const list = filterMenu(menu.items, { cat, q, f, profile });
    return savedOnly ? list.filter((i) => favs.includes(i.id)) : list;
  }, [menu, cat, q, f, profile, savedOnly, favs]);

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
  const meta = [table ? `${t("table")} ${table}` : "", menu.restaurant.city].filter(Boolean).join(" / ");
  const LANGS: [Lang, string][] = [["en", "English"], ["th", "ไทย"], ["my", "မြန်မာ"]];
  // The dishes in sections, one per category, in the owner's order; a dish with no category goes last.
  const sections = (() => {
    const by = new Map<number | null, Item[]>();
    for (const i of shown) by.set(i.category_id, [...(by.get(i.category_id) || []), i]);
    const list = menu.categories.filter((c) => by.has(c.id)).map((c) => ({ id: c.id as number, name: c.name[lang] || c.name.en, items: by.get(c.id) as Item[] }));
    const rest = shown.filter((i) => !menu.categories.some((c) => c.id === i.category_id));
    return rest.length ? [...list, { id: -1, name: t("otherDishes"), items: rest }] : list;
  })();
  const clearAll = () => { setQ(""); setCat(0); setF({ veg: false, noPeanut: false, u100: false, spicy: false, mine: false }); setSavedOnly(false); };
  const reconnect = () => api<Menu>(`/api/public/${slug}/menu?open=1`).then((m) => { setMenu(m); setOffline(false); localStorage.setItem(`menu:${slug}`, JSON.stringify(m)); }).catch((e) => say(e.message));
  let rowNo = 0;
  return (
    <div className="sa-app">
      <div className="diner">
        <header className="sa-sign">
          <div className="sa-sign__top">
            <span className="sa-logo">Shop AI</span>
            <div className="sa-pop-anchor">
              <button type="button" className="sa-langbtn" aria-label={t("navLang")} aria-haspopup="true" aria-expanded={langOpen} onClick={() => setLangOpen((v) => !v)}>{lang.toUpperCase()}<Icon name="down" size={16} /></button>
              {langOpen && (
                <>
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape) */}
                  <div className="pop-scrim" onClick={() => setLangOpen(false)} />
                  {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> would bring its default browser styling into the design */}
                  <div className="sa-pop sa-pop--lang" role="group" aria-label="Language">
                    {LANGS.map(([l, label]) => (
                      <button type="button" key={l} className="sa-pop__row" aria-pressed={lang === l} lang={l} onClick={() => { chooseLang(l); setLangOpen(false); }}>
                        <span className="sa-pop__label">{label}</span>{lang === l && <Icon name="check" size={22} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <h1 className="sa-sign__name">{menu.restaurant.name}</h1>
          {meta && <p className="sa-sign__meta">{meta}</p>}
        </header>

        <div className="diner-pad">
          {offline && (
            <div className="state-card state-card--gray" role="status">
              <Icon name="alert" size={22} />
              <h3>{t("savedMenu")}</h3>
              <p>{t("offline")}</p>
              <button type="button" className="sa-btn sa-btn--ink sa-btn--block" onClick={reconnect}>{t("reconnect")}</button>
            </div>
          )}
          <div className={`hero-ai${chatOpen ? " is-open" : ""}`} ref={heroRef}>
            {chatOpen ? (
              <div className="hero-ai__row hero-ai__row--open" key="open">
                <span className="hero-ai__badge" aria-hidden="true">Ai</span>
                <div className="hero-ai__text"><b>{t("askWaiter")}</b><span>{menu.restaurant.name} · {t("askSub")}</span></div>
                <button type="button" className="sa-round sa-round--soft sa-round--sm" aria-label={t("close")} onClick={() => setChatOpen(false)}><Icon name="up" size={22} /></button>
              </div>
            ) : (
              <button type="button" className="hero-ai__row hero-ai__bar" key="bar" onClick={() => setChatOpen(true)} aria-label={t("heroBar")}>
                <span className="hero-ai__badge" aria-hidden="true">Ai</span>
                <span className="hero-ai__hint">{t("heroBar")}</span>
                <span className="hero-ai__go" aria-hidden="true"><Icon name="sparkles" size={20} /></span>
              </button>
            )}
            <div className={`hero-expand${chatOpen ? " open" : ""}`}>
              <div className="hero-expand-inner">
                <Presence>{chatOpen && <Chat slug={slug} table={table} lang={lang} sessionId={sessionId} msgs={msgs} setMsgs={setMsgs} profile={profile} addMsg={addMsg} menu={menu} t={t} onClose={() => setChatOpen(false)} addPick={addPick} aiAdd={aiAdd} say={say} callStaff={() => callStaff()} />}</Presence>
              </div>
            </div>
          </div>
          <div className="diner-search">
            <Icon name="search" size={22} />
            <input ref={searchRef} className="sa-input" aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} />
            <button type="button" className="diner-search__filter" aria-label={t("filters")} aria-expanded={filtersOpen} aria-controls="diner-filters" aria-pressed={filtersOpen || hasFilters} onClick={() => setFiltersOpen((v) => !v)}>
              <Icon name="filter" size={22} />{hasFilters && <span className="diner-search__count">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* The categories stay reachable while scrolling a long menu; the less-used filters open from the icon in the search field. */}
        <div className="diner-sticky">
          <nav className={`sa-tabs${blob ? " has-blob" : ""}`} ref={tabsRef} aria-label={t("all")}>
            {blob && <span className="sa-tabs__blob" aria-hidden="true" style={{ transform: `translateX(${blob.left}px)`, width: blob.width }} />}
            <button type="button" className="sa-tab" aria-pressed={!cat} onClick={() => setCat(0)}>{t("all")}</button>
            {menu.categories.map((c) => <button type="button" key={c.id} className="sa-tab" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name[lang]}</button>)}
          </nav>
          {filtersOpen && (
            <div id="diner-filters" className="diner-filters">
              {(["veg", "noPeanut", "u100", "spicy", ...(profile.length ? ["mine"] : [])] as (keyof typeof f)[]).map((k) => (
                <button type="button" key={k} className="sa-chip" aria-pressed={f[k]} onClick={() => setF({ ...f, [k]: !f[k] })}>{f[k] && <Icon name="check" size={16} />}{t({ veg: "vegetarian", noPeanut: "noPeanuts", u100: "under100", spicy: "spicy", mine: "mine" }[k])}</button>
              ))}
              <button type="button" className="sa-chip" aria-pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}>{savedOnly && <Icon name="check" size={16} />}{t("saved")}{favs.length > 0 ? ` · ${favs.length}` : ""}</button>
            </div>
          )}
        </div>

        <div className="diner-pad">
          <button type="button" className="allergy-row" aria-haspopup="dialog" aria-label={profile.length ? `${t("myAllergies")}: ${profile.map((a) => allergenName(a, lang)).join(", ")}` : t("setAllergies")} onClick={() => setProfileOpen(true)}>
            <Icon name="alert" size={22} />
            <span className="allergy-row__text">{t("allergyProfile")}{profile.length > 0 && <span className="allergy-row__list">{profile.map((a) => allergenName(a, lang)).join(", ")}</span>}</span>
            {profile.length > 0 && <span className="allergy-row__count">{profile.length}</span>}
            <Icon name="chevron" size={22} />
          </button>
          {menu.specials.length > 0 && (
            <div className="notice-box diner-special">
              <div className="sa-flourish">{t("specials")}</div>
              <div className="sa-display" style={{ fontSize: 20, lineHeight: "26px" }}>{menu.specials[0].title}</div>
              {menu.specials[0].text && <div className="muted" style={{ fontSize: 15 }}>{menu.specials[0].text}</div>}
            </div>
          )}
          {shown.length === 0 && (
            <div className="state-card sa-empty">
              <Icon name="chat" size={22} />
              <h3>{t("none")}</h3>
              <p>{t("noMatchHelp")}</p>
              <button type="button" className="sa-btn sa-btn--ink sa-btn--block" onClick={clearAll}>{t("clearFilters")}</button>
            </div>
          )}
          <div key={`cat-${cat}`}>
            {sections.map((s, si) => (
              <section key={s.id} className="diner-section" aria-label={s.name}>
                <div className="diner-section__head">
                  <h2>{s.name}</h2>
                  {si === 0 || sections.length === 1
                    ? <span className="diner-section__count">{s.items.length} {s.items.length === 1 ? t("dish") : t("dishes")}</span>
                    : <button type="button" className="diner-section__ask" onClick={() => setChatOpen(true)}>{t("askMenu")}</button>}
                </div>
                <div className="diner-list">
                  {s.items.map((i) => <DishCard key={i.id} n={rowNo++} item={i} lang={lang} profile={profile} onOpen={() => setDetail(i)} onAdd={(from) => { addPick(i.id); say(...addMsg(i)); dropInto(from, document.querySelector("[data-cart]")); }} t={t} />)}
                </div>
              </section>
            ))}
          </div>
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
          {/* The navigation: the menu, the AI, the picks and the staff. */}
          <nav className="diner-nav" aria-label={t("navMenu")}>
            <button type="button" className="on" onClick={() => { setChatOpen(false); setLangOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span className="nav-ico"><Icon name="menu" size={24} /></span><span className="nav-label">{t("navMenu")}</span></button>
            <button type="button" aria-haspopup="dialog" aria-label={bill && bill.lines.length > 0 ? `${t("tableBill")} ${priceLabel(lang, bill.total)}` : t("tableBill")} onClick={() => { setLangOpen(false); loadBill(); setBillOpen(true); }}><span className="nav-ico"><Icon name="clipboard" size={24} /></span><span className="nav-label">{t("navBills")}</span></button>
            <button type="button" data-cart="" aria-haspopup="dialog" aria-label={total > 0 ? `${t("myPicks")} · ${total}` : t("myPicks")} onClick={() => { setLangOpen(false); setPicksOpen(true); }}>
              <span className="nav-ico"><Icon name="bag" size={24} />{total > 0 && <span className="nav-badge">{total}</span>}</span><span className="nav-label">{t("myPicks")}</span>
            </button>
            <button type="button" className={ringing ? "is-ringing" : ""} aria-label={t("callStaff")} onClick={callStaff}><span className="nav-ico"><Icon name="bell" size={24} /></span><span className="nav-label">{t("navStaff")}</span></button>
          </nav>
        </div>
      </div>

      <Presence>{detail && <Detail catName={menu.categories.find((c) => c.id === detail.category_id)?.name[lang]} item={detail} lang={lang} profile={profile} t={t} fav={favs.includes(detail.id)} onFav={() => toggleFav(detail.id)} onClose={() => setDetail(null)} onAdd={(qty = 1) => { addPick(detail.id, qty); say(...addMsg(detail)); setDetail(null); }} onAsk={() => { setDetail(null); setChatOpen(true); setTimeout(() => window.dispatchEvent(new CustomEvent("ask", { detail: `${nm(detail)}?` })), 50); }} />}</Presence>
      <Presence>{picksOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        <div className="sheet-back sheet-back--page" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setPicksOpen(false); }}>
          <section className="sa-sheet sa-sheet--page" role="dialog" aria-label={t("myPicks")}>
            <header className="page-head">
              <button type="button" className="sa-round sa-round--plain" onClick={() => setPicksOpen(false)} aria-label={t("close")}><Icon name="back" size={24} /></button>
              <div><h2 className="page-head__title">{t("myPicks")}</h2><p className="page-head__sub">{menu.restaurant.name}{table ? ` · ${t("table")} ${table}` : ""}</p></div>
            </header>
            <div className="sa-page__scroll sa-page__scroll--pad">
              <h3 className="page-lead">{t("reviewSelection")}</h3>
              <p className="page-note">{t("notSent")}</p>
              {valid.length === 0 ? <div className="muted" style={{ margin: "16px 0" }}>{t("picksEmpty")}</div> : (
                <div className="pick-list">
                  {valid.map((p) => { const it = byId.get(p.id)!; return (
                    <div key={p.id} className="pick-row">
                      <DishPhoto src={it.photo_url} className="pick-row__img" />
                      <div className="pick-row__main">
                        <div className="pick-row__top"><b>{nm(it)}</b><b className="pick-row__sum">{priceLabel(lang, it.price * p.qty)}</b></div>
                        <div className="pick-row__each">{priceLabel(lang, it.price)} {t("each")}</div>
                        <span className="sa-qty">
                          {p.qty > 1
                            ? <button type="button" aria-label="-" onClick={() => setPicks((x) => x.map((y) => (y.id === p.id ? { ...y, qty: y.qty - 1 } : y)))}><Icon name="minus" size={18} /></button>
                            : <button type="button" className="sa-qty__del" aria-label={t("remove")} onClick={() => removePick(p.id)}><Icon name="trash" size={18} /></button>}
                          <span key={p.qty} className="sa-tick">{p.qty}</span>
                          <button type="button" aria-label="+" onClick={() => addPick(p.id)}><Icon name="plus" size={18} /></button>
                        </span>
                      </div>
                    </div>); })}
                </div>
              )}
              {profile.length > 0 && (
                <div className="notice-box">
                  <p className="notice-box__title"><Icon name="alert" size={22} />{t("yourProfile")}: {profile.map((a) => allergenName(a, lang)).join(", ")}</p>
                  <p>{t("profileShared")}</p>
                  <button type="button" className="notice-box__link" onClick={() => setProfileOpen(true)}>{t("editProfile")}</button>
                </div>
              )}
              {valid.length > 0 && (
                <div className="pick-total"><span>{total} {total === 1 ? t("item") : t("items")}</span><b>{priceLabel(lang, valid.reduce((s, p) => s + p.qty * (byId.get(p.id)?.price || 0), 0))}</b></div>
              )}
              {valid.length > 0 && <p className="page-note">{t("staffConfirms")}</p>}
            </div>
            {valid.length > 0 && (
              <footer className="sa-page__foot sa-page__foot--stack">
                <p className="sa-page__cap">{t("sendingTo")} {table ? `${t("table")} ${table}` : ""}</p>
                <button type="button" className="sa-btn sa-btn--ink sa-btn--lg sa-btn--block sa-btn--split" onClick={() => { setPicksOpen(false); sendPicks(); }}><span>{t("showToWaiter")} · {priceLabel(lang, valid.reduce((s, p) => s + p.qty * (byId.get(p.id)?.price || 0), 0))}</span><Icon name="arrowRight" size={22} /></button>
              </footer>
            )}
          </section>
        </div>
      )}</Presence>
      <Presence>{profileOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        // biome-ignore lint/a11y/useKeyWithClickEvents: same as above, the keyboard way is Escape
        <div className="sheet-back" onClick={() => setProfileOpen(false)}>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: this only stops clicks inside the dialog from reaching the backdrop */}
          <section className="sa-picks" role="dialog" aria-label={t("myAllergies")} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h3>{t("yourAllergies")}</h3>
              <button type="button" className="sa-round sa-round--soft sa-round--sm" onClick={() => setProfileOpen(false)} aria-label={t("close")}><Icon name="close" size={18} /></button>
            </div>
            <p className="muted" style={{ fontSize: 14, margin: "0 0 16px" }}>{t("profileHelp")}</p>
            {/* all 14 allergens must be visible at once, in two columns */}
            <div className="allergy-grid">
              {ALLERGENS.map((a) => (
                <button type="button" key={a} className="allergy-check" aria-pressed={profile.includes(a)} onClick={() => changeProfile(profile.includes(a) ? profile.filter((x) => x !== a) : [...profile, a])}>
                  <span className="allergy-check__box" aria-hidden="true">{profile.includes(a) && <Icon name="check" size={16} />}</span>{allergenName(a, lang)}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 12 }}>
              {profile.length > 0 && <button type="button" className="sa-btn sa-btn--quiet" onClick={() => changeProfile([])}>{t("clearAll")}</button>}
              <button type="button" className="sa-btn sa-btn--ink sa-btn--lg sa-btn--block" onClick={() => setProfileOpen(false)}>{t("applyProfile")}</button>
            </div>
          </section>
        </div>
      )}</Presence>
      <Presence>{billOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        <div className="sheet-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setBillOpen(false); }}>
          <section className="sa-picks" role="dialog" aria-label={t("tableBill")}>
            {/* the table's bill, or an empty one while nothing has been sent from this phone */}
            <div className="sheet-head">
              <h3>{t("tableBill")}</h3>
              <div className="row" style={{ gap: 12 }}>
                <span className="muted" style={{ fontSize: 14 }}>{t("table")} {table}</span>
                <button type="button" className="sa-round sa-round--soft sa-round--sm" onClick={() => setBillOpen(false)} aria-label={t("close")}><Icon name="close" size={18} /></button>
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
                <div className="muted" style={{ fontSize: 14 }}>{shownBill.pending.map((l) => `${l.qty}× ${l.name}`).join(", ")}</div>
              </div>
            )}
            {shownBill.lines.length > 0 && (shownBill.asked
              ? <button type="button" className="sa-btn sa-btn--block" disabled><Icon name="check" />{t("billRequested")}</button>
              : <button type="button" className="sa-btn sa-btn--ink sa-btn--lg sa-btn--block" onClick={() => { setBillOpen(false); askForBill(); }}><Icon name="bell" />{t("askBill")}</button>)}
          </section>
        </div>
      )}</Presence>
      <Presence>{confirmedOrder && (
        // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
        <div className="sheet-back sheet-back--page" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setConfirmedOrder(null); }}>
          <section className="sa-sheet sa-sheet--page sent-page" role="dialog" aria-label={t("sent")}>
            <div className="sent-page__top"><span className="sa-logo">Shop AI</span><span className="sent-page__table">{t("table")} {confirmedOrder.table}</span></div>
            <div className="sa-page__scroll sa-page__scroll--pad sent-page__body">
              <div className="sent-page__check"><Icon name="check" size={44} /></div>
              <h2 className="sent-page__title">{t("sentTitle")}</h2>
              <p className="page-note" style={{ textAlign: "center" }}>{t("sentSub")}</p>
              <div className="receipt">
                <p className="receipt__head">{t("table")} {confirmedOrder.table} · {confirmedOrder.items.reduce((s, i) => s + i.qty, 0)} {t("items")}</p>
                {confirmedOrder.items.map((i, idx) => (
                  <div key={`${i.name}-${idx}`} className="receipt__row"><span>{i.qty}× {i.name}</span><span>{priceLabel(lang, i.price)}</span></div>
                ))}
                <div className="receipt__row receipt__total"><span>{t("estTotal")}</span><b>{priceLabel(lang, confirmedOrder.total)}</b></div>
              </div>
              {profile.length > 0 && <p className="sent-page__allergy"><Icon name="alert" size={22} />{profile.map((a) => allergenName(a, lang)).join(", ")} · {t("profileSharedShort")}</p>}
              <div className="sent-page__actions">
                <button type="button" className="sa-btn sa-btn--ink sa-btn--lg sa-btn--block" onClick={() => setConfirmedOrder(null)}>{t("backMenu")}</button>
                <button type="button" className="sa-btn sa-btn--quiet sa-btn--lg sa-btn--block sa-btn--split" onClick={() => callStaff()}><span>{t("callStaff")}</span><Icon name="bell" size={22} /></button>
              </div>
              <p className="page-note" style={{ textAlign: "center" }}>{t("changeSomething")}</p>
            </div>
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

function DishCard({ item, lang, profile, onOpen, onAdd, t, n = 0 }: { item: Item; lang: Lang; profile: string[]; onOpen: () => void; onAdd: (from: HTMLElement) => void; t: (k: string) => string; n?: number }) {
  const nm = item.name[lang] || item.name.en;
  const other = [...new Set((["th", "my", "en"] as Lang[]).filter((l) => l !== lang).map((l) => item.name[l]).filter((n) => n && n !== nm))];   // a dish with no Burmese name has its English one there: show it once
  return (
    <article className={`sa-dish sa-in${item.available ? "" : " sa-dish--soldout"}${clash(item, profile) ? " sa-dish--conflict" : ""}`} style={{ animationDelay: `${Math.min(n, 7) * 40}ms`, ...(item.photo_url ? ({ "--photo": `url("${item.photo_url}")` } as React.CSSProperties) : {}) }}>
      <div className="sa-dish__top">
        <Plate item={item} />
        {!item.available && <span className="sa-stamp">{t("soldOut")}</span>}
      </div>
      <div className="sa-dish__body">
        {/* The name's button stretches over the whole row, so tapping anywhere opens the dish. */}
        <h3 className="sa-dish__name"><button type="button" onClick={onOpen}>{nm}</button></h3>
        {other.length > 0 && <p className="sa-dish__alt">{other.join(" · ")}</p>}
        {item.desc[lang] && <p className="sa-dish__desc">{item.desc[lang]}</p>}
        <div className="sa-dish__tags">
          {item.tags.filter((x) => DIET[x]).slice(0, 2).map((x) => <span key={x} className={`sa-tag ${DIET[x]}`}>{x}</span>)}
          <AllergenTags item={item} t={t} profile={profile} />
        </div>
        <div className="sa-dish__foot">
          <span className="sa-price">{priceLabel(lang, item.price)}</span>
          {item.available
            ? <button type="button" className="sa-btn sa-btn--special sa-add" onClick={(e) => onAdd(e.currentTarget)} aria-label={`${t("add")} ${nm}`} data-add-btn={item.id}><Icon name="plus" /></button>
            : <button type="button" className="sa-btn sa-btn--sm" disabled>{t("soldOut")}</button>}
        </div>
      </div>
    </article>
  );
}

function Detail({ item, lang, profile, t, fav, onFav, onClose, onAdd, onAsk, catName }: { item: Item; lang: Lang; profile: string[]; t: (k: string) => string; fav: boolean; onFav: () => void; onClose: () => void; onAdd: (qty: number) => void; onAsk: () => void; catName?: string }) {
  useEscape(onClose);
  const [qty, setQty] = useState(1);
  const nm = item.name[lang] || item.name.en;
  const other = [...new Set((["th", "my", "en"] as Lang[]).filter((l) => l !== lang).map((l) => item.name[l]).filter((n) => n && n !== nm))];   // a dish with no Burmese name has its English one there: show it once
  const known = item.allergens !== null;
  const sum = priceLabel(lang, item.price * qty);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
    <div className="sheet-back sheet-back--page" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="sa-sheet sa-sheet--page" role="dialog" aria-label={nm}>
        <div className="sa-page__scroll">
          <div className="sa-detail__bar">
            <button type="button" className="sa-round sheet-close" onClick={onClose} aria-label={t("close")}><Icon name="back" size={22} /></button>
            <button type="button" className="sa-round" aria-pressed={fav} aria-label={`${fav ? t("unsave") : t("save")}: ${nm}`} onClick={onFav}><Icon name={fav ? "heartFill" : "heart"} size={22} /></button>
          </div>
          <div className="sa-detail__card" style={item.photo_url ? ({ "--photo": `url("${item.photo_url}")` } as React.CSSProperties) : undefined}>
            <div className="sa-detail__photo"><Plate item={item} /></div>
            <div className="sa-detail__meta">
              <h3>{nm}</h3>
              <span className="sa-price">{priceLabel(lang, item.price)}</span>
              {(catName || other.length > 0) && <p className="sa-dish__alt sa-page__sub">{[catName, ...other].filter(Boolean).join(" · ")}</p>}
            </div>
          </div>
          <div className="sa-sheet__body">
            {item.desc[lang] && <p className="sa-page__desc">{item.desc[lang]}</p>}
            <hr className="sa-page__rule" />
            <IngredientPills list={ingredientList(item, lang)} en={splitIngredients(item.ingredients)} listed={item.allergens} profile={profile} t={t} label />
            <div className="notice-box">
              <p className="notice-box__title"><Icon name="alert" size={22} />{known ? t("estAllergens") : t("allergenUnknown")}</p>
              {known && <div className="sa-dish__tags">{item.allergens && item.allergens.length === 0 ? <span className="sa-tag">{t("allergenNone")}</span> : <AllergenTags item={item} t={t} profile={profile} max={20} />}</div>}
              <p>{known ? t("estNote1") : t("allergenUnknownNote")}</p>
              <p>{t("estNote2")}</p>
            </div>
            <button type="button" className="sa-btn sa-btn--quiet sa-btn--block sa-btn--ask" onClick={onAsk}><span aria-hidden="true" /><span>{t("askAbout")}</span><Icon name="chat" size={22} /></button>
          </div>
        </div>
        <footer className="sa-page__foot sa-page__foot--stack">
          {item.available ? (
            <>
              <div className="sa-page__buy">
                <span className="sa-qty" role="group" aria-label={t("quantity")}>
                  <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><Icon name="minus" size={20} /></button>
                  <span key={qty} className="sa-tick">{qty}</span>
                  <button type="button" aria-label="Increase quantity" disabled={qty >= 20} onClick={() => setQty((q) => Math.min(20, q + 1))}><Icon name="plus" size={20} /></button>
                </span>
                <button type="button" className="sa-btn sa-btn--ink sa-btn--lg sa-page__add" onClick={(e) => { dropInto(e.currentTarget, document.querySelector("[data-cart]")); onAdd(qty); }}>{t("addToCart")}<span className="sa-page__dot" aria-hidden="true">·</span><span className="sa-page__total">{sum}</span></button>
              </div>
              <p className="sa-page__cap">{t("reviewBefore")}</p>
            </>
          ) : (
            <button type="button" className="sa-btn sa-btn--lg sa-btn--block" disabled>{t("soldOut")}</button>
          )}
        </footer>
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

const motionOk = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// a letter is a whole letter with its marks: Thai and Burmese stack marks on a base, and cutting between them would show broken glyphs
const graphemes = (text: string): string[] => { const Seg = (Intl as any).Segmenter; return Seg ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text), (x: any) => x.segment as string) : Array.from(text); };

// The text types itself out, letter by letter, with a caret, then says it is done. Long text types faster (about 2.5 s at most; the introduction, which is read once, goes quicker). With reduced motion (or when
// it is not asked to type) the text is simply there. A screen reader gets the whole text at once from a hidden copy, never the typing.
function Typed({ text, go = true, ticks = 110, onDone, onTick }: { text: string; go?: boolean; ticks?: number; onDone?: () => void; onTick?: () => void }) {
  const parts = useMemo(() => graphemes(text), [text]);
  const animate = go && motionOk();
  const [n, setN] = useState(animate ? 0 : parts.length);
  const cb = useRef({ onDone, onTick });
  cb.current = { onDone, onTick };
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new text or the switch to typing restarts it
  useEffect(() => {
    if (!animate) { setN(parts.length); return; }
    let i = 0;
    const step = Math.max(1, Math.ceil(parts.length / ticks));
    const id = setInterval(() => {
      i = Math.min(parts.length, i + step);
      setN(i);
      cb.current.onTick?.();
      if (i >= parts.length) { clearInterval(id); cb.current.onDone?.(); }
    }, 24);
    return () => clearInterval(id);
  }, [text, animate]);
  if (!animate || n >= parts.length) return <>{text}</>;
  return <><span aria-hidden="true">{parts.slice(0, n).join("")}<span className="typing-caret" /></span><span className="sr">{text}</span></>;
}

// What the AI is and is not: it comes first in the chat, typed once per visit, line by line.
let introSeen = false;
function IntroCard({ title, lines }: { title: string; lines: string[] }) {
  const typeIt = motionOk() && !introSeen;
  const [step, setStep] = useState(typeIt ? 0 : lines.length);
  useEffect(() => { if (step >= lines.length) introSeen = true; }, [step, lines.length]);
  return (
    <div className="ai-intro">
      <p className="ai-intro__title"><Icon name="alert" size={20} />{title}</p>
      <ul>{lines.map((l, i) => (i <= step ? <li key={l}>{i < step || !typeIt ? l : <Typed text={l} ticks={34} onDone={() => setStep(i + 1)} />}</li> : null))}</ul>
    </div>
  );
}

function Chat({ slug, table, lang, sessionId, msgs, setMsgs, profile, addMsg, menu, t, onClose, addPick, aiAdd, say, callStaff }: any) {
  const persona = menu.restaurant.persona;
  // the greeting only the first time the chat is ever opened; a reopened chat already has its messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once when the chat opens
  useEffect(() => { if (msgs.length === 0) setMsgs([{ id: "hello", role: "assistant", text: persona.greeting || t("hello") }]); }, []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setMissCount] = useState(() => trailingMisses(msgs));
  const [escalate, setEscalate] = useState(() => trailingMisses(msgs) >= ESCALATE_AFTER_MISSES);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  // the answers that are already on screen when the chat opens (a reopened chat) are not typed again
  const [typed, setTyped] = useState<Set<string>>(() => new Set(msgs.map((m: Msg) => m.id)));
  const markTyped = (id: string) => setTyped((x) => (x.has(id) ? x : new Set(x).add(id)));
  const animating = motionOk();
  const isTyping = (m: Msg) => animating && !typed.has(m.id);
  const scrollEnd = () => logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
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

  const introLines = [t("aiIntro1"), t("aiIntro2"), t("aiIntro3"), t("aiIntro4"), t("aiIntro5")];
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: this container only receives the Escape key and focus (see onPanelKeyDown); it is not a control
    <div className="ai-panel" ref={dialogRef} tabIndex={-1} onKeyDown={onPanelKeyDown}>
      <IntroCard title={t("aiIntroTitle")} lines={introLines} />
      <div ref={logRef} className="sa-chat" role="log" aria-live="polite" aria-atomic="false">
        {profile.length > 0 && <span className="ask-profile">{t("profileAvoiding")} {profile.map((a: string) => allergenName(a, lang)).join(", ")}</span>}
        {msgs.map((m: Msg) => m.role === "user" ? (
          <div key={m.id} className="sa-msg sa-msg--me" style={{ lineHeight: chatLineHeight(lang) }}>{m.text}</div>
        ) : (
          <div key={m.id} className="sa-msg sa-msg--ai" style={{ lineHeight: chatLineHeight(lang) }}>
            <div className="sa-msg__who"><span className="sa-msg__ico"><Icon name="chat" size={20} /></span>Shop AI</div>
            <div className="sa-msg__text"><Typed text={m.ingredients?.length ? (m.lead || "") : m.text} go={isTyping(m)} onDone={() => markTyped(m.id)} onTick={scrollEnd} /></div>
            {!isTyping(m) && (
              <>
                {m.ingredients?.length ? (() => { const dish = m.dishes?.[0] && (byId.get(m.dishes[0].id) || m.dishes[0]); return <IngredientPills list={m.ingredients} en={dish ? splitIngredients(dish.ingredients) : undefined} listed={dish ? dish.allergens : null} profile={profile} t={t} />; })() : null}
                {m.dishes && m.dishes.length > 0 && m.dishes.map((d) => { const cur = byId.get(d.id) || d; const name = cur.name[lang] || cur.name.en; return (
                  <div key={d.id} className="sa-mini">
                    <DishPhoto src={cur.photo_url} />
                    <div className="sa-mini__txt">{name}<br /><span className="sa-dish__alt">{priceLabel(lang, cur.price)}</span></div>
                    <button type="button" className="sa-btn sa-btn--soft sa-btn--icon sa-add" aria-label={`${t("add")} ${name}`} onClick={(e) => { addPick(cur.id); say(...addMsg(cur)); dropInto(e.currentTarget, document.querySelector("[data-cart]")); }}><Icon name="plus" /></button>
                  </div>); })}
                {m.dishes && m.dishes.length > 0 && <p className="sa-msg__foot">{t("estFoot")}</p>}
                {m.messageId && (
                  <>
                    <div className="sa-msg__rate">
                      <button type="button" aria-label={t("helpful")} aria-pressed={m.rated === 1} onClick={() => rateUp(m)}>{m.rated === 1 && <Icon name="check" size={18} />}{t("helpful")}</button>
                      <button type="button" aria-label={t("notHelpful")} aria-pressed={m.rated === -1} onClick={() => setReasonFor(reasonFor === m.id ? null : m.id)}>{t("notHelpful")}</button>
                    </div>
                    {reasonFor === m.id && (
                      // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would bring its default browser styling into the design
                      <div className="chat-reasons" role="group" aria-label={t("reasonPrompt")}>
                        {(Object.keys(REASON_KEYS) as (keyof typeof REASON_KEYS)[]).map((r) => <button type="button" key={r} className="sa-chip" onClick={() => submitReason(m, r)}>{t(REASON_KEYS[r])}</button>)}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ))}
        {busy && (
          <div className="chat-busy" role="status" aria-live="polite">
            <span className="dots" aria-hidden="true"><span /><span /><span /></span>
            <div className="chat-busy__text"><b>{t("thinking")}</b><span>{t("thinkingSub")}</span></div>
            <button type="button" className="chat-busy__link" onClick={() => callStaff()}>{t("callStaffInstead")}</button>
          </div>
        )}
        {escalate && (
          <div className="chat-escalate" role="status" aria-live="polite">
            <Icon name="alert" />
            <div style={{ flex: 1 }}>{t("escalate")}</div>
            <button type="button" className="sa-btn sa-btn--ink sa-btn--sm" onClick={() => { callStaff(); setEscalate(false); }}>{t("escalateCall")}</button>
          </div>
        )}
        {followUps.length > 0 && (
          <div className="chat-tries">
            <span className="sa-label">{t("tryAsking")}</span>
            <div className="chat-tries__chips">{followUps.map((c) => <button type="button" key={c} className="sa-chip" onClick={() => send(c)}>{c}</button>)}</div>
          </div>
        )}
      </div>
      <form className="sa-composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="sa-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("typeQ")} aria-label={t("typeQ")} maxLength={500} />
        <button className="sa-btn sa-btn--ink sa-btn--send" type="submit" aria-label="Send" disabled={busy || !text.trim()}><Icon name="arrowRight" size={22} /></button>
      </form>
    </div>
  );
}
