// The M4 clickable prototype (prototype/): keeps it honest. It must cite only real SRS IDs, cover every Must requirement,
// use the real sample menu and the app's own labels, and open without a server (no scripts from the internet).
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { DICT } from "@/modules/diner/i18n";
import { ALLERGENS } from "@/modules/platform/constants";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const srs = read("docs/SRS_Shop_AI.md");
const proto = ["app.js", "owner.js", "data.js"].map((f) => read(`prototype/${f}`)).join("\n");

const srsRows = [...srs.matchAll(/^\| ([A-Z]{2,3}-\d+) \|.*\| (M|S|C|W) \|\s*$/gm)].map((m) => ({ id: m[1], priority: m[2] }));
// "DM-1 … DM-7" and "AI-1 … AI-13" are ranges
const cited = new Set<string>([...proto.matchAll(/\b([A-Z]{2,3}-\d+)\b/g)].map((m) => m[1]));
for (const m of proto.matchAll(/\b([A-Z]{2,3})-(\d+) … (?:[A-Z]{2,3}-)?(\d+)/g)) for (let n = Number(m[2]); n <= Number(m[3]); n++) cited.add(`${m[1]}-${n}`);

describe("the M4 clickable prototype", () => {
  it("found the SRS requirement rows", () => {
    expect(srsRows.length).toBeGreaterThan(60);
    expect(srsRows.filter((r) => r.priority === "M").length).toBeGreaterThan(50);
  });
  it("cites only requirement IDs that exist in the SRS", () => {
    const known = new Set(srsRows.map((r) => r.id));
    const unknown = [...cited].filter((id) => /^(DM|AI|PC|OA|MM|MI|ST|QR|SF|IN)-/.test(id) && !known.has(id));
    expect(unknown, "cited in the prototype but not in the SRS").toEqual([]);
  });
  it("shows every Must requirement of the SRS somewhere (the Golden Thread: nothing in the SRS without a screen)", () => {
    const missing = srsRows.filter((r) => r.priority === "M" && !cited.has(r.id)).map((r) => r.id);
    expect(missing, "Must requirements the prototype does not mention").toEqual([]);
  });
  it("names all ten course requirements FR-1 … FR-10 in its map", () => {
    const data = read("prototype/data.js");
    for (let n = 1; n <= 10; n++) expect(data, `FR-${n}`).toContain(`["FR-${n}",`);
  });
  it("uses the real sample menu (eval/menu.json): same dishes, prices, allergens and availability", () => {
    const menu = JSON.parse(read("eval/menu.json")).items as { id: string; price: number; allergens: string[] | null; available: boolean; name: Record<string, string> }[];
    const win: any = {};
    new Function("window", read("prototype/data.js"))(win);
    const seed = win.DISH_SEED as typeof menu;
    expect(seed.map((d) => d.id)).toEqual(menu.map((d) => d.id));
    for (const d of menu) {
      const s = seed.find((x) => x.id === d.id)!;
      expect([s.price, s.allergens, s.available, s.name.en, s.name.th]).toEqual([d.price, d.allergens, d.available, d.name.en, d.name.th]);
    }
    expect(seed.some((d) => d.allergens === null), "one dish must have no allergen data").toBe(true);
  });
  it("uses the app's own Thai / Burmese / English labels and the 14 allergens (regenerate with prototype/make-i18n.mjs)", () => {
    const win: any = {};
    new Function("window", read("prototype/i18n.js"))(win);
    expect(win.I18N.dict).toEqual(JSON.parse(JSON.stringify(DICT)));
    expect(win.I18N.allergens).toEqual([...ALLERGENS]);
  });
  it("opens from a folder with no server: every script and style it loads is a local file (only the font stylesheet is remote)", () => {
    const html = read("prototype/index.html");
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) { expect(s, s).not.toMatch(/^(https?:)?\/\//); expect(fs.existsSync(path.join(root, "prototype", s)), s).toBe(true); }
    const sheets = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]).filter((h) => !/^https:\/\/fonts\.googleapis\.com\//.test(h));
    for (const h of sheets) expect(fs.existsSync(path.join(root, "prototype", h)), h).toBe(true);
    expect(proto).not.toMatch(/\bfetch\(|XMLHttpRequest|localStorage/);       // no server calls, nothing saved
  });
});
