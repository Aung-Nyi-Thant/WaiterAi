// Demo logins are development-only, and the seed script never creates well-known passwords in production.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(__dirname, "..");
const seed = (env: Record<string, string>, dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-seed-"))) => {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/seed.mts"], {
    cwd: root, encoding: "utf8", env: { PATH: process.env.PATH!, DATA_DIR: dir, NODE_ENV: "development", ...env },
  });
  return { dir, code: r.status, out: r.stdout + r.stderr };
};
const open = (dir: string) => new DatabaseSync(path.join(dir, "shop.db"));

afterEach(() => { vi.unstubAllEnvs(); });

describe("demo logins exist only outside production", () => {
  it("development/test: the demo restaurant and logins are created on first start", async () => {
    const { get } = await import("@/modules/platform/db");
    const u = get("SELECT password_hash FROM users WHERE email = 'demo@shop.ai'")!;
    expect(bcrypt.compareSync("demo1234", u.password_hash)).toBe(true);
    expect(get("SELECT COUNT(*) AS n FROM staff")!.n).toBe(2);
  });
  it("NODE_ENV=production: a fresh database has no users, no restaurant and no staff", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-prod-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "-e", 'import("./src/modules/platform/db.ts")'], {
      cwd: root, env: { PATH: process.env.PATH!, DATA_DIR: dir, NODE_ENV: "production" }, stdio: "pipe",
    });
    const db = open(dir);
    for (const t of ["users", "restaurants", "staff", "menu_items"]) expect((db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as any).n, t).toBe(0);
    db.close();
  });
});

describe("scripts/seed.mts", () => {
  it("in production with no credentials: generates random ones and prints them once", () => {
    const r = seed({ NODE_ENV: "production" });
    expect(r.code).toBe(0);
    expect(r.out).toContain("Seeded");
    const pw = r.out.match(/owner@example\.com \/ (\S+)/)![1];
    expect(pw).not.toBe("demo1234");
    expect(pw.length).toBeGreaterThanOrEqual(12);
    const pins = [...r.out.matchAll(/PIN (\d{4})/g)].map((m) => m[1]);
    expect(pins).toHaveLength(2);
    expect(pins).not.toContain("1111");
    expect(pins).not.toContain("2222");
    const db = open(r.dir);
    const owner = db.prepare("SELECT password_hash FROM users").get() as any;
    expect(bcrypt.compareSync(pw, owner.password_hash)).toBe(true);
    expect(bcrypt.compareSync("demo1234", owner.password_hash)).toBe(false);
    db.close();
  });
  it("uses the credentials it is given", () => {
    const r = seed({ NODE_ENV: "production", SEED_OWNER_EMAIL: "Boss@Cafe.test", SEED_OWNER_PASSWORD: "a-long-password", SEED_WAITER_PIN: "4821", SEED_CHEF_PIN: "7305" });
    expect(r.code).toBe(0);
    const db = open(r.dir);
    expect((db.prepare("SELECT email FROM users").get() as any).email).toBe("boss@cafe.test");
    const staff = db.prepare("SELECT role, pin_hash FROM staff ORDER BY id").all() as any[];
    expect(bcrypt.compareSync("4821", staff[0].pin_hash)).toBe(true);
    expect(bcrypt.compareSync("7305", staff[1].pin_hash)).toBe(true);
    db.close();
  });
  it("refuses the public demo logins in production", () => {
    for (const env of [{ SEED_OWNER_PASSWORD: "demo1234" }, { SEED_WAITER_PIN: "1111" }, { SEED_CHEF_PIN: "2222" }, { SEED_OWNER_EMAIL: "demo@shop.ai" }]) {
      const r = seed({ NODE_ENV: "production", ...env });
      expect(r.code, JSON.stringify(env)).toBe(1);
      expect(r.out).toMatch(/Refusing/);
      expect(fs.existsSync(path.join(r.dir, "shop.db")) ? (open(r.dir).prepare("SELECT COUNT(*) AS n FROM users").get() as any).n : 0).toBe(0);
    }
  });
  it("validates the credentials", () => {
    expect(seed({ NODE_ENV: "production", SEED_OWNER_PASSWORD: "short" }).code).toBe(1);
    expect(seed({ NODE_ENV: "production", SEED_WAITER_PIN: "12" }).code).toBe(1);
    expect(seed({ NODE_ENV: "production", SEED_WAITER_PIN: "5555", SEED_CHEF_PIN: "5555" }).code).toBe(1);
  });
  it("is safe to run twice", () => {
    const first = seed({ NODE_ENV: "production" });
    const second = seed({ NODE_ENV: "production" }, first.dir);
    expect(second.code).toBe(0);
    expect(second.out).toMatch(/already has data/);
    expect((open(first.dir).prepare("SELECT COUNT(*) AS n FROM users").get() as any).n).toBe(1);
  });
  it("loads the sample menu from eval/menu.json, so the AI eval and the app use the same dishes", async () => {
    const r = seed({ NODE_ENV: "production" });
    const menu = JSON.parse(fs.readFileSync(path.join(root, "..", "eval", "menu.json"), "utf8"));
    const db = open(r.dir);
    const rows = db.prepare("SELECT * FROM menu_items ORDER BY sort").all() as any[];
    expect(rows).toHaveLength(menu.items.length);
    menu.items.forEach((it: any, i: number) => {
      expect([rows[i].name_en, rows[i].price, rows[i].available === 1]).toEqual([it.name.en, it.price, it.available]);
      expect(rows[i].allergens_json === null ? null : JSON.parse(rows[i].allergens_json)).toEqual(it.allergens);
      expect(JSON.parse(rows[i].tags_json)).toEqual(it.tags);
      expect(rows[i].category_id).not.toBeNull();
    });
    expect((db.prepare("SELECT COUNT(*) AS n FROM faqs").get() as any).n).toBe(menu.faq.length);
    expect(JSON.parse((db.prepare("SELECT hours_json FROM restaurants").get() as any).hours_json)).toMatchObject({ open: "10:00", close: "22:00", lastOrder: "21:30" });
    db.close();
  });
  it("the built-in development demo has the same dishes as eval/menu.json (the eval is only valid if it does)", async () => {
    const { all } = await import("@/modules/platform/db");
    const menu = JSON.parse(fs.readFileSync(path.join(root, "..", "eval", "menu.json"), "utf8"));
    const rows = all("SELECT * FROM menu_items WHERE restaurant_id = 1 ORDER BY sort");
    // Burmese names are compared without bracketed glosses, the way the AI matcher reads them
    // (eval/menu.json has "တွမ်ယမ်ကွန်း (ပုစွန်ချဉ်စပ်ဟင်းချို)", the built-in demo has "တွမ်ယမ်ကွန်း").
    const plain = (n: string) => n.replace(/\(.*?\)/g, "").trim();
    expect(rows.map((r: any) => [r.name_en, r.name_th, plain(r.name_my), r.price, r.available === 1, r.allergens_json === null ? null : JSON.parse(r.allergens_json), JSON.parse(r.tags_json)]))
      .toEqual(menu.items.map((i: any) => [i.name.en, i.name.th, plain(i.name.my), i.price, i.available, i.allergens, i.tags]));
  });
});
