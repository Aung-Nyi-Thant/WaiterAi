/* ai-rules.js — scripted stand-in for the AI waiter (FR-2), used by AIService.send() in app.js.
 * Same rules as the real app (app/src/modules/ai/ai.ts): allergens, prices and availability come from MENU, never from a model;
 * a dish is never called "safe"; allergy suggestions use only restaurant-verified dishes (m.v); every allergen answer ends with
 * "confirm with the staff". Returns { t, items?, qa? }, or null when no rule applies (app.js then tries FAQ / hours / fallback).
 * Unhappy paths are switched on from the "Covers" pill (thread.js) and stored in sessionStorage 'shopai_sim'. */
window.AIRules = (() => {
  const LI = { th: 0, en: 1, my: 2 };
  const pick = (l, en, th, my) => (l === 'th' ? th : l === 'my' ? my : en);
  const STAFF = l => pick(l, 'Please confirm with the staff before ordering.', 'กรุณายืนยันกับพนักงานก่อนสั่งอาหาร', 'ဝန်ထမ်းကို မေးမြန်းပေးပါ။');
  const sim = () => { try { return JSON.parse(sessionStorage.getItem('shopai_sim') || '{}') } catch (e) { return {} } };
  const AW = { peanut: /peanut|ถั่วลิสง|မြေပဲ/i, nut: /tree nut|almond|cashew|walnut|ถั่วเปลือกแข็ง/i, shell: /shrimp|prawn|shellfish|crab|กุ้ง|ปู|ပုစွန်/i, fish: /\bfish\b|salmon|tuna|ปลา|ငါး/i, egg: /\beggs?\b|ไข่|ဥ/i, milk: /\bmilk\b|dairy|cheese|นม|နို့/i, gluten: /gluten|wheat|กลูเตน|ข้าวสาลี/i, soy: /\bsoy|ถั่วเหลือง/i, sesame: /sesame|งา|နှမ်း/i };
  const INJECT = /ignore (all |any |your )?(previous|prior|above)|system prompt|you are now|pretend (to be|you)|developer mode|jailbreak/i;
  const OFF_TOPIC = /weather|the news|president|politic|homework|bitcoin|stock market|write (me )?(a |an )?(poem|code|essay|song)|capital of|ข่าว|การเมือง|การบ้าน|หุ้น/i;
  const plain = s => String(s).replace(/\[[^\]]*\]/g, '').trim().toLowerCase();
  const nm = m => tr(m.n).replace(/</g, '&lt;');
  const dishIn = text => { const q = text.toLowerCase(); return MENU.filter(m => m.n.some(n => plain(n).length > 2 && q.includes(plain(n)))).sort((a, b) => plain(b.n[1]).length - plain(a.n[1]).length)[0]; };
  const names = ms => ms.map(m => `${nm(m)} (฿${m.p})`).join(', ');
  const staffQA = l => [['modal', 'staff', pick(l, 'Call staff', 'เรียกพนักงาน', 'ဝန်ထမ်းခေါ်ရန်')]];

  function answer(message, ctx) {
    const l = ctx.lang, q = message.toLowerCase(), live = MENU.filter(m => !m.s), s = sim();
    if (INJECT.test(message)) return { t: pick(l, "I can't change how I work. I answer from the menu data, and I never call a dish safe for allergies. ", 'ฉันเปลี่ยนวิธีทำงานไม่ได้ ฉันตอบจากข้อมูลเมนู และไม่บอกว่าเมนูใดปลอดภัยสำหรับการแพ้ ', 'ကျွန်ုပ် အလုပ်လုပ်ပုံကို ပြောင်း၍မရပါ။ မီနူးအချက်အလက်ကိုသာ ဖြေပါမည်။ ') + STAFF(l), qa: staffQA(l), kind: 'guard' };
    if (OFF_TOPIC.test(message)) return { t: pick(l, "I'm here to help with our menu and our restaurant. What would you like to eat?", 'ช่วยได้เฉพาะเรื่องเมนูและร้านของเรา วันนี้อยากกินอะไรดี', 'မီနူးနဲ့ ဆိုင်အကြောင်းကိုပဲ ကူညီပေးနိုင်ပါတယ်။ ဒီနေ့ ဘာစားချင်လဲ?'), kind: 'rule' };
    if (/\b(bill|check please|call (the )?(staff|waiter)|waiter)\b|เช็คบิล|เรียกพนักงาน/.test(q)) return { t: pick(l, 'I can call the staff to your table. Tap the button.', 'เรียกพนักงานมาที่โต๊ะได้ กดปุ่มด้านล่าง', 'ဝန်ထမ်းကို ခေါ်ပေးနိုင်ပါတယ်။ ခလုတ်ကိုနှိပ်ပါ။'), qa: staffQA(l), kind: 'rule' };
    const dish = dishIn(message), keys = Object.keys(AW).filter(k => AW[k].test(message) && !(dish && AW[k].test(plain(dish.n[1])) && !/allerg|แพ้|free|without/i.test(message)));
    // allergens: from the data only; estimated lists are named as estimates; "safe" is never said
    if (/allerg|แพ้|safe|free of|without|what can i eat|กินอะไรได้/i.test(message) || (dish && /ingredient|contain|ส่วนผสม/i.test(message))) {
      if (dish) {
        const a = dish.al.length ? dish.al.map(k => tr(AL[k])).join(', ') : pick(l, 'none listed', 'ไม่มีที่ระบุไว้', 'မရှိပါ');
        const st = dish.v ? pick(l, 'Verified by the restaurant.', 'ร้านยืนยันแล้ว', 'ဆိုင်က အတည်ပြုထားသည်။') : pick(l, 'This list is an estimate from typical ingredients, not verified by the restaurant.', 'รายการนี้เป็นการประมาณจากส่วนผสมทั่วไป ร้านยังไม่ได้ยืนยัน', 'ဤစာရင်းသည် ခန့်မှန်းချက်သာ ဖြစ်ပြီး ဆိုင်က မအတည်ပြုရသေးပါ။');
        return { t: `${nm(dish)}: ${a}. ${st} ${STAFF(l)}`, items: [dish.id], qa: staffQA(l), kind: 'data' };
      }
      const avoid = keys.length ? keys : S.al, ok = live.filter(m => m.v && !avoid.some(k => m.al.includes(k)));
      if (!ok.length) return { t: pick(l, 'No dish has an allergen list the restaurant has verified yet, so I cannot suggest any dish for this allergy. ', 'ยังไม่มีเมนูที่ร้านยืนยันรายการสารก่อภูมิแพ้ จึงแนะนำเมนูสำหรับการแพ้นี้ไม่ได้ ', 'ဆိုင်က အတည်ပြုထားသော ဟင်းလျာ မရှိသေးသဖြင့် မအကြံပြုနိုင်ပါ။ ') + STAFF(l), qa: staffQA(l), kind: 'data' };
      return { t: pick(l, 'Dishes whose verified list does not include it: ', 'เมนูที่รายการที่ร้านยืนยันไม่มีสารนี้: ', 'အတည်ပြုစာရင်းတွင် မပါသော ဟင်းလျာများ: ') + names(ok.slice(0, 5)) + '. ' + STAFF(l), items: ok.slice(0, 5).map(m => m.id), qa: staffQA(l), kind: 'data' };
    }
    if (dish && /how much|price|cost|ราคา|เท่าไร|กี่บาท|ဈေး/i.test(message)) return { t: `${nm(dish)}: ฿${dish.p}${dish.s ? pick(l, ' (sold out today)', ' (หมดวันนี้)', ' (ယနေ့ ကုန်သွားပြီ)') : ''}.`, items: [dish.id], kind: 'data' };
    if (dish && /sold|available|have|มี|หมด/i.test(message)) return { t: dish.s ? pick(l, `${nm(dish)} is sold out today.`, `${nm(dish)} หมดวันนี้`, `${nm(dish)} ယနေ့ ကုန်သွားပြီ။`) : pick(l, `${nm(dish)} is available.`, `${nm(dish)} มีค่ะ`, `${nm(dish)} ရှိပါတယ်။`), items: [dish.id], kind: 'data' };
    if (/cheapest|ถูกที่สุด/i.test(message)) { const m = live.slice().sort((a, b) => a.p - b.p)[0]; return { t: pick(l, 'The cheapest dish on the menu: ', 'เมนูที่ถูกที่สุด: ', 'အဈေးသက်သာဆုံး: ') + names([m]), items: [m.id], kind: 'data' }; }
    if (/recommend|popular|best|แนะนำ|ยอดนิยม/i.test(message)) { const r = live.filter(m => m.c.includes('rec')).slice(0, 3); if (r.length) return { t: pick(l, 'The restaurant marks these as recommended: ', 'ร้านแนะนำเมนูเหล่านี้: ', 'ဆိုင်က အကြံပြုသော ဟင်းလျာများ: ') + names(r), items: r.map(m => m.id), kind: 'data' }; }
    if (/spicy|เผ็ด/i.test(message)) { const r = live.filter(m => m.sp).slice(0, 4); return { t: r.length ? pick(l, 'These come with a spice level: ', 'เมนูที่เลือกระดับความเผ็ดได้: ', 'စပ်အဆင့်ရွေးနိုင်သော ဟင်းလျာများ: ') + names(r) : pick(l, 'No dish has a spice level.', 'ไม่มีเมนูที่เลือกความเผ็ดได้', 'စပ်အဆင့်ရွေးနိုင်သော ဟင်းလျာ မရှိပါ။'), items: r.map(m => m.id), kind: 'data' }; }
    if (/^(hi|hello|hey|thanks|thank you)\b|สวัสดี|ขอบคุณ/i.test(message.trim())) return { t: pick(l, 'Hello! Ask me about dishes, prices or allergens.', 'สวัสดีค่ะ ถามเรื่องเมนู ราคา หรือสารก่อภูมิแพ้ได้เลย', 'မင်္ဂလာပါ။ ဟင်းလျာ၊ ဈေးနှုန်း၊ ဓာတ်မတည့်မှု မေးနိုင်ပါတယ်။'), kind: 'rule' };
    return null;
  }

  // Open questions would go to the language model. The stand-in has two unhappy paths: the model is offline, or it makes an unsafe claim and the guard replaces its reply.
  function open(ctx) {
    const l = ctx.lang, s = sim();
    if (s.aiOffline) return { t: pick(l, 'The AI waiter is unavailable right now. You can browse the menu or call the staff.', 'ขณะนี้ผู้ช่วย AI ใช้งานไม่ได้ เปิดดูเมนูหรือเรียกพนักงานได้', 'AI စားပွဲထိုး ယခု မရနိုင်ပါ။ မီနူးကြည့်နိုင်သည် သို့မဟုတ် ဝန်ထမ်းခေါ်နိုင်သည်။'), qa: [['nav', 'menu', pick(l, 'Browse the menu', 'ดูเมนู', 'မီနူးကြည့်ရန်')]].concat(staffQA(l)), kind: 'fallback' };
    if (s.modelMisbehaves) return { t: pick(l, "I can't confirm that. ", 'ยืนยันเรื่องนี้ไม่ได้ ', 'အတည်မပြုနိုင်ပါ။ ') + STAFF(l) + pick(l, ' (Guard: the model said a dish was "100% nut-free"; its reply was replaced.)', ' (ตัวตรวจ: โมเดลบอกว่าเมนูไม่มีถั่ว 100% จึงแทนที่คำตอบ)', ' (guard: မော်ဒယ်၏ အဖြေကို အစားထိုးလိုက်သည်)'), qa: staffQA(l), kind: 'guard' };
    return null;
  }
  return { answer, open };
})();
