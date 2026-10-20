// The second sample restaurant (HaChi Kyu, 132 dishes, built from the clickable prototype): the data itself, the seed script, the
// isolation between the two restaurants, the full order flow on the big menu, and the allergen answers checked dish by dish.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { call, noModel, ownerLogin, signOut, staffLogin } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { ALLERGENS, allergenName } from "@/modules/platform/constants";
import { GET as publicMenu } from "@/modules/diner/api/menu";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { POST as chat } from "@/modules/ai/api/chat";
import { GET as floor } from "@/modules/staff/api/floor";
import { GET as kitchen } from "@/modules/staff/api/kitchen";
import { POST as orderAction } from "@/modules/staff/api/orders";
import { GET as ownerItems } from "@/modules/owner/api/items";

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "scripts/seed-data/hachi-kyu.json"), "utf8"));
const node = ["--experimental-strip-types", "--no-warnings"];
const run = (script: string, env: Record<string, string>, args: string[] = []) => {
  const r = spawnSync(process.execPath, [...node, script, ...args], { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH!, NODE_ENV: "development", ...env } });
  return { code: r.status, out: r.stdout + r.stderr };
};
afterEach(() => { vi.unstubAllGlobals(); });

describe("the HaChi Kyu data", () => {
  it("has 132 dishes in 9 categories, each with a Thai and an English name and a whole, positive price", () => {
    expect(data.items.length).toBe(132);
    expect(data.categories.length).toBe(9);
    for (const i of data.items) { expect(i.name.en.length, JSON.stringify(i.name)).toBeGreaterThan(1); expect(i.name.th.length).toBeGreaterThan(1); expect(Number.isInteger(i.price) && i.price > 0, i.name.en).toBe(true); }
  });
  it("every dish is in a category that exists, and no two dishes share an English name", () => {
    const cats = new Set(data.categories.map((c: any) => c.key));
    expect(data.items.filter((i: any) => !cats.has(i.category))).toEqual([]);
    const names = data.items.map((i: any) => i.name.en);
    expect(new Set(names).size).toBe(names.length);
  });
  it("allergens are real ones, listed once each; an estimate that found nothing is NULL (not provided), never an empty list", () => {
    for (const i of data.items) {
      if (i.allergens === null) continue;
      expect(i.allergens.length, `${i.name.en} would read as "no allergens"`).toBeGreaterThan(0);
      expect(new Set(i.allergens).size).toBe(i.allergens.length);
      for (const a of i.allergens) expect(ALLERGENS as readonly string[], `${i.name.en}: ${a}`).toContain(a);
    }
    expect(data.items.filter((i: any) => i.allergens === null).length).toBeGreaterThan(20);
  });
  it("crustaceans and molluscs are separate allergens (the prototype lumped them together)", () => {
    const shrimp = data.items.find((i: any) => i.name.en === "Giant Sweet Shrimp Sashimi");
    expect(shrimp.allergens).toContain("shellfish");
    expect(shrimp.allergens).not.toContain("molluscs");
    const molluscs = data.items.filter((i: any) => (i.allergens || []).includes("molluscs"));
    expect(molluscs.length).toBeGreaterThan(5);
    for (const m of molluscs) expect(m.ingredients.toLowerCase(), m.name.en).toMatch(/scallop|squid|octopus|clam/);
  });
  it("a listed allergen is backed by an ingredient (nothing is invented), and an obvious one is never missed", () => {
    const BACK: Record<string, RegExp> = { fish: /salmon|tuna|mackerel|yellowtail|eel|crab stick|roe|fish|stingray/i, shellfish: /shrimp|crab/i, molluscs: /scallop|squid|octopus|clam/i, egg: /egg/i, milk: /cheese/i, gluten: /batter|noodle|dumpling/i, soy: /soy|miso|teriyaki|edamame|tofu/i };
    for (const i of data.items) {
      for (const a of i.allergens || []) expect(i.ingredients, `${i.name.en} lists ${a}`).toMatch(BACK[a]);
      if (/salmon|tuna/i.test(i.ingredients)) expect(i.allergens, i.name.en).toContain("fish");
    }
  });
  it("tags: only facts the ingredients support (pork, spice); no vegetarian or vegan guesses", () => {
    for (const i of data.items) {
      expect(i.tags.filter((t: string) => !["contains_pork", "spicy"].includes(t)), i.name.en).toEqual([]);
      expect(i.tags.includes("contains_pork"), i.name.en).toBe(/pork|bacon/i.test(i.ingredients));
      expect(i.spice, i.name.en).toBe(i.tags.includes("spicy") ? 2 : 0);
    }
  });
  it("every dish has its ingredients in Thai too, one name per English ingredient, and Burmese where the prototype has it (an empty part = not translated)", () => {
    const parts = (t: string) => t.split(/[,，、;；·•\n]/).map((x) => x.trim());
    let burmese = 0;
    for (const i of data.items) {
      const en = parts(i.ingredients);
      const th = parts(i.ingredients_tr.th);
      if (!i.ingredients) { expect(i.ingredients_tr, i.name.en).toEqual({ th: "", my: "" }); continue; }            // a dish with no ingredient list has no translated one either
      expect(th.length, `${i.name.en}: Thai parts vs English`).toBe(en.length);
      expect(th.every(Boolean), `${i.name.en}: a Thai name is missing`).toBe(true);
      if (i.ingredients_tr.my) { burmese++; expect(parts(i.ingredients_tr.my).length, `${i.name.en}: Burmese parts vs English`).toBe(en.length); expect(parts(i.ingredients_tr.my).some(Boolean), i.name.en).toBe(true); }
    }
    expect(burmese).toBeGreaterThan(80);
    const yaki = data.items.find((i: any) => i.name.en === "[Coke Combo] Yakisoba with Coke");
    expect(yaki.ingredients).toBe("Yakisoba noodles, Cola");
    expect(yaki.ingredients_tr.th).toBe("เส้นยากิโซบะ, น้ำอัดลมโคล่า");
    expect(yaki.ingredients_tr.my).toBe("ခေါက်ဆွဲ, ");                                      // the prototype has a Burmese name for noodles but not for cola
  });
  it("the file is exactly what the generator builds from prototype/data.js", () => {
    const r = run("scripts/make-hachi-kyu-seed.mts", {}, ["--check"]);
    expect(r.out).toContain("up to date");
    expect(r.code).toBe(0);
  });
  it("says in an FAQ that the allergens are estimated, so the AI never presents them as confirmed", () => {
    expect(data.faq.some((f: any) => /not yet|estimated/i.test(f.a) && /allerg/i.test(f.q))).toBe(true);
  });
});

