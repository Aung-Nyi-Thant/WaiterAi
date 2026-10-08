import type { Lang } from "@/modules/platform/menu";

// Diner-facing labels. Thai and Burmese are first drafts: have a native speaker review them.
type Dict = Record<string, string>;
const en: Dict = {
  kitchen: "Kitchen", search: "Search dishes", all: "All", vegetarian: "Vegetarian", noPeanuts: "No peanuts", under100: "Under ฿100", spicy: "Spicy",
  soldOut: "Sold out today", askWaiter: "Ask AI", callStaff: "Call staff", staffCalled: "The staff have been called.", myPicks: "My picks", dish: "dish", dishes: "dishes",
  showToWaiter: "Send to staff", sent: "Sent to the staff. They will come to your table.", add: "Add", added: "Added", back: "Back to menu", typeQ: "Type in Thai, Burmese or English",
  theWaiter: "AI Waiter", askAny: "Ask about any dish, in any language", allergens: "Allergens", none: "No dishes match.", ingredients: "Ingredients", askAbout: "Ask AI about this dish",
  offline: "Offline copy. Prices may differ.", chips1: "Vegetarian options", chips2: "Opening hours", chips3: "What do you recommend?", hello: "Hello! Ask me about the menu, allergens or prices.",
  specials: "Today's special", errorSend: "Could not send. Please try again.", allergenNone: "No allergens listed", allergenUnknown: "Allergen info not provided", helpful: "Helpful", notHelpful: "Not right", thanks: "Thanks for the feedback.",
  close: "Close", table: "Table", picksEmpty: "Nothing picked yet.", remove: "Remove",
  filters: "Filters", thinking: "Thinking about the menu…",
  reasonPrompt: "What was wrong?", reasonWrong: "Wrong info", reasonConfused: "Didn't understand", reasonAllergen: "Missed my allergy",
  escalate: "Sorry, I'm having trouble with that.", escalateCall: "Call the staff",
  tableBill: "Table bill", billTotal: "Total to pay", billEmpty: "Nothing ordered yet.", billPending: "Waiting for staff to confirm (not in the total yet)", askBill: "Ask for the bill", billAsked: "The staff will bring your bill.", billRequested: "Bill requested. Staff are on the way.",
  heroEyebrow: "AI-Powered Menu Assistant", heroPlaceholder: "Ask about dishes, allergies, or get a recommendation…",
  heroChip1: "What's spicy?", heroChip2: "Vegan options?", heroChip3: "Surprise me",
  // allergy profile
  myAllergies: "My allergies", setAllergies: "Set my allergies", clearAll: "Clear", done: "Done", mine: "Without my allergens", yourAllergen: "Your allergen",
  profileHelp: "Saved only on this phone. The AI uses it for every answer and the staff see it on your order. It never makes a dish safe: always confirm with the staff.",
  conflictToast: "lists your allergen. The staff will be told.", chipMyAllergies: "What can I eat?",
};
const th: Dict = {
  kitchen: "ครัว", search: "ค้นหาเมนู", all: "ทั้งหมด", vegetarian: "มังสวิรัติ", noPeanuts: "ไม่มีถั่วลิสง", under100: "ต่ำกว่า ฿100", spicy: "เผ็ด",
  soldOut: "หมดแล้ววันนี้", askWaiter: "ถามผู้ช่วย AI", callStaff: "เรียกพนักงาน", staffCalled: "เรียกพนักงานแล้ว", myPicks: "รายการที่เลือก", dish: "จาน", dishes: "จาน",
  showToWaiter: "ส่งออเดอร์ให้พนักงาน", sent: "ส่งให้พนักงานแล้ว พนักงานจะมาที่โต๊ะของคุณ", add: "เพิ่ม", added: "เพิ่มแล้ว", back: "กลับไปที่เมนู", typeQ: "พิมพ์เป็นไทย พม่า หรืออังกฤษ",
  theWaiter: "ผู้ช่วย AI", askAny: "ถามเกี่ยวกับเมนูได้ทุกภาษา", allergens: "สารก่อภูมิแพ้", none: "ไม่พบเมนู", ingredients: "ส่วนผสม", askAbout: "ถามผู้ช่วย AI เกี่ยวกับเมนูนี้",
  offline: "ข้อมูลที่บันทึกไว้ ราคาอาจต่างจากปัจจุบัน", chips1: "เมนูมังสวิรัติ", chips2: "เวลาเปิด-ปิด", chips3: "แนะนำเมนูหน่อย", hello: "สวัสดี! ถามเรื่องเมนู สารก่อภูมิแพ้ หรือราคาได้เลย",
  specials: "เมนูแนะนำวันนี้", errorSend: "ส่งไม่สำเร็จ กรุณาลองอีกครั้ง", allergenNone: "ไม่มีสารก่อภูมิแพ้ที่ระบุ", allergenUnknown: "ยังไม่มีข้อมูลสารก่อภูมิแพ้", helpful: "เป็นประโยชน์", notHelpful: "ไม่ถูกต้อง", thanks: "ขอบคุณสำหรับความเห็น",
  close: "ปิด", table: "โต๊ะ", picksEmpty: "ยังไม่ได้เลือกเมนู", remove: "ลบ",
  filters: "ตัวกรอง", thinking: "กำลังดูเมนูให้อยู่…",
  reasonPrompt: "ผิดตรงไหน", reasonWrong: "ข้อมูลผิด", reasonConfused: "AI ไม่เข้าใจคำถาม", reasonAllergen: "ไม่แจ้งเตือนสารก่อภูมิแพ้",
  escalate: "ขออภัย ตอบเรื่องนี้ไม่ได้ค่ะ/ครับ", escalateCall: "เรียกพนักงาน",
  tableBill: "บิลของโต๊ะ", billTotal: "ยอดที่ต้องชำระ", billEmpty: "ยังไม่มีรายการสั่ง", billPending: "รอพนักงานยืนยัน (ยังไม่รวมในยอด)", askBill: "ขอเช็คบิล", billAsked: "พนักงานจะนำบิลมาให้", billRequested: "ขอเช็คบิลแล้ว พนักงานกำลังมา",
  heroEyebrow: "ระบบช่วยเลือกเมนูอาหาร AI", heroPlaceholder: "ถามเรื่องเมนู สารก่อภูมิแพ้ หรือขอคำแนะนำ…",
  heroChip1: "เมนูไหนเผ็ดบ้าง?", heroChip2: "มีเมนูเจ/มังสวิรัติไหม?", heroChip3: "แนะนำเมนูเด็ดหน่อย",
  // allergy profile
  myAllergies: "สารก่อภูมิแพ้ของฉัน", setAllergies: "ระบุสารก่อภูมิแพ้", clearAll: "ล้าง", done: "เสร็จ", mine: "ไม่รวมสารก่อภูมิแพ้ของฉัน", yourAllergen: "สารก่อภูมิแพ้ของคุณ",
  profileHelp: "บันทึกไว้ในโทรศัพท์เครื่องนี้เท่านั้น AI ใช้กับทุกคำตอบ และพนักงานจะเห็นในออเดอร์ของคุณ ไม่ได้ทำให้เมนูใดปลอดภัย กรุณายืนยันกับพนักงานทุกครั้ง",
  conflictToast: "มีสิ่งที่แพ้อยู่ในเมนูนี้ จะแจ้งพนักงานให้", chipMyAllergies: "กินอะไรได้บ้าง",
};
const my: Dict = {
  kitchen: "မီးဖိုချောင်", search: "ဟင်းလျာရှာရန်", all: "အားလုံး", vegetarian: "သက်သတ်လွတ်", noPeanuts: "မြေပဲမပါ", under100: "၁၀၀ ဘတ်အောက်", spicy: "စပ်",
  soldOut: "ယနေ့ ကုန်သွားပါပြီ", askWaiter: "AI ကို မေးရန်", callStaff: "ဝန်ထမ်းခေါ်ရန်", staffCalled: "ဝန်ထမ်းကို ခေါ်ပြီးပါပြီ", myPicks: "ရွေးထားသည်များ", dish: "ပွဲ", dishes: "ပွဲ",
  showToWaiter: "အော်ဒါ ပေးပို့ရန်", sent: "ဝန်ထမ်းထံ ပေးပို့ပြီးပါပြီ။ ခဏနေရင် လာပါလိမ့်မယ်ခင်ဗျာ", add: "ထည့်ရန်", added: "ထည့်ပြီး", back: "မီနူးသို့ ပြန်သွားရန်", typeQ: "ထိုင်း၊ မြန်မာ သို့မဟုတ် အင်္ဂလိပ်လို ရိုက်ပါ",
  theWaiter: "AI စားပွဲထိုး", askAny: "ဟင်းလျာအကြောင်း ဘာသာစကားမရွေး မေးနိုင်ပါတယ်", allergens: "Allergens", none: "ကိုက်ညီတာ မရှိပါ", ingredients: "ပါဝင်ပစ္စည်း", askAbout: "ဒီဟင်းလျာအကြောင်း AI ကို မေးရန်",
  offline: "သိမ်းထားတဲ့ မီနူးဖြစ်ပါတယ်။ ဈေးနှုန်း ကွာနိုင်ပါတယ်", chips1: "သက်သတ်လွတ်ဟင်းလျာ", chips2: "ဖွင့်ချိန်", chips3: "ဘာစားသင့်လဲ", hello: "မင်္ဂလာပါ! မီနူး၊ Allergens၊ ဈေးနှုန်း မေးနိုင်ပါတယ်ခင်ဗျာ",
  specials: "ယနေ့အထူး", errorSend: "ပို့မရပါ။ ထပ်ကြိုးစားပါ", allergenNone: "ဖော်ပြထားသော Allergens မရှိပါ", allergenUnknown: "Allergen အချက်အလက် မရှိပါ", helpful: "အသုံးဝင်တယ်", notHelpful: "မှန်မှန်ကန်ကန် မဟုတ်ဘူး", thanks: "အကြံပြုချက်အတွက် ကျေးဇူးတင်ပါတယ်ခင်ဗျာ",
  close: "ပိတ်ရန်", table: "စားပွဲ", picksEmpty: "ဘာမှ မရွေးရသေးပါ", remove: "ဖယ်ရန်",
  filters: "စစ်ထုတ်ရန်", thinking: "မီနူးကို ကြည့်နေပါတယ်…",
  reasonPrompt: "ဘာမှားနေလဲ", reasonWrong: "အချက်အလက် မှား", reasonConfused: "AI က မေးခွန်းကို နားမလည်ပါ", reasonAllergen: "ဓာတ်မတည့်မှု လွဲသွား",
  escalate: "တောင်းပန်ပါတယ်ခင်ဗျာ၊ ဒါကို ဖြေပေးနိုင်ခြင်း မရှိပါ။", escalateCall: "ဝန်ထမ်းခေါ်ရန်",
  tableBill: "စားပွဲ ကျသင့်ငွေ", billTotal: "ပေးရမယ့် စုစုပေါင်း", billEmpty: "မှာထားတာ မရှိသေးပါဘူး", billPending: "ဝန်ထမ်း အတည်ပြုဖို့ စောင့်နေပါတယ် (စုစုပေါင်းထဲ မပါသေးပါဘူး)", askBill: "ဘေလ်တောင်းမည်", billAsked: "ဝန်ထမ်းက ဘေလ် ယူလာပေးပါမယ်ခင်ဗျာ", billRequested: "ဘေလ် တောင်းထားပြီးပါပြီ။ ဝန်ထမ်း လာနေပါပြီခင်ဗျာ",
  heroEyebrow: "AI မီနူး ကူညီသူ", heroPlaceholder: "ဟင်းလျာ၊ Allergens သို့မဟုတ် အကြံပြုချက် မေးပါ…",
  heroChip1: "ဘာစပ်လဲ?", heroChip2: "သက်သတ်လွတ် ရနိုင်မလား?", heroChip3: "ကောင်းတာ အကြံပေးပါ",
  // allergy profile (reviewed; "Allergens" stays English per SRS AI-12)
  myAllergies: "ကျွန်ုပ်၏ Allergens", setAllergies: "Allergens ရွေးချယ်ရန်", clearAll: "ဖျက်ရန်", done: "ပြီးပြီ", mine: "ကျွန်ုပ်၏ Allergens မပါသောဟင်းလျာ", yourAllergen: "သင်၏ Allergen",
  profileHelp: "ဒီဖုန်းထဲမှာပဲ သိမ်းထားပါတယ်ခင်ဗျာ။ AI က အဖြေတိုင်းမှာ သုံးပြီး ဝန်ထမ်းတွေလည်း အော်ဒါမှာ မြင်ရပါမယ်။ ဟင်းလျာတစ်ခုခုကို လုံခြုံတယ်လို့ မဆိုပါဘူး၊ ဝန်ထမ်းကို အမြဲမေးပါနော်ခင်ဗျာ။",
  conflictToast: "ဤဟင်းလျာတွင် သင်၏ Allergen ပါဝင်သည်။ ဝန်ထမ်းကို အသိပေးပါမည်", chipMyAllergies: "ဘာစားလို့ရလဲ?",
};
export const DICT: Record<Lang, Dict> = { en, th, my };
export const tr = (lang: Lang, key: string) => DICT[lang][key] ?? en[key] ?? key;
export const priceLabel = (lang: Lang, p: number) => (lang === "en" || lang === "th" ? `฿\u2009${p}` : `${String(p).replace(/\d/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[+d])} ဘတ်`);
// Both Thai and Burmese stack marks above/below the base letter and need more line-height than Latin
// text to avoid the lines overlapping; Burmese needs the most room.
export const chatLineHeight = (lang: Lang) => (lang === "my" ? 1.9 : lang === "th" ? 1.75 : 1.5);
