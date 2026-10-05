// Loads the sample restaurant (eval/menu.json) with an owner account and two staff PINs.
//
//   npm run db:seed
//
// Safe to run twice: it does nothing when the database already has users.
// Credentials come from SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_WAITER_PIN, SEED_CHEF_PIN.
//  - Development: missing values default to the public demo logins (demo@shop.ai / demo1234 / 1111 / 2222).
//  - NODE_ENV=production: missing values are generated randomly and printed once, and the public demo
//    logins are refused, so a deployment never ends up with well-known passwords.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { db } from "../src/modules/platform/db.ts";

const prod = process.env.NODE_ENV === "production";
const DEMO = { email: "demo@shop.ai", password: "demo1234", waiterPin: "1111", chefPin: "2222" };
const here = path.dirname(fileURLToPath(import.meta.url));
const menu = JSON.parse(fs.readFileSync(process.env.SEED_MENU || path.join(here, "..", "..", "eval", "menu.json"), "utf8"));

const CATEGORY: Record<string, string> = { pad_thai: "Mains", green_curry: "Curries", tom_yum: "Curries", veg_stirfry: "Mains", mango_sticky: "Desserts", chicken_rice: "Mains", massaman: "Curries", som_tam: "Salads", spring_rolls: "Starters", thai_tea: "Drinks", coconut_ice: "Desserts", pork_skewers: "Starters", steamed_fish: "Mains" };
const CATEGORIES: [string, string, string][] = [["Starters", "ของทานเล่น", "အစာစား"], ["Mains", "จานหลัก", "ပင်မဟင်း"], ["Curries", "แกง", "ဟင်းချို/ကာရီ"], ["Salads", "ยำและสลัด", "သုပ်"], ["Desserts", "ของหวาน", "အချိုပွဲ"], ["Drinks", "เครื่องดื่ม", "သောက်စရာ"]];

const given = (k: string) => (process.env[k] || "").trim();
const generated: string[] = [];
const pick = (k: string, fallback: string, make: () => string) => {
  if (given(k)) return given(k);
  if (!prod) return fallback;
  generated.push(k);
  return make();
};
const creds = {
  email: (given("SEED_OWNER_EMAIL") || (prod ? "owner@example.com" : DEMO.email)).toLowerCase(),
  password: pick("SEED_OWNER_PASSWORD", DEMO.password, () => crypto.randomBytes(12).toString("base64url")),
  waiterPin: pick("SEED_WAITER_PIN", DEMO.waiterPin, () => String(crypto.randomInt(1000, 10000))),
  chefPin: pick("SEED_CHEF_PIN", DEMO.chefPin, () => String(crypto.randomInt(1000, 10000))),
};
if (creds.waiterPin === creds.chefPin) { console.error("The waiter and chef PINs must be different."); process.exit(1); }
if (!/^\d{4,8}$/.test(creds.waiterPin) || !/^\d{4,8}$/.test(creds.chefPin)) { console.error("PINs must be 4 to 8 digits."); process.exit(1); }
if (creds.password.length < 8) { console.error("The owner password must be at least 8 characters."); process.exit(1); }
if (prod && (creds.password === DEMO.password || creds.waiterPin === DEMO.waiterPin || creds.chefPin === DEMO.chefPin || creds.email === DEMO.email)) {
  console.error("Refusing to use the public demo logins when NODE_ENV=production. Set your own SEED_* values or leave them out to generate random ones.");
  process.exit(1);
}

if ((db.prepare("SELECT COUNT(*) AS n FROM users").get() as any).n > 0) {
  console.log("The database already has data: nothing to seed. (Delete data/shop.db to start again.)");
  process.exit(0);
}

const slug = "golden-lotus";
db.exec("BEGIN IMMEDIATE");
try {
  const uid = Number(db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(creds.email, bcrypt.hashSync(creds.password, 10)).lastInsertRowid);
  const hours = String(menu.hours).match(/(\d\d:\d\d)-(\d\d:\d\d).*?(\d\d:\d\d)/);
  const rid = Number(db.prepare("INSERT INTO restaurants (owner_id, slug, name, city, currency, hours_json) VALUES (?,?,?,?,?,?)").run(
    uid, slug, menu.restaurant, "Bangkok", menu.currency, JSON.stringify({ open: hours?.[1] || "10:00", close: hours?.[2] || "22:00", lastOrder: hours?.[3] || "21:30", closedDays: [] })).lastInsertRowid);
  const cat: Record<string, number> = {};
  CATEGORIES.forEach(([en, th, my], i) => { cat[en] = Number(db.prepare("INSERT INTO categories (restaurant_id, name_en, name_th, name_my, sort) VALUES (?,?,?,?,?)").run(rid, en, th, my, i).lastInsertRowid); });
  menu.items.forEach((it: any, i: number) => {
    db.prepare(`INSERT INTO menu_items (restaurant_id, category_id, name_en, name_th, name_my, price, ingredients, allergens_json, tags_json, spice, available, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      rid, cat[CATEGORY[it.id] || "Mains"], it.name.en, it.name.th || "", it.name.my || "", it.price, it.ingredients || "",
      it.allergens === null ? null : JSON.stringify(it.allergens), JSON.stringify(it.tags || []), (it.tags || []).includes("spicy") ? 2 : 0, it.available ? 1 : 0, i);
  });
  for (const [i, f] of (menu.faq as any[]).entries()) db.prepare("INSERT INTO faqs (restaurant_id, q, a, sort) VALUES (?,?,?,?)").run(rid, f.q, f.a, i);
  db.prepare("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)").run(rid, "Waiter 1", "waiter", bcrypt.hashSync(creds.waiterPin, 8));
  db.prepare("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)").run(rid, "Chef 1", "chef", bcrypt.hashSync(creds.chefPin, 8));
  db.exec("COMMIT");
} catch (e) { db.exec("ROLLBACK"); throw e; }

console.log(`Seeded "${menu.restaurant}" (${menu.items.length} dishes) at /r/${slug}`);
console.log(`  Owner  (/login):  ${creds.email} / ${creds.password}`);
console.log(`  Waiter (/staff):  restaurant ${slug}, PIN ${creds.waiterPin}`);
console.log(`  Chef   (/staff):  restaurant ${slug}, PIN ${creds.chefPin}`);
if (generated.length) console.log(`These were generated for you (${generated.join(", ")}). Save them now: they are not shown again.`);
