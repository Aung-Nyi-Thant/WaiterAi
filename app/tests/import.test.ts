import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { call, mockModel, ownerLogin, signOut, imageFile } from "./helpers";
import { POST as importPhoto } from "@/modules/platform/api/import";
import { POST as confirm } from "@/modules/platform/api/importConfirm";
import { POST as translate } from "@/modules/platform/api/importTranslate";
import { all, get } from "@/modules/platform/db";

afterEach(() => { vi.unstubAllGlobals(); });
beforeEach(async () => { await ownerLogin(); });
const photo = (type = "image/png") => { const f = new FormData(); f.append("file", type === "image/png" ? imageFile("png") : new File([new Uint8Array([1, 2, 3])], "menu.pdf", { type })); return f; };
const menuJson = JSON.stringify({ items: [
  { name: "Som Tam", price: "฿ 65", category: "Salads", description: "Papaya salad" },
  { name: "Mystery", price: "n/a" },
  { name: "", price: 10 },
  { name: "Green Tea", price: 30, category: "Drinks" },
] });
const dishes = () => get("SELECT COUNT(*) AS n FROM menu_items")!.n as number;

describe("MI-1 / MI-3 / UC-6 reading a menu photo does not touch the live menu", () => {
  it("returns the dishes for review and stores only an 'imports' row", async () => {
    const calls = mockModel(menuJson);
    const before = dishes();
    const r = await call(importPhoto, { method: "POST", form: photo() });
    expect(r.status).toBe(200);
    expect(r.data.items).toEqual([
      { name: "Som Tam", price: 65, category: "Salads", description: "Papaya salad" },
      { name: "Mystery", price: 0, category: "Mains", description: "" },       // unreadable price becomes 0 so it gets flagged; blank names are dropped
      { name: "Green Tea", price: 30, category: "Drinks", description: "" },
    ]);
    expect(dishes()).toBe(before);
    expect(get("SELECT status FROM imports WHERE id = ?", r.data.importId)!.status).toBe("review");
    expect(calls[0].body.messages[0].images).toHaveLength(1);              // the photo went to the vision model
    expect(calls[0].body.messages[0].content).toContain("Do not invent dishes or prices");
  });
  it("accepts only JPG/PNG/WebP and needs an owner login", async () => {
    mockModel(menuJson);
    expect((await call(importPhoto, { method: "POST", form: photo("application/pdf") })).status).toBe(400);
    expect((await call(importPhoto, { method: "POST", form: new FormData() })).status).toBe(400);
    signOut();
    expect((await call(importPhoto, { method: "POST", form: photo() })).status).toBe(401);
  });
  it("NFR-SEC3 rejects a file that is not really an image, before it is stored or sent to the model", async () => {
    const calls = mockModel(menuJson);
    const f = new FormData(); f.append("file", new File(["<html>not a menu photo</html>"], "menu.png", { type: "image/png" }));
    const r = await call(importPhoto, { method: "POST", form: f });
    expect(r.status).toBe(400);
    expect(r.data.error).toMatch(/not a real/);
    expect(calls.length).toBe(0);
  });
  it("reports a clear error when the AI cannot be reached or returns no JSON", async () => {
    mockModel(new Error("ECONNREFUSED"));
    expect((await call(importPhoto, { method: "POST", form: photo() })).status).toBe(502);
    mockModel("sorry, no menu");
    expect((await call(importPhoto, { method: "POST", form: photo() })).status).toBe(502);
  });
  it("caps the number of rows at 80 and trims long text", async () => {
    mockModel(JSON.stringify({ items: Array.from({ length: 100 }, (_, i) => ({ name: "D" + i + "x".repeat(200), price: 1 })) }));
    const r = await call(importPhoto, { method: "POST", form: photo() });
    expect(r.data.items).toHaveLength(80);
    expect(r.data.items[0].name.length).toBe(80);
  });
});

describe("MI-2 / MI-4 confirming publishes the reviewed rows, with unknown allergens", () => {
  it("adds the dishes and new categories, with allergens 'not provided'", async () => {
    mockModel(menuJson);
    const imp = (await call(importPhoto, { method: "POST", form: photo() })).data;
    const before = dishes();
    const r = await call(confirm, { method: "POST", body: { importId: imp.importId, items: [{ name: "Som Tam", price: 70, category: "Salads", name_th: "ส้มตำ" }, { name: "Iced Lemon", price: -5, category: "New Cat" }, { name: "  " }] } });
    expect(r.data).toEqual({ ok: true, added: 2 });
    expect(dishes()).toBe(before + 2);
    const d = get("SELECT * FROM menu_items WHERE name_en = 'Som Tam'")!;
    expect(d.allergens_json).toBeNull();
    expect([d.price, d.name_th]).toEqual([70, "ส้มตำ"]);
    expect(get("SELECT price FROM menu_items WHERE name_en = 'Iced Lemon'")!.price).toBe(0);     // never negative
    expect(get("SELECT 1 FROM categories WHERE name_en = 'New Cat'")).toBeTruthy();
    expect(all("SELECT COUNT(*) AS n FROM categories WHERE name_en = 'Salads'")[0].n).toBe(1);     // the existing category is reused, not duplicated
    expect(get("SELECT status FROM imports WHERE id = ?", imp.importId)!.status).toBe("confirmed");
  });
  it("rejects an empty list and needs an owner login", async () => {
    expect((await call(confirm, { method: "POST", body: { items: [] } })).status).toBe(400);
    expect((await call(confirm, { method: "POST", body: { items: [{ name: " " }] } })).status).toBe(400);
    signOut();
    expect((await call(confirm, { method: "POST", body: { items: [{ name: "X" }] } })).status).toBe(401);
  });
});

describe("MI-5 name suggestions", () => {
  it("returns Thai and Burmese suggestions in the same order", async () => {
    const calls = mockModel(JSON.stringify({ items: [{ en: "Som Tam", th: "ส้มตำ", my: "သင်္ဘောသီးသုပ်" }, { en: "Tea", th: "ชา", my: "လက်ဖက်ရည်" }] }));
    const r = await call(translate, { method: "POST", body: { names: ["Som Tam", "Tea"] } });
    expect(r.data.items).toEqual([{ en: "Som Tam", th: "ส้มตำ", my: "သင်္ဘောသီးသုပ်" }, { en: "Tea", th: "ชา", my: "လက်ဖက်ရည်" }]);
    expect(calls).toHaveLength(1);
  });
  it("needs names, a login, and reports AI errors", async () => {
    expect((await call(translate, { method: "POST", body: { names: [] } })).status).toBe(400);
    mockModel(new Error("down"));
    expect((await call(translate, { method: "POST", body: { names: ["Tea"] } })).status).toBe(502);
    signOut();
    expect((await call(translate, { method: "POST", body: { names: ["Tea"] } })).status).toBe(401);
  });
});