describe("scripts/seed-hachi-kyu.mts", () => {
  const dirs: string[] = [];
  const seed = (env: Record<string, string> = {}, dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-hachi-"))) => { dirs.push(dir); return { dir, ...run("scripts/seed-hachi-kyu.mts", { DATA_DIR: dir, ...env }) }; };
  const sql = async (dir: string, q: string) => { const { DatabaseSync } = await import("node:sqlite"); const d = new DatabaseSync(path.join(dir, "shop.db")); try { return d.prepare(q).all() as any[]; } finally { d.close(); } };
  afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

  it("adds the restaurant beside the first one, with 132 dishes, 2 staff and its own owner", async () => {
    const r = seed();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("/r/hachi-kyu");
    expect((await sql(r.dir, "SELECT slug FROM restaurants ORDER BY id")).map((x) => x.slug)).toEqual(["golden-lotus", "hachi-kyu"]);
    const rid = (await sql(r.dir, "SELECT id FROM restaurants WHERE slug='hachi-kyu'"))[0].id;
    expect((await sql(r.dir, `SELECT COUNT(*) n FROM menu_items WHERE restaurant_id=${rid}`))[0].n).toBe(132);
    expect((await sql(r.dir, `SELECT COUNT(*) n FROM staff WHERE restaurant_id=${rid}`))[0].n).toBe(2);
    expect((await sql(r.dir, "SELECT COUNT(DISTINCT owner_id) n FROM restaurants"))[0].n).toBe(2);
  });
  it("stores NULL for an unknown allergen estimate and a list for a known one", async () => {
    const r = seed();
    const rows = await sql(r.dir, "SELECT name_en, allergens_json FROM menu_items WHERE restaurant_id=(SELECT id FROM restaurants WHERE slug='hachi-kyu')");
    expect(rows.filter((x) => x.allergens_json === "[]")).toEqual([]);
    expect(rows.find((x) => x.name_en === "Salmon Sashimi")!.allergens_json).toBe('["fish"]');
    expect(rows.find((x) => x.name_en === "[Coke Combo] Garlic Fried Rice with Coke")!.allergens_json).toBeNull();
  });
  it("is safe to run twice, and leaves the first restaurant untouched", async () => {
    const r = seed();
    const before = await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id=(SELECT id FROM restaurants WHERE slug='golden-lotus')");
    const again = seed({}, r.dir);
    expect(again.code).toBe(0);
    expect(again.out).toMatch(/already exists/);
    expect((await sql(r.dir, "SELECT COUNT(*) n FROM restaurants"))[0].n).toBe(2);
    expect(await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE restaurant_id=(SELECT id FROM restaurants WHERE slug='golden-lotus')")).toEqual(before);
  });
  it("stores the Thai and Burmese ingredient lines with each dish", async () => {
    const r = seed();
    const row = (await sql(r.dir, "SELECT ingredients, ingredients_th, ingredients_my FROM menu_items WHERE name_en = '[Coke Combo] Yakisoba with Coke'"))[0];
    expect(row).toEqual({ ingredients: "Yakisoba noodles, Cola", ingredients_th: "เส้นยากิโซบะ, น้ำอัดลมโคล่า", ingredients_my: "ခေါက်ဆွဲ, " });
    const written = data.items.filter((i: any) => i.ingredients).length;                         // 6 dishes have no ingredient list at all
    expect(written).toBe(126);
    expect((await sql(r.dir, "SELECT COUNT(*) n FROM menu_items WHERE ingredients_th <> '' AND restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hachi-kyu')"))[0].n).toBe(written);
  });
  it("on a restaurant seeded before the translations existed, a second run fills them in, and keeps an owner's own line", async () => {
    const r = seed();
    const { DatabaseSync } = await import("node:sqlite");
    const d = new DatabaseSync(path.join(r.dir, "shop.db"));
    d.exec("UPDATE menu_items SET ingredients_th = '', ingredients_my = '' WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hachi-kyu')");
    d.exec("UPDATE menu_items SET ingredients_th = 'เส้น, น้ำ' WHERE name_en = '[Coke Combo] Yakisoba with Coke'");     // the owner already wrote this one
    d.close();
    const again = seed({}, r.dir);
    expect(again.out).toMatch(/added the Thai and Burmese ingredient names to 125 dishes/);                 // 126 with a list, minus the one the owner wrote
    const rows = await sql(r.dir, "SELECT name_en, ingredients_th FROM menu_items WHERE name_en IN ('[Coke Combo] Yakisoba with Coke', 'Tuna Sashimi')");
    expect(rows.find((x) => x.name_en.startsWith("[Coke"))!.ingredients_th).toBe("เส้น, น้ำ");
    expect(rows.find((x) => x.name_en === "Tuna Sashimi")!.ingredients_th).toBe("ทูน่า");
    expect(seed({}, r.dir).out).toMatch(/nothing to seed/);                                      // and a third run changes nothing
  });
  it("leaves the photo links out unless SEED_HACHI_PHOTOS=1 (a diner's phone would otherwise fetch them from another site)", async () => {
    const a = seed();
    expect((await sql(a.dir, "SELECT COUNT(*) n FROM menu_items WHERE photo_url <> ''"))[0].n).toBe(0);
    const b = seed({ SEED_HACHI_PHOTOS: "1" });
    expect((await sql(b.dir, "SELECT COUNT(*) n FROM menu_items WHERE photo_url LIKE 'https://%'"))[0].n).toBe(132);
  });
  it("production: refuses the public demo logins, and generates its own when none are given", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-hachi-prod-"));
    dirs.push(dir);
    // the first restaurant needs an owner in production: create it the way a deployment does
    expect(run("scripts/seed.mts", { DATA_DIR: dir, NODE_ENV: "production", SEED_OWNER_PASSWORD: "a-long-password-1", SEED_WAITER_PIN: "4821", SEED_CHEF_PIN: "7390" }).code).toBe(0);
    const bad = run("scripts/seed-hachi-kyu.mts", { DATA_DIR: dir, NODE_ENV: "production", SEED_HACHI_OWNER_PASSWORD: "demo1234", SEED_HACHI_WAITER_PIN: "4444", SEED_HACHI_CHEF_PIN: "5555" });
    expect(bad.code).toBe(1);
    expect(bad.out).toMatch(/Refusing to use the public demo logins/);
    const ok = run("scripts/seed-hachi-kyu.mts", { DATA_DIR: dir, NODE_ENV: "production" });
    expect(ok.code, ok.out).toBe(0);
    expect(ok.out).toMatch(/These were generated for you/);
    expect(ok.out).not.toMatch(/demo1234|PIN 1111|PIN 2222/);
  });
  it("refuses bad PINs and short passwords, and an owner email that already exists", () => {
    expect(seed({ SEED_HACHI_WAITER_PIN: "12" }).out).toMatch(/4 to 8 digits/);
    expect(seed({ SEED_HACHI_WAITER_PIN: "1234", SEED_HACHI_CHEF_PIN: "1234" }).out).toMatch(/must be different/);
    expect(seed({ SEED_HACHI_OWNER_PASSWORD: "short" }).out).toMatch(/at least 8/);
    const r = seed();
    fs.rmSync(path.join(r.dir, "shop.db"), { force: true });   // a fresh database again, but with the owner of the demo restaurant as the email:
    expect(seed({ SEED_HACHI_OWNER_EMAIL: "demo@shop.ai" }, r.dir).out).toMatch(/already an owner/);
  });
});

// ---- the rest runs against the test database with HaChi Kyu added ----
const hachi = "hachi-kyu";
beforeAll(() => {
  const r = run("scripts/seed-hachi-kyu.mts", { DATA_DIR: process.env.DATA_DIR! });
  if (r.code !== 0) throw new Error(r.out);
});

describe("two restaurants in one database stay apart", () => {
  it("the public menu of each shows only its own dishes", async () => {
    signOut();
    const h = await call(publicMenu, { params: { slug: hachi }, url: `http://t/api/public/${hachi}/menu` });
    const g = await call(publicMenu, { params: { slug: "golden-lotus" }, url: "http://t/api/public/golden-lotus/menu" });
    expect(h.status).toBe(200);
    expect(h.data.restaurant.name).toBe("HaChi Kyu");
    expect(h.data.items.length).toBe(132);
    expect(h.data.categories.length).toBe(9);
    expect(g.data.items.length).toBeLessThan(20);
    expect(g.data.items.some((i: any) => /Sashimi/.test(i.name.en))).toBe(false);
    expect(h.data.items.some((i: any) => /Pad Thai/.test(i.name.en))).toBe(false);
  });
  it("a PIN opens only its own restaurant: the same PIN 1111 is a different waiter in each", async () => {
    const a = await staffLogin("1111", hachi);
    const b = await staffLogin("1111", "golden-lotus");
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    expect((await staffLogin("1111", "no-such-place")).status).toBeGreaterThanOrEqual(400);
  });
  it("an owner sees only their own dishes; the other owner's login does not work on the first one's data", async () => {
    await ownerLogin("hachi@shop.ai", "demo1234");
    const mine = await call(ownerItems);
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.data)).toContain("Salmon Sashimi");
    expect(JSON.stringify(mine.data)).not.toContain("Pad Thai");
    await ownerLogin("demo@shop.ai", "demo1234");
    expect(JSON.stringify((await call(ownerItems)).data)).not.toContain("Salmon Sashimi");
  });
});

