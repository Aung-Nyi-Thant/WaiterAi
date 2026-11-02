(() => {
  if (!window.Landing) return;
  const L = window.Landing;
  L.variants.push(() => `<div class="lp lp-table">${L.nav()}<main class="lp-main" id="main-content"><div class="lp-table-layout"><div class="lp-table-stage"><div class="lp-table-caption"><span>HaChi Kyu</span><span>A shared table</span></div>${L.mosaic()}<div class="lp-table-statement"><p>Good food.<br>A little understanding.</p></div></div><div class="lp-table-reading"><section class="lp-hero"><h1 data-reveal>A little more<br>at the table</h1><p data-reveal>A menu in your language. A question answered. A waiter who knows what you picked. That is Shop AI.</p><div class="lp-hero-actions" data-reveal>${L.action()}</div><a class="lp-text-link" href="#experience">Explore the experience</a></section>${L.experience()}${L.handoff()}${L.questions()}</div></div>${L.footer()}</main></div>`);
})();
