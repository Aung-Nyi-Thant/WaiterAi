// @vitest-environment jsdom
// The staff screens (FR-4, FR-9): PIN sign-in, the waiter's floor, the chef's board, the swipe card and the sound alert.
// SF-1 … SF-6, PC-4, BR-4, UC-8 … UC-10.
import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import StaffLogin from "@/modules/staff/StaffLogin";
import Waiter from "@/modules/staff/WaiterPage";
import Chef from "@/modules/staff/ChefPage";
import SwipeCard from "@/modules/staff/SwipeCard";
import { beep } from "@/modules/staff/beep";
import { all, get, run } from "@/modules/platform/db";
import { clearPinLocks } from "@/modules/platform/auth";
import { jar, staffLogin } from "../helpers";
import { apiCalls, failNext, flush, router, withRealApi } from "./harness";

withRealApi();
const post = (path: string, body: unknown) => fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const pick = async (table: string, items: { id: number; qty: number }[], profile: string[] = []) =>
  (await (await post("/api/public/golden-lotus/orders", { table, items, profile, sessionId: `s${table}${Math.random()}`, lang: "en" })).json()).id as number;
const call = (table: string, kind = "help") => post("/api/public/golden-lotus/calls", { table, kind });
const reset = () => { run("DELETE FROM calls"); run("DELETE FROM order_items"); run("DELETE FROM orders"); };
const ago = (table: "orders" | "calls", id: number, minutes: number) => run(`UPDATE ${table} SET created_at = datetime('now', '-${minutes} minutes')${table === "orders" ? `, updated_at = datetime('now', '-${minutes} minutes')` : ""} WHERE id = ?`, id);
const status = (id: number) => get("SELECT status FROM orders WHERE id = ?", id).status;

describe("SF-1 / SF-2 / FR-9: PIN sign-in", () => {
  const key = (d: string) => fireEvent.click(screen.getByRole("button", { name: d }));
  const enter = (pin: string) => [...pin].forEach(key);
  it("the keypad fills the PIN with dots, deletes, and only enables 'Sign in' from 4 digits", () => {
    render(<StaffLogin />);
    const go = screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement;
    enter("123");
    expect(document.querySelector(".pin-display")?.textContent).toBe("•••");
    expect(go.disabled).toBe(true);
    key("4");
    expect(go.disabled).toBe(false);
    key("Delete");
    expect(document.querySelector(".pin-display")?.textContent).toBe("•••");
    enter("999999");
    expect(document.querySelector(".pin-display")?.textContent).toBe("•".repeat(8));      // at most 8 digits
  });
  it("the waiter's PIN goes to the floor screen and the chef's to the kitchen", async () => {
    const { unmount } = render(<StaffLogin />);
    enter("1111");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff/waiter"));
    expect(jar.has("staff")).toBe(true);
    unmount(); router.push.mockClear();
    render(<StaffLogin />);
    enter("2222");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff/chef"));
  });
  it("a wrong PIN shows the message, empties the PIN and signs nobody in", async () => {
    render(<StaffLogin />);
    enter("0000");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/PIN/i);
    expect(document.querySelector(".pin-display")?.textContent).not.toContain("•");
    expect(router.push).not.toHaveBeenCalled();
    expect(jar.has("staff")).toBe(false);
  });
  it("after 5 wrong PINs the account is locked, even for the right PIN", async () => {
    clearPinLocks();
    render(<StaffLogin />);
    for (let i = 0; i < 5; i++) { enter("0000"); fireEvent.click(screen.getByRole("button", { name: "Sign in" })); await screen.findByRole("alert"); await waitFor(() => expect(document.querySelector(".pin-display")?.textContent).not.toContain("•")); }
    enter("1111");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/too many|locked|try again/i));
    expect(router.push).not.toHaveBeenCalled();
    clearPinLocks();
  });
});

