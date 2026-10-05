import { describe, it, expect, beforeAll } from "vitest";
import { call, ownerLogin, staffLogin, signOut } from "./helpers";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { POST as callStaff } from "@/modules/diner/api/calls";
import { GET as dinerBill } from "@/modules/diner/api/bill";
import { POST as register } from "@/modules/platform/api/register";
import { POST as createItem } from "@/modules/owner/api/items";
import { POST as orderAction } from "@/modules/staff/api/orders";
import { POST as markCallDone } from "@/modules/staff/api/calls";
import { POST as payBill } from "@/modules/staff/api/bills";
import { GET as floor } from "@/modules/staff/api/floor";
import { GET as kitchen } from "@/modules/staff/api/kitchen";
import { all, get, run } from "@/modules/platform/db";
import { itemsOf } from "@/modules/platform/menu";

const slug = "golden-lotus";
const id = (en: string) => itemsOf(1).find((i) => i.name.en === en)!.id;
const order = (b: object) => call(placeOrder, { method: "POST", params: { slug }, body: b });
const act = (oid: number, action: string) => call(orderAction, { method: "POST", params: { id: String(oid) }, body: { action } });
const status = (oid: number) => get("SELECT status FROM orders WHERE id = ?", oid)!.status;
const asWaiter = () => staffLogin("1111");
const asChef = () => staffLogin("2222");

describe("PC-2 the diner sends picks to the staff", () => {
  it("creates an order in status 'picked' with the table, language and dish prices", async () => {
    const r = await order({ table: "9", lang: "my", items: [{ id: id("Vegetable Tofu Stir-fry"), qty: 1 }, { id: id("Thai Iced Tea"), qty: 2 }] });
    expect(r.status).toBe(200);
    const o = get("SELECT * FROM orders WHERE id = ?", r.data.id)!;
    expect([o.status, o.table_no, o.lang]).toEqual(["picked", "9", "my"]);
    expect(all("SELECT name, qty, price FROM order_items WHERE order_id = ? ORDER BY id", o.id)).toEqual([
      { name: "Vegetable Tofu Stir-fry", qty: 1, price: 90 }, { name: "Thai Iced Tea", qty: 2, price: 50 }]);
  });
  it("ignores sold-out and unknown dishes, and rejects an order with nothing available", async () => {
    const soldOut = id("Coconut Ice Cream");
    const r = await order({ table: "9", items: [{ id: soldOut, qty: 1 }, { id: 99999, qty: 1 }, { id: id("Papaya Salad"), qty: 1 }] });
    expect(r.status).toBe(200);
    expect(all("SELECT name FROM order_items WHERE order_id = ?", r.data.id).map((x: any) => x.name)).toEqual(["Papaya Salad"]);
    expect((await order({ table: "9", items: [{ id: soldOut, qty: 1 }] })).status).toBe(400);
    expect((await order({ table: "9", items: [] })).status).toBe(400);
    expect((await order({ table: "9" })).status).toBe(400);
    expect((await call(placeOrder, { method: "POST", params: { slug: "nope" }, body: { items: [{ id: 1, qty: 1 }] } })).status).toBe(404);
  });
  it("clamps quantities to 1-20, defaults the language, and limits the table label", async () => {
    const r = await order({ table: "T".repeat(30), lang: "xx", items: [{ id: id("Papaya Salad"), qty: 999 }, { id: id("Chicken Fried Rice"), qty: -3 }, { id: id("Thai Iced Tea"), qty: "x" }] });
    const o = get("SELECT * FROM orders WHERE id = ?", r.data.id)!;
    expect(o.table_no.length).toBe(10);
    expect(o.lang).toBe("en");
    expect(all("SELECT qty FROM order_items WHERE order_id = ? ORDER BY id", o.id).map((x: any) => x.qty)).toEqual([20, 1, 1]);
  });
  it("copies the allergens the diner mentioned in the chat into the order (the red banner)", async () => {
    run("INSERT INTO chat_sessions (id, restaurant_id, table_no) VALUES ('s-allergy', 1, '7')");
    run("INSERT INTO chat_messages (session_id, restaurant_id, role, text, allergens) VALUES ('s-allergy', 1, 'user', 'I am allergic to peanuts', '[\"peanut\"]')");
    run("INSERT INTO chat_messages (session_id, restaurant_id, role, text, allergens) VALUES ('s-allergy', 1, 'user', 'and shrimp', '[\"shellfish\"]')");
    const r = await order({ table: "7", sessionId: "s-allergy", items: [{ id: id("Papaya Salad"), qty: 1 }] });
    expect(get("SELECT allergy_note FROM orders WHERE id = ?", r.data.id)!.allergy_note).toBe("peanut, shellfish");
    await asWaiter();
    expect((await call(floor)).data.picks.find((p: any) => p.id === r.data.id).allergy).toBe("peanut, shellfish");
  });
  it("keeps the price at the time of ordering even if the owner changes it later", async () => {
    const r = await order({ table: "8", items: [{ id: id("Papaya Salad"), qty: 1 }] });
    run("UPDATE menu_items SET price = 999 WHERE name_en = 'Papaya Salad'");
    expect(get("SELECT price FROM order_items WHERE order_id = ?", r.data.id)!.price).toBe(70);
    run("UPDATE menu_items SET price = 70 WHERE name_en = 'Papaya Salad'");
  });
});

