/* i18n.js — three-language text (Thai / English / Myanmar) for the customer screen. Loaded first.
 *  - T    UI labels            - SG   suggested questions in the AI chat
 *  - MODS dish customisation   - SP   spice levels
 * Format: key: ['Thai', 'English', 'မြန်မာ']  Use via t('key') (t / tr are defined in app.js).
 * To add a language: add a value in each array + add it to I (app.js, CONFIG & STATE) + add a button in the header. */

// UI text dictionary (grouped by screen)
const T = {
    // ---- Main menu / home / search ----
    home: ["หน้าแรก", "Home", "ပင်မ"],
    menu: ["เมนู", "Menu", "မီနူး"],
    ai: ["ผู้ช่วย AI", "AI Assistant", "AI အကူ"],
    cart: ["ตะกร้า", "Cart", "ခြင်းတောင်း"],
    more: ["เพิ่มเติม", "More", "နောက်ထပ်"],
    table: ["โต๊ะ", "Table", "စားပွဲ"],
    search: ["ค้นหาเมนู วัตถุดิบ หมวดหมู่...", "Search dishes, ingredients, categories...", "ဟင်းလျာ၊ ပါဝင်ပစ္စည်း ရှာပါ..."],
    feat: ["เมนูแนะนำ & ยอดนิยม", "Popular & Recommended", "လူကြိုက်များသော ဟင်းလျာများ"],
    all: ["ทุกเมนู", "All Menu", "မီနူးအားလုံး"],
    empty: ["ไม่พบเมนูที่ค้นหา ลองคำอื่นดูนะ", "No dishes found. Try another word.", "ရှာမတွေ့ပါ။ အခြားစကားလုံး စမ်းကြည့်ပါ"],
    hello: ["ยินดีต้อนรับสู่", "Welcome to", "ကြိုဆိုပါတယ်"],
    hs: ["สแกน สั่ง ถาม AI ได้เลย ไม่ต้องล็อกอิน", "Scan, ask AI and order – no login", "စကန်ဖတ်၊ AI မေးပြီး မှာယူပါ"],
    // ---- Allergy alerts / ingredient info ----
    alert: ["⚠️ แจ้งเตือนการแพ้: เมนูนี้มี", "⚠️ ALLERGY ALERT: This dish contains", "⚠️ ဓာတ်မတည့်မှု သတိပေးချက်: ဤဟင်းလျာတွင် ပါဝင်သည် -"],
    verified: ["✅ ร้านยืนยันข้อมูลแล้ว", "✅ Verified by the restaurant", "✅ ဆိုင်မှ အတည်ပြုပြီး"],
    ing: ["ส่วนผสม", "Ingredients", "ပါဝင်ပစ္စည်း"],
    noIng: ["ร้านยังไม่ได้ระบุส่วนผสม", "Ingredients not provided yet", "ပါဝင်ပစ္စည်း မပေးရသေးပါ"],
    diet: ["อาหารมังสวิรัติ", "Vegetarian", "သတ်သတ်လွတ်"],
    yes: ["ใช่", "Yes", "ဟုတ်"],
    no: ["ไม่ใช่", "No", "မဟုတ်"],
    unk: ["ไม่ทราบ", "Unknown", "မသိရ"],
    vegMaybe: ["อาจใช่ (ยังไม่ยืนยัน)", "Possibly (unverified)", "ဖြစ်နိုင် (မအတည်ပြုရသေး)"],
    al: ["สารก่อภูมิแพ้", "Allergens", "ဓာတ်မတည့်စာရင်း"],
    none: ["ไม่มีที่ทราบ", "None known", "မရှိ"],
    // ---- Menu detail / customization / dine-in or take-away ----
    add: ["เพิ่มลงตะกร้า", "Add to Cart", "ခြင်းထဲထည့်"],
    spice: ["ระดับความเผ็ด", "Spice level", "စပ်မှုအဆင့်"],
    mods: ["ปรับแต่ง", "Customize", "ပြင်ဆင်ရန်"],
    note: ["คำขอพิเศษ (พิมพ์ได้ทุกภาษา)", "Special instructions (any language)", "အထူးတောင်းဆိုချက်"],
    otype: ["รูปแบบการทาน", "Order type", "မှာယူပုံစံ"],
    dine: ["ทานที่ร้าน", "Dine in", "ဆိုင်တွင်စားမည်"],
    take: ["ใส่กล่องกลับบ้าน", "Takeaway (in a box)", "ပါဆယ်ထုပ်ယူမည်"],
    // ---- Cart / order placement / order confirmation ----
    cartE: ["ตะกร้าว่างเปล่า", "Your cart is empty", "ခြင်းတောင်း ဗလာဖြစ်နေသည်"],
    back: ["กลับไปเลือกเมนู", "Back to menu", "မီနူးသို့ပြန်"],
    sub: ["รวมย่อย", "Subtotal", "စုစုပေါင်း"],
    svc: ["ค่าบริการ", "Service", "ဝန်ဆောင်ခ"],
    total: ["ยอดรวม", "Total", "စုစုပေါင်း"],
    place: ["สั่งอาหาร", "Place Order", "မှာယူမည်"],
    review: ["ตรวจสอบออเดอร์", "Review Order", "မှာယူမှု စစ်ဆေးရန်"],
    confirm: ["ยืนยัน", "Confirm", "အတည်ပြု"],
    cancel: ["ยกเลิก", "Cancel", "မလုပ်တော့"],
    close: ["ปิด", "Close", "ပိတ်"],
    done: ["สั่งอาหารสำเร็จ!", "Order placed!", "မှာယူမှု အောင်မြင်ပါပြီ!"],
    ono: ["เลขที่ออเดอร์", "Order No.", "အော်ဒါနံပါတ်"],
    st: ["สถานะ", "Status", "အခြေအနေ"],
    pre: ["กำลังเตรียมอาหาร", "Preparing", "ပြင်ဆင်နေသည်"],
    eta: ["เวลาโดยประมาณ ~15 นาที", "Estimated ~15 min", "ခန့်မှန်း ~၁၅ မိနစ်"],
    setAll: ["ตั้งค่าทุกรายการ", "Set all", "အားလုံးသတ်မှတ်"],
    orders: ["ออเดอร์ที่สั่งแล้ว", "Placed orders", "မှာထားသော အော်ဒါများ"],
    demo: ["ชื่อและราคาตามเมนูร้าน · ข้อมูลส่วนผสม/สารก่อภูมิแพ้ยังไม่ได้รับการยืนยัน", "Names & prices from the restaurant menu · ingredient/allergen data not yet verified", "ဆိုင်မီနူးအတိုင်း အမည်နှင့်စျေးနှုန်း · ပါဝင်ပစ္စည်း/ဓာတ်မတည့်မှု အချက်အလက် မအတည်ပြုရသေးပါ"],
    // ---- Call staff / check bill ----
    staff: ["เรียกพนักงาน", "Call Staff", "ဝန်ထမ်းခေါ်ရန်"],
    staffOk: ["✅ แจ้งพนักงานแล้ว กรุณารอสักครู่", "✅ Staff notified. Please wait a moment.", "✅ ဝန်ထမ်းကို အကြောင်းကြားပြီး"],
    staffQ: ["ต้องการเรียกพนักงานมาที่โต๊ะนี้ใช่ไหม?", "Call a staff member to this table?", "ဤစားပွဲသို့ ဝန်ထမ်းခေါ်မလား?"],
    wait: ["ส่งคำขอไปแล้ว รอสักครู่ก่อนกดซ้ำ", "Request already sent, please wait.", "တောင်းဆိုပြီးပါပြီ၊ ခဏစောင့်ပါ"],
    bill: ["เช็คบิล", "Request Bill", "ဘီလ်တောင်းရန်"],
    billQ: ["ยืนยันขอเช็คบิล?", "Confirm bill request?", "ဘီလ်တောင်းခံမှု အတည်ပြုမလား?"],
    billOk: ["✅ ส่งคำขอเช็คบิลแล้ว", "✅ Bill request sent.", "✅ ဘီလ်တောင်းခံမှု ပို့ပြီး"],
    noOrd: ["ยังไม่มีออเดอร์ที่สั่งแล้ว", "No placed orders yet.", "မှာထားသော အော်ဒါ မရှိသေးပါ"],
    // ---- Order status (set by staff) / sold out ----
    sNew: ["รอพนักงานรับออเดอร์", "Waiting for staff to accept", "ဝန်ထမ်း လက်ခံရန် စောင့်နေသည်"],
    sAcc: ["ส่งเข้าครัวแล้ว รอเชฟเริ่มทำ", "Sent to the kitchen", "မီးဖိုချောင်သို့ ပို့ပြီး"],
    sCook: ["เชฟกำลังทำอาหาร", "Chef is cooking", "စားဖိုမှူး ချက်နေသည်"],
    sReady: ["อาหารพร้อมแล้ว กำลังนำมาเสิร์ฟ", "Ready – coming to your table", "အဆင်သင့်ဖြစ်ပြီ၊ လာပို့နေသည်"],
    sServed: ["เสิร์ฟแล้ว ทานให้อร่อยนะคะ", "Served – enjoy!", "ချပေးပြီး၊ စားသောက်ပျော်ပါစေ"],
    sPaid: ["ชำระเงินแล้ว", "Paid", "ငွေရှင်းပြီး"],
    soldT: ["หมด", "Sold out", "ကုန်"],
    // ---- Allergy settings ----
    alg: ["ตั้งค่าการแพ้อาหาร", "Allergy Preferences", "အစားအစာ ဓာတ်မတည့်မှု"],
    algS: ["บันทึก", "Save", "သိမ်းမည်"],
    other: ["อื่น ๆ (คั่นด้วยคอมมา)", "Other (comma-separated)", "အခြား (ကော်မာခြား)"],
    saved: ["✅ บันทึกแล้ว", "✅ Saved", "✅ သိမ်းပြီး"],
    algNote: ["ระบบช่วยตรวจเฉพาะข้อมูลที่ร้านระบุไว้ หากแพ้รุนแรงโปรดแจ้งพนักงาน", "We only check data the restaurant provided. For severe allergies, tell staff.", "စားသောက်ဆိုင်ပေးသော အချက်အလက်ကိုသာ စစ်ပါသည်။ ပြင်းထန်ပါက ဝန်ထမ်းကို ပြောပါ"],
    // ---- AI assistant (some text is prepared for dev to use when integrating the backend) ----
    aiN: ["ผู้ช่วย AI ของ HaChi Kyu", "HaChi Kyu AI Assistant", "HaChi Kyu AI အကူ"],
    aiH: ["ถามเรื่องเมนู ราคา ส่วนผสม หรือสารก่อภูมิแพ้ได้เลย", "Ask about dishes, prices, ingredients or allergens.", "မီနူး၊ စျေးနှုန်း၊ ပါဝင်ပစ္စည်း မေးနိုင်ပါသည်"],
    ph: ["พิมพ์ข้อความ...", "Type a message...", "စာရိုက်ပါ..."],
    err: ["ขออภัย เกิดข้อผิดพลาด", "Sorry, something went wrong.", "အမှားအယွင်းရှိနေသည်"],
    retry: ["ลองใหม่", "Retry", "ထပ်ကြိုးစား"],
    rec: ["นี่คือเมนูแนะนำจากเมนูจริงของร้านค่ะ", "Here are picks from our actual menu:", "ဆိုင်၏ တကယ့်မီနူးမှ အကြံပြုချက်များ -"],
    noM: ["ขออภัย ไม่พบเมนูที่ตรงเงื่อนไข ลองปรับคำถามดูนะคะ", "Sorry, no dishes match. Try rephrasing.", "ကိုက်ညီသော ဟင်းလျာ မရှိပါ"],
    filt: ["(กรองตามข้อมูลการแพ้ที่คุณบันทึกไว้แล้ว)", "(Filtered by your saved allergies.)", "(ဓာတ်မတည့်မှုအလိုက် စစ်ထုတ်ပြီး)"],
    ingO: ["ส่วนผสมของ", "Ingredients of", "ပါဝင်ပစ္စည်း -"],
    det: ["ดูรายละเอียด", "Details", "အသေးစိတ်"],
    added: ["เพิ่มลงตะกร้าให้แล้วค่ะ ต้องการตรวจสอบตะกร้าไหม?", "Added to your cart! Review your cart?", "ခြင်းထဲထည့်ပြီးပါပြီ။ စစ်ဆေးမလား?"],
    goC: ["ไปที่ตะกร้า", "Go to cart", "ခြင်းသို့"],
    hi: ["สวัสดีค่ะ! ฉันช่วยแนะนำเมนูที่เหมาะกับคุณได้ ลองถามได้เลย 😊", "Hi! I can recommend dishes that suit you. Just ask 😊", "မင်္ဂလာပါ! သင့်အတွက် ဟင်းလျာ အကြံပြုပေးနိုင်ပါတယ် 😊"],
    aiTodo: ["ฟีเจอร์ AI ยังไม่เชื่อมต่อ (รอทีมพัฒนาเชื่อม backend)", "AI is not connected yet (pending backend integration).", "AI ကို မချိတ်ဆက်ရသေးပါ (backend ချိတ်ဆက်ရန်ကျန်သည်)"],
};

