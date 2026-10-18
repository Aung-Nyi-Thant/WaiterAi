/* owner.js — Owner dashboard (desktop). Login → Dashboard / Menu Items / Import Menu / Hours & FAQ / AI Settings / QR Codes / Staff / Insights
 * All data lives in Store (store.js) so changes reach the customer + staff apps immediately. */
(() => {
  if (window.APP_VIEW !== 'owner') return;   // only run on index.html?view=owner
  const OWNER = { email: 'ownerhachi_kyu@gmail.com', pass: '1234' };   // demo login (client-side only)
  const PG = [['dash', '📊', 'Dashboard'], ['menu', '📖', 'Menu Items'], ['imp', '📥', 'Import Menu'], ['hf', '🕒', 'Hours & FAQ'], ['ai', '✨', 'AI Settings'], ['qr', '🔳', 'QR Codes'], ['staff', '🧑‍🍳', 'Staff'], ['ins', '💡', 'Insights']];
  const ST = { new: 'New', accepted: 'Accepted', cooking: 'Cooking', ready: 'Ready', served: 'Served', paid: 'Paid' };
  const CT = CATS.filter(c => c[0] != 'all' && c[0] != 'rec'), CZ = ['don', 'noodle', 'app', 'grill', 'set'];
  const TPL = 'name_th,name_en,price,category,emoji,ingredients,allergens\nข้าวผัดกุ้ง,Shrimp Fried Rice,89,don,🍚,rice;shrimp;egg,shell;egg\n';
  const root = document.getElementById('app'); root.className = 'ow';
  let U = { ok: sessionStorage.getItem('shopai_owner') == '1', pg: 'dash', q: '', cat: 'all', edit: null, err: '', toast: '', qr: 0 }, D = Store.get(), tm;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const val = id => document.getElementById(id).value, up = Store.update, sum = a => a.reduce((x, o) => x + o.total, 0);
  const typing = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
  const cur = () => D.menu || [], catN = m => (CATS.find(c => c[0] == m.c[0]) || [0, 0, ['-', '-']])[2][1];
  const ingTxt = m => m.ing.map(i => ingA(i)[1]).join(', ');
  const ingParse = s => s.split(/[,;]/).map(x => x.trim()).filter(Boolean).map(x => Object.keys(ING).find(k => ING[k][1].toLowerCase() == x.toLowerCase()) || x);
  const say = x => { U.toast = x; R(); clearTimeout(tm); tm = setTimeout(() => { U.toast = ''; R() }, 2200) };
  if (!D.menu) { up(d => { d.menu = MENU.map(x => ({ id: x.id, img: x.img, n: x.n, p: x.p, c: x.c, ing: x.ing, al: x.al, cz: x.cz, sp: x.sp })) }); D = Store.get() }   // first run: copy built-in menu

  /* ---- shared UI bits ---- */
  const tbl = (h, r) => `<table class="tb"><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${r.join('') || `<tr><td colspan="${h.length}" style="color:var(--sub)">Nothing yet.</td></tr>`}</table>`;
  const bars = r => r.length ? r.map(([l, v], _, a) => `<div style="margin:8px 0"><div class="tot" style="padding:0"><span>${esc(l)}</span><b>${v}</b></div><div class="hb"><i style="width:${v / a[0][1] * 100}%"></i></div></div>`).join('') : '<p style="color:var(--sub)">No data yet.</p>';
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const mrow = m => `<tr><td>${m.img ? `<img src="${m.img}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:8px">` : ''}<b>${esc(m.n[1])}</b><br><small style="color:var(--sub)">${esc(m.n[0])}</small></td><td>${esc(catN(m))}</td><td>฿${m.p}</td><td><small>${esc(ingTxt(m)) || '—'}</small></td><td>${m.al.map(k => `<span class="tag">${(AL[k] || [k, k])[1]}</span>`).join('') || '—'}</td><td style="white-space:nowrap"><button class="btn sm alt" data-o="medit" data-id="${m.id}">Edit</button> <button class="btn sm" style="background:#FDECEA" data-o="mdel" data-id="${m.id}">Delete</button></td></tr>`;
  const ml = () => { const q = U.q.trim().toLowerCase(); return cur().filter(m => (U.cat == 'all' || m.c[0] == U.cat) && (!q || m.n.some(x => x.toLowerCase().includes(q)))).map(mrow).join('') || '<tr><td colspan="6" style="color:var(--sub)">No dishes found.</td></tr>' };
  const qr = n => {
    let h = (n * 2654435761) >>> 0, s = ''; const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296, box = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    for (let y = 0; y < 21; y++)for (let x = 0; x < 21; x++) { if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue; if (rnd() > .5) s += `<rect x="${x}" y="${y}" width="1" height="1"/>` }
    return `<svg viewBox="-1 -1 23 23" fill="#202020">${s}${box(0, 0)}${box(14, 0)}${box(0, 14)}</svg>`
  };   // mock QR (not scannable)
  const url = n => new URL('index.html?restaurant=' + encodeURIComponent(REST) + '&table=' + n, location.href).href;

  /* ---- pages ---- */
  const P = {
    dash: () => {
      const o = D.orders, days = [...Array(7)].map((_, i) => { const dt = new Date(Date.now() - (6 - i) * 864e5); return { l: dt.toLocaleDateString('en', { weekday: 'short' }), v: sum(o.filter(x => new Date(x.t).toDateString() == dt.toDateString())) } }), mx = Math.max(1, ...days.map(x => x.v));
      return `<div class="kpis"><div class="kpi"><small>Total sales</small><b>฿${sum(o)}</b></div><div class="kpi"><small>Today's sales</small><b>฿${days[6].v}</b></div><div class="kpi"><small>Orders</small><b>${o.length}</b></div><div class="kpi"><small>Average order</small><b>฿${o.length ? Math.round(sum(o) / o.length) : 0}</b></div></div>
<div class="pnl"><h2>Sales – last 7 days</h2><div class="bars">${days.map(d => `<div><small>${d.v ? '฿' + d.v : ''}</small><i style="height:${Math.round(d.v / mx * 120)}px"></i>${d.l}</div>`).join('')}</div></div>
<div class="pnl"><h2>Recent orders</h2>${tbl(['Order', 'Table', 'Items', 'Total', 'Status', 'Time'], [...o].sort((a, b) => b.t - a.t).slice(0, 10).map(x => `<tr><td>#${esc(x.no)}</td><td>${esc(x.table)}</td><td>${x.items.reduce((a, l) => a + l.qty, 0)}</td><td>฿${x.total}</td><td><span class="tag">${ST[x.status]}</span></td><td>${new Date(x.t).toLocaleString('en', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</td></tr>`))}</div>`
    },
    menu: () => `<div class="tool"><div class="sb" style="margin:0;flex:1">🔍<input id="mq" value="${esc(U.q)}" placeholder="Search dishes..."></div><select class="in" id="mc"><option value="all">All categories</option>${CT.map(c => `<option value="${c[0]}" ${U.cat == c[0] ? 'selected' : ''}>${c[1]} ${c[2][1]}</option>`).join('')}</select><button class="btn" data-o="madd">+ Add dish</button></div><div class="pnl"><table class="tb"><thead><tr><th>Dish</th><th>Category</th><th>Price</th><th>Ingredients</th><th>Allergens</th><th></th></tr></thead><tbody id="ml">${ml()}</tbody></table></div>`,
    imp: () => `<div class="pnl"><h2>Import menu from CSV</h2><p style="color:var(--sub);font-size:13px">Columns: name_th, name_en, price, category, emoji, ingredients, allergens (separate several values with ;). Categories: ${CT.map(c => c[0]).join(', ')}. Allergens: ${Object.keys(AL).join(', ')}.</p><p style="margin:12px 0"><input type="file" id="fi" accept=".csv,.txt"> <button class="btn sm alt" data-o="tpl">⬇ Download template</button></p><textarea id="ta" rows="10" placeholder="Paste CSV here...">${esc(TPL)}</textarea><p style="margin-top:12px"><button class="btn" data-o="doimport">Import dishes</button></p></div>`,
    hf: () => `<div class="g2"><div class="pnl"><h2>Opening hours</h2><table class="tb">${D.hours.map(h => `<tr class="hr"><td><b>${h.d}</b></td><td><input type="time" class="in ho" value="${h.o}"></td><td><input type="time" class="in hc" value="${h.c}"></td><td><label><input type="checkbox" class="hx" ${h.closed ? 'checked' : ''}> Closed</label></td></tr>`).join('')}</table><p style="margin-top:12px"><button class="btn" data-o="hsave">Save hours</button></p></div>
<div class="pnl"><h2>FAQ – how the AI should answer</h2><p style="color:var(--sub);font-size:13px;margin-bottom:8px">When a diner asks something similar to the question, the AI replies with your answer.</p>${D.faqs.map((f, i) => `<div class="fr" style="margin-bottom:10px"><input class="in fq" placeholder="Question" value="${esc(f.q)}"><textarea class="in fa" rows="2" placeholder="Answer" style="margin-top:6px">${esc(f.a)}</textarea><button class="btn sm alt" data-o="fdel" data-i="${i}" style="margin-top:4px">Remove</button></div>`).join('') || '<p style="color:var(--sub);margin-bottom:10px">No FAQs yet.</p>'}<button class="btn alt" data-o="fadd">+ Add FAQ</button> <button class="btn" data-o="fsave">Save FAQs</button></div></div>`,
    ai: () => { const a = D.ai; return `<div class="pnl" style="max-width:720px"><h2>AI assistant settings</h2><div class="fm"><label>Assistant name</label><input class="in" id="a_n" value="${esc(a.name)}" placeholder="HaChi Kyu AI Assistant"><label>Greeting</label><textarea class="in" id="a_g" rows="2" placeholder="Hi! I can recommend dishes that suit you 😊">${esc(a.greet)}</textarea><label>Tone</label><select class="in" id="a_t">${['Friendly', 'Professional', 'Playful'].map(x => `<option ${a.tone == x ? 'selected' : ''}>${x}</option>`).join('')}</select><label>Custom instructions</label><textarea class="in" id="a_r" rows="4" placeholder="e.g. Always mention that we are closed on Mondays.">${esc(a.rules)}</textarea><label>When AI can't answer</label><textarea class="in" id="a_f" rows="2" placeholder="Sorry, I'm not sure. Please ask our staff.">${esc(a.fallback)}</textarea></div><button class="btn" data-o="asave">Save AI settings</button></div>` },
    qr: () => `<div class="pnl"><h2>Table QR codes</h2><div class="tool" style="margin:0"><span>Number of tables:</span><button class="btn sm" data-o="tn" data-d="-1">−</button><b style="font-size:20px">${D.tables}</b><button class="btn sm" data-o="tn" data-d="1">+</button><span style="flex:1"></span><button class="btn" data-o="gen">🔳 Generate QR codes</button>${U.qr ? '<button class="btn alt" data-o="print">🖨 Print</button>' : ''}</div></div>${U.qr ? `<div class="qrs">${[...Array(D.tables)].map((_, i) => `<div class="qc"><b>Table ${i + 1}</b>${qr(i + 1)}<small>${esc(url(i + 1))}</small></div>`).join('')}</div>` : ''}`,
    staff: () => `<div class="pnl"><h2>Staff accounts</h2><p style="color:var(--sub);font-size:13px;margin-bottom:8px">Staff sign in on the staff screen by choosing their role and entering a 4-digit PIN.</p><table class="tb"><tr><th>Name</th><th>PIN (4 digits)</th><th>Role</th><th></th></tr>${D.staff.map((s, i) => `<tr class="sr"><td><input class="in sn" value="${esc(s.name)}"></td><td><input class="in sp" maxlength="4" value="${esc(s.pass)}"></td><td><select class="in sl">${['waiter', 'chef'].map(r => `<option value="${r}" ${s.role == r ? 'selected' : ''}>${r == 'waiter' ? 'Waiter' : 'Chef'}</option>`).join('')}</select></td><td><button class="btn sm" style="background:#FDECEA" data-o="sdel" data-i="${i}">Delete</button></td></tr>`).join('')}</table><p style="margin-top:12px"><button class="btn alt" data-o="sadd">+ Add staff</button> <button class="btn" data-o="ssave">Save accounts</button></p></div>`,
    ins: () => {
      const mo = {}, al = {}, un = {}; D.orders.forEach(o => { o.items.forEach(l => mo[l.id] = (mo[l.id] || 0) + l.qty);[...new Set(o.al || [])].forEach(a => al[a] = (al[a] || 0) + 1) }); D.unanswered.forEach(x => un[x.q] = (un[x.q] || 0) + 1);
      return `<div class="g2"><div class="pnl"><h2>🏆 Most ordered</h2>${bars(top(mo).map(([id, v]) => { const m = cur().find(x => x.id == id); return [m ? m.n[1] : '(removed dish)', v] }))}</div><div class="pnl"><h2>🥜 Allergies your diners have</h2>${bars(top(al))}</div>
<div class="pnl"><h2>❓ Questions the AI could not answer</h2>${bars(top(un))}${D.unanswered.length ? '<p style="margin-top:10px"><button class="btn sm alt" data-o="clrq">Clear</button></p>' : ''}</div>
<div class="pnl"><h2>👎 Answers diners marked wrong</h2>${D.wrong.length ? [...D.wrong].reverse().slice(0, 10).map(w => `<div style="margin:8px 0;font-size:14px"><b>Q:</b> ${esc(w.q)}<br><b>A:</b> <span style="color:var(--sub)">${esc(w.a)}</span></div>`).join('') + '<button class="btn sm alt" data-o="clrw">Clear</button>' : '<p style="color:var(--sub)">No data yet.</p>'}</div></div>`
    }
  };

  const form = () => {
    const m = U.edit == 'new' ? { img: '', n: ['', ''], p: '', c: ['app'], ing: [], al: [] } : cur().find(x => x.id == U.edit); if (!m) return '';
    return `<div class="ov c"><div class="sh"><h2 style="margin-top:0">${U.edit == 'new' ? 'Add dish' : 'Edit dish'}</h2><div class="fm"><label>Image URL</label><input class="in" id="f_img" value="${esc(m.img || '')}" placeholder="https://..."><label>Name (English)</label><input class="in" id="f_n1" value="${esc(m.n[1])}"><label>Name (Thai)</label><input class="in" id="f_n0" value="${esc(m.n[0])}"><label>Price (฿)</label><input class="in" id="f_p" type="number" min="0" value="${m.p}"><label>Category</label><select class="in" id="f_c">${CT.map(c => `<option value="${c[0]}" ${m.c[0] == c[0] ? 'selected' : ''}>${c[1]} ${c[2][1]}</option>`).join('')}</select><label>Recommended</label><label><input type="checkbox" id="f_r" ${m.c.includes('rec') ? 'checked' : ''}> Show in "Popular &amp; Recommended"</label><label>Ingredients</label><input class="in" id="f_i" value="${esc(ingTxt(m))}" placeholder="Comma-separated, e.g. rice, salmon"><label>Allergens</label><div class="opt" id="fal" style="margin:0">${Object.keys(AL).map(k => `<button data-o="atog" data-k="${k}" class="${m.al.includes(k) ? 'on' : ''}">${AL[k][1]}</button>`).join('')}</div></div><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn alt" data-o="mcancel">Cancel</button><button class="btn" data-o="msave">Save</button></div></div></div>`
  };
  const login = () => `<div class="lg"><div class="logo" style="display:inline-block;font-size:20px">ShopAI</div><h2>Owner login · ${esc(REST)}</h2><label>Email</label><input class="in" id="em" type="email" autocomplete="username"><label>Password</label><input class="in" id="pw" type="password" autocomplete="current-password">${U.err ? `<div class="warn" style="margin-bottom:10px">${U.err}</div>` : ''}<button class="btn" data-o="login">Log in</button><p style="color:var(--sub);font-size:12px;margin-top:12px">Demo: ${OWNER.email} / ${OWNER.pass}</p></div>`;
  const shell = () => `<aside><div class="logo">ShopAI</div>${PG.map(p => `<button class="${U.pg == p[0] ? 'on' : ''}" data-o="pg" data-v="${p[0]}"><span>${p[1]}</span>${p[2]}</button>`).join('')}<div style="flex:1"></div><small>${OWNER.email}</small><button data-o="logout">🔒 Log out</button></aside><div class="mn"><h1>${PG.find(p => p[0] == U.pg)[2]}</h1>${P[U.pg]()}</div>${U.edit != null ? form() : ''}`;
  function R() { const m = root.querySelector('.mn'), sy = m ? m.scrollTop : 0; root.innerHTML = (U.ok ? shell() : login()) + (U.toast ? `<div class="toast" role="status">${U.toast}</div>` : ''); const n = root.querySelector('.mn'); if (n) n.scrollTop = sy }

  /* ---- actions ---- */
  const rows = (sel, f) => [...document.querySelectorAll(sel)].map(f);
  const grabF = () => rows('.fr', r => ({ q: r.querySelector('.fq').value.trim(), a: r.querySelector('.fa').value.trim() }));
  const grabS = () => rows('.sr', r => ({ name: r.querySelector('.sn').value.trim(), pass: r.querySelector('.sp').value.trim(), role: r.querySelector('.sl').value }));
  const H = {
    login: () => { if (val('em').trim().toLowerCase() == OWNER.email && val('pw') == OWNER.pass) { U.ok = true; U.err = ''; sessionStorage.setItem('shopai_owner', '1') } else U.err = '❌ Wrong email or password'; R() },
    logout: () => { U.ok = false; sessionStorage.removeItem('shopai_owner'); R() },
    pg: e => { U.pg = e.v; U.edit = null; R(); root.querySelector('.mn').scrollTop = 0 },
    madd: () => { U.edit = 'new'; R() }, medit: e => { U.edit = +e.id; R() }, mcancel: () => { U.edit = null; R() },
    mdel: e => { const m = cur().find(x => x.id == e.id); if (m && confirm('Delete "' + m.n[1] + '"?')) up(d => { d.menu = d.menu.filter(x => x.id != e.id); d.soldout = d.soldout.filter(x => x != e.id) }) },
    atog: e => { document.querySelector('#fal [data-k="' + e.k + '"]').classList.toggle('on') },
    msave: () => {
      const n1 = val('f_n1').trim(), ps = val('f_p'); if (!n1 || ps === '' || +ps < 0) return say('⚠️ Name and price are required');
      const cat = val('f_c'), c = [cat]; if (document.getElementById('f_r').checked) c.push('rec');
      const o = { img: val('f_img').trim(), n: [val('f_n0').trim() || n1, n1], p: +ps, c, ing: ingParse(val('f_i')), al: rows('#fal .on', b => b.dataset.k) }, id = U.edit; U.edit = null;
      up(d => { if (id == 'new') d.menu.push({ ...o, id: Math.max(0, ...d.menu.map(x => x.id)) + 1, cz: CZ.includes(cat), sp: false }); else Object.assign(d.menu.find(x => x.id == id), o) })
    },
    tpl: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + TPL], { type: 'text/csv' })); a.download = 'menu_template.csv'; a.click() },
    doimport: () => {
      const L = val('ta').split(/\r?\n/).filter(x => x.trim()).map(l => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.trim().replace(/^"|"$/g, ''))).filter(r => r[0] != 'name_th'); let n = 0, bad = 0;
      up(d => {
        let id = Math.max(0, ...d.menu.map(x => x.id)); L.forEach(([th, en, p, cat, e, ing, al]) => {
          if (!(en || th) || !p || isNaN(+p)) { bad++; return } const k = (cat || '').toLowerCase(), c = (CT.find(x => x[0] == k || x[2][1].toLowerCase() == k) || CT.find(x => x[0] == 'app'))[0];
          d.menu.push({ id: ++id, img: e || '', n: [th || en, en || th], p: +p, c: [c], ing: ingParse(ing || ''), al: (al || '').split(/[;,]/).map(x => x.trim().toLowerCase()).filter(x => AL[x]), cz: CZ.includes(c), sp: false }); n++
        })
      });
      say('Imported ' + n + ' dish(es)' + (bad ? ', skipped ' + bad + ' invalid row(s)' : ''))
    },
    hsave: () => { const r = rows('.hr', x => x); up(d => { d.hours.forEach((h, i) => { h.o = r[i].querySelector('.ho').value; h.c = r[i].querySelector('.hc').value; h.closed = r[i].querySelector('.hx').checked ? 1 : 0 }) }); say('✅ Hours saved') },
    fadd: () => up(d => { d.faqs = grabF(); d.faqs.push({ q: '', a: '' }) }), fdel: e => up(d => { d.faqs = grabF(); d.faqs.splice(+e.i, 1) }),
    fsave: () => { up(d => { d.faqs = grabF().filter(f => f.q && f.a) }); say('✅ FAQs saved') },
    asave: () => { up(d => { d.ai = { name: val('a_n').trim(), greet: val('a_g').trim(), tone: val('a_t'), rules: val('a_r').trim(), fallback: val('a_f').trim() } }); say('✅ AI settings saved') },
    tn: e => up(d => { d.tables = Math.max(1, Math.min(60, d.tables + +e.d)) }), gen: () => { U.qr = 1; R() }, print: () => print(),
    sadd: () => up(d => { d.staff = grabS().map((s, i) => ({ ...s, id: d.staff[i] ? d.staff[i].id : 'n' + i })); d.staff.push({ id: 'n' + Date.now(), name: '', pass: '', role: 'waiter' }) }),
    sdel: e => up(d => { d.staff = grabS().map((s, i) => ({ ...s, id: i })); d.staff.splice(+e.i, 1) }),
    ssave: () => { const s = grabS(); if (s.some(x => !x.name || !/^\d{4}$/.test(x.pass))) return say('⚠️ Every account needs a name and a 4-digit PIN'); up(d => { d.staff = s.map((x, i) => ({ ...x, id: 's' + i })) }); say('✅ Accounts saved') },
    clrq: () => up(d => { d.unanswered = [] }), clrw: () => up(d => { d.wrong = [] })
  };
  root.addEventListener('click', ev => { const el = ev.target.closest('[data-o]'); if (el && H[el.dataset.o]) H[el.dataset.o](el.dataset) });
  root.addEventListener('change', e => {
    if (e.target.id == 'mc') { U.cat = e.target.value; R() }
    if (e.target.id == 'fi' && e.target.files[0]) { const r = new FileReader(); r.onload = () => { document.getElementById('ta').value = r.result.replace(/^\ufeff/, '') }; r.readAsText(e.target.files[0]) }
  });
  root.addEventListener('input', e => { if (e.target.id == 'mq') { U.q = e.target.value; document.getElementById('ml').innerHTML = ml() } });
  root.addEventListener('keydown', e => { if (e.key == 'Enter' && e.target.id == 'pw') H.login() });

  Store.on(d => { D = d; applyMenu(); if (U.ok && !typing()) R() });   // realtime: new orders, questions, etc.
  R();
})();
