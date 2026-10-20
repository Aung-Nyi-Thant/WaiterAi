// Ingredient names in Thai and Burmese (the prototype names every ingredient in all three languages): the stored lines, the migration of an
// older database, the public menu, the owner's save, and what the AI says in each language. The helpers themselves are in ingredients.test.ts.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { call, noModel, ownerLogin, signOut } from "./helpers";
import { all, get, run } from "@/modules/platform/db";
import { itemsOf } from "@/modules/platform/menu";
import { ingredientList } from "@/modules/platform/ingredients";
import { GET as publicMenu } from "@/modules/diner/api/menu";
import { GET as ownerItems, POST as addItem } from "@/modules/owner/api/items";
import { PUT as editItem } from "@/modules/owner/api/itemsById";
import { POST as chat } from "@/modules/ai/api/chat";

const root = path.resolve(__dirname, "..");
const node = ["--experimental-strip-types", "--no-warnings"];
afterEach(() => { vi.unstubAllGlobals(); });

describe("the demo menu", () => {
  it("has its ingredients in Thai, one name for each English ingredient (not the spring rolls, whose recipe is deliberately incomplete)", () => {
    const withThai = itemsOf(1).filter((i) => i.ingredients_tr?.th);
    expect(withThai).toHaveLength(12);
    expect(itemsOf(1).find((i) => !i.ingredients_tr?.th)!.name.en).toBe("Fresh Spring Rolls");
    for (const i of withThai) {
      expect(i.ingredients_tr!.th.split(",").length, i.name.en).toBe(i.ingredients.split(",").length);
      expect(ingredientList(i, "th")).not.toEqual(ingredientList(i, "en"));
    }
  });
  it("has no Burmese ingredient names yet, so Burmese diners see the English ones", () => {
    for (const i of itemsOf(1)) { expect(i.ingredients_tr!.my).toBe(""); expect(ingredientList(i, "my")).toEqual(ingredientList(i, "en")); }
  });
});