describe("PC-3 calling the staff", () => {
  const ask = (table: string, kind?: string) => call(callStaff, { method: "POST", params: { slug }, body: { table, kind } });
  it("creates one call per kind per table and reuses it when pressed again", async () => {
    const a = await ask("3", "bill"), b = await ask("3", "bill");
    expect(b.data.id).toBe(a.data.id);
    expect((await ask("3", "help")).data.id).not.toBe(a.data.id);
    expect((await ask("4", "bill")).data.id).not.toBe(a.data.id);
  });
  it("treats an unknown kind as 'help' and an unknown restaurant as 404", async () => {
    const r = await ask("5", "pizza");
    expect(get("SELECT kind FROM calls WHERE id = ?", r.data.id)!.kind).toBe("help");
    expect((await call(callStaff, { method: "POST", params: { slug: "nope" }, body: { table: "1" } })).status).toBe(404);
  });
  it("staff see open calls and can mark them done; then a new call is possible", async () => {
    const a = await ask("6", "help");
    await asWaiter();
    expect((await call(floor)).data.calls.map((c: any) => c.id)).toContain(a.data.id);
    expect((await call(markCallDone, { method: "POST", params: { id: String(a.data.id) } })).status).toBe(200);
    expect((await call(floor)).data.calls.map((c: any) => c.id)).not.toContain(a.data.id);
    signOut();
    expect((await ask("6", "help")).data.id).not.toBe(a.data.id);
  });
  it("one restaurant's staff cannot close another restaurant's call", async () => {
    const other = await call(register, { method: "POST", body: { email: "rival@example.com", password: "rival-pass-1", restaurantName: "Rival" } });
    const rivalId = get("SELECT id FROM restaurants WHERE slug = ?", other.data.slug)!.id;
    const c = run("INSERT INTO calls (restaurant_id, table_no, kind) VALUES (?, '1', 'help')", rivalId).id;
    await asWaiter();
    await call(markCallDone, { method: "POST", params: { id: String(c) } });
    expect(get("SELECT status FROM calls WHERE id = ?", c)!.status).toBe("open");
  });
});

describe("SF-5 / BR-4 the order life cycle: picked -> new -> cooking -> ready -> served", () => {
  let oid: number;
  beforeAll(async () => { oid = (await order({ table: "12", items: [{ id: id("Chicken Fried Rice"), qty: 2 }] })).data.id; });

  it("needs a staff login", async () => {
    signOut();
    expect((await act(oid, "take")).status).toBe(401);
  });
  it("only the waiter may take an order to the kitchen (chef gets 403)", async () => {
    await asChef();
    expect((await act(oid, "take")).status).toBe(403);
    expect(status(oid)).toBe("picked");
  });
  it("rejects skipping steps (409) and unknown actions (400) and unknown orders (404)", async () => {
    await asWaiter();
    expect((await act(oid, "ready")).status).toBe(403);
    await asChef();
    expect((await act(oid, "cooking")).status).toBe(409);
    expect((await act(oid, "ready")).status).toBe(409);
    expect((await act(oid, "served")).status).toBe(409);
    expect((await act(oid, "fly")).status).toBe(400);
    expect((await act(99999, "cooking")).status).toBe(404);
    expect(status(oid)).toBe("picked");
  });
  it("runs the whole flow with the right role at each step", async () => {
    await asWaiter();
    expect((await act(oid, "take")).status).toBe(200);
    expect(status(oid)).toBe("new");
    expect((await act(oid, "take")).status).toBe(409);               // cannot take twice
    await asChef();
    expect((await call(kitchen)).data.tickets.new.map((t: any) => t.id)).toContain(oid);
    expect((await act(oid, "cooking")).status).toBe(200);
    expect((await call(kitchen)).data.tickets.cooking.map((t: any) => t.id)).toContain(oid);
    await asWaiter();
    expect((await act(oid, "cooking")).status).toBe(403);            // the waiter cannot cook
    await asChef();
    expect((await act(oid, "ready")).status).toBe(200);
    expect((await call(kitchen)).data.tickets.ready.map((t: any) => t.id)).toContain(oid);
    await asWaiter();
    expect((await act(oid, "served")).status).toBe(200);
    expect(status(oid)).toBe("served");
    expect((await call(kitchen)).status).toBe(200);
  });
  it("lets the waiter dismiss a pick (picked -> cancelled) but nothing already in the kitchen", async () => {
    const a = (await order({ table: "13", items: [{ id: id("Papaya Salad"), qty: 1 }] })).data.id;
    await asWaiter();
    expect((await act(a, "later")).status).toBe(200);
    expect(status(a)).toBe("cancelled");
    const b = (await order({ table: "13", items: [{ id: id("Papaya Salad"), qty: 1 }] })).data.id;
    await act(b, "take");
    expect((await act(b, "later")).status).toBe(409);
  });
  it("the chef may also mark an order served", async () => {
    const o = (await order({ table: "14", items: [{ id: id("Papaya Salad"), qty: 1 }] })).data.id;
    await asWaiter(); await act(o, "take");
    await asChef(); await act(o, "cooking"); await act(o, "ready");
    expect((await act(o, "served")).status).toBe(200);
  });
  it("staff cannot touch another restaurant's order (404)", async () => {
    await ownerLogin("rival@example.com", "rival-pass-1");
    const item = await call(createItem, { method: "POST", body: { name: { en: "Rival dish" }, price: 10 } });
    signOut();
    const rival = get("SELECT slug FROM restaurants WHERE name = 'Rival'")!.slug;
    const o = await call(placeOrder, { method: "POST", params: { slug: rival }, body: { table: "1", items: [{ id: item.data.id, qty: 1 }] } });
    await asWaiter();
    expect((await act(o.data.id, "take")).status).toBe(404);
    expect(status(o.data.id)).toBe("picked");
  });
});

