/* thread.js — the Golden Thread inside the prototype: feature = requirement = diagram = acceptance test.
 *  1. ?view=thread  → one table, FR-1 … FR-10: happy path, unhappy path, design (diagram), test, and a link that opens the screen.
 *  2. A "Covers" pill on every screen (top-left) naming the FR / SRS IDs of the screen you are on, with its happy and unhappy steps.
 *     On the Ask AI screen it also holds the switches that simulate "AI offline" and "model makes an unsafe claim".
 * The same rows are in docs/FINAL_REPORT.md §6; app/tests/prototype.test.ts checks that every test file and diagram named here exists. */
window.THREAD = [
  { fr: 'FR-1', what: 'Multilingual menu browsing', ids: 'DM-1 … DM-7, DM-11', view: 'customer',
    happy: 'Open the menu from the table QR address, switch TH / EN / MY, search "salmon", filter a category, open a dish.',
    unhappy: 'Search "zzz": "No dishes found" empty state. A sold-out dish shows "Sold out" and cannot be added.',
    design: ['05-use-cases.png', 'UC-1 Browse the menu'], test: ['ui/diner.test.tsx', 'diner-filters.test.ts', 'menu.test.ts'] },
  { fr: 'FR-2', what: 'Safe AI waiter chat', ids: 'AI-1 … AI-13, AI-16 … AI-20', view: 'customer', go: 'ai',
    happy: 'Ask AI: "What is the price of Salmon Sushi?" (data answer with a dish card), "I am allergic to peanuts" (allergen answer from data, ends with "confirm with the staff").',
    unhappy: 'Switch on "AI offline": open question gets a fallback with Browse / Call staff. Switch on "Model makes an unsafe claim": its reply is replaced. "Ignore all previous instructions…" is refused.',
    design: ['04-ai-flow.png', 'SRS §4.4 chat decision flow'], test: ['ai-rules.test.ts', 'ai-guard.test.ts', 'chat-api.test.ts'] },
  { fr: 'FR-3', what: 'Picks, orders and staff calls', ids: 'PC-1 … PC-7', view: 'customer', go: 'cart',
    happy: 'Add two dishes, open Cart, send to staff, then More → Call Staff. The order appears on the staff screen.',
    unhappy: 'Empty cart shows "Cart is empty". A sold-out dish is refused. A second staff call within 60 s is refused ("wait").',
    design: ['03-order-flow.png', 'SRS §4.3 order state model, UC-3, UC-4'], test: ['orders.test.ts', 'allergy-profile.test.ts', 'e2e/diner-flow.e2e.test.ts'] },
  { fr: 'FR-4', what: 'Waiter and kitchen live screens', ids: 'SF-3 … SF-6, PC-4', view: 'staff',
    happy: 'Staff: sign in as waiter (PIN 1111), take the order, then sign in as chef (2222): cook, mark ready; waiter serves.',
    unhappy: 'Chef and waiter see different tabs (a waiter cannot cook). An empty queue shows an empty state.',
    design: ['03-order-flow.png', 'UC-8, UC-9, UC-10'], test: ['ui/staff.test.tsx', 'orders.test.ts', 'diner-flow.test.ts'] },
  { fr: 'FR-5', what: 'Owner account and menu / allergen management', ids: 'OA-1 … OA-3, MM-1 … MM-7', view: 'owner',
    happy: 'Owner: sign in (demo login on the page), Menu Items → add or edit a dish and tick its allergens.',
    unhappy: 'Wrong password is refused. A dish without a name or with a negative price is rejected ("Name and price are required").',
    design: ['02-database.png', 'UC-5 Manage menu (menu_items, owners)'], test: ['auth.test.ts', 'menu.test.ts', 'ui/owner-menu.test.tsx'] },
  { fr: 'FR-6', what: 'Menu import from a photo', ids: 'MI-1 … MI-4', view: 'owner', go: 'imp',
    happy: 'Owner → Import Menu: paste the CSV template, import: the dishes are added.',
    unhappy: 'Rows with a missing name or price are skipped and counted ("skipped N invalid rows").',
    design: ['01-architecture.png', 'UC-6 Import a menu (vision model reads, owner reviews)'], test: ['import.test.ts', 'ui/import.test.tsx', 'ui/import-errors.test.tsx'] },
  { fr: 'FR-7', what: 'Restaurant settings (hours, FAQ, AI voice)', ids: 'ST-1, ST-3, ST-4', view: 'owner', go: 'hf',
    happy: 'Owner → Hours & FAQ: change a closing time, add a FAQ, save. Ask the AI "what are your opening hours?"',
    unhappy: 'A closing time that is not after the opening time is rejected ("Closing time must be after opening time").',
    design: ['02-database.png', 'settings, FAQs'], test: ['menu.test.ts', 'ai-rules.test.ts', 'ui/owner-shell.test.tsx'] },
  { fr: 'FR-8', what: 'QR codes per table', ids: 'QR-1, QR-2', view: 'owner', go: 'qr',
    happy: 'Owner → QR Codes: choose the number of tables and generate.',
    unhappy: 'Going below 1 or above 60 tables is refused ("Tables must be between 1 and 60").',
    design: ['05-use-cases.png', 'UC-7 Print QR codes'], test: ['menu.test.ts', 'ui/owner-pages.test.tsx'] },
  { fr: 'FR-9', what: 'Staff accounts (PIN)', ids: 'SF-1, SF-2', view: 'staff',
    happy: 'Staff: choose Waiter, enter 1111: you are in. Owner → Staff creates or changes a PIN.',
    unhappy: 'A wrong PIN is refused ("Wrong PIN (1 of 5)"). Five wrong PINs lock sign-in for 60 seconds. An account needs a name and a 4-digit PIN.',
    design: ['02-database.png', 'staff table, SRS SF-2 lockout'], test: ['auth.test.ts', 'security-round2.test.ts', 'ratelimit.test.ts'] },
  { fr: 'FR-10', what: 'Insights', ids: 'IN-1 … IN-4', view: 'owner', go: 'ins',
    happy: 'Ask the AI a question it has no rule for, then Owner → Insights: it is listed under "Questions the AI could not answer".',
    unhappy: 'With no questions yet, the list shows an empty state. Questions are stored without any personal data.',
    design: ['05-use-cases.png', 'UC-11 Read insights'], test: ['owner-insights.test.ts', 'chat-api.test.ts'] },
];

