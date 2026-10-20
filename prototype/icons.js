/* icons.js — the prototype's icon set. Loaded before app.js (see index.html).
 * One family: 24 x 24 grid, 1.75 stroke, round caps and joins, drawn in currentColor so an icon takes the colour of its text.
 * ic('bell')        → inline SVG string for a template literal
 * ic('bell', 22)    → the same at 22 px
 * The interface never uses emoji; strip() removes any that arrive inside translated text (the diner dictionary in i18n.js
 * is generated from the real app and still contains a few, and the prototype test requires it to stay identical). */
(() => {
  const P = {
    // food and menu categories
    utensils: '<path d="M5 3v5a3 3 0 0 0 6 0V3M8 11v10"/><path d="M17 21V3c-2 1.4-3 4-3 7 0 2 1 3 3 3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
    combo: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4 10.5h16M12 10.5V19"/>',
    fish: '<path d="M2.5 12c2.5-3.5 6-5 9.5-5 3 0 5.5 2 7 5-1.5 3-4 5-7 5-3.5 0-7-1.5-9.5-5z"/><path d="M19 12l2.5-3v6zM8 11.5h.01"/>',
    sushi: '<path d="M4 14.5h16v3.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4.5 14.5c.4-3 3.3-5 7.5-5s7.1 2 7.5 5M9 11.5l1.5 3M14 11.5l1.5 3"/>',
    salad: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19c3-5 6-8 10-10"/>',
    skewer: '<path d="M4 20L20 4"/><circle cx="9" cy="15" r="2.4"/><circle cx="13" cy="11" r="2.4"/><circle cx="17" cy="7" r="2.4"/>',
    rice: '<path d="M3 13h18a8 8 0 0 1-8 7h-2a8 8 0 0 1-8-7z"/><path d="M6.5 13c0-3 2.4-5 5.5-5s5.5 2 5.5 5"/>',
    noodle: '<path d="M3 12.5h18a8 8 0 0 1-8 7h-2a8 8 0 0 1-8-7z"/><path d="M9 12.5L15 3.5M12.5 12.5l5.5-8"/>',
    bowl: '<path d="M3 12h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z"/><path d="M8 8c0-1.6 1-1.6 1-3.2M12 8c0-1.6 1-1.6 1-3.2M16 8c0-1.6 1-1.6 1-3.2"/>',
    cup: '<path d="M7 5h10l-1.2 14.2a1.5 1.5 0 0 1-1.5 1.3H9.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M7.4 9.5h9.2M13 5l1.6-2.5"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19c3-5 6-8 10-10"/>',
    flame: '<path d="M12 3c.8 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.3 2.2-4.2.1 1.8.9 2.7 1.8 2.9C10.4 8.4 10.6 5.4 12 3z"/>',
    // navigation and actions
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    cart: '<path d="M3 4h2.4l2.1 11h10.2l2-8H6.8"/><circle cx="10" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    menu: '<path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>',
    sparkle: '<path d="M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    more: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8.5v4M12 15.5h.01"/>',
    send: '<path d="M20.5 3.5L10 14M20.5 3.5L14 20.5l-4-6.5-6.5-4z"/>',
    swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.2a1 1 0 0 0 1 .8h8a1 1 0 0 0 1-.8L18 7M9 7V4h6v3"/>',
    note: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    thumbUp: '<path d="M8 10v10H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z"/><path d="M8 10l3-6a2 2 0 0 1 2 2.5L12.4 9H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 19H8"/>',
    thumbDown: '<path d="M8 14V4H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1z"/><path d="M8 14l3 6a2 2 0 0 0 2-2.5L12.4 15H18a2 2 0 0 0 2-2.3l-1.2-6A2 2 0 0 0 16.8 5H8"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    backspace: '<path d="M9 5h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"/><path d="M12.5 10l4 4M16.5 10l-4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    // service, kitchen and owner screens
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 12h.01M17.5 12h.01"/>',
    clipboard: '<path d="M9 4h6v3H9zM7 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1"/><path d="M9 12h6M9 16h4"/>',
    inbox: '<path d="M4 13l2.5-8h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13h4.5l1 2h5l1-2H20"/>',
    chefHat: '<path d="M7 14.5a4 4 0 0 1-.8-7.9 5 5 0 0 1 9.6 0 4 4 0 0 1-.8 7.9z"/><path d="M7 14.5V20h10v-5.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>',
    store: '<path d="M4 9l1.5-5h13L20 9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5 11.5V20h14v-8.5M10 20v-5h4v5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.5L20 15M20 20v-5h-5"/>',
    chart: '<path d="M4 4v16h16M8 16v-4M12 16V8M16 16v-6"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h3v-3"/>',
    printer: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/>',
    download: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>',
  };
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
  window.ic = (name, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || P.help}</svg>`;
  window.strip = s => String(s).replace(EMOJI, '').replace(/ {2,}/g, ' ').trim();
})();
