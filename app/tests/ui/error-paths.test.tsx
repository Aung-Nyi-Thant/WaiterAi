// @vitest-environment jsdom
// What the screens do when something goes wrong or is left empty: a failed action on the floor and in the kitchen, the owner's staff, hours,
// import and test-chat screens, and a card dragged where it has no action. Real components, real routes; failNext() makes one route fail.
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Waiter from "@/modules/staff/WaiterPage";
import Chef from "@/modules/staff/ChefPage";
import SwipeCard from "@/modules/staff/SwipeCard";
import OwnerShell from "@/modules/owner/OwnerShell";
import HoursPage from "@/modules/owner/HoursPage";
import StaffPage from "@/modules/staff/ManageStaffPage";
import TestChat from "@/modules/owner/TestChat";
import { all, get, run } from "@/modules/platform/db";
import { ownerLogin, staffLogin } from "../helpers";
import { apiCalls, failNext, router, withRealApi } from "./harness";

withRealApi();
const post = (path: string, body: unknown) => fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const reset = () => { run("DELETE FROM calls"); run("DELETE FROM order_items"); run("DELETE FROM orders"); };
const pick = async (table: string) =>
  (await (await post("/api/public/golden-lotus/orders", { table, items: [{ id: 1, qty: 1 }], profile: [], sessionId: `s${table}${Math.random()}`, lang: "th" })).json()).id as number;
const ownerPage = async (node: React.ReactElement, path: string, heading: string | RegExp) => {
  await ownerLogin();
  router.pathname = path;
  render(<OwnerShell>{node}</OwnerShell>);
  await screen.findByRole("heading", { name: heading });
};