describe("table bills", () => {
  // the phone's random receipt code, sent with its picks and again when it asks for the bill
  const RC = "phone-one-0123456789abcdef";
  const bill = async (t: string, r = RC) => (await call(dinerBill, { params: { slug }, url: `http://t/api/bill?t=${t}&r=${r}` })).data;
  it("counts only orders the staff have taken, merges identical lines, and lists picks as pending", async () => {
    const mk = async (items: object[]) => (await order({ table: "20", receipt: RC, items })).data.id as number;
    const a = await mk([{ id: id("Thai Iced Tea"), qty: 1 }]);
    const b = await mk([{ id: id("Thai Iced Tea"), qty: 2 }, { id: id("Papaya Salad"), qty: 1 }]);
    const pending = await mk([{ id: id("Chicken Fried Rice"), qty: 1 }]);
    await asWaiter();
    await act(a, "take"); await act(b, "take");
    const r = await bill("20");
    expect(r.lines).toEqual([{ name: "Thai Iced Tea", qty: 3, price: 50 }, { name: "Papaya Salad", qty: 1, price: 70 }]);
    expect(r.total).toBe(220);
    expect(r.pending).toEqual([{ name: "Chicken Fried Rice", qty: 1, price: 80 }]);
    expect(status(pending)).toBe("picked");
  });
  it("shows a table's bill only to a phone that sent picks from that table (no reading other tables by number)", async () => {
    const empty = { table: "20", lines: [], total: 0, pending: [], asked: false };
    expect(await bill("20", "someone-else-0123456789abcdef")).toEqual(empty);    // wrong code
    expect(await bill("20", "")).toEqual(empty);                                  // no code
    expect(await bill("20", "short")).toEqual(empty);                             // malformed code
    expect((await bill("21")).total).toBe(0);                                     // right code, but it never ordered at table 21
    expect((await call(dinerBill, { params: { slug }, url: "http://t/api/bill?t=20" })).data).toEqual(empty);
    expect((await bill("20")).total).toBe(220);                                   // the real phone still sees it
  });
  it("does not show kitchen progress to the diner (order status for diners is out of scope)", async () => {
    expect(Object.keys(await bill("20")).sort()).toEqual(["asked", "lines", "pending", "table", "total"]);
  });
  it("needs a table number, and an empty table owes nothing", async () => {
    expect((await call(dinerBill, { params: { slug }, url: "http://t/api/bill" })).status).toBe(400);
    expect((await bill("never-used")).total).toBe(0);
  });
  it("only a waiter can mark the table paid; that clears the bill and the 'bill, please' call", async () => {
    await call(callStaff, { method: "POST", params: { slug }, body: { table: "20", kind: "bill" } });
    expect((await bill("20")).asked).toBe(true);
    await asChef();
    expect((await call(payBill, { method: "POST", params: { table: "20" } })).status).toBe(403);
    expect((await bill("20")).total).toBe(220);
    await asWaiter();
    expect((await call(payBill, { method: "POST", params: { table: "20" } })).data.orders).toBe(2);
    const after = await bill("20");
    expect(after.total).toBe(0);
    expect(after.asked).toBe(false);
    expect(after.pending.length).toBe(1);        // the untaken pick stays
  });
  it("needs a staff login", async () => {
    signOut();
    expect((await call(payBill, { method: "POST", params: { table: "20" } })).status).toBe(401);
  });
});
