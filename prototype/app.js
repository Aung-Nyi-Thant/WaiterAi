// Shop AI clickable prototype: core, diner and staff journeys. Everything is in memory; nothing is saved or sent anywhere.
(function () {
  "use strict";
  const I = window.I18N, $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const TABLE = "5";
  window.P = { esc, clone };           // shared with owner.js

  // ---------------------------------------------------------------- state
  function fresh() {
    return {
      tab: "diner",
      d: { lang: "en", cat: 0, q: "", f: { veg: false, noPeanut: false, u100: false, spicy: false, mine: false }, profile: [], detail: null, sheet: null, picks: [], chat: [], draft: "", said: [] },
      sys: { aiOffline: false, modelMisbehaves: false, noConnection: false, staffOffline: false },
      dishes: clone(window.DISH_SEED), cats: clone(window.CATS),
      orders: [], calls: [], nextOrder: 101, lateMinutes: 0,
      staff: { screen: "login", role: null, pin: "", fails: 0, locked: false, tab: "calls", err: "", ok: "" },
      owner: { signedIn: false, page: "menu", err: "", register: false, editing: null, form: null, importStep: 0, importRows: [], tables: 12, base: "http://192.168.1.20:3000", hours: { open: "10:00", close: "22:00", last: "21:30" }, faqs: [{ q: "Is there Wi-Fi?", a: window.RESTAURANT.wifi }, { q: "Is there parking?", a: "Free parking behind the building, 20 spaces." }], rules: "", ai: { name: "AI Waiter", voice: "female", tone: "friendly", greeting: "", upsell: true }, staffList: [{ id: 1, name: "Waiter 1", role: "waiter", pin: "1111" }, { id: 2, name: "Chef 1", role: "chef", pin: "2222" }], err2: "", ok2: "" },
      stats: { chats: 0, fromData: 0, unanswered: [], wrong: [], profiles: {}, },
    };
  }
  let S = fresh();
  window.PS = () => S;

  // ---------------------------------------------------------------- small helpers
  const t = (k) => (I.dict[S.d.lang][k] ?? I.dict.en[k] ?? k);
  const money = (p) => (S.d.lang === "my" ? `${String(p).replace(/\d/g, (c) => "၀၁၂၃၄၅၆၇၈၉"[+c])} ဘတ်` : `฿ ${p}`);
  const nm = (d, l = S.d.lang) => d.name[l] || d.name.en;
  const aName = (a, l = S.d.lang) => (I.allergenNames[l] || I.allergenNames.en)[a] || a;
  const dish = (id) => S.dishes.find((d) => d.id === id);
  const catName = (id) => (S.cats.find((c) => c.id === id) || { en: "" }).en;
  // The allergens a dish lists that are in the diner's profile; "unknown" when the dish has no allergen data and a profile is set (never "fine").
  const clash = (d, profile) => (!profile.length ? null : d.allergens === null ? "unknown" : d.allergens.filter((a) => profile.includes(a)).length ? d.allergens.filter((a) => profile.includes(a)) : null);
  let toastTimer;
  function toast(msg, bad) { const el = $("#toast"); el.textContent = msg; el.className = "toast on" + (bad ? " bad" : ""); clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.className = "toast"), 2600); }
  window.P.toast = toast; window.P.render = () => render();
  const covers = (html) => `<div class="covers"><b>Covers:</b> ${html}</div>`;
  const STAFF_SAFE = { en: "Please confirm with the staff before ordering.", th: "กรุณายืนยันกับพนักงานก่อนสั่งอาหาร", my: "မှာယူမီ ဝန်ထမ်းကို အတည်ပြုမေးမြန်းပေးပါ" };
  const confirmStaff = () => STAFF_SAFE[S.d.lang];

  // ---------------------------------------------------------------- AI (a scripted stand-in: the real app uses rules + a local model)
  const ALW = { peanut: ["peanut", "ถั่วลิสง"], shellfish: ["shellfish", "shrimp", "prawn", "กุ้ง"], egg: ["egg", "ไข่"], fish: ["fish", "ปลา"], milk: ["milk", "dairy", "นม"], soy: ["soy"], gluten: ["gluten", "wheat"], sesame: ["sesame", "งา"], tree_nut: ["tree nut", "cashew", "almond"] };
  const allergensIn = (text) => Object.keys(ALW).filter((a) => ALW[a].some((w) => text.includes(w)));
  const dishIn = (text) => S.dishes.find((d) => [d.name.en, d.name.th, d.name.my, d.id.replace(/_/g, " ")].some((n) => n && text.includes(n.toLowerCase())) || (d.id === "thai_tea" && /iced tea/.test(text)) || (d.id === "pad_thai" && /pad thai/.test(text)) || (d.id === "coconut_ice" && /ice cream/.test(text)) || (d.id === "massaman" && /massaman/.test(text)));
  const list = (ds) => ds.map((d) => `${nm(d)} (${money(d.price)})`).join(", ");
  function reply(text, o = {}) { return Object.assign({ text, dishes: [], kind: "data", answered: true }, o); }
  function createCall(kind) {
    const open = S.calls.find((c) => c.table === TABLE && c.kind === kind && c.open);
    if (open) return false;
    S.calls.push({ id: S.calls.length + 1, table: TABLE, kind, open: true, at: Date.now() });
    return true;
  }
  function aiAnswer(raw) {
    const text = raw.toLowerCase().trim();
    const p = S.d.profile;
    // AI-8: an attempt to change or reveal the rules gets a fixed refusal, whatever the model would say
    if (/ignore (your|all|the|previous)|system prompt|you are now|reveal your|forget your/.test(text)) return reply("I can only help with this restaurant's menu, prices, opening hours and your order. I can't change or show my rules.", { kind: "rule" });
    // AI-7: the bill or the staff
    if (/\b(bill|check please|call (the )?(staff|waiter))\b|เช็คบิล|เรียกพนักงาน/.test(text)) {
      const made = createCall("bill");
      return reply(made ? t("billRequested") : "A staff call for your table is already open. They are on the way.", { kind: "staff", action: "call" });
    }
    const named = dishIn(text);
    // AI-6: order wording adds to the picks (it never places an order itself)
    if (/(i'?ll have|i will have|i want|i would like|i'd like|can i have|give me|order)\b/.test(text) && named) {
      const m = text.match(/(\d+)\s*(x|×)?\s*/) || text.match(/[x×]\s*(\d+)/);
      const qty = Math.max(1, Math.min(20, m ? Number(m[1]) : 1));
      if (!named.available) return reply(`${nm(named)} is sold out today, so I did not add it. ${list(S.dishes.filter((d) => d.available && d.cat === named.cat))} ${S.dishes.some((d) => d.available && d.cat === named.cat) ? "are available instead." : ""}`.trim(), { kind: "data" });
      addPick(named.id, qty, true);
      const c = clash(named, p);
      return reply(`Added to your picks: ${qty > 1 ? qty + "× " : ""}${nm(named)}. Tap "${t("showToWaiter")}" when you're ready.` + (c ? ` ⚠ ${c === "unknown" ? t("allergenUnknown") : "lists " + c.map((a) => aName(a)).join(", ")}: the staff will be told.` : ""), { dishes: [named], kind: "data" });
    }
    // AI-2 / AI-3: allergy questions come from the allergen data; a dish is never called "safe"
    const als = allergensIn(text);
    if (/safe|allerg|แพ้|without|free|no \w+ in/.test(text) && (named || als.length)) {
      S.d.said = [...new Set([...S.d.said, ...als])];
      if (named) {
        const al = named.allergens;
        const body = al === null ? `Allergen information is not provided for ${nm(named)}.` : al.length ? `${nm(named)} lists these allergens: ${al.map((a) => aName(a)).join(", ")}.` : `${nm(named)} has no allergens listed.`;
        return reply(`${body} I can't say a dish is safe for you. ${confirmStaff()}`, { dishes: [named], kind: "data" });
      }
      const has = S.dishes.filter((d) => d.allergens && als.some((a) => d.allergens.includes(a)));
      const unknown = S.dishes.filter((d) => d.allergens === null);
      return reply(`Dishes that list ${als.map((a) => aName(a)).join(" / ")}: ${list(has) || "none"}.${unknown.length ? ` No allergen data for: ${unknown.map((d) => nm(d)).join(", ")}.` : ""} ${confirmStaff()}`, { dishes: has, kind: "data" });
    }
    // AI-18: what can I eat, using the saved profile
    if (/what can i eat|my allerg|can i have something|กินอะไรได้/.test(text)) {
      if (!p.length) return reply("Tap “Set my allergies” first, then I can list the dishes that do not list them. " + confirmStaff(), { kind: "data" });
      const fits = S.dishes.filter((d) => d.available && d.allergens !== null && !d.allergens.some((a) => p.includes(a)));
      const unknown = S.dishes.filter((d) => d.available && d.allergens === null);
      return reply(`Dishes that do not list ${p.map((a) => aName(a)).join(" / ")}: ${list(fits) || "none"}.${unknown.length ? ` No allergen data (not included above): ${unknown.map((d) => nm(d)).join(", ")}.` : ""} ${confirmStaff()}`, { dishes: fits, kind: "data" });
    }
    // AI-4: vegetarian / vegan, with a budget
    if (/vegan|vegetarian|มังสวิรัติ/.test(text)) {
      const budget = (text.match(/(?:under|below|less than|up to|ไม่เกิน)\s*(\d+)/) || [])[1];
      const tag = /vegan/.test(text) ? "vegan" : "vegetarian";
      const ds = S.dishes.filter((d) => d.available && (tag === "vegan" ? d.tags.includes("vegan") : d.tags.includes("vegetarian") || d.tags.includes("vegan")) && (!budget || d.price < Number(budget)));
      return reply(ds.length ? `${tag === "vegan" ? "Vegan" : "Vegetarian"} dishes${budget ? ` under ฿${budget}` : ""}: ${list(ds)}.` : `There is no ${tag} dish${budget ? ` under ฿${budget}` : ""} on the menu right now.`, { dishes: ds, kind: "data" });
    }
    if (/spicy|เผ็ด/.test(text)) { const ds = S.dishes.filter((d) => d.available && d.tags.includes("spicy")); return reply(`Spicy dishes: ${list(ds)}.`, { dishes: ds, kind: "data" }); }
    // AI-5: prices, availability, hours, FAQ: from the database
    if (named && /how much|price|cost|available|sold|have|ราคา/.test(text)) return reply(named.available ? `${nm(named)} is ${money(named.price)}.` : `${nm(named)} is sold out today.`, { dishes: [named], kind: "data" });
    if (/hour|open|close|เวลา/.test(text)) return reply(window.RESTAURANT.hours, { kind: "data" });
    const faq = S.owner.faqs.find((f) => f.q && text.split(/\W+/).some((w) => w.length > 3 && f.q.toLowerCase().includes(w)));
    if (faq) return reply(faq.a, { kind: "data" });
    // AI-9 / AI-10 / AI-11: everything else goes to the language model, and its answer is checked
    if (S.sys.aiOffline) return reply("The AI waiter is unavailable right now. You can browse the menu or call the staff.", { kind: "fallback", answered: false, action: "offline" });
    if (S.sys.modelMisbehaves) return reply(`I can't confirm that. ${confirmStaff()}`, { kind: "guard", answered: false, note: "The model's reply claimed a dish was “nut-free”, so the guard replaced it (AI-17, AI-10)." });
    const rec = S.dishes.filter((d) => d.available && ["thai_tea", "mango_sticky"].includes(d.id));
    return reply(`On a hot day I recommend the ${nm(rec[0] || S.dishes[0])} for ${money((rec[0] || S.dishes[0]).price)}${rec[1] ? ` and the ${nm(rec[1])} for ${money(rec[1].price)}` : ""}.`, { dishes: rec, kind: "model" });
  }
  function ask(raw) {
    const q = raw.trim(); if (!q) return;
    S.d.chat.push({ id: Date.now() + Math.random(), role: "me", text: q });
    const r = aiAnswer(q);
    S.d.chat.push(Object.assign({ id: Date.now() + Math.random(), role: "ai", q }, r));
    S.stats.chats++; if (r.answered) S.stats.fromData += r.kind === "model" ? 0 : 1;
    if (!r.answered) S.stats.unanswered.push(q);
    S.d.draft = "";
  }

  // ---------------------------------------------------------------- picks and orders
  function addPick(id, qty = 1, silent) {
    const d = dish(id); if (!d || !d.available) { toast("This dish is sold out today.", true); return false; }
    const row = S.d.picks.find((p) => p.id === id);
    if (row) row.qty = Math.min(20, row.qty + qty); else S.d.picks.push({ id, qty });
    if (!silent) { const c = clash(d, S.d.profile); toast(`${t("added")}: ${nm(d)}` + (c ? ` ⚠ ${c === "unknown" ? t("allergenUnknown") : c.map((a) => aName(a)).join(", ")}` : "")); }
    return true;
  }
  function sendPicks() {
    const lines = S.d.picks.map((p) => ({ p, d: dish(p.id) })).filter((x) => x.d && x.d.available);
    if (!lines.length) { toast("Nothing to send.", true); return; }
    const said = [...new Set([...S.d.profile, ...S.d.said])];
    const o = { id: S.nextOrder++, table: TABLE, status: "picked", note: said.map((a) => aName(a, "en")).join(", "), at: Date.now(), items: lines.map(({ p, d }) => ({ id: d.id, name: d.name.en, qty: p.qty, price: d.price, flag: !S.d.profile.length ? "" : d.allergens === null ? "unknown" : d.allergens.filter((a) => S.d.profile.includes(a)).map((a) => aName(a, "en")).join(", ") })) };
    S.orders.push(o); S.d.picks = []; S.d.sheet = null;
    toast(t("sent"));
  }
  const billOf = () => {
    const mine = S.orders.filter((o) => o.table === TABLE && o.status !== "cancelled" && !o.paid);
    const lines = {}; let total = 0;
    for (const o of mine.filter((o) => o.status !== "picked")) for (const i of o.items) { lines[i.name] = lines[i.name] || { name: i.name, qty: 0, price: i.price }; lines[i.name].qty += i.qty; total += i.qty * i.price; }
    return { lines: Object.values(lines), total, pending: mine.filter((o) => o.status === "picked").flatMap((o) => o.items) };
  };

  // ---------------------------------------------------------------- diner view
  function shownDishes() {
    const f = S.d.f, q = S.d.q.trim().toLowerCase();
    return S.dishes.filter((d) =>
      (!S.d.cat || d.cat === S.d.cat) && (!q || Object.values(d.name).some((n) => n.toLowerCase().includes(q))) &&
      (!f.veg || d.tags.includes("vegetarian") || d.tags.includes("vegan")) &&
      // "No peanuts" must not show a dish whose allergen data is missing, only dishes known to be peanut-free
      (!f.noPeanut || (d.allergens !== null && !d.allergens.includes("peanut"))) &&
      (!f.mine || clash(d, S.d.profile) === null) && (!f.u100 || d.price < 100) && (!f.spicy || d.tags.includes("spicy")));
  }
  function dishCard(d) {
    const c = clash(d, S.d.profile);
    const chips = d.allergens === null ? `<span class="tag tag--unknown">${esc(t("allergenUnknown"))}</span>` : d.allergens.slice(0, 3).map((a) => `<span class="tag ${S.d.profile.includes(a) ? "tag--allergy" : ""}">${esc(aName(a))}</span>`).join("") + (d.allergens.length > 3 ? `<span class="tag">+${d.allergens.length - 3}</span>` : "");
    const tags = d.tags.filter((x) => x === "vegan" || x === "vegetarian" || x === "spicy").map((x) => `<span class="tag ${x === "spicy" ? "tag--spicy" : ""}">${esc(x === "spicy" ? t("spicy") : x === "vegetarian" ? t("vegetarian") : "Vegan")}</span>`).join("");
    return `<article class="dish ${d.available ? "" : "dish--soldout"} ${c ? "dish--conflict" : ""}">
      <div class="dish__img" aria-hidden="true">${{ 1: "🥢", 2: "🍜", 3: "🍲", 4: "🥗", 5: "🍨", 6: "🧋" }[d.cat]}</div>
      <div><button type="button" class="dish__name" data-act="detail" data-arg="${d.id}">${esc(nm(d))}</button>
        <div class="dish__sub">${esc(d.name.th)} · ${esc(d.name.my)}</div>
        <div>${tags}${chips}${c ? `<span class="tag tag--allergy">⚠ ${esc(c === "unknown" ? t("allergenUnknown") : c.map((a) => aName(a)).join(", "))}</span>` : ""}</div>
        <div class="dish__foot"><span class="price">${esc(money(d.price))}</span>
          ${d.available ? `<button type="button" class="btn btn--sm" data-act="add" data-arg="${d.id}">+ ${esc(t("add"))}</button>` : `<span class="tag">${esc(t("soldOut"))}</span>`}</div></div></article>`;
  }
  function dinerPhone() {
    const D = S.d, shown = shownDishes(), total = D.picks.reduce((s, p) => s + p.qty, 0);
    const filt = [["veg", "vegetarian"], ["noPeanut", "noPeanuts"], ["u100", "under100"], ["spicy", "spicy"], ...(D.profile.length ? [["mine", "mine"]] : [])];
    let sheet = "";
    if (D.detail) sheet = detailSheet(dish(D.detail));
    else if (D.sheet === "chat") sheet = chatSheet();
    else if (D.sheet === "picks") sheet = picksSheet();
    else if (D.sheet === "profile") sheet = profileSheet();
    else if (D.sheet === "bill") sheet = billSheet();
    const cv = D.detail ? "FR-1 · DM-7 detail: description, all allergens or “allergen info not provided”, ingredients, Add, Ask AI" : D.sheet === "chat" ? "FR-2 · AI-1 … AI-13, AI-17, AI-18 (8 sample questions below)" : D.sheet === "picks" ? "FR-3 · PC-1 picks, PC-2 send to staff, PC-7 allergy note" : D.sheet === "profile" ? "FR-1 · DM-11 allergy profile (14 allergens, kept on the phone only)" : D.sheet === "bill" ? "FR-3 · PC-5 the table's running bill (no kitchen progress shown, PC-6)" : "FR-1 · DM-1 menu by QR (<code>/r/golden-lotus?t=5</code>) · DM-2 categories, tags, ≤3 allergens · DM-3 search · DM-4 filters · DM-5 TH/MY/EN · DM-6 sold out";
    return covers(cv) + `<div class="phone"><div class="phone__body" id="dbody">
      ${S.sys.noConnection ? `<div class="banner" role="status">${esc(t("offline"))}</div>` : ""}
      <div class="app-head"><div><h1>${esc(window.RESTAURANT.name)}</h1><p>${esc(window.RESTAURANT.city)} · ${esc(t("table"))} ${TABLE}</p></div>
        <div class="langs" role="group" aria-label="Language">${["th", "my", "en"].map((l) => `<button type="button" data-act="lang" data-arg="${l}" aria-pressed="${D.lang === l}">${l.toUpperCase()}</button>`).join("")}</div></div>
      <section class="hero" aria-label="AI assistant"><div class="hero__eyebrow">✦ ${esc(t("heroEyebrow"))}</div>
        <button type="button" class="hero__ask" data-act="chat">${esc(t("heroPlaceholder"))}</button>
        <div class="scrollx" style="margin-top:8px">${[["heroChip1", "What's spicy?"], ["heroChip2", "Vegan options?"], [D.profile.length ? "chipMyAllergies" : "heroChip3", D.profile.length ? "What can I eat with my allergies?" : "What would you recommend on a hot day?"]].map(([k, q]) => `<button type="button" class="chip" data-act="quick" data-arg="${esc(q)}">${esc(t(k))}</button>`).join("")}</div></section>
      <input class="search" id="dq" type="search" placeholder="${esc(t("search"))}" aria-label="${esc(t("search"))}" value="${esc(D.q)}" data-model="q">
      <div class="scrollx">${filt.map(([k, l]) => `<button type="button" class="chip" aria-pressed="${D.f[k]}" data-act="filter" data-arg="${k}">${esc(t(l))}</button>`).join("")}</div>
      <div class="row" style="margin-bottom:8px"><button type="button" class="chip" aria-haspopup="dialog" aria-pressed="${D.profile.length > 0}" data-act="profile">⚠ ${esc(t("setAllergies"))}${D.profile.length ? ` (${D.profile.length})` : ""}</button></div>
      <div class="scrollx"><button type="button" class="chip" aria-pressed="${!D.cat}" data-act="cat" data-arg="0">${esc(t("all"))}</button>${S.cats.map((c) => `<button type="button" class="chip" aria-pressed="${D.cat === c.id}" data-act="cat" data-arg="${c.id}">${esc(c.en)}</button>`).join("")}</div>
      ${shown.length ? shown.map(dishCard).join("") : `<div class="empty"><b>${esc(t("none"))}</b><p class="muted">Nothing matches your search and filters.</p><button type="button" class="btn btn--quiet" data-act="clearfilters">Clear filters</button></div>`}
    </div>
      <div class="dock"><button type="button" class="btn btn--danger bell" data-act="callstaff">🔔 ${esc(t("callStaff"))}</button>
        <button type="button" class="btn btn--block" data-act="picks">${esc(t("myPicks"))}${total ? ` · ${total}` : ""}</button>
        ${S.orders.some((o) => o.table === TABLE) ? `<button type="button" class="btn btn--quiet" data-act="bill">${esc(t("tableBill"))}</button>` : ""}</div>
      ${sheet}</div>`;
  }
  const sheetWrap = (title, body, close = "closesheet") => `<div class="sheet-back" data-act="${close}" data-self="1"><section class="sheet" role="dialog" aria-label="${esc(title)}"><div class="sheet__head"><h2>${esc(title)}</h2><button type="button" class="btn btn--quiet btn--sm" data-act="${close}" aria-label="${esc(t("close"))}">✕</button></div>${body}</section></div>`;
  function detailSheet(d) {
    const al = d.allergens === null ? `<div class="allergen-box allergen-box--unknown">⚠ ${esc(t("allergenUnknown"))}. ${esc(confirmStaff())}</div>` : `<div class="allergen-box"><b>${esc(t("allergens"))}:</b> ${d.allergens.length ? d.allergens.map((a) => `<span class="tag ${S.d.profile.includes(a) ? "tag--allergy" : ""}">${esc(aName(a))}</span>`).join("") : esc(t("allergenNone"))}</div>`;
    return sheetWrap(nm(d), `<p>${esc(d.desc)}</p><p class="muted"><b>${esc(t("ingredients"))}:</b> ${esc(d.ingredients)}</p>${al}<div class="row"><span class="price">${esc(money(d.price))}</span></div>
      <div class="row" style="margin-top:12px">${d.available ? `<button type="button" class="btn" data-act="add" data-arg="${d.id}">+ ${esc(t("add"))}</button>` : `<span class="tag">${esc(t("soldOut"))}</span>`}<button type="button" class="btn btn--staff" data-act="askabout" data-arg="${d.id}">✦ ${esc(t("askAbout"))}</button></div>`, "closedetail");
  }
  function profileSheet() {
    return sheetWrap(t("myAllergies"), `<p class="muted">${esc(t("profileHelp"))}</p><div class="row">${I.allergens.map((a) => `<button type="button" class="chip" aria-pressed="${S.d.profile.includes(a)}" data-act="toggleallergen" data-arg="${a}">${esc(aName(a))}</button>`).join("")}</div>
      <div class="row" style="margin-top:14px">${S.d.profile.length ? `<button type="button" class="btn btn--quiet" data-act="clearprofile">${esc(t("clearAll"))}</button>` : ""}<button type="button" class="btn btn--staff btn--block" data-act="closesheet">${esc(t("done"))}</button></div>`);
  }
  function chatSheet() {
    const log = S.d.chat.length ? S.d.chat : [{ role: "ai", text: t("hello"), kind: "greeting", id: 0 }];
    const bub = (m) => m.role === "me" ? `<div class="bubble bubble--me">${esc(m.text)}</div>` : `<div class="bubble bubble--ai ${m.kind === "guard" ? "bubble--guard" : ""} ${m.down ? "bubble--down" : ""}"><small>${esc(t("theWaiter"))} · ${{ data: "answered from the menu data, no model", model: "written by the language model, then checked", rule: "fixed refusal", staff: "staff call created", fallback: "AI unavailable: fallback", guard: "model reply replaced by the guard", greeting: "greeting" }[m.kind] || ""}</small>${esc(m.text)}${m.note ? `<br><em class="muted">${esc(m.note)}</em>` : ""}
      ${(m.dishes || []).slice(0, 4).map((d) => `<div class="mini"><span>${esc(nm(d))} · ${esc(money(d.price))}</span>${d.available ? `<button type="button" class="btn btn--sm" data-act="add" data-arg="${d.id}" aria-label="${esc(t("add"))} ${esc(nm(d))}">+</button>` : `<span class="tag">${esc(t("soldOut"))}</span>`}</div>`).join("")}
      ${m.action === "offline" ? `<div class="row" style="margin-top:6px"><button type="button" class="btn btn--sm btn--danger" data-act="callstaff">🔔 ${esc(t("escalateCall"))}</button><button type="button" class="btn btn--sm btn--quiet" data-act="closesheet">${esc(t("back"))}</button></div>` : ""}
      ${m.kind !== "greeting" && m.id ? `<div class="row" style="margin-top:6px"><button type="button" class="btn btn--sm btn--quiet" data-act="rate" data-arg="${m.id}|1" aria-label="${esc(t("helpful"))}">👍</button><button type="button" class="btn btn--sm btn--quiet" data-act="rate" data-arg="${m.id}|-1" aria-label="${esc(t("notHelpful"))}">👎</button></div>` : ""}</div>`;
    const qs = window.SAMPLE_QUESTIONS.map(([q, id]) => `<button type="button" class="q" data-act="quick" data-arg="${esc(q)}">${esc(q)} <em>${id}</em></button>`).join("");
    return sheetWrap(t("theWaiter"), `<p class="muted" style="margin:0">${esc(t("askAny"))}. <small>(The prototype shows the replies in English; the real app answers in the language of the question, AI-1.)</small></p>
      <div class="chatlog">${log.map(bub).join("")}</div><details ${S.d.chat.length ? "" : "open"}><summary style="min-height:44px;display:flex;align-items:center;font-weight:700">Try a sample question</summary><div class="qs">${qs}</div></details>
      <form class="chatform" data-form="chat"><input id="dchat" aria-label="${esc(t("typeQ"))}" placeholder="${esc(t("typeQ"))}" value="${esc(S.d.draft)}" data-model="draft" autocomplete="off"><button type="submit" class="btn btn--staff" aria-label="Send">➤</button></form>`);
  }
  function picksSheet() {
    const rows = S.d.picks.map((p) => ({ p, d: dish(p.id) })).filter((x) => x.d);
    const sum = rows.reduce((s, { p, d }) => s + p.qty * d.price, 0);
    const warn = rows.filter(({ d }) => clash(d, S.d.profile));
    const body = rows.length ? rows.map(({ p, d }) => `<div class="row" style="justify-content:space-between;margin:6px 0"><div><b>${esc(nm(d))}</b><div class="muted">${esc(money(d.price))}${clash(d, S.d.profile) ? ` · <span class="flag">⚠ ${esc(clash(d, S.d.profile) === "unknown" ? t("allergenUnknown") : clash(d, S.d.profile).map((a) => aName(a)).join(", "))}</span>` : ""}</div></div>
        <div class="row"><button type="button" class="btn btn--sm btn--quiet" data-act="dec" data-arg="${d.id}" aria-label="−">−</button><b>${p.qty}</b><button type="button" class="btn btn--sm btn--quiet" data-act="inc" data-arg="${d.id}" aria-label="+">+</button><button type="button" class="btn btn--sm btn--quiet" data-act="rm" data-arg="${d.id}" aria-label="${esc(t("remove"))}">🗑</button></div></div>`).join("") +
      `${warn.length ? `<div class="banner">${esc(warn.map(({ d }) => nm(d)).join(", "))}: ${esc(t("conflictToast"))}</div>` : ""}<p><b>${esc(money(sum))}</b></p>
      <button type="button" class="btn btn--staff btn--block" data-act="send" ${S.sys.noConnection ? "disabled" : ""}>${esc(t("showToWaiter"))}</button>${S.sys.noConnection ? `<div class="err">${esc(t("errorSend"))}</div>` : ""}`
      : `<div class="empty"><b>${esc(t("picksEmpty"))}</b><p class="muted">Add a dish from the menu or ask the AI.</p></div>`;
    return sheetWrap(t("myPicks"), body);
  }
  function billSheet() {
    const b = billOf();
    return sheetWrap(t("tableBill"), `${b.lines.length ? `<table><tbody>${b.lines.map((l) => `<tr><td>${l.qty}× ${esc(l.name)}</td><td>${esc(money(l.qty * l.price))}</td></tr>`).join("")}</tbody></table><p><b>${esc(t("billTotal"))}: ${esc(money(b.total))}</b></p>` : `<p class="muted">${esc(t("billEmpty"))}</p>`}
      ${b.pending.length ? `<p class="muted"><b>${esc(t("billPending"))}:</b> ${esc(b.pending.map((i) => `${i.qty}× ${i.name}`).join(", "))}</p>` : ""}<p class="muted">The diner is not shown kitchen progress (cooking / ready): order status for diners is out of scope (PC-6).</p>
      <button type="button" class="btn btn--danger btn--block" data-act="askbill">🔔 ${esc(t("askBill"))}</button>`);
  }
  function dinerSide() {
    const sw = (key, label) => `<label class="switch"><input type="checkbox" data-act="sys" data-arg="${key}" ${S.sys[key] ? "checked" : ""}> ${label}</label>`;
    return `<aside class="side"><h3>Try this (happy path)</h3><ol style="padding-left:18px;margin:0 0 12px"><li>Switch <b>TH / MY / EN</b>, search “papaya”, tap <b>Vegetarian</b>.</li><li><b>Set my allergies</b>: peanut + shellfish. Dishes that list them turn red.</li><li>Open <b>Fresh Spring Rolls</b>: “allergen info not provided”.</li><li>Open the AI and tap sample questions.</li><li>Add <b>Shrimp Pad Thai</b>, then <b>My picks → Send to staff</b>.</li><li>Open the <b>Staff</b> tab, sign in with PIN 1111.</li></ol>
      <h3>Unhappy paths</h3>${sw("aiOffline", "AI model is offline (AI-11)")}${sw("modelMisbehaves", "Model makes an allergen claim (AI-10, AI-17)")}${sw("noConnection", "No connection (offline copy, send fails)")}
      <ul><li>Search “zzz” → empty state.</li><li>“No peanuts” hides the spring rolls (no data).</li><li>Add <b>Coconut Ice Cream</b>: sold out.</li><li>Press 🔔 twice: one open call per table.</li></ul>
      <button type="button" class="btn btn--quiet btn--sm" data-act="reset">Reset demo</button></aside>`;
  }

  // ---------------------------------------------------------------- staff views
  const mins = (o) => Math.floor((Date.now() - o.at) / 60000) + S.lateMinutes;
  function staffPhone() {
    const st = S.staff;
    const cv = st.screen === "login" ? "FR-9 · SF-2 PIN sign-in, taken to the screen of the role; 5 wrong PINs lock sign-in" : st.screen === "waiter" ? "FR-4 · SF-3 waiter screen: calls, picks with allergy warning, take order, ready, tables · SF-6 LIVE · PC-4 table bills" : "FR-4 · SF-4 chef board New / Cooking / Ready, late after 10 min, allergy banner · SF-5 status order";
    let body;
    if (st.screen === "login") {
      body = st.locked ? `<div class="lock"><b>🔒</b><h2>Too many wrong PINs</h2><p>Try again in 10 minute(s). (HTTP 429, even for the right PIN)</p><button type="button" class="btn btn--quiet" data-act="unlock">Demo: skip the 10 minutes</button></div>` :
        `<div class="app-head"><div><h1>Staff sign-in</h1><p>${esc(window.RESTAURANT.name)} · code <code>golden-lotus</code></p></div></div>
        <div class="pin-dots" aria-label="PIN">${[0, 1, 2, 3].map((i) => `<i class="${i < st.pin.length ? "on" : ""}"></i>`).join("")}</div>${st.err ? `<div class="err" role="alert">${esc(st.err)}</div>` : ""}
        <div class="pin">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-act="pin" data-arg="${n}">${n}</button>`).join("")}<button type="button" data-act="pinclear" aria-label="Clear">⌫</button><button type="button" data-act="pin" data-arg="0">0</button><button type="button" data-act="pinenter" aria-label="Sign in">✓</button></div>
        <p class="muted" style="text-align:center">Prototype hint: waiter PIN <b>1111</b>, chef PIN <b>2222</b> (or a PIN the owner added).</p>`;
    } else if (st.screen === "waiter") body = waiterBody(); else body = chefBody();
    return covers(cv) + `<div class="phone phone--staff"><div class="phone__body">${st.screen !== "login" ? `<div class="app-head"><div><h1>${st.screen === "waiter" ? "Floor" : "Kitchen"}</h1><p>${esc(st.name || "")}</p></div><div class="row"><span class="tag ${S.sys.staffOffline ? "tag--allergy" : ""}" role="status">${S.sys.staffOffline ? "OFFLINE" : "● LIVE"}</span><button type="button" class="btn btn--sm btn--quiet" data-act="logout">Sign out</button></div></div>${S.sys.staffOffline ? `<div class="err">Connection lost. This screen shows the last data it received and will refresh as soon as it is back (SF-6).</div>` : ""}` : ""}${body}</div></div>`;
  }
  const allergyBanner = (o) => (o.note ? `<div class="banner">⚠ Allergy: ${esc(o.note)}. Confirm with the kitchen before ordering.</div>` : "");
  const lines = (o, price) => `<ul>${o.items.map((i) => `<li><b>${i.qty}×</b><span>${esc(i.name)}${i.flag ? ` <span class="flag">⚠ ${esc(i.flag === "unknown" ? "no allergen data" : i.flag)}</span>` : ""}</span>${price ? `<span style="margin-left:auto">฿${i.qty * i.price}</span>` : ""}</li>`).join("")}</ul>`;
  function waiterBody() {
    const st = S.staff, tabs = [["calls", "Calls"], ["picks", "Picks"], ["ready", "Ready"], ["tables", "Tables"], ["soldout", "Sold out"]];
    const openCalls = S.calls.filter((c) => c.open), picks = S.orders.filter((o) => o.status === "picked"), ready = S.orders.filter((o) => o.status === "ready");
    const badge = { calls: openCalls.length, picks: picks.length, ready: ready.length };
    let pane = "";
    if (st.tab === "calls") pane = openCalls.length ? openCalls.map((c) => `<div class="ticket"><h3>Table ${c.table}</h3><div>${c.kind === "bill" ? "Wants the bill" : "Needs help"} · ${Math.max(0, Math.floor((Date.now() - c.at) / 60000))} min</div><button type="button" class="btn btn--ok btn--block" data-act="calldone" data-arg="${c.id}">Done</button></div>`).join("") : `<div class="empty"><b>No open calls</b><p class="muted">When a diner presses 🔔 or asks for the bill, it appears here.</p></div>`;
    if (st.tab === "picks") pane = picks.length ? picks.map((o) => `<div class="ticket"><h3>Table ${o.table} · picks</h3>${allergyBanner(o)}${lines(o, true)}<div class="row"><button type="button" class="btn btn--staff" data-act="take" data-arg="${o.id}">Take order</button><button type="button" class="btn btn--quiet" data-act="dismiss" data-arg="${o.id}">Dismiss</button></div></div>`).join("") : `<div class="empty"><b>No picks waiting</b><p class="muted">Send picks from the diner screen to see them here within 3 seconds.</p></div>`;
    if (st.tab === "ready") pane = ready.length ? ready.map((o) => `<div class="ticket"><h3>Table ${o.table} · ready</h3>${lines(o)}<button type="button" class="btn btn--ok btn--block" data-act="served" data-arg="${o.id}">Served</button></div>`).join("") : `<div class="empty"><b>Nothing ready</b></div>`;
    if (st.tab === "tables") pane = `<div class="tables">${Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => { const call = S.calls.some((c) => c.open && c.table === n), pk = S.orders.some((o) => o.table === n && o.status === "picked"), kit = S.orders.some((o) => o.table === n && ["new", "cooking", "ready"].includes(o.status)); const b = S.orders.filter((o) => o.table === n && !["picked", "cancelled"].includes(o.status) && !o.paid).reduce((s, o) => s + o.items.reduce((x, i) => x + i.qty * i.price, 0), 0); return `<button type="button" class="table-tile ${call ? "table-tile--call" : pk ? "table-tile--picks" : kit ? "table-tile--kitchen" : ""}" data-act="tablebill" data-arg="${n}">${n}<div style="font-weight:400;font-size:12px">${call ? "calling" : pk ? "picks" : kit ? "in kitchen" : "free"}${b ? ` · ฿${b}` : ""}</div></button>`; }).join("")}</div><p class="muted">Tap a table to see its running bill (PC-4): only orders you took count; picks are pending.</p>${st.billTable ? tableBillView(st.billTable) : ""}`;
    if (st.tab === "soldout") pane = S.dishes.map((d) => `<label class="switch"><input type="checkbox" data-act="soldtoggle" data-arg="${d.id}" ${d.available ? "" : "checked"}> ${esc(d.name.en)} <span class="muted">sold out today</span></label>`).join("");
    return `<div class="tabsline" role="tablist">${tabs.map(([k, l]) => `<button type="button" class="chip" role="tab" aria-pressed="${st.tab === k}" data-act="wtab" data-arg="${k}">${l}${badge[k] ? ` (${badge[k]})` : ""}</button>`).join("")}</div>${st.err ? `<div class="err" role="alert">${esc(st.err)}</div>` : ""}${pane}`;
  }
  function tableBillView(n) {
    const mine = S.orders.filter((o) => o.table === n && !["cancelled"].includes(o.status) && !o.paid);
    const taken = mine.filter((o) => o.status !== "picked"), pend = mine.filter((o) => o.status === "picked");
    const agg = {}; let total = 0; for (const o of taken) for (const i of o.items) { agg[i.name] = (agg[i.name] || 0) + i.qty; total += i.qty * i.price; }
    return `<div class="ticket"><h3>Table ${n} bill</h3>${Object.keys(agg).length ? `<ul>${Object.entries(agg).map(([k, q]) => `<li><b>${q}×</b><span>${esc(k)}</span></li>`).join("")}</ul><b>Total ฿${total}</b>` : `<div class="muted">Nothing taken yet.</div>`}${pend.length ? `<div class="muted">Pending (not in the total): ${pend.flatMap((o) => o.items).map((i) => `${i.qty}× ${esc(i.name)}`).join(", ")}</div>` : ""}${taken.length ? `<button type="button" class="btn btn--ok btn--block" data-act="paid" data-arg="${n}">Mark as paid</button>` : ""}</div>`;
  }
  function chefBody() {
    const st = S.staff, col = (status, title, next, label) => {
      const os = S.orders.filter((o) => o.status === status);
      return `<section><h2 style="font-size:20px;margin:8px 0">${title} (${os.length})</h2>${os.length ? os.map((o) => `<div class="ticket ${mins(o) >= 10 ? "ticket--late" : ""}"><h3>Table ${o.table}</h3><div>${mins(o)} min${mins(o) >= 10 ? " · LATE" : ""}</div>${allergyBanner(o)}${lines(o)}<button type="button" class="btn btn--staff btn--block" data-act="${next}" data-arg="${o.id}">${label}</button></div>`).join("") : `<div class="muted" style="padding:6px 0 10px">Nothing here.</div>`}</section>`;
    };
    return `${st.err ? `<div class="err" role="alert">${esc(st.err)}</div>` : ""}<div class="kitchen">${col("new", "New", "cooking", "Start cooking")}${col("cooking", "Cooking", "ready", "Mark ready")}${col("ready", "Ready", "noop", "Waiting for the waiter to serve")}</div>
      <h2 style="font-size:20px;margin:12px 0 4px">Sold out today</h2>${S.dishes.slice(0, 5).map((d) => `<label class="switch"><input type="checkbox" data-act="soldtoggle" data-arg="${d.id}" ${d.available ? "" : "checked"}> ${esc(d.name.en)}</label>`).join("")}`;
  }
  function staffSide() {
    return `<aside class="side"><h3>Try this</h3><ol style="padding-left:18px;margin:0 0 12px"><li>Enter PIN <b>1111</b> → Floor screen. (Or <b>2222</b> → Kitchen.)</li><li>Open <b>Picks</b>: the diner's picks with the allergy banner and the ⚠ tag on the clashing dish.</li><li><b>Take order</b> → sign out → PIN <b>2222</b> → <b>Start cooking</b> → <b>Mark ready</b>.</li><li>Back as the waiter: <b>Ready → Served</b>; the bill appears under <b>Tables</b>.</li></ol>
      <p class="muted">No picks yet? Go to the <b>Diner</b> tab, add a dish and send it. (The two tabs share one memory.)</p>
      <h3>Unhappy paths</h3><ul><li>Enter a wrong PIN: error. Five wrong PINs: locked.</li></ul>
      <div class="row"><button type="button" class="btn btn--sm btn--quiet" data-act="wrongrole" data-arg="chef">Press a chef-only button as the waiter (403)</button><button type="button" class="btn btn--sm btn--quiet" data-act="wrongrole" data-arg="waiter">Press a waiter-only button as the chef (403)</button></div>
      <label class="switch"><input type="checkbox" data-act="sys" data-arg="staffOffline" ${S.sys.staffOffline ? "checked" : ""}> Connection lost (OFFLINE indicator)</label>
      <button type="button" class="btn btn--quiet btn--sm" data-act="latemin">Fast-forward 10 minutes (late tickets turn red, SF-4)</button> <button type="button" class="btn btn--quiet btn--sm" data-act="reset" style="margin-top:6px">Reset demo</button></aside>`;
  }

  // ---------------------------------------------------------------- actions
  const ORDER = { take: ["picked", "new", "waiter"], cooking: ["new", "cooking", "chef"], ready: ["cooking", "ready", "chef"], served: ["ready", "served", "waiter"] };
  function moveOrder(id, action) {
    const o = S.orders.find((x) => x.id === Number(id)); const [from, to, role] = ORDER[action];
    if (!o) return;
    if (S.staff.role !== role) { S.staff.err = `Only the ${role} can do this (HTTP 403).`; toast(S.staff.err, true); return; }
    if (o.status !== from) { S.staff.err = `This order is “${o.status}”: it cannot go to “${to}” (HTTP 409).`; return; }
    o.status = to; o.at = to === "new" ? Date.now() : o.at; S.staff.err = ""; toast(`Order ${o.id}: ${from} → ${to}`);
  }
  function act(a, arg, el, ev) {
    const D = S.d, st = S.staff;
    switch (a) {
      case "tab": S.tab = arg; break;
      case "reset": { const keep = S.tab; S = fresh(); S.tab = keep; toast("Demo reset."); break; }
      case "lang": D.lang = arg; break;
      case "cat": D.cat = Number(arg); break;
      case "filter": D.f[arg] = !D.f[arg]; break;
      case "clearfilters": D.q = ""; D.cat = 0; Object.keys(D.f).forEach((k) => (D.f[k] = false)); break;
      case "detail": D.detail = arg; break;
      case "closedetail": if (ev && el.dataset.self && ev.target !== el) return false; D.detail = null; break;
      case "add": addPick(arg, 1); break;
      case "chat": D.sheet = "chat"; D.detail = null; break;
      case "quick": D.sheet = "chat"; D.detail = null; ask(arg); break;
      case "askabout": D.detail = null; D.sheet = "chat"; ask(`Is the ${dish(arg).name.en} safe for me? What allergens does it list?`); break;
      case "picks": D.sheet = "picks"; break;
      case "profile": D.sheet = "profile"; break;
      case "bill": D.sheet = "bill"; break;
      case "closesheet": if (ev && el.dataset.self && ev.target !== el) return false; D.sheet = null; break;
      case "toggleallergen": D.profile = D.profile.includes(arg) ? D.profile.filter((x) => x !== arg) : [...D.profile, arg]; if (!D.profile.length) D.f.mine = false; break;
      case "clearprofile": D.profile = []; D.f.mine = false; break;
      case "inc": addPick(arg, 1, true); break;
      case "dec": { const r = D.picks.find((p) => p.id === arg); if (r) r.qty = Math.max(1, r.qty - 1); break; }
      case "rm": D.picks = D.picks.filter((p) => p.id !== arg); break;
      case "send": sendPicks(); break;
      case "callstaff": toast(createCall("help") ? t("staffCalled") : "A staff call for this table is already open.", false); break;
      case "askbill": toast(createCall("bill") ? t("billRequested") : "The bill was already requested.", false); break;
      case "rate": { const [id, v] = arg.split("|"); const m = D.chat.find((x) => String(x.id) === id); if (m && v === "-1") { m.down = true; S.stats.wrong.push(m.q); toast("Thanks. The owner will see this answer under “marked wrong”."); } else toast(t("thanks")); break; }
      case "sys": S.sys[arg] = el.checked; break;
      // staff
      case "pin": if (st.pin.length < 8) st.pin += arg; break;
      case "pinclear": st.pin = ""; st.err = ""; break;
      case "pinenter": {
        const member = S.owner.staffList.find((x) => x.pin === st.pin), role = member ? member.role : null;
        if (!st.pin) { st.err = "Enter your PIN."; break; }
        if (!role) { st.fails++; st.pin = ""; if (st.fails >= 5) { st.locked = true; st.err = ""; } else st.err = `Wrong PIN. (${5 - st.fails} tries left before sign-in is locked)`; break; }
        st.screen = role; st.role = role; st.name = member.name; st.fails = 0; st.err = ""; st.pin = ""; break;
      }
      case "unlock": st.locked = false; st.fails = 0; break;
      case "logout": st.screen = "login"; st.role = null; st.err = ""; st.pin = ""; break;
      case "wtab": st.tab = arg; st.err = ""; break;
      case "take": case "cooking": case "ready": case "served": moveOrder(arg, a); break;
      case "dismiss": { const o = S.orders.find((x) => x.id === Number(arg)); if (o) { o.status = "cancelled"; toast("Picks dismissed."); } break; }
      case "calldone": { const c = S.calls.find((x) => x.id === Number(arg)); if (c) c.open = false; break; }
      case "tablebill": st.billTable = arg; break;
      case "paid": S.orders.filter((o) => o.table === arg && !["picked", "cancelled"].includes(o.status)).forEach((o) => (o.paid = true)); toast(`Table ${arg} marked as paid.`); break;
      case "soldtoggle": { const d = dish(arg); if (d) d.available = !el.checked; break; }
      case "wrongrole": { st.err = `Only the ${arg} can do this (HTTP 403). The server refuses it even if the screen showed the button.`; toast(st.err, true); break; }
      case "latemin": S.lateMinutes += 10; toast("10 minutes later."); break;
      case "noop": break;
      default: if (window.OWNER && window.OWNER.act(a, arg, el, ev)) break; return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- shell
  const TABS = [["diner", "1 · Diner (phone)"], ["staff", "2 · Staff (phone)"], ["owner", "3 · Owner (laptop)"], ["map", "Requirements map"]];
  function render() {
    const ae = document.activeElement, keep = ae && ae.id ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
    const sc = { d: ($("#dbody") || {}).scrollTop || 0 };
    $("#tabs").innerHTML = TABS.map(([k, l]) => `<button type="button" class="tab" data-act="tab" data-arg="${k}" aria-pressed="${S.tab === k}">${l}</button>`).join("");
    let html;
    if (S.tab === "diner") html = `<div class="layout"><div>${dinerPhone()}</div>${dinerSide()}</div>`;
    else if (S.tab === "staff") html = `<div class="layout"><div>${staffPhone()}</div>${staffSide()}</div>`;
    else if (S.tab === "owner") html = window.OWNER.view();
    else html = window.OWNER.map();
    $("#stage").innerHTML = html;
    const b = $("#dbody"); if (b) b.scrollTop = sc.d;
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (_) {} } }
    const log = $(".chatlog"); if (log && S.d.sheet === "chat") { const sh = log.closest(".sheet"); if (sh) sh.scrollTop = sh.scrollHeight; }
  }
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act]"); if (!el) return;
    if (el.tagName === "INPUT" && el.type === "checkbox") return;            // checkboxes are handled on "change"
    const r = act(el.dataset.act, el.dataset.arg, el, ev);
    if (r !== false) render();
  });
  document.addEventListener("change", (ev) => { const el = ev.target; if (el.tagName === "INPUT" && el.type === "checkbox" && el.dataset.act) { if (act(el.dataset.act, el.dataset.arg, el, ev) !== false) render(); } else if (el.dataset && el.dataset.omodel && window.OWNER) { window.OWNER.model(el, true); } });
  document.addEventListener("input", (ev) => { const el = ev.target; if (el.dataset && el.dataset.model === "q") { S.d.q = el.value; render(); } else if (el.dataset && el.dataset.model === "draft") S.d.draft = el.value; else if (el.dataset && el.dataset.omodel && window.OWNER) window.OWNER.model(el, false); });
  document.addEventListener("submit", (ev) => {
    const f = ev.target.closest("[data-form]"); if (!f) return; ev.preventDefault();
    if (f.dataset.form === "chat") { ask(S.d.draft || ($("#dchat") || {}).value || ""); render(); }
    else if (window.OWNER && window.OWNER.submit(f.dataset.form, f)) render();
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { if (S.d.detail) S.d.detail = null; else if (S.d.sheet) S.d.sheet = null; else return; render(); } });
  window.P.getState = () => S; window.P.t = t; window.P.dish = dish; window.P.nm = nm; window.P.covers = covers; window.P.catName = catName;
  window.P.start = () => render();
  if (document.readyState !== "loading") setTimeout(() => window.P.start()); else document.addEventListener("DOMContentLoaded", () => window.P.start());
})();