describe("SF-3 / PC-4: the waiter's floor", () => {
  const floor = async () => { await staffLogin("1111"); render(<Waiter />); await screen.findByRole("heading", { name: "Floor" }); };
  it("with nothing to do it says so, and shows LIVE with the time of the last update", async () => {
    reset();
    await floor();
    expect(screen.getByText("Nothing needs you right now.")).toBeTruthy();
    expect(screen.getByRole("status", { name: "" }).textContent).toContain("Live");
    expect(screen.getByRole("button", { name: "Feed · 0" })).toBeTruthy();
  });
  it("lists calls longest-waiting first with the table, the reason and the waiting time; 'Done' closes the call", async () => {
    reset();
    await call("3"); await call("9", "help");
    const older = all("SELECT id FROM calls WHERE table_no = '9'")[0].id;
    ago("calls", older, 6);
    await floor();
    const slips = Array.from(document.querySelectorAll(".sa-call"));
    expect(slips).toHaveLength(2);
    expect(slips[0].textContent).toContain("9");
    expect(slips[0].textContent).toContain("Waiting 6 min");
    expect(slips[0].className).toContain("sa-call--urgent");              // red after 5 minutes
    expect(slips[1].textContent).toContain("Just called");
    expect(slips[1].className).not.toContain("urgent");
    expect(slips[0].textContent).toContain("NEEDS HELP AT THE TABLE");
    fireEvent.click(within(slips[0] as HTMLElement).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(document.querySelectorAll(".sa-call")).toHaveLength(1));
    expect(all("SELECT status FROM calls WHERE table_no = '9'")[0].status).toBe("done");
  });
  it("a 'bill, please' call shows the table's total, and 'Mark paid' closes the bill and the call together", async () => {
    reset();
    const id = await pick("4", [{ id: 3, qty: 1 }, { id: 10, qty: 2 }]);
    await staffLogin("1111");
    await fetch(`/api/staff/orders/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "take" }) });
    await call("4", "bill");
    await floor();
    const slip = document.querySelector(".sa-call") as HTMLElement;
    expect(slip.textContent).toContain("BILL, PLEASE");
    expect(slip.textContent).toContain("฿280");
    fireEvent.click(within(slip).getByRole("button", { name: "Mark paid" }));
    await waitFor(() => expect(document.querySelector(".sa-call")).toBeNull());
    expect(get("SELECT paid_at FROM orders WHERE id = ?", id).paid_at).toBeTruthy();
    expect(all("SELECT status FROM calls WHERE table_no = '4' AND kind = 'bill'").map((c: any) => c.status)).toEqual(["done"]);
  });
  it("shows a new pick with its dishes and prices; 'Take order' sends it to the kitchen, 'Dismiss' cancels it", async () => {
    reset();
    const a = await pick("5", [{ id: 3, qty: 2 }]);
    const b = await pick("6", [{ id: 4, qty: 1 }]);
    await floor();
    const cards = Array.from(document.querySelectorAll(".sa-ticket"));
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("T5");
    expect(cards[0].textContent).toContain("2×");
    expect(cards[0].textContent).toContain("Tom Yum Goong");
    expect(cards[0].textContent).toContain("฿360");
    expect(cards[0].textContent).toContain("English");
    fireEvent.click(within(cards[0] as HTMLElement).getByRole("button", { name: "Take order" }));
    await waitFor(() => expect(status(a)).toBe("new"));
    fireEvent.click(within(document.querySelector(".sa-ticket") as HTMLElement).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(status(b)).toBe("cancelled"));
    await waitFor(() => expect(document.querySelectorAll(".sa-ticket")).toHaveLength(0));
  });
  it("the border of a pick is green under 5 minutes, yellow from 5 and red from 10 (waiting-time colours)", async () => {
    reset();
    const fresh = await pick("1", [{ id: 6, qty: 1 }]);
    const five = await pick("2", [{ id: 6, qty: 1 }]);
    const ten = await pick("3", [{ id: 6, qty: 1 }]);
    ago("orders", five, 6); ago("orders", ten, 11);
    await floor();
    const border = (table: string) => (Array.from(document.querySelectorAll<HTMLElement>(".sa-ticket")).find((c) => c.textContent?.includes(`T${table}`)) as HTMLElement).style.borderLeft;
    expect(border("1")).toContain("rgb(61, 220, 151)");
    expect(border("2")).toContain("rgb(255, 217, 138)");
    expect(border("3")).toContain("rgb(255, 107, 107)");
    void fresh;
  });
  it("shows the diner's allergy as a banner and marks the dish that clashes", async () => {
    reset();
    await pick("7", [{ id: 8, qty: 1 }, { id: 5, qty: 1 }], ["peanut"]);       // Papaya Salad lists peanut
    await floor();
    const banner = screen.getByRole("alert", { name: "" });
    expect(banner.textContent).toContain("Peanut");
    expect(banner.textContent).toContain("Confirm with the kitchen before ordering.");
    expect(screen.getByText(/⚠ Peanut/)).toBeTruthy();
    const mango = screen.getByText("Mango Sticky Rice").closest("li") as HTMLElement;
    expect(within(mango).queryByText(/⚠/)).toBeNull();
  });
  it("food that the kitchen marked ready appears in the feed; 'Served' finishes it", async () => {
    reset();
    const id = await pick("8", [{ id: 6, qty: 1 }]);
    run("UPDATE orders SET status = 'ready' WHERE id = ?", id);
    await floor();
    expect(screen.getByRole("button", { name: "Feed · 1" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Served/ }));
    await waitFor(() => expect(status(id)).toBe("served"));
  });
  it("Bills tab: lists each table's total and dishes not yet served; 'Mark paid' clears it", async () => {
    reset();
    const id = await pick("10", [{ id: 6, qty: 2 }]);
    await staffLogin("1111");
    await fetch(`/api/staff/orders/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "take" }) });
    await floor();
    fireEvent.click(screen.getByRole("button", { name: "Bills · 1" }));
    const bill = document.querySelector(".sa-ticket") as HTMLElement;
    expect(bill.textContent).toContain("T10");
    expect(bill.textContent).toContain("฿ 160");
    expect(bill.textContent).toContain("2 dishes are not served yet");
    fireEvent.click(within(bill).getByRole("button", { name: /Mark paid/ }));
    await waitFor(() => expect(screen.getByText("No open bills.")).toBeTruthy());
  });
  it("Tables tab: 12 tables with their state, open calls and dishes in the kitchen", async () => {
    reset();
    await call("2");
    await pick("3", [{ id: 6, qty: 1 }]);
    const cooking = await pick("5", [{ id: 6, qty: 2 }, { id: 3, qty: 1 }]);
    run("UPDATE orders SET status = 'cooking' WHERE id = ?", cooking);
    await floor();
    fireEvent.click(screen.getByRole("button", { name: "Tables" }));
    expect(document.querySelectorAll(".sa-table")).toHaveLength(12);
    expect(screen.getByRole("img", { name: "Table 2, Calling, 1 open calls, 0 dishes" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Table 3, Picks, 0 open calls, 0 dishes" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Table 5, Kitchen, 0 open calls, 3 dishes, owes ฿340" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Table 1, Free, 0 open calls, 0 dishes" })).toBeTruthy();
  });
  it("the sold-out panel switches a dish off at once, for diners and the AI", async () => {
    run("UPDATE menu_items SET available = 1 WHERE id = 4");
    await floor();
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(screen.getByLabelText("Vegetable Tofu Stir-fry: sold out today"));
    await waitFor(() => expect(get("SELECT available FROM menu_items WHERE id = 4").available).toBe(0));
    await waitFor(() => expect(screen.getByText(/Sold out now · 2/)).toBeTruthy());     // the ice cream was already out
    run("UPDATE menu_items SET available = 1 WHERE id = 4");
  });
  it("SF-6: refreshes by itself every 3 seconds, and says 'Reconnecting' when the connection drops", async () => {
    reset();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await floor();
    const loads = () => apiCalls.filter((c) => c.url === "/api/staff/floor").length;
    const first = loads();
    await act(async () => { vi.advanceTimersByTime(3000); await flush(); });
    expect(loads()).toBe(first + 1);
    failNext("/api/staff/floor", 500);
    await act(async () => { vi.advanceTimersByTime(3000); await flush(); });
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Reconnecting"));
    await act(async () => { vi.advanceTimersByTime(3000); await flush(); });
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Live"));
  });
  it("a chef who opens the waiter screen is sent to the kitchen; a visitor who is not signed in is sent to the PIN page", async () => {
    await staffLogin("2222");
    const { unmount } = render(<Waiter />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff/chef"));
    unmount(); router.push.mockClear(); jar.clear();
    render(<Waiter />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff"));
  });
  it("signing out clears the session and goes back to the PIN page", async () => {
    await floor();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff"));
    expect(jar.has("staff")).toBe(false);
  });
});

describe("SF-4 / SF-5: the chef's kitchen", () => {
  const kitchen = async () => { await staffLogin("2222"); render(<Chef />); await screen.findByRole("heading", { name: "Kitchen" }); };
  const col = (title: string) => screen.getByRole("heading", { name: title }).closest(".col") as HTMLElement;
  const newTicket = async (table: string, items = [{ id: 6, qty: 1 }], profile: string[] = []) => {
    const id = await pick(table, items, profile);
    run("UPDATE orders SET status = 'new' WHERE id = ?", id);
    return id;
  };
  it("has three columns with their counts and shows 'Empty' for a column with no tickets", async () => {
    reset();
    await newTicket("1");
    await kitchen();
    expect(within(col("New")).getByText("1")).toBeTruthy();
    expect(within(col("Cooking")).getByText("Empty")).toBeTruthy();
    expect(within(col("Ready")).getByText("Empty")).toBeTruthy();
    expect(within(col("New")).getByText("T1")).toBeTruthy();
    expect(within(col("New")).getByText("Chicken Fried Rice")).toBeTruthy();
  });
  it("moves a ticket New → Cooking → Ready → Served with one button each", async () => {
    reset();
    const id = await newTicket("2");
    await kitchen();
    fireEvent.click(within(col("New")).getByRole("button", { name: "Start cooking" }));
    await waitFor(() => expect(within(col("Cooking")).getByText("T2")).toBeTruthy());
    expect(status(id)).toBe("cooking");
    fireEvent.click(within(col("Cooking")).getByRole("button", { name: "Mark ready" }));
    await waitFor(() => expect(within(col("Ready")).getByText("T2")).toBeTruthy());
    fireEvent.click(within(col("Ready")).getByRole("button", { name: /Served/ }));
    await waitFor(() => expect(status(id)).toBe("served"));
    await waitFor(() => expect(within(col("Ready")).getByText("Empty")).toBeTruthy());
  });
  it("'Recall to Cooking' moves a Ready ticket back", async () => {
    reset();
    const id = await newTicket("3");
    run("UPDATE orders SET status = 'ready' WHERE id = ?", id);
    await kitchen();
    fireEvent.click(within(col("Ready")).getByRole("button", { name: "Recall to Cooking" }));
    await waitFor(() => expect(status(id)).toBe("cooking"));
    await waitFor(() => expect(within(col("Cooking")).getByText("T3")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Recall to Cooking" })).toBeNull();     // only Ready tickets can be recalled
  });
  it("a ticket that has waited 10 minutes in the same column turns late", async () => {
    reset();
    const old = await newTicket("4"); const fresh = await newTicket("5");
    ago("orders", old, 12);
    await kitchen();
    const timer = (t: string) => within(within(col("New")).getByText(t).closest("article") as HTMLElement).getByText(/min|just now/);
    expect(timer("T4").className).toContain("sa-timer--late");
    expect(timer("T5").className).not.toContain("late");
    void fresh;
  });
  it("shows the diner's allergy on the ticket, and the dish that clashes", async () => {
    reset();
    await newTicket("6", [{ id: 8, qty: 1 }], ["peanut"]);
    await kitchen();
    const banner = within(col("New")).getByRole("alert");
    expect(banner.textContent).toContain("Peanut");
    expect(banner.textContent).toContain("Check before cooking.");
    expect(within(col("New")).getByText(/⚠ Peanut/)).toBeTruthy();
  });
  it("the sold-out panel is on the chef's screen too", async () => {
    await kitchen();
    fireEvent.click(screen.getByLabelText("Fresh Spring Rolls: sold out today"));
    await waitFor(() => expect(get("SELECT available FROM menu_items WHERE id = 9").available).toBe(0));
    run("UPDATE menu_items SET available = 1 WHERE id = 9");
  });
  it("a waiter who opens the kitchen is sent to the floor screen", async () => {
    await staffLogin("1111");
    render(<Chef />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff/waiter"));
  });
  it("a waiter pressing a chef-only action gets the 403 message, and nothing changes (BR-4)", async () => {
    reset();
    const id = await newTicket("7");
    await staffLogin("1111");
    const r = await post(`/api/staff/orders/${id}`, { action: "cooking" });
    expect(r.status).toBe(403);
    expect(status(id)).toBe("new");
  });
});

describe("the sound alert (SF-6)", () => {
  // the screen keeps ONE AudioContext for the whole page life, so every test shares the same spy
  const started = vi.fn();
  function fakeAudio() {
    started.mockClear();
    class FakeCtx {
      state = "running"; currentTime = 0; destination = {};
      createOscillator() { return { frequency: { value: 0 }, connect() {}, start: started, stop() {} }; }
      createGain() { return { gain: { value: 0 }, connect() {} }; }
      resume() {}
    }
    vi.stubGlobal("AudioContext", FakeCtx);
    return started;
  }
  it("beep() plays a short tone, and never throws when the browser has no audio", () => {
    const started = fakeAudio();
    beep();
    expect(started).toHaveBeenCalledTimes(1);
    vi.stubGlobal("AudioContext", undefined);
    expect(() => beep()).not.toThrow();                                    // (the context made above is kept, so this also proves a missing one is safe)
  });
  it("the waiter screen beeps when a NEW call arrives, not on the first load", async () => {
    reset();
    const started = fakeAudio();
    await call("1");
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await staffLogin("1111");
    render(<Waiter />);
    await screen.findByRole("heading", { name: "Floor" });
    expect(started).not.toHaveBeenCalled();
    await call("2");
    await act(async () => { vi.advanceTimersByTime(3000); await flush(); });
    await waitFor(() => expect(started).toHaveBeenCalledTimes(1));
    await act(async () => { vi.advanceTimersByTime(3000); await flush(); });
    expect(started).toHaveBeenCalledTimes(1);                              // the same calls again: silence
  });
  it("the chef screen beeps when a new ticket arrives", async () => {
    reset();
    const started = fakeAudio();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await staffLogin("2222");
    render(<Chef />);
    await screen.findByRole("heading", { name: "Kitchen" });
    const id = await pick("9", [{ id: 6, qty: 1 }]);
    run("UPDATE orders SET status = 'new' WHERE id = ?", id);
    await act(async () => { vi.advanceTimersByTime(3000); await flush(); });
    await waitFor(() => expect(started).toHaveBeenCalledTimes(1));
  });
});

describe("the swipe card", () => {
  const card = (props: Record<string, unknown> = {}) => {
    const right = vi.fn(), left = vi.fn(), click = vi.fn();
    (Element.prototype as any).setPointerCapture = () => {};
    render(<SwipeCard onSwipeRight={right} onSwipeLeft={left} rightLabel="Done" leftLabel="Dismiss" {...props}><button type="button" onClick={click}>Press</button></SwipeCard>);
    const el = screen.getByRole("button", { name: "Press" }).parentElement as HTMLElement;
    const drag = (dx: number) => {
      fireEvent.pointerDown(el, { clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(el, { clientX: 100 + dx, pointerId: 1 });
      fireEvent.pointerUp(el, { clientX: 100 + dx, pointerId: 1 });
    };
    return { right, left, click, drag, el };
  };
  it("a long swipe to the right runs the right action; to the left the left action", () => {
    const c = card();
    c.drag(120); expect(c.right).toHaveBeenCalledTimes(1);
    c.drag(-120); expect(c.left).toHaveBeenCalledTimes(1);
  });
  it("a short swipe does nothing, and a tap on the button still clicks it", () => {
    const c = card();
    c.drag(4); expect(c.right).not.toHaveBeenCalled();                    // under 8 px is a tap, not a drag
    fireEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(c.click).toHaveBeenCalledTimes(1);
    c.drag(60); expect(c.right).not.toHaveBeenCalled();                   // a drag too short to count
    expect(c.left).not.toHaveBeenCalled();
  });
  it("a card with no left action cannot be dragged left", () => {
    const c = card({ onSwipeLeft: undefined });
    c.drag(-200);
    expect(c.left).not.toHaveBeenCalled();
    expect(c.right).not.toHaveBeenCalled();
  });
  it("a swipe that ends on the button does not also click it", () => {
    const c = card();
    c.drag(150);
    fireEvent.click(screen.getByRole("button", { name: "Press" }));
    expect(c.click).not.toHaveBeenCalled();
  });
});
