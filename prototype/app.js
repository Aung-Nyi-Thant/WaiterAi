/* #####################################################################
 * app.js — logic of the customer screen and the staff screens (waiter + chef). Loaded after data.js.
 * The page decides what to draw (see index.html):  index.html = customer · ?view=staff = waiter/chef · ?view=owner = owner dashboard (owner.js)
 *
 *  ── Customer app ──
 *   4  AI SERVICE ★ (TODO for dev)   5  CONFIG & STATE          6  ALLERGY (check + warning badges)
 *   7  CART                          8  UI: header/search/menu cards     9  UI: AI chat screen
 *   10 UI: cart/confirmation/more    11 UI: menu detail popup    12 RENDER (screen drawing)
 *   13 ACTIONS (button handling)     14 MAIN (customer startup)
 *  ── Staff app ──
 *   15 STAFF: waiter + chef screens with PIN login
 *
 * Text (T, SG, MODS, SP) is in i18n.js; menu / allergens / ingredients / Store are in data.js.
 * Section order matters (later sections use variables from earlier ones); do not swap
 * ##################################################################### */

/* =====================================================================
 * ▌Section 4 — AI SERVICE ★ the next dev must complete this
 * AI connection layer: chat UI is ready (see AI chat screen section); only the backend call in AIService.send() remains
 * ===================================================================== */

/* ================= AI SERVICE LAYER — TODO (next developer) =================
 * UI is finished (chat, suggestions, menu cards, add-to-cart, loading/error/retry).
 * Only the backend call below is missing. Replace the body of AIService.send().
 *
 * Contract:
 *   AIService.send(message, ctx) -> Promise<{ t, items?, qa? }>
 *   ctx   = see aiCtx(): lang ('th'|'en'|'my'), restaurant, table, allergies (keys of AL),
 *           otherAllergy (free text), cart, menu (MENU)
 *   t     : reply text, written in ctx.lang
 *   items : array of MENU ids -> rendered as cards (image, price, allergy warning, Add button)
 *   qa    : quick-action buttons, [[action, value, label], ...]  e.g. ['nav','cart','Go to cart']
 *   Throw/reject on failure -> the chat shows an error bubble with a Retry button.
 *
 * Rules (from the spec): use ONLY real menu data; never invent dishes/prices/ingredients/allergens;
 * never claim a dish is allergy-safe unless m.v (verified) is true.
 * ============================================================================ */
const aiS = () => Store.get().ai || {};   // owner's AI settings (name, greeting, tone, instructions, fallback)
const aiCtx = () => ({ lang: S.lang, restaurant: REST, table: TABLE, allergies: S.al, otherAllergy: S.other, cart: S.cart, menu: MENU, ai: aiS(), faqs: Store.get().faqs, hours: Store.get().hours });
const AIService = {
  async send(message, ctx) {
    // TODO: call your AI backend here, e.g.
    // const res=await apiCall('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,ctx})});
    // if(!res.ok)throw new Error('AI request failed');
    // return await res.json();   // -> { t, items, qa }
    await new Promise(r => setTimeout(r, 400));
    // Until a real AI backend is connected: answer from the owner's FAQ / opening hours, otherwise log the question for Insights
    const d = Store.get(), q = message.toLowerCase().trim(), w = s => s.toLowerCase().split(/[\s?,.!]+/).filter(x => x.length > 2);
    const f = (d.faqs || []).find(x => x.q && (q.includes(x.q.toLowerCase()) || x.q.toLowerCase().includes(q) || w(x.q).filter(k => q.includes(k)).length >= Math.max(1, w(x.q).length / 2)));
    if (f) return { t: f.a.replace(/</g, '&lt;') };
    if (/hours?|open|close|เปิด|ปิด/i.test(message) && d.hours) return { t: d.hours.map(h => h.d + ' ' + (h.closed ? 'Closed' : h.o + '–' + h.c)).join(' · ') };
    Store.update(x => x.unanswered.push({ q: message, t: Date.now() }));
    return { t: (aiS().fallback || t('aiTodo')).replace(/</g, '&lt;') };
  }
};
async function ask(x) {
  x = x.trim(); if (!x) return;
  S.chat.push({ r: 'u', t: x.replace(/</g, '&lt;') }, { r: 'a', typing: 1 }); render();
  let r; try { r = await AIService.send(x, aiCtx()) } catch (e) { r = { t: t('err'), retry: x } }
  S.chat.pop(); S.chat.push({ r: 'a', q: x, ...r }); render()
}

/* =====================================================================
 * ▌Section 5 — CONFIG & STATE: default values and app state
 * Default values, app state, and basic helper functions
 * Other sections of app.js and the AI SERVICE use these variables together
 * ===================================================================== */

// $ = shorthand for document.querySelector, I = language index in the translation array [Thai, English, Myanmar]
// P = URL parameters (used for shop/table from QR such as ?restaurant=HaChi%20Kyu&table=5)
const $ = s => document.querySelector(s), I = { th: 0, en: 1, my: 2 }, P = new URLSearchParams(location.search);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Shop name and table number (default values: HaChi Kyu / Table 5)
const REST = P.get('restaurant') || 'HaChi Kyu', TABLE = P.get('table') || '5';

// Entire app state (stored in memory + saved to sessionStorage via save())
let S = {
  lang: 'th',      // selected language: 'th' | 'en' | 'my'
  view: 'home',    // current screen: home | menu | ai | cart | more | confirm
  q: '',           // search text in the search box
  cat: 'all',      // selected category (key in CATS)
  cart: [],        // cart items [{id,qty,spice,mods,note,ot,k}]
  al: [],          // allergens selected by the customer (key in AL)
  other: '',       // other allergens (free-form text separated by commas)
  chat: [],        // AI chat messages [{r:'u'|'a', t, items, qa, typing, retry}]
  orders: [],      // orders placed in this session
  modal: null,     // opened popup: null | 'detail' | 'al' | 'staff' | 'bill' | 'review'
  toast: '',       // temporary notification message
  staffAt: 0,      // time of last staff call (prevents repeated clicks for 60 seconds)
  busy: false,     // order is being sent (prevents repeat clicks)
  D: null          // menu item currently open for details/customization
};
// Load previous session data (cart, language, allergies, orders) if available
try { Object.assign(S, JSON.parse(sessionStorage.getItem('shopai2') || '{}')) } catch (e) { }
// Save state that must persist to sessionStorage (no login required; disappears when tab closes)
const save = () => { try { sessionStorage.setItem('shopai2', JSON.stringify({ lang: S.lang, cart: S.cart, al: S.al, other: S.other, orders: S.orders, staffAt: S.staffAt })) } catch (e) { } };
// tr(translation array) = select the current language text (falls back to English if Myanmar translation is missing)
// t('key') = get UI text from dictionary T in 02-i18n.js
const tr = a => a[I[S.lang]] || a[1], t = k => tr(T[k]);