describe("an older database", () => {
  it("gets the two columns on start, and the demo dishes get their Thai names, while a dish the owner changed keeps what it has", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-mig-"));
    try {
      const env = { PATH: process.env.PATH!, NODE_ENV: "development", DATA_DIR: dir } as NodeJS.ProcessEnv;
      expect(spawnSync(process.execPath, [...node, "scripts/seed.mts"], { cwd: root, env, encoding: "utf8" }).status).toBe(0);
      // make it look like a database from before the columns existed, and let the owner have changed one dish's ingredients
      const prep = `const { DatabaseSync } = require("node:sqlite"); const d = new DatabaseSync(process.env.DATA_DIR + "/shop.db");
        d.exec("ALTER TABLE menu_items DROP COLUMN ingredients_th; ALTER TABLE menu_items DROP COLUMN ingredients_my");
        d.exec("UPDATE menu_items SET ingredients = 'noodles, prawns' WHERE name_en = 'Shrimp Pad Thai'"); d.close();`;
      expect(spawnSync(process.execPath, ["-e", prep], { cwd: root, env, encoding: "utf8" }).status).toBe(0);
      const open = `import("./src/modules/platform/db.ts").then(({ all }) => { console.log(JSON.stringify(all("SELECT name_en, ingredients_th, ingredients_my FROM menu_items ORDER BY id"))); process.exit(0); })`;
      const r = spawnSync(process.execPath, [...node, "-e", open], { cwd: root, env, encoding: "utf8" });
      expect(r.status, r.stderr).toBe(0);
      const rows = JSON.parse(r.stdout.trim().split("\n").pop()!);
      expect(rows.find((x: any) => x.name_en === "Papaya Salad")).toEqual({ name_en: "Papaya Salad", ingredients_th: "มะละกอดิบ, พริก, มะนาว, ถั่วลิสง, กุ้งแห้ง", ingredients_my: "" });
      expect(rows.find((x: any) => x.name_en === "Shrimp Pad Thai").ingredients_th).toBe("");        // its English line was changed: a Thai line for the old one would no longer fit
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("the public menu and the owner's menu list", () => {
  it("both carry the translated lines", async () => {
    signOut();
    const pub = await call(publicMenu, { params: { slug: "golden-lotus" }, url: "http://t/api/public/golden-lotus/menu" });
    expect(pub.data.items.find((i: any) => i.name.en === "Papaya Salad").ingredients_tr).toEqual({ th: "มะละกอดิบ, พริก, มะนาว, ถั่วลิสง, กุ้งแห้ง", my: "" });
    await ownerLogin();
    const mine = await call(ownerItems);
    expect(mine.data.find((i: any) => i.name.en === "Papaya Salad").ingredients_tr.th).toContain("มะละกอดิบ");
  });
});

describe("the owner writes translated ingredients", () => {
  const body = (over: Record<string, unknown> = {}) => ({ name: { en: "Test Salad", th: "", my: "" }, price: 55, ingredients: "lettuce, tomato", ...over });
  it("adds a dish with Thai and Burmese lines, and they are stored and returned as written", async () => {
    await ownerLogin();
    const r = await call(addItem, { method: "POST", body: body({ ingredients_tr: { th: "ผักกาดหอม, มะเขือเทศ", my: "ဆလတ်, ခရမ်းချဉ်သီး" } }) });
    expect(r.status, JSON.stringify(r.data)).toBeLessThan(300);
    const row = get("SELECT ingredients_th, ingredients_my FROM menu_items WHERE id = ?", r.data.id);
    expect(row).toEqual({ ingredients_th: "ผักกาดหอม, มะเขือเทศ", ingredients_my: "ဆလတ်, ခရမ်းချဉ်သီး" });
    expect(ingredientList(itemsOf(1).find((i) => i.id === r.data.id)!, "th")).toEqual(["ผักกาดหอม", "มะเขือเทศ"]);
    run("DELETE FROM menu_items WHERE id = ?", r.data.id);
  });
  it("a dish added without the lines has none, and an edit that does not mention them leaves them alone", async () => {
    await ownerLogin();
    const added = await call(addItem, { method: "POST", body: body() });
    expect(get("SELECT ingredients_th, ingredients_my FROM menu_items WHERE id = ?", added.data.id)).toEqual({ ingredients_th: "", ingredients_my: "" });
    await call(editItem, { method: "PUT", params: { id: String(added.data.id) }, body: { ingredients_tr: { th: "ผักกาดหอม, มะเขือเทศ", my: "" } } });
    await call(editItem, { method: "PUT", params: { id: String(added.data.id) }, body: { price: 60 } });
    const row = get("SELECT price, ingredients_th FROM menu_items WHERE id = ?", added.data.id);
    expect(row).toEqual({ price: 60, ingredients_th: "ผักกาดหอม, มะเขือเทศ" });
    run("DELETE FROM menu_items WHERE id = ?", added.data.id);
  });
  it("the lines can be cleared again, a missing language is stored as empty, and a very long line is cut", async () => {
    await ownerLogin();
    const id = (await call(addItem, { method: "POST", body: body({ ingredients_tr: { th: "ก, ข", my: "x".repeat(2000) } }) })).data.id;
    expect(get("SELECT LENGTH(ingredients_my) n FROM menu_items WHERE id = ?", id)!.n).toBe(900);
    await call(editItem, { method: "PUT", params: { id: String(id) }, body: { ingredients_tr: { th: "" } } });
    expect(get("SELECT ingredients_th, ingredients_my FROM menu_items WHERE id = ?", id)).toEqual({ ingredients_th: "", ingredients_my: "" });
    run("DELETE FROM menu_items WHERE id = ?", id);
  });
  it("changing the English line without the translations leaves a line that no longer fits, which is then not used", async () => {
    await ownerLogin();
    const id = (await call(addItem, { method: "POST", body: body({ ingredients_tr: { th: "ผักกาดหอม, มะเขือเทศ", my: "" } }) })).data.id;
    await call(editItem, { method: "PUT", params: { id: String(id) }, body: { ingredients: "lettuce, tomato, cucumber" } });
    expect(ingredientList(itemsOf(1).find((i) => i.id === id)!, "th")).toEqual(["lettuce", "tomato", "cucumber"]);
    run("DELETE FROM menu_items WHERE id = ?", id);
  });
  it("a diner cannot write them (the route needs the owner)", async () => {
    signOut();
    expect((await call(addItem, { method: "POST", body: body({ ingredients_tr: { th: "x", my: "y" } }) })).status).toBe(401);
  });
});

describe("what the AI says in each language", () => {
  const ask = async (message: string, lang: string) => { noModel(); signOut(); return (await call(chat, { method: "POST", params: { slug: "golden-lotus" }, body: { message, sessionId: `i18n-${lang}-${Math.random()}`, table: "5", lang } })).data; };
  it("in English: the English line, as before", async () => {
    const r = await ask("What is in the Pad Thai?", "en");
    expect(r.reply).toBe("Shrimp Pad Thai is made with: rice noodles, shrimp, egg, tamarind, fish sauce, crushed peanuts.");
  });
  it("in Thai: the Thai names, the polite particle after a space, and the list for the pills", async () => {
    const r = await ask("ส่วนผสมของผัดไทยมีอะไรบ้าง", "th");
    expect(r.reply).toBe("ส่วนผสมของผัดไทยกุ้ง: เส้นผัดไทย, กุ้ง, ไข่, น้ำมะขาม, น้ำปลา, ถั่วลิสงบด ครับ");
    expect(r.ingredients).toEqual(["เส้นผัดไทย", "กุ้ง", "ไข่", "น้ำมะขาม", "น้ำปลา", "ถั่วลิสงบด"]);
  });
  it("in Burmese, with no Burmese names written: the English names", async () => {
    const r = await ask("ပုစွန် ပတ်ထိုင်း ဘာတွေပါလဲ", "my");
    expect(r.ingredients).toEqual(["rice noodles", "shrimp", "egg", "tamarind", "fish sauce", "crushed peanuts"]);
  });
  it("in Burmese, once the owner writes them, the Burmese names (an empty part keeps the English name)", async () => {
    run("UPDATE menu_items SET ingredients_my = 'ခေါက်ဆွဲ, ပုစွန်, ဥ, , , မြေပဲ' WHERE name_en = 'Shrimp Pad Thai'");
    const r = await ask("ပုစွန် ပတ်ထိုင်း ဘာတွေပါလဲ", "my");
    expect(r.ingredients).toEqual(["ခေါက်ဆွဲ", "ပုစွန်", "ဥ", "tamarind", "fish sauce", "မြေပဲ"]);
    expect(r.reply).toContain("ခေါက်ဆွဲ, ပုစွန်, ဥ, tamarind, fish sauce, မြေပဲ");
    run("UPDATE menu_items SET ingredients_my = '' WHERE name_en = 'Shrimp Pad Thai'");
  });
  it("the stored reply is the Thai text the diner read", async () => {
    await ask("ส่วนผสมของผัดไทยมีอะไรบ้าง", "th");
    const last = all("SELECT text FROM chat_messages WHERE role = 'assistant' ORDER BY id DESC LIMIT 1")[0] as any;
    expect(last.text).toContain("เส้นผัดไทย");
  });
});
