/* motion.js — entrance and feedback animations. Loaded after icons.js (see index.html); the styles are in Part 5 of proto.css.
 * Every screen is redrawn by replacing innerHTML, so a CSS transition never runs (the element is new each time). This file
 * compares the screen before and after a redraw and gives a class to only what changed; the keyframes do the rest.
 *
 *   const done = fx.snap(root);          // before replacing the screen
 *   root.innerHTML = ...;
 *   done({ page, order, count, list, main });
 *
 *   page   key of the page now shown (a tab, a view). When it changes, <main> slides in from the side it lies on (.pg-f / .pg-b)
 *   order  the pages in navigation order; decides the direction
 *   count  the cart count; when it grows, elements marked data-bump bounce
 *   list   key of the filter on the dish list (the category); when it changes, the cards enter one after another (.stg)
 *   main   selector of the scrolling content (default "main")
 * Marked elements: .on that was not .on before gets .sel (not inside a sheet that is opening) · [data-fx] that was not on screen before gets .fresh (a new order,
 * a new call; only when the page did not change) · [data-tick] whose text changed gets .tick (quantities). The first draw
 * of a page load animates nothing. */
(() => {
  const key = (e) => Object.values(e.dataset).join("|");
  let ready = false, lastPage, lastCount = 0, lastList, lastFx = new Set();
  window.fx = {
    snap(root) {
      const on = new Set([...root.querySelectorAll(".on")].map(key));
      const ticks = [...root.querySelectorAll("[data-tick]")].map((e) => e.textContent);
      return (o = {}) => {
        const main = root.querySelector(o.main || "main");
        const moved = ready && o.page !== undefined && o.page !== lastPage;
        if (ready) {
          root.querySelectorAll(".on").forEach((e) => { if (!on.has(key(e)) && !e.closest(".ov.in")) e.classList.add("sel"); });
          root.querySelectorAll("[data-tick]").forEach((e, i) => { if (ticks[i] !== undefined && ticks[i] !== e.textContent) e.classList.add("tick"); });
          if (o.count > lastCount) root.querySelectorAll("[data-bump]").forEach((e) => e.classList.add("bump"));
          if (moved && main) {
            const order = o.order || [];
            main.classList.add("pg", order.indexOf(o.page) < order.indexOf(lastPage) ? "pg-b" : "pg-f");
          }
          if (o.list !== undefined && o.list !== lastList && !moved) root.querySelector("#list")?.classList.add("stg");
        }
        const now = new Set([...root.querySelectorAll("[data-fx]")].map((e) => e.dataset.fx));
        if (ready && !moved) root.querySelectorAll("[data-fx]").forEach((e) => { if (!lastFx.has(e.dataset.fx)) e.classList.add("fresh"); });
        lastFx = now; lastPage = o.page; lastCount = o.count ?? lastCount; lastList = o.list; ready = true;
      };
    },
  };
})();
