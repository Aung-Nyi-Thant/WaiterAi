/* Shared content for the three isolated landing-page directions. */
(() => {
  if (window.APP_VIEW !== 'landing') return;
  document.getElementById('app').className = 'landing-app';
  document.getElementById('app').innerHTML = '<div id="stage"></div>';
  document.documentElement.lang = 'en';

  const dishes = [12, 16, 56, 103].map(id => MENU.find(m => m.id === id)).filter(Boolean);
  const roleNames = { diner: 'Diner', waiter: 'Floor staff', chef: 'Kitchen', owner: 'Owner' };
  let lang = 'en', role = 'diner';
  const picks = new Map();
  const href = view => `index.html?view=${view}&lang=en`;
  const brand = () => `<a class="lp-brand" href="index.html" aria-label="Shop AI home">${ic('utensils', 23)}<span>Shop AI</span></a>`;
  const action = (label = 'Explore the demo') => `<a class="lp-button" href="${href('customer')}">${label}<span aria-hidden="true">↗</span></a>`;
  const nav = () => `<a class="lp-skip" href="#main-content">Skip to content</a><header class="lp-nav">${brand()}<div class="lp-nav-links"><a href="#experience">Experience</a><a href="#handoff">How it works</a><a href="#questions">Questions</a></div><a class="lp-nav-demo" href="${href('owner')}">Owner demo ${ic('arrowRight', 16)}</a></header>`;
  const photo = (name, alt, cls = '') => `<img class="${cls}" src="assets/${name}.jpg" width="256" height="256" alt="${alt}" loading="lazy">`;
  const preview = () => {
    const count = [...picks.values()].reduce((a, n) => a + n, 0);
    const total = dishes.reduce((a, m) => a + m.p * (picks.get(m.id) || 0), 0);
    return `<div class="lp-menu" data-ui><div class="lp-menu-top"><span>HaChi Kyu</span><span>Table 5</span></div><div class="lp-menu-title"><div><h3>Your table, your taste</h3><p>Choose a dish to try the menu.</p></div>${ic('utensils', 22)}</div><div class="lp-languages" aria-label="Menu preview language">${[['en','English'],['th','ไทย'],['my','မြန်မာ']].map(([l,n]) => `<button type="button" data-preview-lang="${l}" lang="${l}" aria-pressed="${l === lang}">${n}</button>`).join('')}</div><div class="lp-dishes">${dishes.map(m => `<div class="lp-dish"><img src="${menuPhoto(m.img)}" width="72" height="72" alt="${esc(m.n[1])}"><div><b lang="${lang}">${esc(m.n[{ th: 0, en: 1, my: 2 }[lang]] || m.n[1])}</b><small>฿${m.p}</small></div><button type="button" data-preview-add="${m.id}" aria-label="Add ${esc(m.n[1])} to preview picks">${picks.get(m.id) || '+'}</button></div>`).join('') || '<p>No preview dishes available. Open the diner demo to browse the current menu.</p>'}</div><p class="lp-allergy">${ic('info', 15)}Recipe details are estimates. Confirm allergies with staff.</p><div class="lp-menu-total"><span>Preview picks <b>${count}</b></span><output aria-live="polite">฿${total}</output>${count ? '<button type="button" data-preview-clear>Clear</button>' : ''}</div></div>`;
  };
  const roleTabs = () => `<div class="lp-role-tabs" role="group" aria-label="Explore a restaurant role">${Object.entries(roleNames).map(([key,name]) => `<button type="button" data-preview-role="${key}" aria-pressed="${role === key}">${name}</button>`).join('')}</div>`;
  const rolePanel = () => {
    if (role === 'diner') return `<div class="lp-role-copy"><h3>A menu you can talk to</h3><p>Browse dishes in Thai, Burmese or English. Keep your picks together, ask a menu question, or call a person.</p><a href="${href('customer')}">Open diner demo ${ic('arrowRight', 18)}</a></div><div data-menu-preview>${preview()}</div>`;
    if (role === 'owner') return `<div class="lp-role-copy"><h3>The menu stays in your hands</h3><p>Edit dishes, mark availability, update opening hours and manage your team from one workspace.</p><a href="${href('owner')}">Open owner demo ${ic('arrowRight', 18)}</a><p class="lp-demo-login">Demo sign-in<br>ownerhachi_kyu@gmail.com / 1234</p></div><div class="lp-owner-sample" data-ui><div class="lp-sample-header"><b>Menu items</b><span>HaChi Kyu</span></div>${dishes.map(m => `<div class="lp-owner-row"><img src="${menuPhoto(m.img)}" width="48" height="48" alt="${esc(m.n[1])}"><b>${esc(m.n[1])}</b><span>฿${m.p}</span></div>`).join('')}<p>Menu edits in the demo are saved in this browser.</p></div>`;
    const chef = role === 'chef';
    return `<div class="lp-role-copy"><h3>${chef ? 'A clear next ticket' : 'People make the final call'}</h3><p>${chef ? 'Accepted orders reach the kitchen with table numbers, quantities and allergy notes. Move each ticket from cooking to ready.' : 'See table calls and diner picks together. Confirm an order before sending it to the kitchen, then serve it when it is ready.'}</p><a href="${href('staff')}">Open ${chef ? 'kitchen' : 'staff'} demo ${ic('arrowRight', 18)}</a><p class="lp-demo-login">Choose ${chef ? 'Chef · PIN 2222' : 'Waiter · PIN 1111'}</p></div><div class="lp-ticket" data-ui><div class="lp-ticket-top"><span>Example ticket</span>${ic(chef ? 'chefHat' : 'clipboard', 20)}</div><h3>Table 5</h3><p>${chef ? 'Accepted by floor staff' : 'Waiting for staff confirmation'}</p><div class="lp-ticket-line"><span>2 × Salmon Sushi</span><span>฿192</span></div><div class="lp-ticket-line"><span>1 × Miso Soup</span><span>฿42</span></div><div class="lp-ticket-total"><span>Total</span><b>฿234</b></div><p class="lp-ticket-note">Allergy notes stay with the ticket. Staff must confirm recipes.</p><a class="lp-button" href="${href('staff')}">Try the ${chef ? 'kitchen' : 'staff'} demo</a></div>`;
  };
  const experience = () => `<section class="lp-experience" id="experience"><div class="lp-section-heading"><h2 data-reveal>One table. A whole team.</h2><p data-reveal>Switch perspectives. See what each person needs to keep service moving.</p></div><div data-role-tabs>${roleTabs()}</div><div class="lp-role-panel" data-role-panel>${rolePanel()}</div></section>`;
  const handoff = () => `<section class="lp-handoff" id="handoff"><h2 data-reveal>From a pick to a plate</h2><div class="lp-handoff-body"><p data-reveal>A diner sends picks.<br>A waiter confirms.<br>The kitchen gets cooking.</p><div class="lp-handoff-detail"><p data-reveal>Each handoff carries the table, the dishes and the allergy notes. Sending picks asks the team to confirm your order.</p><a href="${href('staff')}" data-reveal>Follow it on the staff screen ${ic('arrowRight', 18)}</a></div></div></section>`;
  const questions = () => `<section class="lp-questions" id="questions"><div><h2 data-reveal>Before you try it</h2><p data-reveal>A few things to know about this prototype.</p>${photo('edamame', 'Edamame from the HaChi Kyu reference menu', 'lp-faq-photo')}</div><div class="lp-faq-list">${[
    ['Do diners need an account?', 'No. A table link opens the diner menu directly. The prototype starts at HaChi Kyu, Table 5.'],
    ['Which languages can I use?', 'The diner interface supports Thai, Burmese and English. Some dish names fall back to English when a translation is missing.'],
    ['How are allergies handled?', 'Diners can share an allergy profile with staff. Recipe and allergen details in this menu are estimates; ask the restaurant to confirm them.'],
    ['Is this a working restaurant?', 'This is a clickable demo. Menu edits, calls and orders stay in your browser. The AI is a scripted stand-in; it does not contact a live model.'],
    ['Can I explore the whole service?', 'Yes. Open the diner, staff and owner demos in the same browser. Their shared demo data connects the journey from picks to preparation and the bill.']
  ].map(([q,a]) => `<details data-reveal><summary>${q}<span aria-hidden="true">+</span></summary><p>${a}</p></details>`).join('')}</div></section>`;
  const footer = () => `<section class="lp-close"><div><h2 data-reveal>Take a seat at Table 5</h2><p data-reveal>Start with the menu. Follow the service.</p></div>${action()}</section><footer class="lp-footer"><div class="lp-footer-links"><p>A shared language for good service.</p><div><a href="${href('customer')}">Diner</a><a href="${href('staff')}">Staff & kitchen</a><a href="${href('owner')}">Owner</a></div></div><p class="lp-footer-wordmark" aria-hidden="true">Shop AI</p><div class="lp-credits"><span>Clickable prototype · Browser-saved demo data</span><a href="assets/provenance.json">Food references: HaChi Kyu / Wongnai</a></div></footer>`;
  const mosaic = () => `<div class="lp-food-mosaic">${photo('salmon-sushi','Salmon Sushi')}${photo('tuna-sushi','Tuna Sushi')}${photo('gyoza','Gyoza')}${photo('miso-soup','Miso Soup')}</div>`;

  let observer;
  window.Landing = { variants: [], brand, action, nav, preview, experience, handoff, questions, footer, mosaic, photo, href,
    activate() {
      observer?.disconnect();
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('lp-enter'); observer.unobserve(entry.target); }
      }), { threshold: .08 });
      document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    }
  };
  document.getElementById('app').addEventListener('click', event => {
    const add = event.target.closest('[data-preview-add]');
    const locale = event.target.closest('[data-preview-lang]');
    const tab = event.target.closest('[data-preview-role]');
    const clear = event.target.closest('[data-preview-clear]');
    if (!add && !locale && !tab && !clear) return;
    if (add) picks.set(+add.dataset.previewAdd, (picks.get(+add.dataset.previewAdd) || 0) + 1);
    if (locale) lang = locale.dataset.previewLang;
    if (clear) picks.clear();
    if (tab) {
      role = tab.dataset.previewRole;
      document.querySelector('[data-role-tabs]').innerHTML = roleTabs();
      document.querySelector('[data-role-panel]').innerHTML = rolePanel();
      document.querySelector(`[data-preview-role="${role}"]`).focus({ preventScroll: true });
    } else {
      document.querySelectorAll('[data-menu-preview]').forEach(el => { el.innerHTML = preview(); });
      const selector = add ? `[data-preview-add="${add.dataset.previewAdd}"]` : locale ? `[data-preview-lang="${lang}"]` : '[data-preview-add]';
      document.querySelector(selector)?.focus({ preventScroll: true });
    }
  });
})();
