// SQLite database (Node's built-in node:sqlite). Created and seeded on first run.
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

type DB = any;
const g = globalThis as any;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'THB',
  hours_json TEXT NOT NULL DEFAULT '{"open":"10:00","close":"22:00","lastOrder":"21:30","closedDays":[]}',
  persona_json TEXT NOT NULL DEFAULT '{"name":"The Waiter","gender":"male","tone":"friendly","greeting":"","upsell":true,"rules":""}',
  chat_cap INTEGER NOT NULL DEFAULT 300,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL, name_th TEXT NOT NULL DEFAULT '', name_my TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name_en TEXT NOT NULL, name_th TEXT NOT NULL DEFAULT '', name_my TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL DEFAULT '', desc_th TEXT NOT NULL DEFAULT '', desc_my TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  ingredients TEXT NOT NULL DEFAULT '',
  allergens_json TEXT,                 -- NULL = allergen info not provided
  tags_json TEXT NOT NULL DEFAULT '[]',
  spice INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 1,
  photo_url TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS specials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL, text TEXT NOT NULL DEFAULT '',
  starts_on TEXT NOT NULL DEFAULT '', ends_on TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  q TEXT NOT NULL, a TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('waiter','chef')),
  pin_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_no TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'en',
  started_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  restaurant_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  text TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  topic TEXT NOT NULL DEFAULT 'other',
  allergens TEXT NOT NULL DEFAULT '[]',
  action_json TEXT,
  answered INTEGER NOT NULL DEFAULT 1,
  flagged INTEGER NOT NULL DEFAULT 0,
  feedback INTEGER NOT NULL DEFAULT 0,
  feedback_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_no TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'picked' CHECK (status IN ('picked','new','cooking','ready','served','cancelled')),
  lang TEXT NOT NULL DEFAULT 'en',
  allergy_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id INTEGER, name TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 1, price REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_no TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'help',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'review',
  image_url TEXT NOT NULL DEFAULT '',
  result_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_rest ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_msgs_rest ON chat_messages(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_rest ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_rest ON calls(restaurant_id, status);
`;

function open(): DB {
  const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const database = new DatabaseSync(path.join(dir, "shop.db"));
  database.exec("PRAGMA busy_timeout = 10000");   // several server processes may start at once
  database.exec(SCHEMA);
  // migration for databases created before feedback_reason existed; SQLite has no "ADD COLUMN IF NOT EXISTS"
  try { database.exec("ALTER TABLE chat_messages ADD COLUMN feedback_reason TEXT NOT NULL DEFAULT ''"); } catch {}
  try { seedIfEmpty(database); } catch (e: any) { if (!/UNIQUE|locked|busy/i.test(String(e?.message))) throw e; }
  return database;
}


export const all = <T = any>(sql: string, ...args: any[]): T[] => db.prepare(sql).all(...args) as T[];
export const get = <T = any>(sql: string, ...args: any[]): T | undefined => db.prepare(sql).get(...args) as T | undefined;
export const run = (sql: string, ...args: any[]) => {
  const r = db.prepare(sql).run(...args);
  return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
};

// ---------------------------------------------------------------- demo data
const ITEMS: [string, string, string, string, string, number, string, string[] | null, string[], number, string, boolean][] = [
  // category, en, th, my, desc, price, ingredients, allergens, tags, spice, photo, available
  ["Mains", "Shrimp Pad Thai", "ผัดไทยกุ้ง", "ပုစွန် ပတ်ထိုင်း", "Rice noodles wok-fried with shrimp, egg and tamarind.", 120, "rice noodles, shrimp, egg, tamarind, fish sauce, crushed peanuts", ["peanut", "shellfish", "egg", "fish"], [], 0, "", true],
  ["Curries", "Chicken Green Curry", "แกงเขียวหวานไก่", "ကြက်သား ဂရင်းကာရီ", "Green curry with chicken, coconut milk and Thai basil.", 140, "chicken, coconut milk, green curry paste with shrimp paste, Thai basil", ["shellfish"], ["spicy"], 2, "", true],
  ["Curries", "Tom Yum Goong", "ต้มยำกุ้ง", "တွမ်ယမ်ကွန်း", "Hot and sour shrimp soup with lemongrass and lime.", 180, "shrimp, lemongrass, galangal, lime, chili, fish sauce", ["shellfish", "fish"], ["spicy"], 3, "", true],
  ["Mains", "Vegetable Tofu Stir-fry", "ผัดผักรวมเต้าหู้", "တိုဟူးနှင့် ဟင်းသီးဟင်းရွက်ကြော်", "Tofu and mixed vegetables in garlic soy sauce.", 90, "tofu, mixed vegetables, soy sauce, garlic", ["soy"], ["vegan", "vegetarian"], 0, "", true],
  ["Desserts", "Mango Sticky Rice", "ข้าวเหนียวมะม่วง", "သရက်သီး ကောက်ညှင်းပေါင်း", "Sweet mango with coconut sticky rice.", 100, "mango, glutinous rice, coconut milk, sugar", [], ["vegan", "vegetarian"], 0, "", true],
  ["Mains", "Chicken Fried Rice", "ข้าวผัดไก่", "ကြက်သား ထမင်းကြော်", "Wok-fried rice with chicken and egg.", 80, "rice, chicken, egg, soy sauce", ["egg", "soy"], [], 0, "", true],
  ["Curries", "Beef Massaman Curry", "แกงมัสมั่นเนื้อ", "အမဲသား မတ်စမန်ကာရီ", "Mild curry with beef, potato and peanuts.", 160, "beef, potato, peanuts, coconut milk, massaman paste", ["peanut"], [], 0, "", true],
  ["Salads", "Papaya Salad", "ส้มตำ", "သင်္ဘောသီးသုပ်", "Green papaya salad with chili, lime and peanuts.", 70, "green papaya, chili, lime, peanuts, dried shrimp", ["peanut", "shellfish"], ["spicy"], 3, "", true],
  ["Starters", "Fresh Spring Rolls", "ปอเปี๊ยะสด", "ဟင်းသီးဟင်းရွက် ကော်ပြန့်စိမ်း", "Rice-paper rolls with vegetables and herbs.", 85, "rice paper, vegetables, herbs, dipping sauce (recipe not fully recorded)", null, [], 0, "", true],
  ["Drinks", "Thai Iced Tea", "ชาไทยเย็น", "ထိုင်းလက်ဖက်ရည်အေး", "Sweet iced tea with milk.", 50, "black tea, sugar, evaporated milk, ice", ["milk"], ["vegetarian"], 0, "", true],
  ["Desserts", "Coconut Ice Cream", "ไอศกรีมกะทิ", "အုန်းနို့ ရေခဲမုန့်", "Creamy coconut ice cream.", 60, "coconut milk, cream, sugar", ["milk"], ["vegetarian"], 0, "", false],
  ["Starters", "Grilled Pork Skewers", "หมูปิ้ง", "ဝက်သားကင်", "Marinated pork grilled over charcoal.", 60, "pork, soy sauce, garlic, coriander root", ["soy"], ["contains_pork"], 0, "", true],
  ["Mains", "Steamed Fish with Lime", "ปลานึ่งมะนาว", "ငါးပေါင်း", "Sea bass steamed with lime, garlic and chili.", 260, "sea bass, lime, garlic, chili, coriander", ["fish"], ["spicy"], 2, "", true],
];

function seedIfEmpty(d: DB) {
  if (d.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0) return;
  d.exec("BEGIN IMMEDIATE");
  try {
    if (d.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0) { d.exec("ROLLBACK"); return; }
    seedDemo(d);
    d.exec("COMMIT");
  } catch (e) { try { d.exec("ROLLBACK"); } catch {} throw e; }
}

function seedDemo(d: DB) {
  const uid = Number(d.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run("demo@shop.ai", bcrypt.hashSync("demo1234", 10)).lastInsertRowid);
  const rid = Number(d.prepare("INSERT INTO restaurants (owner_id, slug, name, city) VALUES (?, ?, ?, ?)").run(uid, "golden-lotus", "Golden Lotus Kitchen", "Bangkok").lastInsertRowid);
  const cats: Record<string, number> = {};
  [["Starters", "ของทานเล่น", "အစာစား"], ["Mains", "จานหลัก", "ပင်မဟင်း"], ["Curries", "แกง", "ဟင်းချို/ကာရီ"], ["Salads", "ยำและสลัด", "သုပ်"], ["Desserts", "ของหวาน", "အချိုပွဲ"], ["Drinks", "เครื่องดื่ม", "သောက်စရာ"]].forEach(([en, th, my], i) => {
    cats[en] = Number(d.prepare("INSERT INTO categories (restaurant_id, name_en, name_th, name_my, sort) VALUES (?,?,?,?,?)").run(rid, en, th, my, i).lastInsertRowid);
  });
  ITEMS.forEach(([cat, en, th, my, desc, price, ing, al, tags, spice, photo, avail], i) => {
    d.prepare(`INSERT INTO menu_items (restaurant_id, category_id, name_en, name_th, name_my, desc_en, price, ingredients, allergens_json, tags_json, spice, available, photo_url, sort)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(rid, cats[cat], en, th, my, desc, price, ing, al === null ? null : JSON.stringify(al), JSON.stringify(tags), spice, avail ? 1 : 0, photo, i);
  });
  [["Is there Wi-Fi?", "Yes, free Wi-Fi. Ask staff for the password."], ["Is there parking?", "Free parking behind the building, 20 spaces."], ["Do you give tax invoices?", "Yes, tell staff before paying."]].forEach(([q, a], i) =>
    d.prepare("INSERT INTO faqs (restaurant_id, q, a, sort) VALUES (?,?,?,?)").run(rid, q, a, i));
  d.prepare("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)").run(rid, "Waiter 1", "waiter", bcrypt.hashSync("1111", 8));
  d.prepare("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)").run(rid, "Chef 1", "chef", bcrypt.hashSync("2222", 8));
}

// created last so that the demo data above is defined when seeding runs
export const db: DB = g.__shopdb ?? (g.__shopdb = open());
