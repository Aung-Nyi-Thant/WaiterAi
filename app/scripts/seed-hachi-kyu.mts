// Adds the HaChi Kyu sushi restaurant (scripts/seed-data/hachi-kyu.json, built from the prototype menu) next to the existing one,
// with its own owner account and two staff PINs. The first restaurant (Golden Lotus) is left alone and stays the default.
//
//   npm run db:seed:hachi
//
// Safe to run twice: it does nothing when /r/hachi-kyu already exists.
// Credentials: SEED_HACHI_OWNER_EMAIL, SEED_HACHI_OWNER_PASSWORD, SEED_HACHI_WAITER_PIN, SEED_HACHI_CHEF_PIN.
//  - Development: missing values default to the public demo logins (hachi@shop.ai / demo1234 / 1111 / 2222).
//  - NODE_ENV=production: missing values are generated and printed once; the public demo logins are refused.
// Photos are links to the menu's source site. A diner's phone would fetch them from there, so they are left out unless
// SEED_HACHI_PHOTOS=1.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { db } from "../src/modules/platform/db.ts";

const prod = process.env.NODE_ENV === "production";
const DEMO = { email: "hachi@shop.ai", password: "demo1234", waiterPin: "1111", chefPin: "2222" };
const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, "seed-data", "hachi-kyu.json"), "utf8"));
const photos = process.env.SEED_HACHI_PHOTOS === "1";

const given = (k: string) => (process.env[k] || "").trim();
const generated: string[] = [];
const pick = (k: string, fallback: string, make: () => string) => { if (given(k)) return given(k); if (!prod) return fallback; generated.push(k); return make(); };
const creds = {
  email: (given("SEED_HACHI_OWNER_EMAIL") || (prod ? "owner@hachikyu.example" : DEMO.email)).toLowerCase(),
  password: pick("SEED_HACHI_OWNER_PASSWORD", DEMO.password, () => crypto.randomBytes(12).toString("base64url")),
  waiterPin: pick("SEED_HACHI_WAITER_PIN", DEMO.waiterPin, () => String(crypto.randomInt(1000, 10000))),
  chefPin: pick("SEED_HACHI_CHEF_PIN", DEMO.chefPin, () => String(crypto.randomInt(1000, 10000))),
};
if (creds.waiterPin === creds.chefPin) { console.error("The waiter and chef PINs must be different."); process.exit(1); }
if (!/^\d{4,8}$/.test(creds.waiterPin) || !/^\d{4,8}$/.test(creds.chefPin)) { console.error("PINs must be 4 to 8 digits."); process.exit(1); }
if (creds.password.length < 8) { console.error("The owner password must be at least 8 characters."); process.exit(1); }
if (prod && (creds.password === DEMO.password || creds.waiterPin === DEMO.waiterPin || creds.chefPin === DEMO.chefPin || creds.email === DEMO.email)) {
  console.error("Refusing to use the public demo logins when NODE_ENV=production. Set your own SEED_HACHI_* values or leave them out to generate random ones.");
  process.exit(1);
}

const slug = data.restaurant.slug;
const existing = db.prepare("SELECT id FROM restaurants WHERE slug = ?").get(slug) as any;
if (existing) {
  // Seeded before the ingredient names had Thai and Burmese lines: fill them in for the dishes that have none yet (an owner's own lines are kept).
  const fill = db.prepare("UPDATE menu_items SET ingredients_th = ?, ingredients_my = ? WHERE restaurant_id = ? AND name_en = ? AND ingredients = ? AND ingredients_th = '' AND ingredients_my = ''");
  let filled = 0;
  for (const it of data.items) if (it.ingredients_tr?.th || it.ingredients_tr?.my) filled += Number(fill.run(it.ingredients_tr?.th || "", it.ingredients_tr?.my || "", existing.id, it.name.en, it.ingredients).changes);
  console.log(filled ? `/r/${slug} already exists: added the Thai and Burmese ingredient names to ${filled} dishes.` : `/r/${slug} already exists: nothing to seed.`);
  process.exit(0);
}
if ((db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = ?").get(creds.email) as any).n > 0) { console.error(`The email ${creds.email} is already an owner: set SEED_HACHI_OWNER_EMAIL to another one.`); process.exit(1); }

db.exec("BEGIN IMMEDIATE");
try {
  const uid = Number(db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(creds.email, bcrypt.hashSync(creds.password, 10)).lastInsertRowid);
  const rid = Number(db.prepare("INSERT INTO restaurants (owner_id, slug, name, city, currency, hours_json) VALUES (?,?,?,?,?,?)").run(uid, slug, data.restaurant.name, "", data.restaurant.currency, JSON.stringify(data.restaurant.hours)).lastInsertRowid);
  const cat: Record<string, number> = {};
  data.categories.forEach((c: any, i: number) => { cat[c.key] = Number(db.prepare("INSERT INTO categories (restaurant_id, name_en, name_th, name_my, sort) VALUES (?,?,?,?,?)").run(rid, c.en, c.th, c.my, i).lastInsertRowid); });
  data.items.forEach((it: any, i: number) => {
    db.prepare(`INSERT INTO menu_items (restaurant_id, category_id, name_en, name_th, name_my, price, ingredients, ingredients_th, ingredients_my, allergens_json, tags_json, spice, available, photo_url, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      rid, cat[it.category], it.name.en, it.name.th || "", "", it.price, it.ingredients, it.ingredients_tr?.th || "", it.ingredients_tr?.my || "", it.allergens === null ? null : JSON.stringify(it.allergens), JSON.stringify(it.tags), it.spice, 1, photos ? it.photo : "", i);
  });
  data.faq.forEach((f: any, i: number) => { db.prepare("INSERT INTO faqs (restaurant_id, q, a, sort) VALUES (?,?,?,?)").run(rid, f.q, f.a, i); });
  db.prepare("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)").run(rid, "Waiter 1", "waiter", bcrypt.hashSync(creds.waiterPin, 8));
  db.prepare("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)").run(rid, "Chef 1", "chef", bcrypt.hashSync(creds.chefPin, 8));
  db.exec("COMMIT");
} catch (e) { db.exec("ROLLBACK"); throw e; }

console.log(`Seeded "${data.restaurant.name}" (${data.items.length} dishes) at /r/${slug}`);
console.log(`  Owner  (/login):  ${creds.email} / ${creds.password}`);
console.log(`  Waiter (/staff):  restaurant ${slug}, PIN ${creds.waiterPin}`);
console.log(`  Chef   (/staff):  restaurant ${slug}, PIN ${creds.chefPin}`);
if (generated.length) console.log(`These were generated for you (${generated.join(", ")}). Save them now: they are not shown again.`);