/* =====================================================================
 * ▌Section 6 — ALLERGY: allergen checks and warning labels
 * Allergen-check logic and warning labels on menu cards
 * ===================================================================== */

// PLANT: ingredients that are plant-based/non-animal (used to estimate a preliminary "vegetarian" status)
const PLANT = ['rice', 'seaweed', 'cucumber', 'edamame', 'tofu', 'enoki', 'shiitake', 'kingoyster', 'garlic', 'leek', 'okra', 'pumpkin', 'lettuce', 'veg', 'potato', 'sweetpotato', 'kimchi', 'noodle', 'cheese', 'batter'];
// Vegetarian? → 'Possibly (unverified)' / 'No' / 'Unknown' (never fully confirmed from the menu name alone)
const vegT = m => m.ing.length ? (m.ing.every(x => PLANT.includes(x)) ? t('vegMaybe') : t('no')) : t('unk');

// hits(menu) = list of allergens the customer has and the menu contains (checks al, ingredients, and ingredient names in free text "other")
const hits = m => {
  const o = m.al.filter(k => S.al.includes(k)).map(k => tr(AL[k])); const cu = S.other.split(/[,，]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const c = m.ing.filter(i => ingA(i).some(x => cu.some(q => x.toLowerCase().includes(q)))).map(i => tr(ingA(i))); const nm = cu.filter(q => m.n.some(x => x.toLowerCase().includes(q))); return [...new Set([...o, ...c, ...nm])]
};

// warn(menu) = HTML warning badge shown on card/detail/cart/chat
//   1) red frame "ALLERGY ALERT" if the dish contains something the customer is allergic to (includes icon + text, not only color)
//   2) "✅ Verified by the restaurant" if m.v=1
const warn = m => {
  const h = hits(m);
  let u = '';
  if (m.v) u = `<div class="vf">${t('verified')}</div>`;
  return (h.length ? `<div class="warn" role="alert">${t('alert')} ${h.join(', ')}</div>` : '') + u;
};

/* =====================================================================
 * ▌Section 7 — CART: cart logic
 * Cart logic (price, add items, aggregate duplicates)
 * 1 cart item = {id, qty, spice, mods[], note, ot('dine'|'take'), k}
 * ===================================================================== */

// item price / cart subtotal / total item count (no service fee or box fee because the restaurant does not specify them)
const price = l => byId(l.id).p * l.qty, sum = () => S.cart.reduce((a, l) => a + price(l), 0), cnt = () => S.cart.reduce((a, l) => a + l.qty, 0);

// keyOf = identifier for the "same item" (dish + spice + selections + order note + dine-in/takeaway) used to combine quantities
const keyOf = l => JSON.stringify([l.id, l.spice, l.mods, l.note, l.ot]);
// addLine = add to cart (if the same item already exists, add quantity)
function addLine(l) { const k = keyOf(l); const e = S.cart.find(x => x.k == k); if (e) e.qty += l.qty; else S.cart.push({ ...l, k }) }
// defL = default item values (quantity 1, no spice selected, dine-in)
const defL = id => ({ id: +id, qty: 1, spice: null, mods: [], note: '', ot: 'dine' });

/* =====================================================================
 * ▌Section 8 — UI: app header, search, categories, menu cards
 * UI components: app header, search, categories, menu cards
 * Every function returns an HTML string (render() composes them in the RENDER section)
 * ===================================================================== */

// card(menu) = menu card: image (emoji) → name → description (category) → warning → price/rating/button +
//   click card = open details (action 'open'), click + button = add to cart immediately (action 'quick')
const card = m => `<div class="card${m.s ? ' so' : ''}" data-a="open" data-id="${m.id}"><div class="img">${m.img ? `<img src="${m.img}" alt="${esc(tr(m.n))}" loading="lazy">` : ''}</div><div class="cb"><b>${tr(m.n)}</b><small>${tr(m.d)}</small>${m.s ? `<span class="tag so-b">${t('soldT')}</span>` : ''}${warn(m)}<div class="row"><span class="pr">฿${m.p}</span><span>${m.r ? '⭐' + m.r : ''}</span><button class="add" aria-label="${t('add')}" data-a="quick" data-id="${m.id}">+</button></div></div></div>`;

// filtered() = items matching the selected category + search term (searches across all 3 languages: name, category, ingredients)
function filtered() { const q = S.q.trim().toLowerCase(); return MENU.filter(m => (S.cat == 'all' || m.c.includes(S.cat)) && (!q || [...m.n, ...m.d, ...m.ing.flatMap(i => ingA(i)), ...m.c.flatMap(c => CATS.find(x => x[0] == c) ? CATS.find(x => x[0] == c)[2] : [])].some(x => x.toLowerCase().includes(q)))) }
// listH() = HTML for the menu list (if not found, show an empty state)
const listH = () => { const L = filtered(); return L.length ? L.map(card).join('') : `<div class="empty"><i>🔍</i>${t('empty')}</div>` };

// header() = top bar: ShopAI logo · shop name · table · staff call button 🛎️ · cart 🛒 · language switch
function header() {
  return `<header><div class="top"><div class="logo">ShopAI</div><div class="tt"><b>${REST}</b><small>${t('table')} ${TABLE}</small></div><button class="ib" data-a="modal" data-m="staff" aria-label="${t('staff')}">🛎️</button><button class="ib" data-a="nav" data-v="cart" aria-label="${t('cart')}">🛒${cnt() ? `<span class="bd">${cnt()}</span>` : ''}</button></div>
<div class="lang">${['th', 'en', 'my'].map(l => `<button data-a="lang" data-l="${l}" class="${S.lang == l ? 'on' : ''}">${{ th: 'ไทย', en: 'EN', my: 'မြန်မာ' }[l]}</button>`).join('')}</div></header>`
}

// disc(feat) = search/select menu page order: search box → category chips → (home-only: banner + featured menu) → menu grid
function disc(feat) {
  return `<div class="sb">🔍<input id="q" value="${S.q.replace(/"/g, '&quot;')}" placeholder="${t('search')}" aria-label="search"></div>
<div class="chips">${CATS.map(c => `<button class="chip ${S.cat == c[0] ? 'on' : ''}" data-a="cat" data-c="${c[0]}"><span>${c[1]}</span>${tr(c[2])}</button>`).join('')}</div>
${feat ? `<div class="hero"><div><small>${t('hello')}</small><b>${REST}</b><small>${t('hs')}</small></div><i>🍜</i></div><h2>🔥 ${t('feat')}</h2><div class="feat">${MENU.filter(m => m.c.includes('rec')).map(card).join('')}</div><h2>${t('all')}</h2>` : ''}
<div class="grid" id="list">${listH()}</div><p style="text-align:center;color:var(--sub);font-size:11px;margin-top:14px">${t('demo')}</p>`
}

/* =====================================================================
 * ▌Section 9 — UI: AI assistant chat screen
 * UI components: AI assistant chat screen
 * ===================================================================== */

// chatV() = chat screen order: AI header → greeting → chat messages (S.chat)
//   AI-side messages can be: text · menu cards with warning/add-to-cart buttons · quick action buttons · retry button on error
//   Input box and suggested questions are in render() (RENDER section)
function chatV() {
  return `<div class="aih"><i>✨</i><div><b>${aiS().name || t('aiN')}</b><br><small>${t('aiH')}</small></div></div><div class="chat">
<div class="m a">${aiS().greet ? aiS().greet.replace(/</g, '&lt;') : t('hi')}</div>${S.chat.map((c, ix) => c.typing ? `<div class="m a dots"><span></span><span></span><span></span></div>` : `<div class="m ${c.r}">${c.t}${c.r == 'a' && c.q && !c.retry ? `<div class="qa"><button data-a="wrong" data-i="${ix}" aria-label="wrong answer">👎</button></div>` : ''}${(c.items || []).map(id => { const m = byId(id); return `<div class="mc"><div class="r2">${m.img ? `<img src="${m.img}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px">` : ''}<div style="flex:1"><b>${tr(m.n)}</b><br>฿${m.p}${m.r ? ' · ⭐' + m.r : ''}</div></div>${warn(m)}<div class="r2"><button class="l" data-a="open" data-id="${id}">${t('det')}</button><button data-a="aiadd" data-id="${id}">+ ${t('add')}</button></div></div>` }).join('')}${(c.qa || []).length ? `<div class="qa">${c.qa.map(q => `<button data-a="${q[0]}" data-v="${q[1]}" data-m="${q[1]}">${q[2]}</button>`).join('')}</div>` : ''}${c.retry ? `<div class="qa"><button data-a="ask" data-t="${c.retry}">${t('retry')}</button></div>` : ''}</div>`).join('')}</div>`
}

/* =====================================================================
 * ▌Section 10 — UI: cart, order confirmation, more page
 * UI components: cart page, order confirmation page, more page
 * ===================================================================== */

// cartV() = cart page: (empty cart shows a back-to-menu button) → set all dine-in/takeaway buttons →
//   items (image · name · selections · note · dine-in/takeaway toggle button · quantity · price · remove) → subtotal/service/total → place order button
// stOf(order) = live order status text (updated by waiter/chef through Store)
const stOf = o => { const r = Store.get().orders.find(x => x.id == o.no); return t({ new: 'sNew', accepted: 'sAcc', cooking: 'sCook', ready: 'sReady', served: 'sServed', paid: 'sPaid' }[r ? r.status : 'new']) };
function cartV() {
  if (!S.cart.length) return `<div class="empty"><i>🛒</i>${t('cartE')}<button class="btn" data-a="nav" data-v="menu">${t('back')}</button></div>`;
  return `<div class="opt"><span style="align-self:center;font-weight:700">${t('setAll')}:</span><button data-a="allot" data-v="dine">🍽️ ${t('dine')}</button><button data-a="allot" data-v="take">🥡 ${t('take')}</button></div>` + S.cart.map((l, i) => { const m = byId(l.id); return `<div class="ci"><div class="img">${m.img ? `<img src="${m.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px">` : ''}</div><div style="flex:1"><b>${tr(m.n)}</b>${warn(m)}<div style="font-size:12px;color:var(--sub)">${[l.spice != null ? tr(SP[l.spice]) : '', ...l.mods.map(k => tr(MODS[k]))].filter(Boolean).join(' · ')}${l.note ? '<br>📝 ' + l.note.replace(/</g, '&lt;') : ''}</div><button class="tag" data-a="lt" data-i="${i}">${l.ot == 'take' ? '🥡 ' + t('take') : '🍽️ ' + t('dine')} ⇄</button><div class="row" style="margin-top:6px"><div class="qt"><button data-a="cq" data-i="${i}" data-d="-1">−</button>${l.qty}<button data-a="cq" data-i="${i}" data-d="1">+</button></div><span class="pr" style="text-align:right">฿${price(l)}</span><button data-a="rm" data-i="${i}" aria-label="remove">🗑️</button></div></div></div>` }).join('') +
    `<div class="tot"><span>${t('sub')}</span><span>฿${sum()}</span></div><div class="tot"><span>${t('svc')}</span><span>฿0</span></div><div class="tot b"><span>${t('total')}</span><span>฿${sum()}</span></div><button class="btn" data-a="modal" data-m="review">${t('place')}</button><button class="btn alt" data-a="nav" data-v="menu">+ ${t('back')}</button>`
}

// moreV() = "More" tab: allergy settings · call staff · check bill · placed orders
function moreV() {
  return `<button class="li" data-a="modal" data-m="al"><span>🥜</span>${t('alg')}${S.al.length || S.other ? ` <span class="tag">${S.al.length + (S.other ? 1 : 0)}</span>` : ''}</button><button class="li" data-a="modal" data-m="staff"><span>🛎️</span>${t('staff')}</button><button class="li" data-a="modal" data-m="bill"><span>🧾</span>${t('bill')}</button>
<h2>${t('orders')}</h2>${S.orders.length ? S.orders.map(o => `<div class="ci"><div style="flex:1"><b>#${o.no}</b> · ${o.items.length} ${'items'}<br><small>${stOf(o)}</small></div><b>฿${o.total}</b></div>`).join('') : `<p style="color:var(--sub)">${t('noOrd')}</p>`}`
}

// confirmV() = post-order success screen: order number · shop/table · status · estimated time · items and total
function confirmV() { const o = S.orders[S.orders.length - 1]; return `<div class="ok"><i>✅</i><h2>${t('done')}</h2></div><div class="ci" style="display:block"><div class="tot"><span>${t('ono')}</span><b>#${o.no}</b></div><div class="tot"><span>${REST}</span><b>${t('table')} ${TABLE}</b></div><div class="tot"><span>${t('st')}</span><b>${stOf(o)}</b></div><div class="tot"><span></span><small>${t('eta')}</small></div><hr>${o.items.map(l => `<div class="tot"><span>${byId(l.id).e} ${tr(byId(l.id).n)} ×${l.qty}${l.ot == 'take' ? ' 🥡' : ''}</span><span>฿${price(l)}</span></div>`).join('')}<div class="tot b"><span>${t('total')}</span><span>฿${o.total}</span></div></div><button class="btn" data-a="nav" data-v="menu">${t('back')}</button>` }

/* =====================================================================
 * ▌Section 11 — UI: menu details and pop-up windows
 * UI components: menu detail sheet and various pop-up windows
 * ===================================================================== */

// detail() = menu detail screen (full-screen slide-up sheet) in top-to-bottom order:
//   image → name + price → description → warning badge → ingredients → vegetarian/allergen info →
//   dine-in/takeaway → spice (only for m.sp) → customization options + special requests (only for m.cz) →
//   quantity + total → add-to-cart button
function detail() {
  const D = S.D, m = byId(D.id), tot = m.p * D.qty; return `<div class="ov" data-a="closeM"><div class="sh"><div class="big">${m.img ? `<img src="${m.img}" alt="${esc(tr(m.n))}">` : ''}</div><div class="pad"><div class="row"><h2 style="margin:0;flex:1">${tr(m.n)}</h2><span class="pr" style="flex:none">฿${m.p}</span></div><p style="color:var(--sub);font-size:14px;margin:6px 0">${tr(m.d)}</p>${warn(m)}
<h2>${t('ing')}</h2>${m.ing.length ? m.ing.map(i => `<span class="tag">${tr(ingA(i))}</span>`).join('') : `<span class="tag">${t('noIng')}</span>`}
<p style="margin-top:8px;font-size:13px">🥗 ${t('diet')}: <b>${vegT(m)}</b> · 🚫 ${t('al')}: <b>${m.al.length ? m.al.map(k => tr(AL[k])).join(', ') : t('none')}</b></p>
<h2>🍽️ ${t('otype')}</h2><div class="opt"><button class="${D.ot == 'dine' ? 'on' : ''}" data-a="dot" data-v="dine">🍽️ ${t('dine')}</button><button class="${D.ot == 'take' ? 'on' : ''}" data-a="dot" data-v="take">🥡 ${t('take')}</button></div>
${m.sp ? `<h2>🌶️ ${t('spice')}</h2><div class="opt">${SP.map((s, i) => `<button class="${D.spice == i ? 'on' : ''}" data-a="spice" data-i="${i}">${tr(s)}</button>`).join('')}</div>` : ''}
${m.cz ? `<h2>${t('mods')}</h2><div class="opt">${Object.keys(MODS).map(k => `<button class="${D.mods.includes(k) ? 'on' : ''}" data-a="mod" data-k="${k}">${tr(MODS[k])}</button>`).join('')}</div><h2>${t('note')}</h2><textarea rows="2" id="note">${D.note}</textarea>` : ''}
<div class="row" style="margin-top:14px"><div class="qt"><button data-a="dq" data-d="-1">−</button>${D.qty}<button data-a="dq" data-d="1">+</button></div><span class="pr" style="text-align:right;font-size:20px">฿${tot}</span></div>
<button class="btn" data-a="addD">${t('add')} · ฿${tot}</button><button class="btn alt" data-a="closeM">${t('close')}</button></div></div></div>`
}

// modal() = popup window based on S.modal:
//   'detail' → detail() | 'al' → allergy settings | 'staff' → confirm staff call |
//   'bill' → request bill check | 'review' → confirm order before placing
function modal() {
  const M = S.modal; if (!M) return ''; if (M == 'detail') return detail();
  let b = ''; if (M == 'al') b = `<h2 style="margin-top:0">🥜 ${t('alg')}</h2><div class="opt">${Object.keys(AL).map(k => `<button class="${S.al.includes(k) ? 'on' : ''}" data-a="algT" data-k="${k}">${tr(AL[k])}</button>`).join('')}</div><input class="in" id="oth" value="${S.other}" placeholder="${t('other')}"><p style="font-size:12px;color:var(--sub);margin-top:8px">${t('algNote')}</p><button class="btn" data-a="algS">${t('algS')}</button>`;
  if (M == 'staff') b = `<h2 style="margin-top:0">🛎️ ${t('staff')}</h2><p>${t('staffQ')}</p><p style="color:var(--sub);font-size:13px">${REST} · ${t('table')} ${TABLE}</p><button class="btn" data-a="staffGo">${t('confirm')}</button><button class="btn alt" data-a="closeM">${t('cancel')}</button>`;
  if (M == 'bill') { const tt = S.orders.reduce((a, o) => a + o.total, 0); b = `<h2 style="margin-top:0">🧾 ${t('bill')}</h2>${S.orders.length ? S.orders.map(o => `<div class="tot"><span>#${o.no}</span><span>฿${o.total}</span></div>`).join('') + `<div class="tot b"><span>${t('total')}</span><span>฿${tt}</span></div><p>${t('billQ')}</p><button class="btn" data-a="billGo">${t('confirm')}</button>` : `<p>${t('noOrd')}</p>`}<button class="btn alt" data-a="closeM">${t('cancel')}</button>` }
  if (M == 'review') b = `<h2 style="margin-top:0">${t('review')}</h2><p><b>${REST}</b> · ${t('table')} ${TABLE}</p>${S.cart.map(l => `<div class="tot"><span>${byId(l.id).e} ${tr(byId(l.id).n)} ×${l.qty}${l.ot == 'take' ? ' 🥡' : ''}</span><span>฿${price(l)}</span></div>`).join('')}<div class="tot b"><span>${t('total')}</span><span>฿${sum()}</span></div><button class="btn" data-a="placeGo" ${S.busy ? 'disabled' : ''}>${S.busy ? '⏳ ...' : t('confirm')}</button><button class="btn alt" data-a="closeM">${t('cancel')}</button>`;
  return `<div class="ov c" data-a="closeM"><div class="sh">${b}</div></div>`
}

/* =====================================================================
 * ▌Section 12 — RENDER: main screen drawing
 * Main screen drawing logic
 * How it works: change state (S) then call render() → rebuild the entire page
 * ===================================================================== */

// nav() = bottom menu bar: home · menu · AI assistant (highlighted round button) · cart · more
function nav() { const n = (v, i, l, c = '') => `<button class="${c} ${S.view == v ? 'on' : ''}" data-a="nav" data-v="${v}"><span>${i}</span>${l}</button>`; return `<nav>${n('home', '🏠', t('home'))}${n('menu', '📖', t('menu'))}${n('ai', '✨', t('ai'), 'aib')}${n('cart', '🛒', t('cart'))}${n('more', '☰', t('more'))}</nav>` }

// render() = compose screen: header + content based on S.view + (AI page: suggested questions + input) + nav + modal + toast
function render() {
  const _cs = document.querySelector(".chips"), _sx = _cs ? _cs.scrollLeft : 0; const v = S.view, bd = v == 'home' ? disc(1) : v == 'menu' ? disc(0) : v == 'ai' ? chatV() : v == 'cart' ? cartV() : v == 'more' ? moreV() : confirmV();
  const ai = v == 'ai'; $('#app').innerHTML = header() + `<main ${ai ? 'style="padding-bottom:8px"' : ''}>${bd}</main>` + (ai ? `<div style="padding-bottom:90px;background:#fff"><div class="sg" style="padding:6px 12px">${SG.map(r => r[I[S.lang]]).filter(Boolean).map(x => `<button data-a="ask" data-t="${x.replace(/"/g, '&quot;')}">${x}</button>`).join('')}</div><div class="inb"><input id="ci" placeholder="${t('ph')}"><button data-a="send" aria-label="send">➤</button></div></div>` : '') + nav() + modal() + (S.toast ? `<div class="toast" role="status">${S.toast}</div>` : '');
  document.documentElement.lang = S.lang; { const c = document.querySelector(".chips"); if (c) { c.style.scrollSnapType = "none"; c.scrollLeft = _sx; const on = c.querySelector(".chip.on"); if (on && (on.offsetLeft < c.scrollLeft || on.offsetLeft + on.offsetWidth > c.scrollLeft + c.clientWidth)) c.scrollTo({ left: on.offsetLeft - (c.clientWidth - on.offsetWidth) / 2, behavior: "smooth" }); requestAnimationFrame(() => { c.style.scrollSnapType = "" }) } } if (ai) { const m = $('main'); m.scrollTop = m.scrollHeight } save()
}

// toast(message) = short notification for 2.2 seconds
const toast = x => { S.toast = x; render(); setTimeout(() => { S.toast = ''; render() }, 2200) };

/* =====================================================================
 * ▌Section 13 — ACTIONS: all button actions
 * Handles all button actions
 * Buttons in HTML specify data-a="action name" (+ data-xxx are parameters), and MAIN sends them to A[name]
 *   lang/nav/cat       switch language/page/category     open/closeM/modal  open/close pop-up
 *   quick/aiadd/addD   add to cart                       spice/mod/dq/dot   adjust item details
 *   cq/rm/lt/allot     edit cart                         algT/algS          set allergy preferences
 *   staffGo/billGo     call staff/check bill            placeGo            confirm order (prevent double taps)
 *   ask/send           chat AI
 * ===================================================================== */

const A = {
  lang: e => { S.lang = e.l; render() }, nav: e => { S.view = e.v; S.modal = null; render() }, cat: e => { S.cat = e.c; render() },
  open: e => { S.D = { ...defL(e.id) }; S.modal = 'detail'; render() }, closeM: () => { S.modal = null; render() }, modal: e => { S.modal = e.m; render() },
  quick: e => { if (byId(e.id).s) return toast('⛔ ' + t('soldT')); addLine(defL(e.id)); toast('✅ ' + tr(byId(e.id).n)) },
  aiadd: e => { if (byId(e.id).s) return toast('⛔ ' + t('soldT')); addLine(defL(e.id)); S.chat.push({ r: 'a', t: t('added'), qa: [['nav', 'cart', '🛒 ' + t('goC')]] }); render() },
  spice: e => { S.D.spice = S.D.spice == +e.i ? null : +e.i; render() }, dot: e => { S.D.ot = e.v; render() }, lt: e => { const l = S.cart[e.i]; l.ot = l.ot == 'take' ? 'dine' : 'take'; l.k = keyOf(l); render() }, allot: e => { S.cart.forEach(l => { l.ot = e.v; l.k = keyOf(l) }); render() }, mod: e => { const m = S.D.mods, i = m.indexOf(e.k); i < 0 ? m.push(e.k) : m.splice(i, 1); render() },
  dq: e => { S.D.qty = Math.max(1, S.D.qty + +e.d); render() }, addD: () => { if (byId(S.D.id).s) return toast('⛔ ' + t('soldT')); const nt = $('#note'); if (nt) S.D.note = nt.value; addLine(S.D); S.modal = null; toast('✅ ' + t('add')) },
  cq: e => { const l = S.cart[e.i]; l.qty += +e.d; if (l.qty < 1) S.cart.splice(e.i, 1); render() }, rm: e => { S.cart.splice(e.i, 1); render() },
  algT: e => { const i = S.al.indexOf(e.k); i < 0 ? S.al.push(e.k) : S.al.splice(i, 1); S.other = $('#oth').value; render() }, algS: () => { S.other = $('#oth').value; S.modal = null; toast(t('saved')) },
  staffGo: () => { if (Date.now() - S.staffAt < 60000) { S.modal = null; return toast(t('wait')) } S.staffAt = Date.now(); Store.update(d => { if (!d.calls.some(c => c.table == TABLE && !c.done)) d.calls.push({ id: Date.now().toString(36), table: TABLE, t: Date.now(), done: 0 }) }); S.modal = null; toast(t('staffOk')) },
  billGo: () => { Store.update(d => { if (!d.bills.some(b => b.table == TABLE && !b.done)) d.bills.push({ id: Date.now().toString(36), table: TABLE, total: S.orders.reduce((a, o) => a + o.total, 0), t: Date.now(), done: 0 }) }); S.modal = null; toast(t('billOk')) },
  placeGo: () => { if (S.busy || !S.cart.length) return; S.busy = true; render(); setTimeout(() => { const o = { no: 'HK' + TABLE + '-' + (1000 + Math.floor(Math.random() * 9000)), items: S.cart, total: sum() }; S.orders.push(o); Store.update(d => d.orders.push({ id: o.no, no: o.no, table: TABLE, items: o.items.map(l => ({ ...l })), total: o.total, status: 'new', t: Date.now(), al: [...S.al.map(k => AL[k][1]), ...(S.other ? [S.other] : [])] })); S.cart = []; S.busy = false; S.modal = null; S.view = 'confirm'; render() }, 1200) },
  wrong: e => { const c = S.chat[e.i]; if (!c || !c.q) return; Store.update(d => d.wrong.push({ q: c.q, a: String(c.t).replace(/<[^>]*>/g, ''), t: Date.now() })); c.q = 0; toast(t('saved')) }, ask: e => ask(e.t), send: () => { const i = $('#ci'); const v = i.value; i.value = ''; ask(v) }
};

/* =====================================================================
 * ▌Section 14 — MAIN: app startup
 * App startup: attach events and draw the first screen
 * ===================================================================== */

document.addEventListener('click', ev => { const el = ev.target.closest('[data-a]'); if (el && A[el.dataset.a]) { if (el.classList.contains('ov') && ev.target !== el) return; ev.stopPropagation(); A[el.dataset.a](el.dataset) } });
document.addEventListener('input', e => { if (e.target.id == 'note' && S.D) S.D.note = e.target.value; if (e.target.id == 'q') { S.q = e.target.value; $('#list').innerHTML = listH() } });
document.addEventListener('keydown', e => { if (e.key == 'Enter' && e.target.id == 'ci') A.send() });
/* Desktop horizontal scroll for category chips / featured row: mouse-wheel + click-drag (touch scrolls natively) */
(() => {
  const SEL = ".chips,.feat"; let el = null, x0 = 0, s0 = 0, moved = false;
  document.addEventListener("wheel", e => { const c = e.target.closest(SEL); if (c && Math.abs(e.deltaY) > Math.abs(e.deltaX) && c.scrollWidth > c.clientWidth) { c.scrollLeft += e.deltaY; e.preventDefault() } }, { passive: false });
  document.addEventListener("mousedown", e => { if (e.button !== 0) return; el = e.target.closest(SEL); if (el) { x0 = e.clientX; s0 = el.scrollLeft; moved = false } });
  document.addEventListener("mousemove", e => { if (!el) return; const dx = e.clientX - x0; if (!moved && Math.abs(dx) > 5) { moved = true; el.classList.add("drag") } if (moved) el.scrollLeft = s0 - dx });
  document.addEventListener("mouseup", () => { if (el) { const c = el; if (moved) setTimeout(() => c.classList.remove("drag"), 0); el = null } });
  document.addEventListener("click", e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false } }, true);
})();
// Staff / owner views set window.STAFF_MODE (index.html) → only the data above is used, customer screen is not drawn
if (!window.STAFF_MODE) {
  S.cart = S.cart.filter(l => byId(l.id));   // drop dishes the owner deleted
  // Staff changes (order status / sold-out menu) arrive here in realtime; skip redraw while the customer is typing
  Store.on(() => { applyMenu(); syncSold(); S.cart = S.cart.filter(l => byId(l.id)); const a = document.activeElement; if (!(a && /INPUT|TEXTAREA/.test(a.tagName))) render() });
  render();
}

