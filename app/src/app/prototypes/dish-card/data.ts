// Prototype-only snapshot of the demo menu (golden-lotus). Coconut Ice Cream is forced sold out to exercise that state.
import type { Item, Category } from "@/modules/platform/menu";
export const CATEGORIES: Category[] = [{"id":1,"sort":0,"name":{"en":"Starters","th":"ของทานเล่น","my":"အစာစား"}},{"id":2,"sort":1,"name":{"en":"Mains","th":"จานหลัก","my":"ပင်မဟင်း"}},{"id":3,"sort":2,"name":{"en":"Curries","th":"แกง","my":"ဟင်းချို/ကာရီ"}},{"id":4,"sort":3,"name":{"en":"Salads","th":"ยำและสลัด","my":"သုပ်"}},{"id":5,"sort":4,"name":{"en":"Desserts","th":"ของหวาน","my":"အချိုပွဲ"}},{"id":6,"sort":5,"name":{"en":"Drinks","th":"เครื่องดื่ม","my":"သောက်စရာ"}}];
export const ITEMS: Item[] = [
 {
  "id": 1,
  "category_id": 2,
  "name": {
   "en": "Shrimp Pad Thai",
   "th": "ผัดไทยกุ้ง",
   "my": "ပုစွန် ပတ်ထိုင်း"
  },
  "desc": {
   "en": "Rice noodles wok-fried with shrimp, egg and tamarind.",
   "th": "Rice noodles wok-fried with shrimp, egg and tamarind.",
   "my": "Rice noodles wok-fried with shrimp, egg and tamarind."
  },
  "price": 120,
  "ingredients": "rice noodles, shrimp, egg, tamarind, fish sauce, crushed peanuts",
  "allergens": [
   "peanut",
   "shellfish",
   "egg",
   "fish"
  ],
  "tags": [],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 2,
  "category_id": 3,
  "name": {
   "en": "Chicken Green Curry",
   "th": "แกงเขียวหวานไก่",
   "my": "ကြက်သား ဂရင်းကာရီ"
  },
  "desc": {
   "en": "Green curry with chicken, coconut milk and Thai basil.",
   "th": "Green curry with chicken, coconut milk and Thai basil.",
   "my": "Green curry with chicken, coconut milk and Thai basil."
  },
  "price": 140,
  "ingredients": "chicken, coconut milk, green curry paste with shrimp paste, Thai basil",
  "allergens": [
   "shellfish"
  ],
  "tags": [
   "spicy"
  ],
  "spice": 2,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 3,
  "category_id": 3,
  "name": {
   "en": "Tom Yum Goong",
   "th": "ต้มยำกุ้ง",
   "my": "တွမ်ယမ်ကွန်း"
  },
  "desc": {
   "en": "Hot and sour shrimp soup with lemongrass and lime.",
   "th": "Hot and sour shrimp soup with lemongrass and lime.",
   "my": "Hot and sour shrimp soup with lemongrass and lime."
  },
  "price": 180,
  "ingredients": "shrimp, lemongrass, galangal, lime, chili, fish sauce",
  "allergens": [
   "shellfish",
   "fish"
  ],
  "tags": [
   "spicy"
  ],
  "spice": 3,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 4,
  "category_id": 2,
  "name": {
   "en": "Vegetable Tofu Stir-fry",
   "th": "ผัดผักรวมเต้าหู้",
   "my": "တိုဟူးနှင့် ဟင်းသီးဟင်းရွက်ကြော်"
  },
  "desc": {
   "en": "Tofu and mixed vegetables in garlic soy sauce.",
   "th": "Tofu and mixed vegetables in garlic soy sauce.",
   "my": "Tofu and mixed vegetables in garlic soy sauce."
  },
  "price": 90,
  "ingredients": "tofu, mixed vegetables, soy sauce, garlic",
  "allergens": [
   "soy"
  ],
  "tags": [
   "vegan",
   "vegetarian"
  ],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 5,
  "category_id": 5,
  "name": {
   "en": "Mango Sticky Rice",
   "th": "ข้าวเหนียวมะม่วง",
   "my": "သရက်သီး ကောက်ညှင်းပေါင်း"
  },
  "desc": {
   "en": "Sweet mango with coconut sticky rice.",
   "th": "Sweet mango with coconut sticky rice.",
   "my": "Sweet mango with coconut sticky rice."
  },
  "price": 100,
  "ingredients": "mango, glutinous rice, coconut milk, sugar",
  "allergens": [],
  "tags": [
   "vegan",
   "vegetarian"
  ],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 6,
  "category_id": 2,
  "name": {
   "en": "Chicken Fried Rice",
   "th": "ข้าวผัดไก่",
   "my": "ကြက်သား ထမင်းကြော်"
  },
  "desc": {
   "en": "Wok-fried rice with chicken and egg.",
   "th": "Wok-fried rice with chicken and egg.",
   "my": "Wok-fried rice with chicken and egg."
  },
  "price": 80,
  "ingredients": "rice, chicken, egg, soy sauce",
  "allergens": [
   "egg",
   "soy"
  ],
  "tags": [],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 7,
  "category_id": 3,
  "name": {
   "en": "Beef Massaman Curry",
   "th": "แกงมัสมั่นเนื้อ",
   "my": "အမဲသား မတ်စမန်ကာရီ"
  },
  "desc": {
   "en": "Mild curry with beef, potato and peanuts.",
   "th": "Mild curry with beef, potato and peanuts.",
   "my": "Mild curry with beef, potato and peanuts."
  },
  "price": 160,
  "ingredients": "beef, potato, peanuts, coconut milk, massaman paste",
  "allergens": [
   "peanut"
  ],
  "tags": [],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 8,
  "category_id": 4,
  "name": {
   "en": "Papaya Salad",
   "th": "ส้มตำ",
   "my": "သင်္ဘောသီးသုပ်"
  },
  "desc": {
   "en": "Green papaya salad with chili, lime and peanuts.",
   "th": "Green papaya salad with chili, lime and peanuts.",
   "my": "Green papaya salad with chili, lime and peanuts."
  },
  "price": 70,
  "ingredients": "green papaya, chili, lime, peanuts, dried shrimp",
  "allergens": [
   "peanut",
   "shellfish"
  ],
  "tags": [
   "spicy"
  ],
  "spice": 3,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 9,
  "category_id": 1,
  "name": {
   "en": "Fresh Spring Rolls",
   "th": "ปอเปี๊ยะสด",
   "my": "ဟင်းသီးဟင်းရွက် ကော်ပြန့်စိမ်း"
  },
  "desc": {
   "en": "Rice-paper rolls with vegetables and herbs.",
   "th": "Rice-paper rolls with vegetables and herbs.",
   "my": "Rice-paper rolls with vegetables and herbs."
  },
  "price": 85,
  "ingredients": "rice paper, vegetables, herbs, dipping sauce (recipe not fully recorded)",
  "allergens": null,
  "tags": [],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 10,
  "category_id": 6,
  "name": {
   "en": "Thai Iced Tea",
   "th": "ชาไทยเย็น",
   "my": "ထိုင်းလက်ဖက်ရည်အေး"
  },
  "desc": {
   "en": "Sweet iced tea with milk.",
   "th": "Sweet iced tea with milk.",
   "my": "Sweet iced tea with milk."
  },
  "price": 50,
  "ingredients": "black tea, sugar, evaporated milk, ice",
  "allergens": [
   "milk"
  ],
  "tags": [
   "vegetarian"
  ],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 11,
  "category_id": 5,
  "name": {
   "en": "Coconut Ice Cream",
   "th": "ไอศกรีมกะทิ",
   "my": "အုန်းနို့ ရေခဲမုန့်"
  },
  "desc": {
   "en": "Creamy coconut ice cream.",
   "th": "Creamy coconut ice cream.",
   "my": "Creamy coconut ice cream."
  },
  "price": 60,
  "ingredients": "coconut milk, cream, sugar",
  "allergens": [
   "milk"
  ],
  "tags": [
   "vegetarian"
  ],
  "spice": 0,
  "available": false,
  "photo_url": ""
 },
 {
  "id": 12,
  "category_id": 1,
  "name": {
   "en": "Grilled Pork Skewers",
   "th": "หมูปิ้ง",
   "my": "ဝက်သားကင်"
  },
  "desc": {
   "en": "Marinated pork grilled over charcoal.",
   "th": "Marinated pork grilled over charcoal.",
   "my": "Marinated pork grilled over charcoal."
  },
  "price": 60,
  "ingredients": "pork, soy sauce, garlic, coriander root",
  "allergens": [
   "soy"
  ],
  "tags": [
   "contains_pork"
  ],
  "spice": 0,
  "available": true,
  "photo_url": ""
 },
 {
  "id": 13,
  "category_id": 2,
  "name": {
   "en": "Steamed Fish with Lime",
   "th": "ปลานึ่งมะนาว",
   "my": "ငါးပေါင်း"
  },
  "desc": {
   "en": "Sea bass steamed with lime, garlic and chili.",
   "th": "Sea bass steamed with lime, garlic and chili.",
   "my": "Sea bass steamed with lime, garlic and chili."
  },
  "price": 260,
  "ingredients": "sea bass, lime, garlic, chili, coriander",
  "allergens": [
   "fish"
  ],
  "tags": [
   "spicy"
  ],
  "spice": 2,
  "available": true,
  "photo_url": ""
 }
];