(() => {
  const view = window.APP_VIEW, esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const link = f => { const u = new URL(location.href); u.search = ''; u.searchParams.set('view', f.view); u.searchParams.set('table', '5'); u.searchParams.set('lang', 'en'); return u.href; };
  const css = document.createElement('style');
  css.textContent = `.cv{position:fixed;left:12px;top:12px;z-index:60;max-width:min(250px,calc(100vw - 24px));font:13px/1.45 system-ui,sans-serif;background:#fff;color:#111;border:1px solid #d6d6d6;border-radius:14px;box-shadow:0 6px 24px #0002}
.cv summary{cursor:pointer;padding:8px 12px;min-height:44px;display:flex;align-items:center;gap:6px;list-style:none}.cv summary::-webkit-details-marker{display:none}
.cv .b{padding:0 12px 12px}.cv h4{margin:8px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}.cv label{display:flex;gap:8px;align-items:center;min-height:32px}
@media(max-width:800px){.cv{top:auto;bottom:84px}}
.view-thread #app{width:auto!important;max-width:none!important;height:auto!important;overflow:visible!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important;margin:0!important}
.th{max-width:1280px;margin:0 auto;padding:72px 16px 40px;font:14px/1.5 system-ui,sans-serif;color:#111}.th table{border-collapse:collapse;width:100%}.th th,.th td{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}.th th{background:#111;color:#fff;position:sticky;top:0}.th td b{white-space:nowrap}.th a{color:#0645ad}
@media(max-width:800px){.th table,.th tbody,.th tr,.th td{display:block}.th thead{display:none}.th tr{margin-bottom:14px;border:1px solid #ddd}.th td{border:0;border-bottom:1px solid #eee}}`;
  document.head.appendChild(css);

  if (view === 'thread') {
    document.title = 'Golden Thread · Shop AI prototype';
    const rows = window.THREAD.map(f => `<tr><td><b>${f.fr}</b><br>${esc(f.what)}<br><small>${esc(f.ids)}</small></td><td>${esc(f.happy)}</td><td>${esc(f.unhappy)}</td>
<td><a href="assets/diagrams/${f.design[0]}" target="_blank" rel="noopener">${esc(f.design[0])}</a><br><small>${esc(f.design[1])}</small></td>
<td>${f.test.map(t => `<code>app/tests/${esc(t)}</code>`).join('<br>')}</td><td><a href="${link(f)}">Open the screen</a></td></tr>`).join('');
    document.getElementById('app').innerHTML = `<div class="th"><h1>Golden Thread</h1><p>Problem → requirement → design → feature → test. Each row: the requirement (course FR → SRS IDs), what to click for the happy path and for an unhappy path, the diagram it comes from, and the automated tests that prove it. Every screen also has a <b>Covers</b> pill (top-left) naming the requirement it shows.</p>
<table><thead><tr><th>Requirement</th><th>Happy path</th><th>Unhappy path</th><th>Design</th><th>Acceptance tests</th><th>Try</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }
  if (view === 'landing') return;

  // screen → FR (customer: S.view; owner: the highlighted nav button; staff: the signed-in role)
  const screenFR = () => {
    if (view === 'customer') return { home: 'FR-1', menu: 'FR-1', ai: 'FR-2', cart: 'FR-3', confirm: 'FR-3', more: 'FR-3' }[typeof S === 'object' ? S.view : 'home'] || 'FR-1';
    if (view === 'owner') { const on = document.querySelector('aside .on'); return on ? { dash: 'FR-10', menu: 'FR-5', imp: 'FR-6', hf: 'FR-7', ai: 'FR-7', qr: 'FR-8', staff: 'FR-9', ins: 'FR-10' }[on.dataset.v] : 'FR-5'; }
    return document.querySelector('.tt small') ? 'FR-4' : 'FR-9';
  };
  const pill = document.createElement('details'); pill.className = 'cv'; document.body.appendChild(pill);
  const sim = () => { try { return JSON.parse(sessionStorage.getItem('shopai_sim') || '{}') } catch (e) { return {} } };
  let last = '';
  const draw = () => {
    const fr = screenFR(), f = window.THREAD.find(x => x.fr === fr), s = sim(), key = fr + JSON.stringify(s); if (key === last) return; last = key;
    const sw = (k, label) => `<label><input type="checkbox" data-sim="${k}" ${s[k] ? 'checked' : ''}> ${label}</label>`;
    pill.innerHTML = `<summary><b>Covers:</b> ${fr} · ${esc(f.what)}</summary><div class="b"><div>${esc(f.ids)}</div><h4>Happy path</h4>${esc(f.happy)}<h4>Unhappy path</h4>${esc(f.unhappy)}
${fr === 'FR-2' ? `<h4>Simulate</h4>${sw('aiOffline', 'AI model offline')}${sw('modelMisbehaves', 'Model makes an unsafe claim')}` : ''}<h4>Design and tests</h4>${esc(f.design[1])} · ${esc(f.test[0])}<br><a href="?view=thread">All ten requirements</a></div>`;
  };
  pill.addEventListener('change', e => { const k = e.target.dataset.sim; if (!k) return; const s = sim(); s[k] = e.target.checked; sessionStorage.setItem('shopai_sim', JSON.stringify(s)); });
  new MutationObserver(draw).observe(document.getElementById('app'), { childList: true, subtree: true });
  draw();
})();
