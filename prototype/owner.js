// Shop AI clickable prototype: owner journey (laptop) and the requirements map. In memory only.
(function () {
  "use strict";
  const { esc, toast, covers } = window.P;
  const S = () => window.PS(), O = () => S().owner;
  const ALL = window.I18N.allergens, aname = (a) => window.I18N.allergenNames.en[a];
  const PAGES = [["menu", "Menu items"], ["import", "Import a menu"], ["hours", "Hours & FAQ"], ["ai", "AI settings"], ["qr", "QR codes"], ["staff", "Staff"], ["insights", "Insights"]];
  const COVERS = {
    signin: "FR-5 · OA-1 register (email, password ≥ 8 characters, restaurant name) · OA-2 sign in (wrong credentials rejected) · OA-3 only your own restaurant",
    menu: "FR-5 · MM-1 dishes (3 languages, price ≥ 0) · MM-2 the 14 allergens or “not provided” (stored as unknown, not as none) · MM-3 categories · MM-4 on/off sale applies to the diner menu and the AI at once · MM-7 validation",
    import: "FR-6 · MI-1 read a menu photo · MI-2 review every row, problem rows flagged · MI-3 nothing goes live until you confirm · MI-4 imported dishes have unknown allergens",
    hours: "FR-7 · ST-1 opening, closing, last-order time (invalid rejected; the AI quotes them exactly) · ST-3 FAQ and shop rules used by the AI",
    ai: "FR-7 · ST-4 assistant name, voice (male/female particles in Thai and Burmese), tone, greeting, upselling on/off",
    qr: "FR-8 · QR-1 one SVG per table · QR-2 base address (the server's Wi-Fi address), 1–60 tables, print all, download one",
    staff: "FR-9 · SF-1 staff with name, role (waiter / chef) and a 4–8 digit PIN, unique in the restaurant, stored hashed · signs in on the Staff tab",
    insights: "FR-10 · IN-1 … IN-4 chats and what the AI answered from data, unanswered questions with “Add FAQ”, answers marked wrong, allergies diners have · AI-16 every question is stored with its language, topic, allergens mentioned and whether it was answered, with no personal data",
  };
  const field = (label, name, val = "", extra = "") => `<label class="field">${label}<input name="${name}" value="${esc(val)}" ${extra}></label>`;
  const fd = (f) => { const d = Object.fromEntries(new FormData(f)); d._al = new FormData(f).getAll("al"); return d; };
  const err = (m) => (m ? `<div class="err" role="alert">${esc(m)}</div>` : "");
  const ok = (m) => (m ? `<div class="okmsg" role="status">${esc(m)}</div>` : "");

  function signin() {
    const o = O();
    return `<div class="layout layout--wide"><div>${covers(COVERS.signin)}<div class="laptop" style="grid-template-columns:1fr;place-items:center;padding:30px"><div style="max-width:380px;width:100%">
      <h2 style="font-size:28px">${o.register ? "Create your restaurant" : "Owner sign-in"}</h2>${err(o.err)}
      ${o.register ? `<form data-form="oregister">${field("Email", "email", "", 'type="email" required')}${field("Password (8 characters or more)", "password", "", 'type="password"')}${field("Restaurant name", "name", "", "")}<button class="btn btn--staff btn--block" type="submit">Create account</button></form><p><button type="button" class="btn btn--quiet btn--sm" data-act="oregtoggle">I already have an account</button></p>`
      : `<form data-form="osignin">${field("Email", "email", "owner@example.com", 'type="email" required')}${field("Password", "password", "", 'type="password"')}<button class="btn btn--staff btn--block" type="submit">Sign in</button></form><p class="muted">Prototype hint: <code>owner@example.com</code> / <code>demo1234</code>.</p><p><button type="button" class="btn btn--quiet btn--sm" data-act="oregtoggle">Create an account</button></p>`}
    </div></div></div></div>`;
  }

  function menuPage() {
    const o = O(), dishes = S().dishes, known = dishes.filter((d) => d.allergens !== null).length;
    const f = o.form;
    const form = f ? `<form data-form="odish" class="allergen-box"><h3 style="font-size:18px">${f.id ? "Edit dish" : "Add a dish"}</h3>${err(o.err2)}
      <div class="grid2">${field("Name (English)", "name_en", f.name_en)}${field("Name (Thai)", "name_th", f.name_th)}${field("Name (Burmese)", "name_my", f.name_my)}${field("Price (฿)", "price", f.price, 'inputmode="decimal"')}
      <label class="field">Category<select name="cat">${S().cats.map((c) => `<option value="${c.id}" ${Number(f.cat) === c.id ? "selected" : ""}>${esc(c.en)}</option>`).join("")}</select></label>
      <label class="field">Spice<select name="spicy"><option value="">Not spicy</option><option value="1" ${f.spicy ? "selected" : ""}>Spicy</option></select></label></div>
      <fieldset style="border:2px solid var(--line);border-radius:12px"><legend><b>Allergens (14)</b></legend><div class="allergen-grid">${ALL.map((a) => `<label><input type="checkbox" name="al" value="${a}" ${(f.allergens || []).includes(a) ? "checked" : ""}> ${esc(aname(a))}</label>`).join("")}</div>
      <label class="switch"><input type="checkbox" name="unknown" ${f.allergens === null ? "checked" : ""}> Allergen info not provided <span class="muted">(stored as “unknown”, never as “no allergens”)</span></label></fieldset>
      <div class="row" style="margin-top:10px"><button class="btn btn--staff" type="submit">Save dish</button><button type="button" class="btn btn--quiet" data-act="ocancel">Cancel</button></div></form>` : "";
    return `<h2>Menu items</h2><p class="muted">${known} of ${dishes.length} dishes have complete allergen data.</p><div class="meter" aria-hidden="true"><i style="width:${Math.round((known / dishes.length) * 100)}%"></i></div>
      ${o.ok2 ? ok(o.ok2) : ""}${form}<div class="row" style="margin:8px 0"><button type="button" class="btn btn--staff" data-act="onew">+ Add a dish</button></div>
      <table><thead><tr><th>Dish</th><th>Price</th><th>Allergens</th><th>On sale</th><th></th></tr></thead><tbody>${dishes.map((d) => `<tr><td><b>${esc(d.name.en)}</b><div class="muted">${esc(d.name.th)} · ${esc(d.name.my)}</div><span class="tag">${esc(window.P.catName(d.cat))}</span></td><td>฿${d.price}</td>
        <td>${d.allergens === null ? `<span class="tag tag--unknown">not provided</span>` : d.allergens.length ? d.allergens.map((a) => `<span class="tag">${esc(aname(a))}</span>`).join("") : `<span class="tag">none listed</span>`}</td>
        <td><label class="switch"><input type="checkbox" data-act="osale" data-arg="${d.id}" ${d.available ? "checked" : ""} aria-label="On sale: ${esc(d.name.en)}"> ${d.available ? "On" : "Sold out"}</label></td>
        <td><button type="button" class="btn btn--sm btn--quiet" data-act="oedit" data-arg="${d.id}">Edit</button> <button type="button" class="btn btn--sm btn--quiet" data-act="odel" data-arg="${d.id}" aria-label="Delete ${esc(d.name.en)}">🗑</button></td></tr>`).join("")}</tbody></table>
      <h3 style="margin-top:18px;font-size:18px">Categories</h3><div class="row">${S().cats.map((c) => `<span class="tag">${esc(c.en)} <button type="button" class="chip" style="min-height:32px;padding:0 8px" data-act="ocatdel" data-arg="${c.id}" aria-label="Delete category ${esc(c.en)}">✕</button></span>`).join("")}</div>
      <form data-form="ocat" class="row" style="margin-top:6px"><input name="name" placeholder="New category" aria-label="New category" style="min-height:44px;border:2px solid var(--line-strong);border-radius:10px;padding:0 10px"><button class="btn btn--quiet btn--sm" type="submit">Add</button></form>`;
  }

  function importPage() {
    const o = O();
    if (o.importStep === 0) return `<h2>Import a menu</h2><p class="muted">Upload a photo of a printed menu. The AI reads it; you review every row before anything goes live.</p><div class="upload"><div class="menu-photo" aria-label="Sample photo of a printed menu"><b>GOLDEN LOTUS</b><br>Green Curry ........ 140<br>Tom Yam Gung ??? .... 180<br>Mango Sticky Rice ....<br>Fried Banana ........ 60</div><button type="button" class="btn" data-act="oimpread">Read this photo</button><p class="muted">JPG, PNG or WebP up to 8 MB, judged by the file's real content (MM-6).</p></div>`;
    if (o.importStep === 2) return `<h2>Import a menu</h2>${ok(o.ok2)}<p>The new dishes are on the live menu with <b>allergen info not provided</b>. Set their allergens under Menu items (MI-4).</p><button type="button" class="btn" data-act="oimpreset">Import another photo</button>`;
    const flagged = (r) => (r.price === "" || Number.isNaN(Number(r.price)) ? "Missing price" : /\?/.test(r.name) ? "Suspicious name" : "");
    const bad = o.importRows.filter(flagged).length;
    return `<h2>Review the ${o.importRows.length} rows</h2><p class="muted">Edit anything. Rows with a problem are flagged and must be fixed or removed before you can publish. Nothing is live yet (MI-3).</p>${err(o.err2)}
      <table><thead><tr><th>Name</th><th>Price (฿)</th><th>Check</th><th></th></tr></thead><tbody>${o.importRows.map((r, i) => `<tr><td><input data-omodel="imp:${i}:name" value="${esc(r.name)}" aria-label="Name row ${i + 1}" style="min-height:44px;border:2px solid var(--line-strong);border-radius:8px;padding:0 8px;width:100%"></td><td><input data-omodel="imp:${i}:price" value="${esc(r.price)}" aria-label="Price row ${i + 1}" inputmode="decimal" style="min-height:44px;border:2px solid var(--line-strong);border-radius:8px;padding:0 8px;width:90px"></td><td>${flagged(r) ? `<span class="flag">⚠ ${flagged(r)}</span>` : "OK"}</td><td><button type="button" class="btn btn--sm btn--quiet" data-act="oimpdel" data-arg="${i}">Remove</button></td></tr>`).join("")}</tbody></table>
      <div class="row" style="margin-top:10px"><button type="button" class="btn btn--staff" data-act="oimppublish">Publish ${o.importRows.length - bad} dishes</button>${bad ? `<span class="flag">${bad} row(s) still flagged</span>` : ""}</div>`;
  }

  function hoursPage() {
    const o = O();
    return `<h2>Hours & FAQ</h2>${err(o.err2)}${o.ok2 ? ok(o.ok2) : ""}<form data-form="ohours" class="allergen-box"><div class="grid2">${field("Opens (HH:MM)", "open", o.hours.open)}${field("Closes (HH:MM)", "close", o.hours.close)}${field("Last order (HH:MM)", "last", o.hours.last)}</div><button class="btn btn--staff" type="submit">Save hours</button> <span class="muted">The AI quotes these exactly.</span></form>
      <h3 style="font-size:18px">FAQ (the AI answers from these)</h3><table><tbody>${o.faqs.map((q, i) => `<tr><td><b>${esc(q.q)}</b><div>${esc(q.a)}</div></td><td><button type="button" class="btn btn--sm btn--quiet" data-act="ofaqdel" data-arg="${i}">Remove</button></td></tr>`).join("") || `<tr><td class="muted">No FAQ yet.</td></tr>`}</tbody></table>
      <form data-form="ofaq" class="allergen-box" style="margin-top:8px"><div class="grid2">${field("Question", "q")}${field("Answer", "a")}</div><button class="btn btn--quiet btn--sm" type="submit">Add FAQ</button></form>
      <label class="field">Shop rules (free text for the AI)<textarea data-omodel="rules" rows="3" style="border:2px solid var(--line-strong);border-radius:10px;padding:8px;font:inherit">${esc(o.rules)}</textarea></label>`;
  }
  function aiPage() {
    const o = O();
    return `<h2>AI settings</h2>${o.ok2 ? ok(o.ok2) : ""}<form data-form="oai" class="allergen-box"><div class="grid2">${field("Assistant name", "name", o.ai.name)}<label class="field">Voice<select name="voice"><option value="female" ${o.ai.voice === "female" ? "selected" : ""}>Female (ค่ะ / ရှင်)</option><option value="male" ${o.ai.voice === "male" ? "selected" : ""}>Male (ครับ / ခင်ဗျာ)</option></select></label>
      <label class="field">Tone<select name="tone">${["friendly", "polite", "playful"].map((x) => `<option ${o.ai.tone === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>${field("Greeting", "greeting", o.ai.greeting, 'placeholder="Hello! Ask me about the menu."')}</div>
      <label class="switch"><input type="checkbox" name="upsell" ${o.ai.upsell ? "checked" : ""}> Suggest a drink or dessert (upselling)</label><button class="btn btn--staff" type="submit">Save</button></form>
      <p class="muted">Preview: “${esc(o.ai.greeting || "Hello! Ask me about the menu, allergens or prices.")}” — ${esc(o.ai.name)}${o.ai.voice === "female" ? " (female voice: ค่ะ)" : " (male voice: ครับ)"}</p>`;
  }
  function qrSvg(n) {
    let h = Number(n) * 2654435761 >>> 0; const cells = [];
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      let on;
      if (finder) { const fx = x % 14 < 7 ? x % 14 : x - 14, fy = y % 14 < 7 ? y % 14 : y - 14; on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4); }
      else { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; on = (h & 3) === 0 || (h & 7) === 5; }
      if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
    return `<svg viewBox="-1 -1 23 23" role="img" aria-label="QR code for table ${n}" shape-rendering="crispEdges">${cells.join("")}</svg>`;
  }
  function qrPage() {
    const o = O(), shown = Math.min(o.tables, 12);
    return `<h2>QR codes</h2>${err(o.err2)}<form data-form="oqr" class="allergen-box"><div class="grid2">${field("Base address (the server's Wi-Fi address)", "base", o.base)}${field("Number of tables (1 to 60)", "tables", o.tables, 'inputmode="numeric"')}</div><button class="btn btn--staff" type="submit">Update</button> <button type="button" class="btn btn--quiet" data-act="oprint">Print all</button></form>
      <div class="cards">${Array.from({ length: shown }, (_, i) => i + 1).map((n) => `<div class="stat"><div class="qr">${qrSvg(n)}</div><b style="font-size:18px">Table ${n}</b><div class="muted" style="word-break:break-all;font-size:12px">${esc(o.base)}/r/${window.RESTAURANT.code}?t=${n}</div><button type="button" class="btn btn--sm btn--quiet" data-act="odownload" data-arg="${n}">Download SVG</button></div>`).join("")}</div>${o.tables > 12 ? `<p class="muted">…and ${o.tables - 12} more tables (the page shows the first 12 here).</p>` : ""}
      <p class="muted">These patterns are decorative: the real app draws scannable QR codes (QR-1).</p>`;
  }
  function staffPage() {
    const o = O();
    return `<h2>Staff</h2>${err(o.err2)}${o.ok2 ? ok(o.ok2) : ""}<table><thead><tr><th>Name</th><th>Role</th><th>PIN</th><th></th></tr></thead><tbody>${o.staffList.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.role}</td><td>•••• <span class="muted">(stored hashed; shown here only because this is a prototype: ${esc(s.pin)})</span></td><td><button type="button" class="btn btn--sm btn--quiet" data-act="ostaffdel" data-arg="${s.id}">Remove</button></td></tr>`).join("")}</tbody></table>
      <form data-form="ostaff" class="allergen-box" style="margin-top:10px"><div class="grid2">${field("Name", "name")}<label class="field">Role<select name="role"><option value="waiter">Waiter</option><option value="chef">Chef</option></select></label>${field("PIN (4 to 8 digits)", "pin", "", 'inputmode="numeric" autocomplete="off"')}</div><button class="btn btn--staff" type="submit">Add staff</button></form>
      <p class="muted">Add someone, then open the Staff tab and sign in with their PIN.</p>`;
  }
  function insightsPage() {
    const S_ = S(), st = S_.stats, answered = st.chats ? Math.round((st.fromData / st.chats) * 100) : 0;
    const profile = S_.d.profile, avail = S_.dishes.filter((d) => d.available), missing = S_.dishes.filter((d) => d.allergens === null);
    const ordered = {}; S_.orders.forEach((o) => o.items.forEach((i) => (ordered[i.name] = (ordered[i.name] || 0) + i.qty)));
    const top = Object.entries(ordered).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `<h2>Insights</h2><div class="cards"><div class="stat"><b>${st.chats}</b>chats this session</div><div class="stat"><b>${answered}%</b>answered from the menu data</div><div class="stat"><b>${st.unanswered.length}</b>could not be answered</div><div class="stat"><b>${missing.length}</b>dishes with no allergen data</div></div>
      <h3 style="font-size:18px">Questions the AI could not answer</h3>${st.unanswered.length ? `<table><tbody>${st.unanswered.map((q, i) => `<tr><td>${esc(q)}</td><td><button type="button" class="btn btn--sm btn--staff" data-act="oaddfaq" data-arg="${i}">Add FAQ</button></td></tr>`).join("")}</tbody></table>` : `<p class="muted">None yet. Turn on “AI model is offline” on the Diner tab and ask an open question.</p>`}
      <h3 style="font-size:18px;margin-top:14px">Answers diners marked wrong</h3>${st.wrong.length ? `<ul>${st.wrong.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : `<p class="muted">None yet. Tap 👎 under an AI answer on the Diner tab.</p>`}
      <h3 style="font-size:18px;margin-top:14px">Allergies your diners have</h3>${profile.length ? `<table><tbody>${profile.map((a) => `<tr><td>${esc(aname(a))}</td><td>1 diner</td><td>${avail.filter((d) => d.allergens !== null && !d.allergens.includes(a)).length} dishes serve them</td></tr>`).join("")}</tbody></table><p class="muted">Counted once per chat session, with no personal data. ${missing.length ? `${missing.map((d) => esc(d.name.en)).join(", ")} has no allergen data, so it is hidden from diners who set a profile.` : ""}</p>` : `<p class="muted">None yet. Set allergies on the Diner tab.</p>`}
      <h3 style="font-size:18px;margin-top:14px">Most ordered</h3>${top.length ? `<ul>${top.map(([n, q]) => `<li>${esc(n)} × ${q}</li>`).join("")}</ul>` : `<p class="muted">Nothing ordered yet.</p>`}`;
  }

  function view() {
    const o = O();
    if (!o.signedIn) return signin();
    const bodies = { menu: menuPage, import: importPage, hours: hoursPage, ai: aiPage, qr: qrPage, staff: staffPage, insights: insightsPage };
    return `<div class="layout layout--wide"><div>${covers(COVERS[o.page])}<div class="laptop"><nav class="nav" aria-label="Owner pages"><h2>${esc(window.RESTAURANT.name)}</h2>${PAGES.map(([k, l]) => `<button type="button" data-act="onav" data-arg="${k}" ${o.page === k ? 'aria-current="page"' : ""}>${l}</button>`).join("")}<button type="button" data-act="oview">View live menu ↗</button><button type="button" data-act="osignout" style="margin-top:auto">Sign out</button></nav><div class="pane">${bodies[o.page]()}</div></div></div></div>`;
  }

  function map() {
    const rows = window.FR_MAP.map(([fr, what, ids, where, unhappy]) => `<tr><td>${fr}</td><td>${esc(what)}</td><td>${esc(ids)}</td><td>${esc(where)}</td><td>${esc(unhappy)}</td></tr>`).join("");
    return `<div class="layout layout--wide"><div><div class="covers"><b>Golden Thread:</b> problem → requirement → design → feature → test</div><div class="laptop" style="grid-template-columns:1fr"><div class="pane">
      <h2>Requirements map: this prototype ↔ the SRS</h2><p>Every Must requirement of the M2 SRS has a screen here. The ten course requirements (FR-1 … FR-10, from the M1 charter) are split into the finer IDs of <code>docs/SRS_Shop_AI.md</code>; the third column says which. The last column is the unhappy path you can try.</p>
      <table class="map"><thead><tr><th>FR</th><th>What</th><th>SRS IDs</th><th>Where in the prototype</th><th>Unhappy path to try</th></tr></thead><tbody>${rows}</tbody></table>
      <h3 style="margin-top:18px;font-size:20px">From this screen to the code and the tests</h3><p><b>feature = FR = diagram = acceptance test.</b> Each SRS ID is traced to the code that implements it and to the automated tests that check it in <code>docs/TRACEABILITY.md</code> (108 IDs, checked by a test, so the table cannot go stale). The real application is in <code>app/</code>; this prototype copies its labels, its sample menu and its rules, but has no server and no database.</p>
      <h3 style="margin-top:14px;font-size:20px">What the prototype does not do</h3><ul><li>The AI is a scripted stand-in. The real app answers allergen, price, hours, order and bill questions from the database with fixed sentences, and uses a local language model (Ollama) only for open questions, checking every model reply (<code>docs/AI_SAFETY.md</code>).</li><li>Nothing is saved: reloading the page resets everything.</li><li>The prototype shows AI replies in English only; the real app replies in the language of the question.</li></ul></div></div></div></div>`;
  }

  function act(a, arg, el) {
    const o = O(), s = S();
    switch (a) {
      case "oregtoggle": o.register = !o.register; o.err = ""; return true;
      case "onav": o.page = arg; o.form = null; o.err2 = ""; o.ok2 = ""; return true;
      case "osignout": o.signedIn = false; o.err = ""; return true;
      case "oview": s.tab = "diner"; return true;
      case "onew": o.form = { name_en: "", name_th: "", name_my: "", price: "", cat: s.cats[0] ? s.cats[0].id : 1, allergens: [] }; o.err2 = ""; o.ok2 = ""; return true;
      case "oedit": { const d = window.P.dish(arg); o.form = { id: d.id, name_en: d.name.en, name_th: d.name.th, name_my: d.name.my, price: d.price, cat: d.cat, spicy: d.tags.includes("spicy"), allergens: d.allergens === null ? null : [...d.allergens] }; o.err2 = ""; o.ok2 = ""; return true; }
      case "ocancel": o.form = null; o.err2 = ""; return true;
      case "osale": { const d = window.P.dish(arg); d.available = el.checked; toast(`${d.name.en} is now ${d.available ? "on sale" : "sold out"}: the diner menu and the AI change at once.`); return true; }
      case "odel": s.dishes = s.dishes.filter((d) => d.id !== arg); toast("Dish deleted."); return true;
      case "ocatdel": s.cats = s.cats.filter((c) => c.id !== Number(arg)); toast("Category deleted. Its dishes are kept."); return true;
      case "oimpread": o.importStep = 1; o.err2 = ""; o.importRows = [{ name: "Green Curry", price: "140" }, { name: "Tom Yam Gung ???", price: "180" }, { name: "Mango Sticky Rice", price: "" }, { name: "Fried Banana", price: "60" }]; return true;
      case "oimpdel": o.importRows.splice(Number(arg), 1); return true;
      case "oimpreset": o.importStep = 0; return true;
      case "oimppublish": {
        const badRows = o.importRows.filter((r) => r.price === "" || Number.isNaN(Number(r.price)) || /\?/.test(r.name));
        if (badRows.length) { o.err2 = "Fix or remove the flagged rows first. Nothing is added until every row is reviewed."; return true; }
        o.importRows.forEach((r, i) => s.dishes.push({ id: "imp_" + Date.now() + i, cat: 2, price: Number(r.price), name: { en: r.name, th: "", my: "" }, allergens: null, tags: [], available: true, desc: "Imported from a photo.", ingredients: "(not recorded)" }));
        o.ok2 = `${o.importRows.length} dishes published. Imported dishes have unknown allergens until you set them.`; o.importStep = 2; return true;
      }
      case "ofaqdel": o.faqs.splice(Number(arg), 1); return true;
      case "oaddfaq": { const q = s.stats.unanswered[Number(arg)]; s.stats.unanswered.splice(Number(arg), 1); o.faqs.push({ q, a: "(write the answer here)" }); toast("Added to Hours & FAQ. Write the answer there."); return true; }
      case "ostaffdel": o.staffList = o.staffList.filter((x) => x.id !== Number(arg)); toast("Staff member removed. Their session ends at the next request."); return true;
      case "oprint": toast("In the real app this opens the print dialog with all QR codes."); return false;
      case "odownload": toast(`In the real app this downloads table-${arg}.svg.`); return false;
      default: return false;
    }
  }
  function model(el, commit) {
    const o = O(), m = el.dataset.omodel;
    if (m === "rules") { o.rules = el.value; return; }
    const g = m.match(/^imp:(\d+):(name|price)$/);
    if (g) { o.importRows[Number(g[1])][g[2]] = el.value; if (commit) window.P.render(); }
  }
  const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  function submit(name, f) {
    const o = O(), s = S(), d = fd(f);
    o.err = ""; o.err2 = ""; o.ok2 = "";
    switch (name) {
      case "osignin":
        if (d.email.trim().toLowerCase() === "owner@example.com" && d.password === "demo1234") { o.signedIn = true; o.page = "menu"; return true; }
        o.err = "Wrong email or password."; return true;
      case "oregister":
        if (!d.name.trim()) { o.err = "Please enter your restaurant's name."; return true; }
        if (d.password.length < 8) { o.err = "Password must be at least 8 characters."; return true; }
        if (d.email.trim().toLowerCase() === "owner@example.com") { o.err = "This email already has an account."; return true; }
        o.signedIn = true; o.register = false; toast(`Account created. Your restaurant code is ${d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.`); return true;
      case "odish": {
        const price = Number(String(d.price).trim());
        o.form = { ...o.form, name_en: d.name_en, name_th: d.name_th, name_my: d.name_my, price: d.price, cat: d.cat, spicy: !!d.spicy, allergens: d.unknown ? null : d._al };
        if (!d.name_en.trim() && !d.name_th.trim() && !d.name_my.trim()) { o.err2 = "Please enter a name."; return true; }
        if (String(d.price).trim() === "" || !Number.isFinite(price) || price < 0) { o.err2 = "Enter a price of 0 or more."; return true; }
        const rec = { name: { en: d.name_en.trim() || d.name_th.trim(), th: d.name_th.trim(), my: d.name_my.trim() }, price, cat: Number(d.cat), allergens: d.unknown ? null : d._al, tags: d.spicy ? ["spicy"] : [] };
        if (o.form.id) { const ex = window.P.dish(o.form.id); Object.assign(ex, rec, { tags: [...ex.tags.filter((x) => x !== "spicy"), ...rec.tags] }); } else s.dishes.push({ id: "new_" + Date.now(), available: true, desc: "", ingredients: "", ...rec });
        o.form = null; o.ok2 = "Saved. The diner menu and the AI use it at once."; return true;
      }
      case "ocat": if (!d.name.trim()) { toast("Please enter a category name.", true); return false; } s.cats.push({ id: Date.now(), en: d.name.trim() }); return true;
      case "ohours":
        if (![d.open, d.close, d.last].every((x) => TIME.test(x))) { o.err2 = "Use HH:MM, for example 21:30."; return true; }
        if (!(d.open < d.close) || d.last > d.close || d.last < d.open) { o.err2 = "The last order cannot be after closing time, and opening must be before closing."; return true; }
        o.hours = { open: d.open, close: d.close, last: d.last }; window.RESTAURANT.hours = `Open every day ${d.open}-${d.close} (last order ${d.last}).`; o.ok2 = "Hours saved. The AI quotes them exactly."; return true;
      case "ofaq": if (!d.q.trim() || !d.a.trim()) { o.err2 = "Question and answer are both needed."; return true; } o.faqs.push({ q: d.q.trim(), a: d.a.trim() }); return true;
      case "oai": o.ai = { name: d.name.trim() || "AI Waiter", voice: d.voice, tone: d.tone, greeting: d.greeting, upsell: !!d.upsell }; o.ok2 = "Saved."; return true;
      case "oqr": {
        const n = Number(d.tables);
        if (!Number.isInteger(n) || n < 1 || n > 60) { o.err2 = "Tables must be a whole number from 1 to 60."; return true; }
        if (!/^https?:\/\/\S+$/.test(d.base.trim())) { o.err2 = "The base address must start with http:// or https://."; return true; }
        o.tables = n; o.base = d.base.trim().replace(/\/$/, ""); return true;
      }
      case "ostaff":
        if (!d.name.trim()) { o.err2 = "Please enter a name."; return true; }
        if (!/^\d{4,8}$/.test(d.pin)) { o.err2 = "PIN must be 4 to 8 digits."; return true; }
        if (o.staffList.some((x) => x.pin === d.pin)) { o.err2 = "This PIN is already used by another staff member. Choose a different one."; return true; }
        o.staffList.push({ id: Date.now(), name: d.name.trim(), role: d.role, pin: d.pin }); o.ok2 = `${d.name.trim()} added. They sign in on the Staff tab with their PIN.`; return true;
      default: return false;
    }
  }
  window.OWNER = { view, map, act, model, submit };
})();
