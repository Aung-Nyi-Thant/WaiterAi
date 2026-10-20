// Adds the HaChi Kyu sushi restaurant (scripts/seed-data/hachi-kyu.json, built from the prototype menu) next to the existing one,
// with its own owner account and two staff PINs. The first restaurant (Golden Lotus) is left alone and stays the default.
//
//   npm run db:seed:hachi
//   npm run db:seed:hachi -- --into golden-lotus      adds the same dishes to an existing restaurant's own menu instead (no new restaurant,
//                                                     owner or staff): categories with the same English name are shared, dishes the
//                                                     restaurant already has (same English name) are skipped, so it is safe to run twice
//   ... --into golden-lotus --replace                 first removes ALL the restaurant's dishes and categories (its FAQs, hours, staff and
//                                                     past orders stay; an order line keeps its name and price), then adds these
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
// One dish row from the data file (names in three languages, description, ingredients in three languages, allergens, tags, spice, photo).
const insertDish = (rid: number, categoryId: number, it: any, sort: number) =>
  db.prepare(`INSERT INTO menu_items (restaurant_id, category_id, name_en, name_th, name_my, desc_en, desc_th, desc_my, price, ingredients, ingredients_th, ingredients_my, allergens_json, tags_json, spice, available, photo_url, sort)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    rid, categoryId, it.name.en, it.name.th || "", it.name.my || "", it.desc?.en || "", it.desc?.th || "", it.desc?.my || "", it.price,
    it.ingredients, it.ingredients_tr?.th || "", it.ingredients_tr?.my || "", it.allergens === null ? null : JSON.stringify(it.allergens), JSON.stringify(it.tags), it.spice, 1, photos ? it.photo : "", sort);

// ---- --into <slug>: put these dishes on an existing restaurant's menu ----
const intoAt = process.argv.indexOf("--into");
if (intoAt >= 0) {
  const target = process.argv[intoAt + 1];
  const shop = target && !target.startsWith("--") ? (db.prepare("SELECT id, name FROM restaurants WHERE slug = ?").get(target) as any) : undefined;
  if (!shop) { console.error(`--into needs the code of an existing restaurant (for example golden-lotus); "${target || ""}" is not one.`); process.exit(1); }
  const replace = process.argv.includes("--replace");
  db.exec("BEGIN IMMEDIATE");
  try {
    let removed = 0;
    if (replace) {
      removed = Number(db.prepare("DELETE FROM menu_items WHERE restaurant_id = ?").run(shop.id).changes);
      db.prepare("DELETE FROM categories WHERE restaurant_id = ?").run(shop.id);
    }
    const sameName = db.prepare("SELECT id FROM categories WHERE restaurant_id = ? AND lower(name_en) = lower(?)");
    let sort = Number((db.prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM categories WHERE restaurant_id = ?").get(shop.id) as any).n);
    const cat: Record<string, number> = {};
    let newCats = 0;
    for (const c of data.categories) {
      const found = sameName.get(shop.id, c.en) as any;
      if (found) { cat[c.key] = found.id; continue; }
      cat[c.key] = Number(db.prepare("INSERT INTO categories (restaurant_id, name_en, name_th, name_my, sort) VALUES (?,?,?,?,?)").run(shop.id, c.en, c.th, c.my, sort++).lastInsertRowid);
      newCats++;
    }
    const has = db.prepare("SELECT id FROM menu_items WHERE restaurant_id = ? AND name_en = ?");
    let itemSort = Number((db.prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM menu_items WHERE restaurant_id = ?").get(shop.id) as any).n);
    let added = 0;
    for (const it of data.items) {
      if (has.get(shop.id, it.name.en)) continue;
      insertDish(shop.id, cat[it.category], it, itemSort++);
      added++;
    }
    // The questions the data file brings (that its ingredients and allergens are not the kitchen's own recipes) so the AI can say so. An older
    // wording of the same question is replaced, and a question the restaurant already has is left alone.
    const OLD_Q = ["Are the allergen details of the sushi and grill dishes confirmed by the kitchen?", "Are the allergen details confirmed by the kitchen?"];
    if (added) {
      for (const q of OLD_Q) db.prepare("DELETE FROM faqs WHERE restaurant_id = ? AND q = ?").run(shop.id, q);
      let next = Number((db.prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM faqs WHERE restaurant_id = ?").get(shop.id) as any).n);
      for (const f of data.faq) if (!db.prepare("SELECT id FROM faqs WHERE restaurant_id = ? AND q = ?").get(shop.id, f.q)) db.prepare("INSERT INTO faqs (restaurant_id, q, a, sort) VALUES (?,?,?,?)").run(shop.id, f.q, f.a, next++);
    }
    db.exec("COMMIT");
    console.log(replace ? `Replaced the ${removed} dishes of "${shop.name}" (/r/${target}) with ${added} dishes in ${newCats} categories.` : added ? `Added ${added} dishes and ${newCats} categories to "${shop.name}" (/r/${target}).` : `"${shop.name}" (/r/${target}) already has these dishes: nothing to add.`);
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  process.exit(0);
}

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
  data.items.forEach((it: any, i: number) => { insertDish(rid, cat[it.category], it, i); });
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