/* =====================================================================
 * ▌Section 15 — STAFF: waiter + chef screens (PIN login)
 * Shown on index.html?view=staff — uses Store (data.js) for orders / calls / bills / sold-out and the menu data above
 * ===================================================================== */

/* staff.js — Staff app: Waiter + Chef (PIN login). Data comes from Store (store.js); menu data from app.js.
 * Flow: customer places order (new) → waiter accepts (accepted) → chef starts (cooking) → chef done (ready)
 *       → waiter serves (served) → customer requests bill → waiter collects payment (paid) */
(() => {
  if (window.APP_VIEW !== 'staff') return;   // only run on index.html?view=staff
  const PIN = { waiter: '1111', chef: '2222' };   // demo PINs (client-side only — move to a backend for production)
  const TABS = {
    waiter: [['calls', '🛎️', 'Calls'], ['orders', '📋', 'Orders'], ['ready', '🍽️', 'Serve'], ['bills', '🧾', 'Bills'], ['menu', '📖', 'Menu']],
    chef: [['todo', '📥', 'To cook'], ['cook', '🔥', 'Cooking'], ['menu', '📖', 'Menu']]
  };
  const ST = { new: 'New', accepted: 'Waiting for chef', cooking: 'Cooking', ready: 'Ready to serve', served: 'Served', paid: 'Paid' };
  const root = document.getElementById('app');
  const saved = sessionStorage.getItem('shopai_staff');
  let U = { role: PIN[saved] ? saved : '', tab: '', pin: '', pick: 'waiter', q: '', cat: 'all', toast: '' }, D = Store.get(), seen = new Set(), keep = true, tm, ac;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ago = ts => { const m = Math.floor((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m + ' min ago' };
  const byS = s => D.orders.filter(o => o.status == s).sort((a, b) => a.t - b.t);
  const typing = () => /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '');
  const beep = () => { try { ac = ac || new (window.AudioContext || webkitAudioContext)(); ac.resume(); const o = ac.createOscillator(); o.connect(ac.destination); o.frequency.value = 880; o.start(); o.stop(ac.currentTime + .3) } catch (e) { } };

  /* ---- components ---- */
  const tags = l => [l.spice != null ? '🌶️ ' + SP[l.spice][1] : '', ...(l.mods || []).map(k => MODS[k][1]), l.ot == 'take' ? '🥡 Takeaway' : '🍽️ Dine in'].filter(Boolean).map(x => `<span class="tag">${x}</span>`).join('');
  const line = l => { const m = byId(l.id) || { img: '', n: ['', '(removed dish)'] }; return `<div class="ln"><b>${m.img ? `<img src="${m.img}" alt="" style="width:20px;height:20px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px">` : ''}${esc(m.n[1])}</b> <span class="q">×${l.qty}</span><div>${tags(l)}</div>${l.note ? `<div class="nt">📝 ${esc(l.note)}</div>` : ''}</div>` };
  const btn = (a, id, txt, c = '') => `<button class="btn ${c}" data-s="${a}" data-id="${id}">${txt}</button>`;
  const oc = (o, act, showSt) => `<div class="ci os ${o.status}"><div style="flex:1;min-width:0"><div class="top"><b style="font-size:18px">Table ${esc(o.table)}</b><span class="tag">#${esc(o.no)}</span>${showSt ? `<span class="tag st">${ST[o.status]}</span>` : ''}<small class="ago">${ago(o.t)}</small></div>${o.al && o.al.length ? `<div class="warn" style="margin:6px 0">⚠️ Customer allergy: ${o.al.map(esc).join(', ')}</div>` : ''}${o.items.map(line).join('')}<div class="tot b"><span>Total</span><span>฿${o.total}</span></div>${act || ''}</div></div>`;
  const list = (a, f, em) => a.length ? a.map(f).join('') : `<div class="empty"><i>${em[0]}</i>${em[1]}</div>`;

  const ml = () => { const q = U.q.trim().toLowerCase(); return MENU.filter(m => (U.cat == 'all' || m.c.includes(U.cat)) && (!q || m.n.some(x => x.toLowerCase().includes(q)))).map(m => { const x = D.soldout.includes(m.id); return `<div class="ci mr ${x ? 'x' : ''}">${m.img ? `<img src="${m.img}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:8px;margin-right:10px">` : ''}<div style="flex:1;min-width:0"><b>${esc(m.n[1])}</b><br><small>฿${m.p}</small></div><button class="swt ${x ? 'x' : ''}" data-s="sold" data-id="${m.id}">${x ? '❌ Sold out' : '✅ In stock'}</button></div>` }).join('') || '<div class="empty"><i>🔍</i>No dishes found</div>' };

  /* ---- screens (tab key → HTML) ---- */
  const V = {
    calls: () => list(D.calls.filter(c => !c.done).sort((a, b) => a.t - b.t), c => `<div class="ci os new"><div style="flex:1"><div class="top"><b style="font-size:20px">🛎️ Table ${esc(c.table)}</b><small class="ago">${ago(c.t)}</small></div><p>Customer is calling for staff</p>${btn('callDone', c.id, '✅ Acknowledged')}</div></div>`, ['😌', 'No tables are calling right now']),
    orders: () => { const n = byS('new'), p = [...byS('accepted'), ...byS('cooking')]; return `<h2>🆕 New orders (${n.length})</h2>` + list(n, o => oc(o, btn('accept', o.id, '👍 Accept order → send to chef')), ['📋', 'No new orders']) + `<h2>👨‍🍳 In the kitchen (${p.length})</h2>` + list(p, o => oc(o, '', 1), ['🍳', 'No orders in the kitchen']) },
    ready: () => list(byS('ready'), o => oc(o, btn('serve', o.id, '🍽️ Mark as served', 'dk')), ['🍽️', 'Nothing waiting to be served']),
    bills: () => list(D.bills.filter(b => !b.done).sort((a, b) => a.t - b.t), b => { const os = D.orders.filter(o => o.table == b.table && o.status != 'paid'), tt = os.reduce((a, o) => a + o.total, 0), pend = os.filter(o => o.status != 'served'); return `<div class="ci os ready"><div style="flex:1"><div class="top"><b style="font-size:20px">🧾 Table ${esc(b.table)}</b><small class="ago">${ago(b.t)}</small></div>${os.map(o => `<div class="tot"><span>#${esc(o.no)}</span><span>฿${o.total}</span></div>`).join('')}<div class="tot b"><span>Amount to collect</span><span>฿${tt}</span></div>${pend.length ? `<div class="warn">⚠️ ${pend.length} order(s) not served yet</div>` : ''}${btn('paid', b.id, '💵 Payment received')}</div></div>` }, ['🧾', 'No bill requests']),
    todo: () => list(byS('accepted'), o => oc(o, btn('start', o.id, '🔥 Start cooking')), ['📥', 'No orders waiting to cook']),
    cook: () => list(byS('cooking'), o => oc(o, btn('done', o.id, '✅ Ready to serve', 'dk')), ['🔥', 'No orders being cooked']),
    menu: () => { const n = D.soldout.length; return `<div class="sb">🔍<input id="sq" value="${esc(U.q)}" placeholder="Search dishes..."></div><div class="chips">${CATS.map(c => `<button class="chip ${U.cat == c[0] ? 'on' : ''}" data-s="cat" data-c="${c[0]}"><span>${c[1]}</span>${c[2][1]}</button>`).join('')}</div><div class="top" style="margin:4px 0 8px"><b style="flex:1">Sold-out items: ${n}</b>${n ? '<button class="tag" data-s="reset">Clear all</button>' : ''}</div><div id="ml">${ml()}</div>` }
  };
  const cnt = k => ({ calls: () => D.calls.filter(c => !c.done).length, orders: () => byS('new').length, ready: () => byS('ready').length, bills: () => D.bills.filter(b => !b.done).length, todo: () => byS('accepted').length, cook: () => byS('cooking').length }[k] || (() => 0))();
  const toastH = () => U.toast ? `<div class="toast" role="status">${U.toast}</div>` : '';

  const login = () => `<main style="display:flex;flex-direction:column;justify-content:center;padding-bottom:24px"><div style="text-align:center"><div class="logo" style="display:inline-block;font-size:22px;padding:6px 16px">ShopAI</div><h2 style="margin-top:12px">${REST} · Staff login</h2></div><div class="lang" style="margin:12px auto">${['waiter', 'chef'].map(r => `<button data-s="pick" data-v="${r}" class="${U.pick == r ? 'on' : ''}">${r == 'waiter' ? '🧑‍🍽️ Waiter' : '👨‍🍳 Chef'}</button>`).join('')}</div><p style="text-align:center;color:var(--sub)">Enter your 4-digit PIN</p><div class="pin">${[0, 1, 2, 3].map(i => `<i class="${i < U.pin.length ? 'f' : ''}"></i>`).join('')}</div><div class="kp">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-s="k" data-v="${k}">${k}</button>`).join('')}</div></main>` + toastH();

  const app = () => {
    const tb = TABS[U.role]; if (!tb.some(x => x[0] == U.tab)) U.tab = tb[0][0];
    return `<header><div class="top"><div class="logo">ShopAI</div><div class="tt"><b>${REST}</b><small>${U.role == 'waiter' ? '🧑‍🍽️ Waiter' : '👨‍🍳 Chef'}</small></div><button class="ib" data-s="logout" aria-label="Log out">🔒</button></div></header><main>${V[U.tab]()}</main><nav>${tb.map(x => { const n = cnt(x[0]); return `<button class="${U.tab == x[0] ? 'on' : ''}" data-s="tab" data-v="${x[0]}"><span>${x[1]}</span>${x[2]}${n ? `<b class="bd">${n}</b>` : ''}</button>` }).join('')}</nav>` + toastH()
  };

  function R() {
    const m = root.querySelector('main'), sy = keep && m ? m.scrollTop : 0, c = root.querySelector('.chips'), sx = c ? c.scrollLeft : 0; keep = true;
    root.innerHTML = U.role ? app() : login();
    const m2 = root.querySelector('main'), c2 = root.querySelector('.chips'); if (m2) m2.scrollTop = sy; if (c2) c2.scrollLeft = sx
  }
  const say = x => { U.toast = x; R(); clearTimeout(tm); tm = setTimeout(() => { U.toast = ''; R() }, 2200) };

  /* ---- realtime: "new" items for the current role (used for beep + toast) ---- */
  const keys = () => new Set((U.role == 'chef' ? D.orders.filter(o => o.status == 'accepted') : [...D.calls.filter(c => !c.done), ...D.orders.filter(o => o.status == 'new' || o.status == 'ready'), ...D.bills.filter(b => !b.done)]).map(x => x.id + (x.status || '')));
  Store.on(d => { D = d; applyMenu(); if (!U.role) return; const k = keys(), fresh = [...k].some(x => !seen.has(x)); seen = k; if (fresh) beep(); if (!typing()) fresh ? say('🔔 New activity') : R() });
  setInterval(() => { if (U.role && !typing()) R() }, 30000);   // refresh "x minutes ago"

  /* ---- actions ---- */
  const up = Store.update, ord = (id, from, to) => up(d => { const o = d.orders.find(x => x.id == id); if (o && o.status == from) o.status = to });
  const H = {
    pick: e => { U.pick = e.v; U.pin = ''; R() },
    k: e => {
      if (e.v == '⌫') U.pin = U.pin.slice(0, -1); else if (U.pin.length < 4) U.pin += e.v;
      if (U.pin.length == 4) { if (Store.get().staff.some(a => a.role == U.pick && a.pass == U.pin)) { U.role = U.pick; U.tab = ''; U.pin = ''; sessionStorage.setItem('shopai_staff', U.role); D = Store.get(); seen = keys(); beep() } else { U.pin = ''; return say('❌ Wrong PIN') } } R()
    },
    logout: () => { U.role = ''; sessionStorage.removeItem('shopai_staff'); R() },
    tab: e => { U.tab = e.v; keep = false; R() }, cat: e => { U.cat = e.c; R() },
    accept: e => ord(e.id, 'new', 'accepted'), start: e => ord(e.id, 'accepted', 'cooking'), done: e => ord(e.id, 'cooking', 'ready'), serve: e => ord(e.id, 'ready', 'served'),
    callDone: e => up(d => { const c = d.calls.find(x => x.id == e.id); if (c) c.done = 1 }),
    paid: e => up(d => { const b = d.bills.find(x => x.id == e.id); if (!b) return; b.done = 1; d.orders.forEach(o => { if (o.table == b.table && o.status != 'paid') o.status = 'paid' }) }),
    sold: e => up(d => { const i = d.soldout.indexOf(+e.id); i < 0 ? d.soldout.push(+e.id) : d.soldout.splice(i, 1) }),
    reset: () => up(d => { d.soldout = [] })
  };
  root.addEventListener('click', ev => { const el = ev.target.closest('[data-s]'); if (el && H[el.dataset.s]) H[el.dataset.s](el.dataset) });
  document.addEventListener('input', e => { if (e.target.id == 'sq') { U.q = e.target.value; document.getElementById('ml').innerHTML = ml() } });

  if (U.role) seen = keys();
  R();
})();