// Suggested questions in the AI chat: each row is one language [Thai, English, Myanmar]; buttons display according to the selected language
const SG = [["แนะนำเมนูให้หน่อย", "Recommend something spicy.", "ဘာစားရင်ကောင်းမလဲ"], ["มีเมนูไหนที่ไม่เผ็ดบ้าง?", "What can I eat if I'm allergic to peanuts?", "Recommend a meal under 150 baht."], ["เมนูยอดนิยมมีอะไรบ้าง", "What are your most popular dishes?", "I want something light and healthy."], ["แนะนำเมนูไม่เกิน 150 บาท", "What should I eat today?", "What are your most popular dishes?"]];

// Food customization options (only for menu items with cz=true — see Section 3)
const MODS = {
    onion: ["ไม่ใส่หอมใหญ่", "No onions", "ကြက်သွန်နီမထည့်"],
    cori: ["ไม่ใส่ผักชี", "No coriander", "နံနံမထည့်"],
    sauce: ["เพิ่มซอส", "Extra sauce", "ဆော့စ်ပို"],
    salt: ["เค็มน้อย", "Less salt", "ဆားနည်း"],
};

// Spice levels 0-4 (shown only for menu items with sp=true)
const SP = [["ไม่เผ็ด", "Not spicy", "မစပ်"], ["เผ็ดน้อย", "Mild", "နည်းနည်းစပ်"], ["เผ็ดกลาง", "Medium", "အလယ်အလတ်"], ["เผ็ดมาก", "Hot", "စပ်"], ["เผ็ดพิเศษ", "Extra hot", "အလွန်စပ်"]];
