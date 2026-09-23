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
  heroEyebrow: "AI-Powered Menu Assistant", heroPlaceholder: "Ask about dishes, allergies, or get a recommendation…",
  heroChip1: "What's spicy?", heroChip2: "Vegan options?", heroChip3: "Surprise me",
};
const th: Dict = {
  kitchen: "ครัว", search: "ค้นหาเมนู", all: "ทั้งหมด", vegetarian: "มังสวิรัติ", noPeanuts: "ไม่มีถั่วลิสง", under100: "ต่ำกว่า ฿100", spicy: "เผ็ด",
  soldOut: "หมดแล้ววันนี้", askWaiter: "ถามพนักงาน AI", callStaff: "เรียกพนักงาน", staffCalled: "เรียกพนักงานแล้ว", myPicks: "รายการที่เลือก", dish: "จาน", dishes: "จาน",
  showToWaiter: "ให้พนักงานดู", sent: "ส่งให้พนักงานแล้ว พนักงานจะมาที่โต๊ะของคุณ", add: "เพิ่ม", added: "เพิ่มแล้ว", back: "กลับไปที่เมนู", typeQ: "พิมพ์เป็นไทย พม่า หรืออังกฤษ",
  theWaiter: "พนักงาน AI", askAny: "ถามเกี่ยวกับเมนูได้ทุกภาษา", allergens: "สารก่อภูมิแพ้", none: "ไม่พบเมนู", ingredients: "ส่วนผสม", askAbout: "ถามพนักงาน AI เกี่ยวกับเมนูนี้",
  offline: "ข้อมูลที่บันทึกไว้ ราคาอาจต่างจากปัจจุบัน", chips1: "เมนูมังสวิรัติ", chips2: "เวลาเปิด-ปิด", chips3: "แนะนำเมนูหน่อย", hello: "สวัสดี! ถามเรื่องเมนู สารก่อภูมิแพ้ หรือราคาได้เลย",
  specials: "เมนูแนะนำวันนี้", errorSend: "ส่งไม่สำเร็จ กรุณาลองอีกครั้ง", allergenNone: "ไม่มีสารก่อภูมิแพ้ที่ระบุ", allergenUnknown: "ยังไม่มีข้อมูลสารก่อภูมิแพ้", helpful: "เป็นประโยชน์", notHelpful: "ไม่ถูกต้อง", thanks: "ขอบคุณสำหรับความเห็น",
  close: "ปิด", table: "โต๊ะ", picksEmpty: "ยังไม่ได้เลือกเมนู", remove: "ลบ",
  filters: "ตัวกรอง", thinking: "กำลังดูเมนูให้อยู่…",
  reasonPrompt: "ผิดตรงไหน", reasonWrong: "ข้อมูลผิด", reasonConfused: "ไม่เข้าใจคำตอบ", reasonAllergen: "พลาดเรื่องแพ้อาหาร",
  escalate: "ขออภัย ตอบเรื่องนี้ไม่ได้ค่ะ", escalateCall: "เรียกพนักงาน",
};
const my: Dict = {
  kitchen: "မီးဖိုချောင်", search: "ဟင်းလျာရှာရန်", all: "အားလုံး", vegetarian: "သက်သတ်လွတ်", noPeanuts: "မြေပဲမပါ", under100: "၁၀၀ ဘတ်အောက်", spicy: "စပ်",
  soldOut: "ယနေ့ ကုန်သွားပါပြီ", askWaiter: "စားပွဲထိုးကို မေးရန်", callStaff: "ဝန်ထမ်းခေါ်ရန်", staffCalled: "ဝန်ထမ်းကို ခေါ်ပြီးပါပြီ", myPicks: "ရွေးထားသည်များ", dish: "ခွက်", dishes: "ခွက်",
  showToWaiter: "စားပွဲထိုးကို ပြရန်", sent: "စားပွဲထိုးထံ ပို့ပြီးပါပြီ။ ခဏနေရင် လာပါလိမ့်မယ်", add: "ထည့်ရန်", added: "ထည့်ပြီး", back: "မီနူးသို့ ပြန်သွားရန်", typeQ: "ထိုင်း၊ မြန်မာ သို့မဟုတ် အင်္ဂလိပ်လို ရိုက်ပါ",
  theWaiter: "စားပွဲထိုး", askAny: "ဟင်းလျာအကြောင်း ဘာသာစကားမရွေး မေးနိုင်ပါတယ်", allergens: "Allergens", none: "ကိုက်ညီတာ မရှိပါ", ingredients: "ပါဝင်ပစ္စည်း", askAbout: "ဒီဟင်းလျာအကြောင်း မေးရန်",
  offline: "သိမ်းထားတဲ့ မီနူးဖြစ်ပါတယ်။ ဈေးနှုန်း ကွာနိုင်ပါတယ်", chips1: "သက်သတ်လွတ်ဟင်းလျာ", chips2: "ဖွင့်ချိန်", chips3: "ဘာစားသင့်လဲ", hello: "မင်္ဂလာပါ! မီနူး၊ Allergens၊ ဈေးနှုန်း မေးနိုင်ပါတယ်",
  specials: "ယနေ့အထူး", errorSend: "ပို့မရပါ။ ထပ်ကြိုးစားပါ", allergenNone: "ဖော်ပြထားသော Allergens မရှိပါ", allergenUnknown: "Allergen အချက်အလက် မရှိပါ", helpful: "အသုံးဝင်တယ်", notHelpful: "မှန်မှန်ကန်ကန် မဟုတ်ဘူး", thanks: "အကြံပြုချက်အတွက် ကျေးဇူးတင်ပါတယ်",
  close: "ပိတ်ရန်", table: "စားပွဲ", picksEmpty: "ဘာမှ မရွေးရသေးပါ", remove: "ဖယ်ရန်",
  filters: "စစ်ထုတ်ရန်", thinking: "မီနူးကို ကြည့်နေပါတယ်…",
  reasonPrompt: "ဘာမှားနေလဲ", reasonWrong: "အချက်အလက် မှား", reasonConfused: "အဖြေကို နားမလည်ဘူး", reasonAllergen: "ဓာတ်မတည့်မှု လွဲသွား",
  escalate: "တောင်းပန်ပါတယ်ခင်ဗျာ၊ ဒါကို ဖြေပေးနိုင်ခြင်း မရှိပါ။", escalateCall: "ဝန်ထမ်းခေါ်ရန်",
};
export const DICT: Record<Lang, Dict> = { en, th, my };
export const tr = (lang: Lang, key: string) => DICT[lang][key] ?? en[key] ?? key;
export const priceLabel = (lang: Lang, p: number) => (lang === "en" ? `฿${p}` : lang === "th" ? `฿${p}` : `${String(p).replace(/\d/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[+d])} ဘတ်`);
// Both Thai and Burmese stack marks above/below the base letter and need more line-height than Latin
// text to avoid the lines overlapping; Burmese needs the most room.
export const chatLineHeight = (lang: Lang) => (lang === "my" ? 1.9 : lang === "th" ? 1.75 : 1.5);