describe("the HaChi Kyu ingredients in the diner's language", () => {
  const askIn = async (message: string, lang: string) => { noModel(); signOut(); return (await call(chat, { method: "POST", params: { slug: hachi }, body: { message, sessionId: `hk-i-${lang}-${Math.random()}`, table: "3", lang } })).data; };
  it("the public menu carries the translated lines next to the English one", async () => {
    signOut();
    const m = await call(publicMenu, { params: { slug: hachi }, url: `http://t/api/public/${hachi}/menu` });
    const yaki = m.data.items.find((i: any) => i.name.en === "[Coke Combo] Yakisoba with Coke");
    expect(yaki.ingredients_tr).toEqual({ th: "เส้นยากิโซบะ, น้ำอัดลมโคล่า", my: "ခေါက်ဆွဲ, " });
  });
  it("asked in Thai, the AI lists the Thai ingredient names", async () => {
    const r = await askIn("Tuna Sashimi ส่วนผสมมีอะไรบ้าง", "th");
    expect(r.ingredients).toEqual(["ทูน่า"]);
    expect(r.reply).toContain("ทูน่า");
    expect(r.reply).not.toContain("Tuna,");
  });
  it("asked in Burmese, the AI uses the Burmese names it has and the English name for the one it has not", async () => {
    const r = await askIn("Eel Sushi ပါဝင်ပစ္စည်း ဘာတွေလဲ", "my");
    expect(r.ingredients).toEqual(["ထမင်း", "Eel"]);
    expect(r.lead).toMatch(/ဖြစ်ပါတယ်ခင်ဗျာ။$/);
  });
  it("asked in English, nothing changes", async () => {
    const r = await askIn("What is in the Eel Sushi?", "en");
    expect(r.reply).toBe("Eel Sushi is made with: Japanese rice, Eel.");
    expect(r.ingredients).toEqual(["Japanese rice", "Eel"]);
  });
});

