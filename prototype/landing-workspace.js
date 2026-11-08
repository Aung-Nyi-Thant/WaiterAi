(() => {
  if (!window.Landing) return;
  const L = window.Landing;
  L.variants.push(() => `<div class="lp lp-workspace">${L.nav()}<main class="lp-main" id="main-content"><section class="lp-workspace-intro"><h1 data-reveal>Your next service,<br>connected</h1><div><p data-reveal>One table connects the diner, the floor and the kitchen. Try each side of Shop AI before the first order.</p><div data-reveal>${L.action()}</div></div></section>${L.experience()}<section class="lp-menu-strip"><div><h2 data-reveal>Real dishes. Clear choices.</h2><p data-reveal>The HaChi Kyu reference menu gives the demo its food, names and prices.</p></div>${L.mosaic()}</section>${L.handoff()}${L.questions()}${L.footer()}</main></div>`);
})();