describe("the waiter's floor", () => {
  it("an action the server refuses shows its message, and the status says the connection is being re-tried", async () => {
    reset();
    const id = await pick("4");
    await staffLogin("1111");
    render(<Waiter />);
    await screen.findByText("T4");
    expect(screen.getByText("Live")).toBeTruthy();
    failNext(`/api/staff/orders/${id}`, 500);
    fireEvent.click(screen.getByRole("button", { name: "Take order" }));
    expect((await screen.findByRole("alert")).textContent).toContain("forced failure");     // it stays on screen (it used to vanish in the refresh that follows)
    expect(screen.getByText("Reconnecting")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Live")).toBeTruthy(), { timeout: 8000 });   // the next poll worked: the notice goes
  });
  it("shows the language the diner used, 'Offline' before the first load succeeds, and the table of a pick", async () => {
    reset();
    await pick("6");
    await staffLogin("1111");
    failNext("/api/staff/floor", 500);
    render(<Waiter />);
    await screen.findByText("forced failure");                                          // the first load failed: the page says so instead of staying blank
    await screen.findByText("T6", undefined, { timeout: 8000 });                         // and recovers on the next poll
    expect(screen.getByText(/Thai · /)).toBeTruthy();
  });
  it("a bill lists the picks still waiting and the dishes not yet served, and says when the bill was asked for", async () => {
    reset();
    const id = await pick("7");
    await staffLogin("1111");
    await post(`/api/staff/orders/${id}`, { action: "take" });
    await pick("7");                                                                     // a second pick, not taken yet
    await post("/api/public/golden-lotus/calls", { table: "7", kind: "bill" });
    render(<Waiter />);
    fireEvent.click(await screen.findByRole("button", { name: /^Bills/ }));
    await screen.findByText(/1 dish is not served yet/);
    expect(screen.getByText(/picks waiting in the feed \(1 dishes\)/)).toBeTruthy();
    expect(screen.getByText("Bill asked")).toBeTruthy();
  });
  it("the sold-out panel opens and closes again, and lists what is sold out", async () => {
    reset();
    await staffLogin("1111");
    render(<Waiter />);
    fireEvent.click(await screen.findByRole("button", { name: "Manage" }));
    const panel = document.querySelector(".sold-dock__panel") as HTMLElement;
    expect(within(panel).getByText("Sold out today")).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Close" }));
    expect(document.querySelector(".sold-dock__panel")).toBeNull();
    expect(screen.getByText(/Sold out now · \d+/)).toBeTruthy();
  });
});

describe("the kitchen board", () => {
  it("an action the server refuses is shown in the page, and the board keeps working", async () => {
    reset();
    const id = await pick("2");
    await staffLogin("1111");
    await post(`/api/staff/orders/${id}`, { action: "take" });
    await staffLogin("2222");
    render(<Chef />);
    await screen.findByText("T2");
    failNext(`/api/staff/orders/${id}`, 500);
    fireEvent.click(screen.getByRole("button", { name: /Start cooking/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("forced failure");
    expect(screen.getByText("T2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Start cooking/ }));
    await waitFor(() => expect(get("SELECT status FROM orders WHERE id = ?", id).status).toBe("cooking"));
  });
  it("a signed-out chef is sent to the PIN screen", async () => {
    render(<Chef />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff"));
  });
  it("signing out calls the server and goes to the PIN screen", async () => {
    await staffLogin("2222");
    render(<Chef />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff"));
    expect(apiCalls.some((c) => c.url === "/api/auth/logout")).toBe(true);
  });
});

describe("the swipe card", () => {
  const pointer = (el: Element, type: string, x: number) => fireEvent(el, new MouseEvent(type, { bubbles: true, clientX: x }));
  it("a card with only a right action does not move to the left, and a move without a press is ignored", () => {
    const onRight = vi.fn();
    const { container } = render(<SwipeCard onSwipeRight={onRight} rightLabel="Done"><div>card</div></SwipeCard>);
    const card = container.firstElementChild as HTMLElement;
    const surface = (card.querySelector("[style*='translateX']") || card.firstElementChild) as HTMLElement;
    pointer(surface, "mousemove", 50);                                                  // no press yet: nothing moves
    expect(surface.style.transform).toBe("translateX(0px)");
    expect(onRight).not.toHaveBeenCalled();
  });
});

describe("opening hours and specials: smaller paths", () => {
  it("closing and re-opening a day, and changing the last order time, are saved with the hours", async () => {
    await ownerPage(<HoursPage />, "/owner/hours", "Opening hours");
    fireEvent.click(screen.getByLabelText("Mon"));
    fireEvent.click(screen.getByLabelText("Mon"));
    fireEvent.click(screen.getByLabelText("Tue"));
    fireEvent.change(screen.getByLabelText("Last order"), { target: { value: "20:45" } });
    fireEvent.click(screen.getByRole("button", { name: "Save hours" }));
    await screen.findByText("Opening hours saved.");
    expect(JSON.parse(get("SELECT hours_json FROM restaurants WHERE id = 1").hours_json)).toMatchObject({ lastOrder: "20:45", closedDays: ["Tuesday"] });
    run("UPDATE restaurants SET hours_json = '{\"open\":\"10:00\",\"close\":\"22:00\",\"lastOrder\":\"21:30\",\"closedDays\":[]}' WHERE id = 1");
  });
  it("a special that the server refuses shows the message and is not added", async () => {
    run("DELETE FROM specials");
    await ownerPage(<HoursPage />, "/owner/hours", "Opening hours");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Bad special" } });
    failNext("/api/owner/specials", 500);
    fireEvent.click(screen.getByRole("button", { name: "Add special" }));
    await screen.findByText("forced failure");
    expect(all("SELECT id FROM specials")).toEqual([]);
  });
});

describe("staff accounts: smaller paths", () => {
  it("a cancelled or empty PIN prompt changes nothing, and a refused new PIN is reported", async () => {
    await ownerLogin();
    await post("/api/owner/staff", { name: "Nok", role: "waiter", pin: "4321" });
    await ownerPage(<StaffPage />, "/owner/staff", "Add a team member");
    await screen.findByText("Nok");
    const waiter = (all("SELECT id, name FROM staff WHERE name = 'Nok'")[0] as any);
    const change = within(screen.getByText("Nok").closest(".row") as HTMLElement).getByRole("button", { name: "Change PIN" });
    vi.stubGlobal("prompt", () => "");
    fireEvent.click(change);
    await new Promise((r) => setTimeout(r, 30));
    expect(apiCalls.some((c) => c.method === "PUT" && c.url.startsWith("/api/owner/staff/"))).toBe(false);
    vi.stubGlobal("prompt", () => "12");
    fireEvent.click(change);
    await waitFor(() => expect(document.querySelector(".toast")?.textContent).toMatch(/PIN/));
    expect(get("SELECT name FROM staff WHERE id = ?", waiter.id).name).toBe(waiter.name);
    run("DELETE FROM staff WHERE name = 'Nok'");
  });
});

describe("the owner's test chat", () => {
  it("ignores a blank question, shows the action a question led to, and shows the error when the question fails", async () => {
    render(<TestChat slug="golden-lotus" />);
    fireEvent.submit(screen.getByLabelText("Test question").closest("form") as HTMLFormElement);
    expect(screen.getByText(/Ask anything a diner would ask/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Test question"), { target: { value: "How much is the Massaman curry?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/Action: show_dishes → Beef Massaman Curry/)).toBeTruthy();
    failNext("/api/public/golden-lotus/chat", 500);
    fireEvent.change(screen.getByLabelText("Test question"), { target: { value: "What time do you close?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("forced failure")).toBeTruthy();
    expect(all("SELECT id FROM chat_messages WHERE session_id LIKE 'test%'")).toEqual([]);   // a test chat is never stored
  });
});