describe("a diner orders from the big menu and the HaChi Kyu staff cook it (the full flow, 132 dishes)", () => {
  it("picks go to the waiter of that restaurant only; the kitchen cooks, the waiter serves", async () => {
    noModel();
    signOut();
    const menu = await call(publicMenu, { params: { slug: hachi }, url: `http://t/api/public/${hachi}/menu` });
    const dish = (n: string) => menu.data.items.find((i: any) => i.name.en === n);
    const sashimi = dish("Salmon Sashimi"), sushi = dish("Salmon Sushi");
    // the diner tells the AI about an allergy; the order then carries it to the waiter (the allergy comes from the chat session, not the order)
    const sid = "hk-flow-1";
    expect((await call(chat, { method: "POST", params: { slug: hachi }, body: { message: "I'm allergic to shellfish", sessionId: sid, table: "7", lang: "en" } })).status).toBe(200);
    const order = await call(placeOrder, { method: "POST", params: { slug: hachi }, body: { table: "7", lang: "en", sessionId: sid, items: [{ id: sashimi.id, qty: 2 }, { id: sushi.id, qty: 1 }] } });
    expect(order.status, JSON.stringify(order.data)).toBeLessThan(300);

    await staffLogin("1111", "golden-lotus");
    expect(JSON.stringify((await call(floor)).data)).not.toContain("Salmon");      // the other restaurant's waiter never sees it

    await staffLogin("1111", hachi);
    const f = await call(floor);
    expect(f.status, JSON.stringify(f.data)).toBe(200);
    const pick = f.data.picks.find((p: any) => p.table === "7");
    expect(pick, JSON.stringify(f.data.picks)).toBeTruthy();
    expect(pick.items.reduce((s: number, i: any) => s + i.qty, 0)).toBe(3);
    expect(pick.allergy).toBe("shellfish");
    expect((await call(orderAction, { method: "POST", params: { id: String(pick.id) }, body: { action: "take" } })).status).toBe(200);

    await staffLogin("2222", hachi, "chef");
    const k = await call(kitchen);
    expect(k.data.tickets.new.some((t: any) => t.id === pick.id)).toBe(true);
    for (const action of ["cooking", "ready"]) expect((await call(orderAction, { method: "POST", params: { id: String(pick.id) }, body: { action } })).status, action).toBe(200);

    await staffLogin("1111", hachi);
    expect((await call(orderAction, { method: "POST", params: { id: String(pick.id) }, body: { action: "served" } })).status).toBe(200);
  });
  it("an allergy question over the chat endpoint is answered from the data, without the model", async () => {
    const calls = noModel();
    signOut();
    const r = await call(chat, { method: "POST", params: { slug: hachi }, body: { message: "Is the Salmon Sashimi OK? I'm allergic to fish", sessionId: "hk-1", table: "7", lang: "en" } });
    expect(r.status).toBe(200);
    expect(r.data.reply).toMatch(/fish/i);
    expect(r.data.reply).toMatch(/confirm with the staff/i);
    expect(calls.length).toBe(0);
  });
});

