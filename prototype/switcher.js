/* switcher.js — Prototype toolbar (demo only, remove before production).
 * Fixed at the top-right corner of the browser window:
 *   [ Diner ] [ Staff ] [ Owner ] [ Reset ]
 * - Diner / Staff / Owner : jump to that screen by changing the ?view= URL parameter
 *                           (other parameters such as restaurant/table are kept).
 * - Reset                 : wipe all prototype data (orders, calls, bills, cart, logins) and reload the current screen.
 * Loaded last in index.html. Styles live in Part 4 of proto.css (.pt-bar). */
(() => {
    // Views available in the prototype: [?view= value, button label, icon name (see icons.js)]
    const VIEWS = [['customer', 'Diner', 'utensils'], ['staff', 'Staff', 'chefHat'], ['owner', 'Owner', 'store']];

    // Storage keys used by the prototype (see data.js Store, app.js save(), staff login, owner login)
    const LOCAL_KEYS = ['shopai_db'];                                  // shared demo database (orders / calls / bills / menu edits)
    const SESSION_KEYS = ['shopai2', 'shopai_staff', 'shopai_owner'];    // diner session, staff login, owner login

    // Current screen (index.html sets window.APP_VIEW before this script runs)
    const cur = window.APP_VIEW || 'customer';

    // Build a URL for the target view: keep existing query params, only change "view"
    // (the diner screen is the default, so its ?view= parameter is removed)
    const urlFor = v => {
        const u = new URL(location.href);
        if (v === 'customer') u.searchParams.delete('view'); else u.searchParams.set('view', v);
        return u.href;
    };

    // Clear every prototype storage key, then reload the same screen from a clean state
    // Clearing localStorage also fires the "storage" event, so other open tabs (staff / owner) refresh automatically
    const reset = () => {
        LOCAL_KEYS.forEach(k => { try { localStorage.removeItem(k) } catch (e) { } });
        SESSION_KEYS.forEach(k => { try { sessionStorage.removeItem(k) } catch (e) { } });
        location.replace(location.href);
    };

    // Build the toolbar and attach it to <body> (outside #app, so app re-renders never remove it)
    const bar = document.createElement('div');
    bar.className = 'pt-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Prototype controls');
    bar.innerHTML =
        VIEWS.map(([v, label, ico]) => `<a href="${urlFor(v)}" class="${v === cur ? 'on' : ''}" title="${label}"${v === cur ? ' aria-current="page"' : ''}><span>${ic(ico, 16)}</span><b>${label}</b></a>`).join('') +
        `<button type="button" class="rs" title="Reset prototype"><span>${ic('refresh', 16)}</span><b>Reset</b></button>`;
    bar.querySelector('.rs').addEventListener('click', reset);
    document.body.appendChild(bar);

    // Owner dashboard uses the full browser width → add the class that reserves space under the toolbar
    if (cur === 'owner') document.body.classList.add('pt-owner');
})();
