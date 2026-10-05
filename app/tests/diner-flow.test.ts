// The diner journey end to end through the real route handlers and database (UC-1, UC-2, UC-3, UC-8, UC-9).
// tests/e2e/ runs the same story against a real running server.
import { describe, it, expect, afterEach, vi } from "vitest";
import { call, noModel, staffLogin, signOut } from "./helpers";
import { GET as publicMenu } from "@/modules/diner/api/menu";
import { POST as chat } from "@/modules/ai/api/chat";
import { POST as placeOrder } from "@/modules/diner/api/orders";
import { POST as orderAction } from "@/modules/staff/api/orders";
import { GET as floor } from "@/modules/staff/api/floor";
import { GET as kitchen } from "@/modules/staff/api/kitchen";

afterEach(() => { vi.unstubAllGlobals(); });
const slug = "golden-lotus";

describe("a diner opens the menu, chats, sends picks; the staff cook and serve them", () => {
  it("runs the whole story", async () => {
    noModel();
    signOut();
    // 1. scan the QR code: the menu opens without any login
    const menu = await call(publicMenu, { params: { slug }, url: "http://t/api/public/golden-lotus/menu?open=1" });
    expect(menu.status).toBe(200);
    expect(menu.data.restaurant.name).toBe("Golden Lotus Kitchen");
    expect(menu.data.categories.length).toBeGreaterThan(0);
    const dish = (n: string) => menu.data.items.find((i: any) => i.name.en === n);

    // 2. an allergy question gets a database answer that asks to confirm with the staff
    const sid = "journey-1";
    const say = (message: string) => call(chat, { method: "POST", params: { slug }, body: { message, sessionId: sid, table: "5", lang: "en" } });
    const allergy = await say("I'm allergic to peanuts");
    expect(allergy.data.reply).toMatch(/peanut/);
    expect(allergy.data.reply).toMatch(/confirm with the staff/);

    // 3. ordering by chat only fills the picks; nothing reaches the staff yet
    const pick = await say("2 x mango sticky rice please");
    expect(pick.data.action.type).toBe("add_to_picks");
    expect(pick.data.action.qty[dish("Mango Sticky Rice").id]).toBe(2);
    signOut();
    await staffLogin("1111");
    expect((await call(floor)).data.picks).toEqual([]);

    // 4. the diner sends the picks to the staff
    signOut();
    const sent = await call(placeOrder, { method: "POST", params: { slug }, body: { table: "5", lang: "en", sessionId: sid, items: [{ id: dish("Mango Sticky Rice").id, qty: 2 }] } });
    expect(sent.status).toBe(200);

    // 5. the waiter sees the pick with the allergy warning and takes the order
    await staffLogin("1111");
    const pickOnFloor = (await call(floor)).data.picks.find((p: any) => p.id === sent.data.id);
    expect(pickOnFloor).toMatchObject({ table: "5", status: "picked", allergy: "peanut" });
    expect(pickOnFloor.items).toEqual([{ name: "Mango Sticky Rice", qty: 2, price: 100 }]);
    const act = (id: number, action: string) => call(orderAction, { method: "POST", params: { id: String(id) }, body: { action } });
    expect((await act(sent.data.id, "take")).status).toBe(200);

    // 6. the chef cooks it, the waiter serves it
    await staffLogin("2222");
    expect((await call(kitchen)).data.tickets.new.map((t: any) => t.id)).toContain(sent.data.id);
    expect((await act(sent.data.id, "cooking")).status).toBe(200);
    expect((await act(sent.data.id, "ready")).status).toBe(200);
    await staffLogin("1111");
    expect((await act(sent.data.id, "served")).status).toBe(200);
    expect((await call(floor)).data.active.map((o: any) => o.id)).not.toContain(sent.data.id);
  });
});
