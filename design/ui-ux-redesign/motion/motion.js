'use strict';
// Isolated interaction study. No fetch, credentials, persistence or live ordering.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const paths = {
  menu:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
  chat:'<path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5"/>',
  bag:'<path d="M5 8h14l1 13H4zM9 8V6a3 3 0 0 1 6 0v2"/>',
  bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  alert:'<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.chat}</svg>`;
const dishes = [
  {id:'salmon-sushi',name:'Salmon Sushi',th:'ซูชิแซลม่อน',my:'ဆော်လမွန် ဆူရှီ',category:'Sushi',price:96,allergens:'fish',portion:'1 piece'},
  {id:'tuna-sushi',name:'Tuna Sushi',th:'ซูชิทูน่า',my:'တူနာ ဆူရှီ',category:'Sushi',price:96,allergens:'fish',portion:'1 piece'},
  {id:'edamame',name:'Edamame',th:'ถั่วแระญี่ปุ่น',my:'Edamame',category:'Small plates',price:96,allergens:'soy',portion:'1 serving'},
  {id:'gyoza',name:'Gyoza',th:'เกี๊ยวซ่า',my:'Gyoza',category:'Small plates',price:96,allergens:'gluten, soy, sesame',portion:'1 serving'},
  {id:'miso-soup',name:'Miso Soup',th:'ซุบมิโซะ',my:'Miso ဟင်းချို',category:'Soup',price:42,allergens:'fish, soy',portion:'1 bowl'}
];
const state = {page:'menu',category:'All',lang:'EN',picks:{},unavailable:new Set(),role:'diner',calls:0,sent:false,allergy:false,ticket:'New'};
const main = $('#main'), device = $('.device'), dock = $('.dock');
const media = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new WeakMap(), running = new Set();
const OUT = 'cubic-bezier(.23,1,.32,1)';
let aiOpen = false, aiSequence = 0, requestSequence = 0, statusTimer;
const speed = () => $('#slow').checked ? 2 : 1;
const reduced = () => $('#motion').value === 'reduce' || media.matches;
const nameOf = d => state.lang === 'TH' ? d.th : state.lang === 'MY' ? d.my : d.name;
const asset = d => `../assets/${d.id}.jpg`;
const qty = () => Object.values(state.picks).reduce((a,b) => a+b,0);
const total = () => dishes.reduce((n,d) => n + (state.picks[d.id] || 0)*d.price,0);
function motion(el, frames, duration, channel='state') {
  if (!el) return Promise.resolve();
  const map = animations.get(el) || new Map();
  const previous = map.get(channel);
  const current = previous ? {transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity} : null;
  previous?.cancel();
  let keyframes = frames.map(f => ({...f}));
  if (reduced()) keyframes = keyframes.map(({opacity,offset}) => ({...(opacity !== undefined ? {opacity} : {}),...(offset !== undefined ? {offset} : {})}));
  else if (current) keyframes[0] = {...keyframes[0],...current};
  el.style.willChange = reduced() ? 'opacity' : 'transform, opacity';
  const animation = el.animate(keyframes,{duration:(reduced()?120:duration)*speed(),easing:OUT,fill:'none'});
  map.set(channel,animation);animations.set(el,map);running.add(animation);
  return animation.finished.catch(() => {}).finally(() => {running.delete(animation);if(map.get(channel)===animation){map.delete(channel);el.style.willChange='';}});
}
function refreshMotion() {
  device.classList.toggle('motion-reduced',reduced());
  document.body.classList.toggle('motion-reduced',reduced());
  if (reduced()) for (const a of [...running]) a.finish();
  device.style.setProperty('--press',`${160*speed()}ms`);
  device.style.setProperty('--routine',`${240*speed()}ms`);
}
$('#motion').addEventListener('change',refreshMotion);$('#slow').addEventListener('change',refreshMotion);media.addEventListener('change',refreshMotion);
document.addEventListener('pointerdown',event => {
  if (reduced()) return;
  const button = event.target.closest('button');if(!button || button.disabled || !device.contains(button) && !button.closest('dialog,[popover]')) return;
  const rect = button.getBoundingClientRect();button.querySelector('.ripple')?.remove();
  const ripple = document.createElement('span');ripple.className='ripple';ripple.setAttribute('aria-hidden','true');ripple.style.left=`${event.clientX-rect.left-10}px`;ripple.style.top=`${event.clientY-rect.top-10}px`;button.append(ripple);
  const size = Math.max(rect.width,rect.height)/9;
  motion(ripple,[{transform:'scale(.85)',opacity:.8},{transform:`scale(${size})`,opacity:0}],280,'ripple').then(()=>ripple.remove());
});
function notify(message) {
  const el = $('#status');el.textContent=message;el.classList.add('visible');clearTimeout(statusTimer);statusTimer=setTimeout(()=>el.classList.remove('visible'),2400);
}
function nav() {
  const pages=[['menu','Menu','menu'],['ask','Ask AI','chat'],['picks','My picks','bag'],['staff','Staff','bell']];
  pages.forEach(([id,label,ico],i) => {const b=$(`[data-page="${id}"]`);b.innerHTML=icon(ico)+`<span>${label}</span>`+(id==='picks'&&qty()?`<b>${qty()}</b>`:'');if(state.page===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');if(state.page===id)$('#nav-drop').style.transform=`translateX(${i*100}%)`;});
}
function title(text,subtitle='') {return `<div class="intro"><h2>${text}</h2><p>${subtitle}</p></div>`;}
function aiBar(standalone=false) {
 return `<section class="ai-area" aria-label="Menu assistant"><button class="ai-trigger glass" id="ai-trigger" aria-expanded="false" aria-controls="ai-panel">${icon('chat')}<span>Ask AI about the menu…</span><span class="end">${icon('down')}</span></button><span class="liquid-drop" hidden aria-hidden="true"></span><section id="ai-panel" class="ai-panel glass" hidden aria-label="Ask the menu"><div class="panel-title"><h3>Ask the menu</h3><button id="ai-close" aria-label="Close menu assistant">×</button></div><p class="disclaimer">Recipe estimates. Staff confirm allergies.</p><form class="question-form" id="question-form"><input id="question" aria-label="Question about the menu" placeholder="What would you like to know?" maxlength="240" autocomplete="off"><button aria-label="Ask question">↑</button></form><div class="suggestions"><button data-question="Under THB 100">Under THB 100</button><button data-question="What contains fish?">What contains fish?</button></div><div class="ai-result" id="ai-result" aria-live="polite"><p class="note">Ask about portions, prices or ingredients.</p></div></section></section>${standalone?'<p class="secondary" style="font-size:13px">Use the same assistant without leaving the menu.</p>':''}`;
}
function dishRow(d) {
 const out=state.unavailable.has(d.id);
 return `<article class="dish"><button class="photo-button" data-detail="${d.id}" aria-label="View ${d.name}"><img src="${asset(d)}" alt="${d.name}" width="104" height="104"></button><div class="dish-info"><button class="dish-title" data-detail="${d.id}">${nameOf(d)}</button><small>${d.portion} / Est. ${d.allergens}</small><div class="price-line"><strong>THB ${d.price}</strong><button class="add" data-add="${d.id}" aria-label="Add ${d.name}" ${out?'disabled':''}>${out?'—':'+'}</button></div>${out?'<small>Sold out</small>':''}</div></article>`;
}
function menu() {
 return title('HaChi Kyu','Table 05 / Dine in')+aiBar()+`<div class="tabs" aria-label="Menu categories">${['All','Sushi','Small plates','Soup'].map(c=>`<button data-category="${c}" aria-pressed="${state.category===c}">${c}</button>`).join('')}<span class="category-line" aria-hidden="true"></span></div><button class="allergy-profile" id="allergy">${icon('alert')}<span>${state.allergy?'Peanut allergy profile set':'Allergy profile'}</span><span>›</span></button><label class="filter-search">${icon('search')}<input id="dish-search" aria-label="Search dishes" placeholder="Search dishes" type="search"></label><div id="menu-list" class="menu-list"></div>`;
}
function renderMenuList(query='') {
 const list=$('#menu-list');if(!list)return;const filtered=dishes.filter(d=>(state.category==='All'||state.category===d.category)&&`${d.name} ${d.allergens} ${nameOf(d)}`.toLowerCase().includes(query.toLowerCase()));
 list.innerHTML=filtered.length?filtered.map(dishRow).join(''):'<div class="empty"><h3>No dishes match</h3><p>Try another search or category.</p></div>';
 const active=$(`[data-category="${state.category}"]`),line=$('.category-line');if(active&&line){line.style.transform=`translateX(${active.offsetLeft}px) scaleX(${active.offsetWidth/24})`;}
}
function picks() {
 if(state.sent)return `<div class="checkmark" aria-hidden="true">✓</div>${title('Sent to staff','Demo: awaiting staff confirmation.')}<div class="notice"><strong>Peanut allergy ${state.allergy?'shared':'not set'}</strong>Your picks and total still need staff confirmation.</div><button class="primary full" data-page="menu">Back to the menu</button>`;
 if(!qty())return title('My picks','Table 05')+'<div class="empty"><h3>A table for your favourites.</h3><p>Add a dish from the menu to get started.</p><button class="outline" data-page="menu">Browse the menu</button></div>';
 return title('My picks','Review before sending to staff.')+dishes.filter(d=>state.picks[d.id]).map(d=>`<article class="pick-row"><img src="${asset(d)}" alt=""><div><h3>${nameOf(d)}</h3><small>THB ${d.price} each / Est. ${d.allergens}</small><div class="quantity"><button data-quantity="${d.id}" data-delta="-1" aria-label="Remove one ${d.name}">−</button><output aria-label="Quantity of ${d.name}">${state.picks[d.id]}</output><button data-quantity="${d.id}" data-delta="1" aria-label="Add one ${d.name}">+</button></div></div></article>`).join('')+`<div class="notice"><strong>${state.allergy?'Peanut allergy will be shared':'Allergy profile not set'}</strong>Speak with staff before ordering. Recipes are estimates.</div><div class="total"><span>Estimated total</span><strong>THB ${total()}</strong></div><button class="primary full" id="send-picks">Send to staff</button>`;
}
function staff(){return title('Staff','A person is always available.')+`<div class="notice">Ask the floor team about recipes, allergies or changes to your order.</div><button id="call-staff" class="primary full">Call staff</button><p class="secondary" style="font-size:12px;margin-top:16px">Demo requests appear in the Floor staff preview.</p>`;}
function operational() {
 if(state.role==='floor')return title('Floor','Illustrative service feed')+`<article class="ticket"><header><h3>Table 05</h3><span class="age">${state.calls?'Guest call':'Picks / 2 min'}</span></header><p>${state.calls?'A guest needs help.':'2 × Salmon Sushi<br>1 × Miso Soup'}</p><div class="notice"><strong>Peanut allergy</strong>Confirm with guest and kitchen.</div><div class="actions"><button class="primary" id="floor-action">${state.calls?'Mark handled':'Take order'}</button></div></article>`;
 if(state.role==='kitchen')return title('Kitchen','Illustrative ticket')+`<article class="ticket"><header><h3>Table 05</h3><span class="age">2 min</span></header><div class="ticket-state">${state.ticket}</div><p>2 × Salmon Sushi<br>1 × Miso Soup</p><div class="notice"><strong>Peanut allergy</strong>Check with floor staff before cooking.</div><button id="kitchen-action" class="primary full">${state.ticket==='New'?'Start preparing':state.ticket==='Cooking'?'Mark ready':'Recall to preparing'}</button></article>`;
 return title('Menu','Owner / illustrative workspace')+`<div class="notice"><strong>Allergen information needs review</strong>Missing information stays unknown. Confirm recipes with your kitchen.</div>${dishes.map(d=>`<div class="owner-row"><div><strong>${d.name}</strong><small>THB ${d.price} / Est. ${d.allergens}</small></div><button class="switch" role="switch" aria-label="Availability of ${d.name}" aria-checked="${!state.unavailable.has(d.id)}" data-available="${d.id}">${state.unavailable.has(d.id)?'Sold out':'Available'}</button></div>`).join('')}`;
}
function render({animate=true,focus=false}={}) {
 ++aiSequence;++requestSequence;aiOpen=false;
 main.innerHTML=state.role!=='diner'?operational():state.page==='menu'?menu():state.page==='ask'?title('Ask AI','HaChi Kyu / menu assistant')+aiBar(true):state.page==='picks'?picks():staff();
 dock.hidden=state.role!=='diner';dock.style.display=state.role!=='diner'?'none':'grid';nav();
 if(state.page==='menu'&&state.role==='diner')renderMenuList();
 if(animate)motion(main,[{opacity:.45,transform:'translateY(7px) scale(.985,.995)'},{opacity:1,transform:'translateY(0) scale(1)'}],240,'page');
 if(focus)main.focus({preventScroll:true});
}
function navigate(page) {if(!['menu','ask','picks','staff'].includes(page))return;state.page=page;main.scrollTop=0;render({focus:true});if(page==='ask')openAI();}
async function openAI() {
 const panel=$('#ai-panel');if(!panel||aiOpen)return;aiOpen=true;const sequence=++aiSequence;
 $('#ai-trigger').setAttribute('aria-expanded','true');panel.hidden=false;
 const drop=$('.liquid-drop');drop.hidden=reduced();
 if(!reduced())motion(drop,[{transform:'translateY(0) scale(.9,1.1)',opacity:.9},{transform:'translateY(21px) scale(.7,1.3)',opacity:1,offset:.5},{transform:'translateY(38px) scale(1.25,.85)',opacity:0}],300,'drop').then(()=>drop.hidden=true);
 await motion(panel,[{opacity:.3,transform:'translateY(-12px) scale(.97,.88)',borderRadius:'28px 28px 40px 40px'},{opacity:1,transform:'translateY(3px) scale(1.008,1.02)',borderRadius:'20px 20px 25px 25px',offset:.68},{opacity:1,transform:'translateY(0) scale(1)',borderRadius:'22px'}],480,'panel');
 if(sequence===aiSequence&&aiOpen)$('#question')?.focus({preventScroll:true});
}
async function closeAI({restoreFocus=true}={}) {
 if(!aiOpen)return;aiOpen=false;const sequence=++aiSequence;const panel=$('#ai-panel');$('#ai-trigger')?.setAttribute('aria-expanded','false');
 await motion(panel,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-9px) scale(.98,.94)'}],180,'panel');
 if(sequence===aiSequence&&!aiOpen){panel.hidden=true;if(restoreFocus)$('#ai-trigger')?.focus({preventScroll:true});}
}
async function ask(question) {
 const text=question.trim();if(!text)return;const result=$('#ai-result');if(!result)return;const sequence=++requestSequence;
 $('#question').value=text;result.setAttribute('aria-busy','true');result.innerHTML='<div class="loading-drops" aria-label="Checking the menu"><i></i><i></i><i></i></div><p class="note">Checking the menu…</p>';
 await new Promise(resolve=>setTimeout(resolve,650));if(sequence!==requestSequence||!result.isConnected)return;
 const lower=text.toLowerCase();let reply='This prototype shows sample replies. Try a budget, portion, fish or vegetarian question.',matches=[];
 if(/100|budget|price|cheap/.test(lower)){reply='These dishes are under THB 100. Recipe and allergen details are estimates.';matches=[dishes[0],dishes[2]];}
 else if(/fish|allerg|peanut|ingredient/.test(lower)){reply='Salmon Sushi is estimated to list fish. Miso Soup is estimated to list fish and soy. Missing data is not an allergy guarantee.';matches=[dishes[0],dishes[4]];}
 else if(/veget|light|soy/.test(lower)){reply='Edamame may fit a lighter meal. It lists soy in the recipe estimates. Confirm ingredients and cross-contact with staff.';matches=[dishes[2]];}
 else if(/piece|portion|salmon/.test(lower)){reply='Salmon Sushi is THB 96 for one piece. The reference photo shows more than one piece.';matches=[dishes[0]];}
 result.removeAttribute('aria-busy');result.innerHTML='';const answer=document.createElement('p');answer.textContent=reply;result.append(answer);
 result.insertAdjacentHTML('beforeend',matches.map(d=>`<div class="mini-dish"><img src="${asset(d)}" alt=""><div><strong>${nameOf(d)}</strong><small>THB ${d.price} / Est. ${d.allergens}</small></div><button data-add="${d.id}" aria-label="Add ${d.name}" ${state.unavailable.has(d.id)?'disabled':''}>+</button></div>`).join('')+'<p class="note">Sample reply. Confirm allergies with staff.</p>');
 motion(result,[{opacity:.35,transform:'translateY(-5px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],240,'answer');
}
function add(id){const d=dishes.find(d=>d.id===id);if(!d||state.unavailable.has(id))return;state.picks[id]=(state.picks[id]||0)+1;state.sent=false;nav();const badge=$('[data-page="picks"] b');motion(badge,[{transform:'scale(.9,1.1)',opacity:.6},{transform:'scale(1.12,.94)',opacity:1,offset:.55},{transform:'scale(1)',opacity:1}],240,'count');notify(`${d.name} added to My picks`);}
function detail(id){const d=dishes.find(d=>d.id===id);if(!d)return;$('#dish-content').innerHTML=`<img class="detail-image" src="${asset(d)}" alt="${d.name}"><div class="detail-body"><p class="detail-caption">Reference photo / price is for ${d.portion}.</p><h2 id="dish-title">${nameOf(d)}</h2><p>${d.portion}</p><div class="notice"><strong>Estimated allergens: ${d.allergens}</strong>Recipe estimates are not staff-verified. Confirm with staff before ordering.</div><div class="detail-price"><span>Price</span><strong>THB ${d.price}</strong></div><button class="primary full" data-add="${d.id}" ${state.unavailable.has(id)?'disabled':''}>Add to my picks</button></div>`;const dialog=$('#dish-dialog');dialog.showModal();motion(dialog,[{opacity:.2,transform:'translateY(18px) scale(.96,.97)'},{opacity:1,transform:'translateY(-2px) scale(1.005)',offset:.7},{opacity:1,transform:'translateY(0) scale(1)'}],300,'dialog');}
$('#dish-dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
$('#dish-dialog form').addEventListener('submit',event=>{event.preventDefault();closeDialog();});
async function closeDialog(){const d=$('#dish-dialog');await motion(d,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(12px) scale(.97)'}],180,'dialog');d.close();}
document.addEventListener('click',event=>{
 if(aiOpen&&!event.target.closest('.ai-area')&&device.contains(event.target))closeAI({restoreFocus:false});
 const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.page){navigate(b.dataset.page);return;}
 if(b.id==='ai-trigger'){aiOpen?closeAI():openAI();return;}
 if(b.id==='ai-close'){closeAI();return;}
 if(b.dataset.question){ask(b.dataset.question);return;}
 if(b.dataset.add){add(b.dataset.add);return;}
 if(b.dataset.detail){detail(b.dataset.detail);return;}
 if(b.dataset.category){state.category=b.dataset.category;$$('[data-category]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderMenuList($('#dish-search').value);motion($('#menu-list'),[{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],200,'filter');return;}
 if(b.dataset.quantity){const id=b.dataset.quantity;const value=Math.max(0,(state.picks[id]||0)+Number(b.dataset.delta));if(!value){delete state.picks[id];render({focus:true});}else{state.picks[id]=value;const output=$('output',b.parentElement);output.value=String(value);motion(output,[{opacity:.4,transform:'translateY(3px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}],160,'quantity');$('.total strong').textContent=`THB ${total()}`;nav();}return;}
 if(b.id==='allergy'){state.allergy=!state.allergy;$('.allergy-profile span').textContent=state.allergy?'Peanut allergy profile set':'Allergy profile';notify(state.allergy?'Demo peanut allergy profile set':'Demo allergy profile cleared');return;}
 if(b.id==='call-staff'){state.calls++;notify('Demo call added to the floor feed');return;}
 if(b.id==='send-picks'){state.sent=true;render({focus:true});motion($('.checkmark'),[{transform:'scale(.9,1.1)',opacity:.4},{transform:'scale(1.08,.96)',opacity:1,offset:.65},{transform:'scale(1)',opacity:1}],300,'success');return;}
 if(b.id==='floor-action'){if(state.calls)state.calls=0;else state.ticket='New';notify('Demo floor action saved');b.textContent='Handled';return;}
 if(b.id==='kitchen-action'){state.ticket=state.ticket==='New'?'Cooking':state.ticket==='Cooking'?'Ready':'Cooking';$('.ticket-state').textContent=state.ticket;b.textContent=state.ticket==='Cooking'?'Mark ready':'Recall to preparing';motion($('.ticket'),[{transform:'scale(.985,1.015)',opacity:.8},{transform:'scale(1)',opacity:1}],200,'ticket');return;}
 if(b.dataset.available){const id=b.dataset.available;state.unavailable.has(id)?state.unavailable.delete(id):state.unavailable.add(id);b.setAttribute('aria-checked',!state.unavailable.has(id));b.textContent=state.unavailable.has(id)?'Sold out':'Available';notify('Demo availability updated');return;}
 if(b.dataset.language){state.lang=b.dataset.language;$('#language-trigger').innerHTML=state.lang+' <span aria-hidden="true">⌄</span>';$$('[data-language]').forEach(x=>{const mark=$('span',x);mark?.remove();if(x===b)x.insertAdjacentHTML('beforeend','<span>✓</span>');});$('#languages').hidePopover();render({focus:true});return;}
});
document.addEventListener('submit',event=>{if(event.target.id==='question-form'){event.preventDefault();ask($('#question').value);}});
document.addEventListener('input',event=>{if(event.target.id==='dish-search')renderMenuList(event.target.value);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&aiOpen){event.preventDefault();closeAI();}});
$('#role').addEventListener('change',()=>{state.role=$('#role').value;main.scrollTop=0;render();});
$('#reset').addEventListener('click',()=>{state.page='menu';state.category='All';state.picks={};state.sent=false;state.allergy=false;state.calls=0;state.ticket='New';state.unavailable.clear();render();notify('Prototype reset');});
const popover=$('#languages');
$('#language-trigger').addEventListener('click',()=>{const r=$('#language-trigger').getBoundingClientRect();popover.style.left=`${Math.max(8,Math.min(innerWidth-188,r.right-180))}px`;popover.style.top=`${r.bottom+3}px`;});
popover.addEventListener('toggle',event=>{if(event.newState==='open')motion(popover,[{opacity:.3,transform:'translateY(-6px) scale(.95,.92)',borderRadius:'22px'},{opacity:1,transform:'translateY(1px) scale(1.01)',offset:.7},{opacity:1,transform:'translateY(0) scale(1)',borderRadius:'14px'}],240,'language');});
refreshMotion();render({animate:false});
