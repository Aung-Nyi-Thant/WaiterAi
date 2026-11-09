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
  const nm = (m, l) => (l && Array.isArray(m.n) ? (l === 'th' ? m.n[0] : l === 'my' ? (m.n[2] || m.n[1] || m.n[0]) : (m.n[1] || m.n[0])) : tr(m.n)).replace(/</g, '&lt;');
  const dishIn = text => { const q = text.toLowerCase(); return MENU.filter(m => m.n.some(n => plain(n).length > 2 && q.includes(plain(n)))).sort((a, b) => plain(b.n[1]).length - plain(a.n[1]).length)[0]; };
  const names = (ms, l) => ms.map(m => `${nm(m, l)} (฿${m.p})`).join(', ');
  const staffQA = l => [['modal', 'staff', pick(l, 'Call staff', 'เรียกพนักงาน', 'ဝန်ထမ်းခေါ်ရန်')]];

  const hasPhoto = m => {
    try {
      const dp = typeof window !== 'undefined' ? window.DISH_PHOTOS : null;
      if (dp && dp[m.img]) return true;
      return !!(m.img && !/wongnai\.com/.test(m.img));
    } catch (e) { return false; }
  };
  const isSpicy = m => !!(m.sp || (m.tags && m.tags.includes('spicy')) || /กระเพรา|โกจุงจัง|ยำ|ลาบ|กิมจิ/.test(m.n[0]) || /\bspicy\b/i.test(m.n[1] || ''));

  const NON_SPICY = /not\s+(too\s+)?spicy|no\s+spicy|non-?spicy|can'?t\s+eat\s+(too\s+)?spicy|cannot\s+eat\s+(too\s+)?spicy|child.*can'?t\s+eat.*spicy|mild|for\s+(the\s+)?(kids?|children|child)|kid-?friendly|without\s+(chili|chilli|spice)|no\s+(chili|chilli|spice)|ไม่เผ็ด|ไม่กินเผ็ด|ไม่ทานเผ็ด|กินเผ็ดไม่ได้|ทานเผ็ดไม่ได้|เผ็ดน้อย|สำหรับเด็ก|เด็กกิน|เด็กทาน|မစပ်|ကလေးအတွက်/i;
  const REC = /recommend|popular|best|suggest|signature|what('s| is) good|what should (i|we) (eat|order)|what (to|can i) order|today's special|special.*today|what should i have|eat today|แนะนำ|ยอดนิยม|กินอะไรดี|อะไรดี|เมนูเด็ด|น่ากิน|အကြံပြု|လူကြိုက်များ|ဘာစားရမလဲ|ဘာကောင်းလဲ|အကောင်းဆုံး/i;
  const GREETING = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|sawasdee|sawadee|sawatdee|mingalaba|thanks|thank you)\b|สวัสดี|ขอบคุณ|မင်္ဂလာပါ|ကျေးဇူး/i;
  const VEG = /vegetar|vegan|meat-?free|plant-?based|มังสวิรัติ|เจ|ไม่มีเนื้อ|သက်သတ်လွတ်/i;
  const PLANT_INGS = ['rice', 'seaweed', 'cucumber', 'edamame', 'tofu', 'enoki', 'shiitake', 'kingoyster', 'garlic', 'leek', 'okra', 'pumpkin', 'lettuce', 'veg', 'potato', 'sweetpotato'];
  const NON_VEG_WORDS = /ซาซิมิ|ปลา|กุ้ง|ปู|หอย|ปลาหมึก|หมู|ไก่|เนื้อ|เบคอน|เป็ด|เกี๊ยว|dumpling|sashimi|fish|salmon|tuna|saba|hamachi|eel|shrimp|prawn|crab|clam|scallop|squid|octopus|urchin|foie|pork|chicken|beef|wagyu|bacon/i;

  const INGS = [
    { k: 'chicken', re: /chicken|ไก่|ကြက်သား/i, n: { en: 'chicken', th: 'ไก่', my: 'ကြက်သား' } },
    { k: 'salmon', re: /salmon|แซลม่อน|แซลมอน|ซอลมอน|ဆော်လမွန်/i, n: { en: 'salmon', th: 'แซลม่อน', my: 'ဆော်လမွန်' } },
    { k: 'beef', re: /beef|wagyu|เนื้อ|အမဲသား/i, n: { en: 'beef', th: 'เนื้อวัว', my: 'အမဲသား' } },
    { k: 'pork', re: /pork|หมู|ဝက်သား/i, n: { en: 'pork', th: 'หมู', my: 'ဝက်သား' } },
    { k: 'shrimp', re: /shrimp|prawn|กุ้ง|ပုစွန်/i, n: { en: 'shrimp', th: 'กุ้ง', my: 'ပုစွန်' } },
    { k: 'tuna', re: /tuna|ทูน่า|တူနာ/i, n: { en: 'tuna', th: 'ทูน่า', my: 'တူနာ' } }
  ];

  function answer(message, ctx) {
    const l = ctx.lang, q = message.toLowerCase(), live = MENU.filter(m => !m.s);
    if (INJECT.test(message)) return { t: pick(l, "I can't change how I work. I answer from the menu data, and I never call a dish safe for allergies. ", 'ฉันเปลี่ยนวิธีทำงานไม่ได้ ฉันตอบจากข้อมูลเมนู และไม่บอกว่าเมนูใดปลอดภัยสำหรับการแพ้ ', 'ကျွန်ုပ် အလုပ်လုပ်ပုံကို ပြောင်း၍မရပါ။ မီနူးအချက်အလက်ကိုသာ ဖြေပါမည်။ ') + STAFF(l), qa: staffQA(l), kind: 'guard' };
    if (OFF_TOPIC.test(message)) return { t: pick(l, "I'm here to help with our menu and our restaurant. What would you like to eat?", 'ช่วยได้เฉพาะเรื่องเมนูและร้านของเรา วันนี้อยากกินอะไรดี', 'မီနူးနဲ့ ဆိုင်အကြောင်းကိုပဲ ကူညီပေးနိုင်ပါတယ်။ ဒီနေ့ ဘာစားချင်လဲ?'), kind: 'rule' };
    if (/\b(bill|check please|call (the )?(staff|waiter)|waiter)\b|เช็คบิล|เรียกพนักงาน/.test(q)) return { t: pick(l, 'I can call the staff to your table. Tap the button.', 'เรียกพนักงานมาที่โต๊ะได้ กดปุ่มด้านล่าง', 'ဝန်ထမ်းကို ခေါ်ပေးနိုင်ပါတယ်။ ခလုတ်ကိုနှိပ်ပါ။'), qa: staffQA(l), kind: 'rule' };

    const dish = dishIn(message), keys = Object.keys(AW).filter(k => AW[k].test(message) && !(dish && AW[k].test(plain(dish.n[1])) && !/allerg|แพ้|free|without/i.test(message)));
    // allergens: from the data only; estimated lists are named as estimates; "safe" is never said
    if (/allerg|แพ้|safe|free of|without|what can i eat|กินอะไรได้/i.test(message.replace(/\bwithout\s+(?:chili|chilli|spice)\b(?:\s+please)?\s*[.!?]*$/i, '')) || (keys.length && /without/i.test(message)) || (dish && /ingredient|contain|ส่วนผสม/i.test(message))) {
      if (dish) {
        const a = dish.al.length ? dish.al.map(k => tr(AL[k])).join(', ') : pick(l, 'none listed', 'ไม่มีที่ระบุไว้', 'မရှိပါ');
        const st = dish.v ? pick(l, 'Verified by the restaurant.', 'ร้านยืนยันแล้ว', 'ဆိုင်က အတည်ပြုထားသည်။') : pick(l, 'This list is an estimate from typical ingredients, not verified by the restaurant.', 'รายการนี้เป็นการประมาณจากส่วนผสมทั่วไป ร้านยังไม่ได้ยืนยัน', 'ဤစာရင်းသည် ခန့်မှန်းချက်သာ ဖြစ်ပြီး ဆိုင်က မအတည်ပြုရသေးပါ။');
        return { t: `${nm(dish, l)}: ${a}. ${st} ${STAFF(l)}`, items: [dish.id], qa: staffQA(l), kind: 'data' };
      }
      const avoid = keys.length ? keys : S.al, ok = live.filter(m => m.v && !avoid.some(k => m.al.includes(k)));
      if (!ok.length) return { t: pick(l, 'No dish has an allergen list the restaurant has verified yet, so I cannot suggest any dish for this allergy. ', 'ยังไม่มีเมนูที่ร้านยืนยันรายการสารก่อภูมิแพ้ จึงแนะนำเมนูสำหรับการแพ้นี้ไม่ได้ ', 'ဆိုင်က အတည်ပြုထားသော ဟင်းလျာ မရှိသေးသဖြင့် မအကြံပြုနိုင်ပါ။ ') + STAFF(l), qa: staffQA(l), kind: 'data' };
      return { t: pick(l, 'Dishes whose verified list does not include it: ', 'เมนูที่รายการที่ร้านยืนยันไม่มีสารนี้: ', 'အတည်ပြုစာရင်းတွင် မပါသော ဟင်းလျာများ: ') + names(ok.slice(0, 5), l) + '. ' + STAFF(l), items: ok.slice(0, 5).map(m => m.id), qa: staffQA(l), kind: 'data' };
    }
    if (dish && /how much|price|cost|ราคา|เท่าไร|กี่บาท|ဈေး/i.test(message)) return { t: `${nm(dish, l)}: ฿${dish.p}${dish.s ? pick(l, ' (sold out today)', ' (หมดวันนี้)', ' (ယနေ့ ကုန်သွားပြီ)') : ''}.`, items: [dish.id], kind: 'data' };
    if (dish && /sold|available|have|มี|หมด/i.test(message)) return { t: dish.s ? pick(l, `${nm(dish, l)} is sold out today.`, `${nm(dish, l)} หมดวันนี้`, `${nm(dish, l)} ယနေ့ ကုန်သွားပြီ။`) : pick(l, `${nm(dish, l)} is available.`, `${nm(dish, l)} มีค่ะ`, `${nm(dish, l)} ရှိပါတယ်။`), items: [dish.id], kind: 'data' };

    const lim = message.match(/(?:under|below|less than|ไม่เกิน|ต่ำกว่า)\s*(\d+)/i);
    const pool = lim ? live.filter(m => m.p <= Number(lim[1])) : live;

    // Ingredient lists are incomplete; candidates are never a dietary certification.
    if (VEG.test(message)) {
      const vegan = /vegan|plant-?based|เจ/i.test(message);
      const veg = pool.filter(m => {
        const tags = m.tags || [], text = m.n.join(' ') + ' ' + m.ing.join(' ');
        if (NON_VEG_WORDS.test(text) || m.al.some(k => ['fish', 'shell'].includes(k))) return false;
        if (vegan && (m.al.some(k => ['egg', 'milk'].includes(k)) || /egg|tamago|milk|dairy|cheese|butter|cream|honey|ไข่|นม|ชีส|เนย|น้ำผึ้ง/i.test(text))) return false;
        return !m.c.includes('drink') && !m.c.includes('set') &&
          (tags.includes('vegan') || (!vegan && tags.includes('vegetarian')) ||
            (m.ing.length && m.ing.every(i => PLANT_INGS.includes(i) || (!vegan && ['egg', 'cheese'].includes(i)))));
      }).filter(m => NON_SPICY.test(message) ? !isSpicy(m) : /spicy|เผ็ด|စပ်/i.test(message) ? isSpicy(m) : true);
      const r = veg.slice().sort((a, b) => (hasPhoto(b) ? 1 : 0) - (hasPhoto(a) ? 1 : 0)).slice(0, 4);
      return {
        t: (r.length
          ? pick(l, 'Dishes to ask staff about for your diet (suitability unconfirmed): ', 'เมนูที่ควรสอบถามพนักงานเรื่องอาหารมังสวิรัติหรือเจ (ยังไม่ยืนยัน): ', 'သက်သတ်လွတ်အတွက် ဝန်ထမ်းကို မေးမြန်းရန် ဟင်းလျာများ (အတည်မပြုရသေးပါ): ') + names(r, l)
          : pick(l, 'No dishes with suitable dietary tags or listed ingredients match your request', 'ไม่พบเมนูที่มีป้ายอาหารหรือส่วนผสมที่ระบุไว้ตรงตามคำขอ ', 'တောင်းဆိုချက်နှင့် ကိုက်ညီသော အစားအသောက်အမှတ်အသား သို့မဟုတ် ပါဝင်ပစ္စည်းစာရင်းရှိ ဟင်းလျာ မတွေ့ပါ')) + '. ' + STAFF(l),
        items: r.map(m => m.id),
        qa: staffQA(l),
        kind: 'data'
      };
    }

    // Non-spicy requests run after the allergy guard.
    if (NON_SPICY.test(message)) {
      if (dish && !lim && !REC.test(message) && /is|spicy|เผ็ด|စပ်/i.test(message)) {
        return {
          t: isSpicy(dish)
            ? pick(l, `${nm(dish, l)} comes with a spice level.`, `${nm(dish, l)} มีระดับความเผ็ด`, `${nm(dish, l)} သည် စပ်ပါသည်။`)
            : pick(l, `${nm(dish, l)} is not spicy (no spice level).`, `${nm(dish, l)} ไม่เผ็ด (ไม่มีระดับความเผ็ด)`, `${nm(dish, l)} သည် မစပ်ပါ။`),
          items: [dish.id],
          kind: 'data'
        };
      }
      const nonSpicy = pool.filter(m => !isSpicy(m) && !m.c.includes('drink'));
      const sorted = nonSpicy.slice().sort((a, b) => {
        const sa = (a.c.includes('rec') ? 4 : 0) + (hasPhoto(a) ? 2 : 0);
        const sb = (b.c.includes('rec') ? 4 : 0) + (hasPhoto(b) ? 2 : 0);
        return sb - sa;
      });
      const r = sorted.slice(0, 4);
      return {
        t: r.length
          ? pick(l, 'These dishes are not spicy (no spice level): ', 'เมนูเหล่านี้ไม่เผ็ด (ไม่มีระดับความเผ็ด): ', 'ဤဟင်းလျာများသည် မစပ်ပါ (စပ်အဆင့်မရှိပါ): ') + names(r, l)
          : pick(l, 'No non-spicy dishes found.', 'ไม่มีเมนูที่ไม่เผ็ด', 'မစပ်သော ဟင်းလျာ မရှိပါ။'),
        items: r.map(m => m.id),
        kind: 'data'
      };
    }

    // Positive spicy
    if (/spicy|เผ็ด|စပ်/i.test(message)) {
      const r = pool.filter(m => isSpicy(m)).slice(0, 4);
      return {
        t: r.length
          ? pick(l, 'These come with a spice level: ', 'เมนูที่เลือกระดับความเผ็ดได้: ', 'စပ်အဆင့်ရွေးနိုင်သော ဟင်းလျာများ: ') + names(r, l)
          : pick(l, 'No dish has a spice level.', 'ไม่มีเมนูที่เลือกความเผ็ดได้', 'စပ်အဆင့်ရွေးနိုင်သော ဟင်းလျာ မရှိပါ။'),
        items: r.map(m => m.id),
        kind: 'data'
      };
    }

    // 4. Ingredient queries ("something with chicken/salmon")
    const matchedIng = INGS.find(ig => ig.re.test(message));
    if (matchedIng && !dish) {
      const matches = pool.filter(m =>
        m.ing.some(i => i.toLowerCase().includes(matchedIng.k)) ||
        matchedIng.re.test(m.n[0]) ||
        matchedIng.re.test(m.n[1] || '')
      ).sort((a, b) => ((b.c.includes('rec') ? 2 : 0) + (hasPhoto(b) ? 1 : 0)) - ((a.c.includes('rec') ? 2 : 0) + (hasPhoto(a) ? 1 : 0)));
      if (matches.length) {
        const iname = pick(l, matchedIng.n.en, matchedIng.n.th, matchedIng.n.my);
        const r = matches.slice(0, 4);
        return {
          t: pick(l, `Dishes with ${iname}: `, `เมนูที่มี${iname}: `, `${iname}ပါသော ဟင်းလျာများ: `) + names(r, l),
          items: r.map(m => m.id),
          kind: 'data'
        };
      }
    }

    // 5. Cheap / budget dishes / price limits
    if (lim || /cheapest|cheap|budget|affordable|ถูกที่สุด|ราคาถูก|ถูกๆ|ไม่แพง|ประหยัด|သက်သာ/i.test(message)) {
      if (pool.length && /cheapest|ถูกที่สุด|အဈေးသက်သာဆုံး/i.test(message)) {
        const m = pool.slice().sort((a, b) => a.p - b.p)[0];
        return { t: pick(l, 'The cheapest dish on the menu: ', 'เมนูที่ถูกที่สุด: ', 'အဈေးသက်သာဆုံး: ') + names([m], l), items: [m.id], kind: 'data' };
      }
      const foodLive = pool.filter(m => !m.c.includes('drink'));
      const r = (foodLive.length ? foodLive : pool).slice().sort((a, b) => a.p - b.p).slice(0, 4);
      return {
        t: r.length
          ? pick(l, 'Affordable dishes on our menu: ', 'เมนูราคาย่อมเยา: ', 'ဈေးသက်သာသော ဟင်းလျာများ: ') + names(r, l)
          : pick(l, 'No available dishes match that budget.', 'ไม่มีเมนูที่พร้อมขายในงบนี้', 'ထိုဘတ်ဂျက်နှင့် ကိုက်ညီသော ဟင်းလျာ မရှိပါ။'),
        items: r.map(m => m.id),
        kind: 'data'
      };
    }

    // 2. Recommendations / "what should I eat today" / "what's good" / popular dishes
    if (REC.test(message)) {
      const r = live.filter(m => m.c.includes('rec'));
      const recList = r.slice(0, 4);
      return {
        t: recList.length
          ? pick(l, 'The restaurant marks these as recommended: ', 'ร้านแนะนำเมนูเหล่านี้: ', 'ဆိုင်က အကြံပြုသော ဟင်းလျာများ: ') + names(recList, l)
          : pick(l, 'No available dishes are marked as recommended.', 'ไม่มีเมนูที่พร้อมขายซึ่งร้านระบุว่าแนะนำ', 'ရရှိနိုင်သော ဟင်းလျာများတွင် ဆိုင်က အကြံပြုထားသည် မရှိပါ။'),
        items: recList.map(m => m.id),
        kind: 'data'
      };
    }

    // 6. Greetings
    if (GREETING.test(message.trim())) return { t: pick(l, 'Hello! Ask me about dishes, prices or allergens.', 'สวัสดีค่ะ ถามเรื่องเมนู ราคา หรือสารก่อภูมิแพ้ได้เลย', 'မင်္ဂလာပါ။ ဟင်းလျာ၊ ဈေးနှုန်း၊ ဓာတ်မတည့်မှု မေးနိုင်ပါတယ်။'), kind: 'rule' };

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