describe("the allergen answers equal the data, for every HaChi Kyu dish and every allergen (the oracle)", () => {
  const WORD: Record<string, string> = { peanut: "peanuts", tree_nut: "almonds", shellfish: "shellfish", molluscs: "squid", fish: "fish", egg: "egg", milk: "milk", soy: "soy", gluten: "gluten", sesame: "sesame", celery: "celery", mustard: "mustard", sulphites: "sulphites", lupin: "lupin" };
  const staffLine = /confirm with the staff/i, notProvided = /not provided/i;
  const UNSAFE = /\bis safe\b|\bsafe to eat\b|\ballergen[- ]free\b|\bno allergens\b(?! listed)|\bguarantee/i;

  async function ctx() {
    const { restaurantBySlug, itemsOf, faqsOf, specialsOf } = await import("@/modules/platform/menu");
    const r = restaurantBySlug(hachi)!;
    return { restaurant: r, items: itemsOf(r.id), faqs: faqsOf(r.id) as any[], specials: specialsOf(r.id) as any[], history: [] as any[] };
  }
  // dishes whose full name is also the start of another dish's name ("Salmon Sushi" / "Salmon Sushi Roll") cannot be told apart by a plain name match
  const ambiguous = (c: any, d: any) => c.items.some((o: any) => o !== d && (o.name.en.toLowerCase().includes(d.name.en.toLowerCase())));

  it("'I'm allergic to X. Can I eat <dish>?' names exactly the dish's listed allergens, or says 'not provided', and never calls the model", async () => {
    const c = await ctx();
    const wrong: string[] = [];
    let checked = 0;
    for (const d of c.items) {
      for (const a of Object.keys(WORD)) {
        const calls = noModel();
        const r = await answer(`I'm allergic to ${WORD[a]}. Can I eat the ${d.name.en}?`, "en", c as any);
        vi.unstubAllGlobals();
        checked++;
        const where = `[${d.name.en} | ${d.allergens === null ? "NULL" : d.allergens.join(",")} | ask ${a}] ${r.reply}`;
        if (calls.length) wrong.push(`went to the model: ${where}`);
        else if (UNSAFE.test(r.reply)) wrong.push(`unsafe wording: ${where}`);
        else if (!staffLine.test(r.reply)) wrong.push(`no staff line: ${where}`);
        else if (d.allergens === null) { if (!notProvided.test(r.reply)) wrong.push(`NULL not reported as unknown: ${where}`); }
        else {
          const rest = r.reply.toLowerCase().split(d.name.en.toLowerCase()).join(" ").replace(/please confirm with the staff/g, " ");
          for (const k of d.allergens) { if (!rest.includes(allergenName(k, "en").toLowerCase())) wrong.push(`missing ${k}: ${where}`); }
        }
      }
    }
    expect(checked).toBe(132 * 14);
    expect(wrong, `${wrong.length} wrong of ${checked}:\n${wrong.slice(0, 6).join("\n")}`).toEqual([]);
  });

  it("'Which dishes contain X?' lists every dish with X, and every dish with no data, on the 132-dish menu", async () => {
    const c = await ctx();
    const wrong: string[] = [];
    for (const a of Object.keys(WORD)) {
      const calls = noModel();
      const r = await answer(`Which dishes contain ${WORD[a]}?`, "en", c as any);
      vi.unstubAllGlobals();
      if (calls.length) { wrong.push(`went to the model for ${a}`); continue; }
      if (!staffLine.test(r.reply)) wrong.push(`${a}: no staff line`);
      const should = c.items.filter((d) => d.allergens === null || d.allergens.includes(a));
      for (const d of c.items) {
        if (ambiguous(c, d)) continue;
        if (should.includes(d) && !r.reply.includes(d.name.en)) wrong.push(`${a}: ${d.name.en} missing from the answer`);
        if (!should.includes(d) && r.reply.includes(d.name.en)) wrong.push(`${a}: ${d.name.en} wrongly listed`);
      }
    }
    expect(wrong, wrong.slice(0, 8).join("\n")).toEqual([]);
  });
});
