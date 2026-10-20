// @vitest-environment jsdom
// The diner's phone screen (FR-1, FR-2, FR-3), driven like a person: real component, real API routes, real temporary database.
// DM-1 … DM-9, DM-11, PC-1 … PC-3, PC-5, AI-13 and the screen part of UC-1 … UC-4.
import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Diner from "@/modules/diner/Diner";
import { priceLabel, tr } from "@/modules/diner/i18n";
import { all, get, run } from "@/modules/platform/db";
import { staffLogin } from "../helpers";
import { apiCalls, failNext, flush, setModel, setPhoneLanguage, withRealApi } from "./harness";

withRealApi();
const B = (n: number) => priceLabel("en", n).replace(/\u2009/g, " ");   // "฿ 180": the page has a thin space after the sign, Testing Library reads it as a normal space
const T = (k: string, l: "en" | "th" | "my" = "en") => tr(l, k);
const open = async (url = "/?t=5", firstDish = "Tom Yum Goong") => {
  window.history.replaceState({}, "", url);
  const view = render(<Diner slug="golden-lotus" />);
  await waitFor(() => expect(dishNames()).toContain(firstDish));
  return view;
};
const cardOf = (name: string) => screen.getByRole("button", { name }).closest("article") as HTMLElement;
const addBtn = (name: string) => screen.getByRole("button", { name: `${T("add")} ${name}` });
const dishNames = () => Array.from(document.querySelectorAll(".sa-dish__name")).map((e) => e.textContent);
const sentOrders = () => apiCalls.filter((c) => c.method === "POST" && c.url.endsWith("/orders"));
const resetCalls = () => run("DELETE FROM calls");

describe("DM-1 / DM-2: the menu", () => {
  it("shows the restaurant, the table from the QR address, categories and every dish with its price", async () => {
    await open("/?t=5");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Golden Lotus Kitchen");
    expect(document.querySelector(".sa-sign__meta")?.textContent).toContain(`${T("table")} 5`);
    expect(dishNames()).toHaveLength(13);
    expect(within(cardOf("Tom Yum Goong")).getByText(B(180))).toBeTruthy();
    for (const tab of ["Starters", "Mains", "Curries", "Desserts", "Drinks"]) expect(screen.getByRole("button", { name: tab })).toBeTruthy();
  });
  it("marks a sold-out dish with a stamp and a disabled button, so it cannot be added", async () => {
    await open();
    const card = cardOf("Coconut Ice Cream");
    expect(within(card).getAllByText(T("soldOut")).length).toBeGreaterThan(0);
    expect((within(card).getByRole("button", { name: T("soldOut") }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: `${T("add")} Coconut Ice Cream` })).toBeNull();
  });
  it("shows up to three allergens with '+N' for the rest, and 'not provided' for a dish with no data (never 'none')", async () => {
    await open();
    const padThai = cardOf("Shrimp Pad Thai");
    expect(within(padThai).getByText("+1")).toBeTruthy();             // peanut, shellfish, egg, fish: three shown, one more
    const rolls = cardOf("Fresh Spring Rolls");
    expect(within(rolls).getByText(T("allergenUnknown"))).toBeTruthy();
    expect(within(rolls).queryByText(T("allergenNone"))).toBeNull();
  });
  it("shows the other two languages of a dish name under the name", async () => {
    await open();
    expect(cardOf("Tom Yum Goong").textContent).toContain("ต้มยำกุ้ง");
  });
  it("DM-8: shows today's special, and not one that has ended", async () => {
    run("INSERT INTO specials (restaurant_id, title, text, ends_on) VALUES (1, 'Old special', 'gone', '2000-01-01')");
    run("INSERT INTO specials (restaurant_id, title, text) VALUES (1, 'Mango week', 'Two for one')");
    await open();
    expect(screen.getByText("Mango week")).toBeTruthy();
    expect(screen.getByText("Two for one")).toBeTruthy();
    expect(screen.queryByText("Old special")).toBeNull();
    run("DELETE FROM specials");
  });
});

describe("DM-3 / DM-4: search and filters", () => {
  it("searches dish names in any language", async () => {
    await open();
    const box = screen.getByLabelText(T("search"));
    fireEvent.change(box, { target: { value: "tom" } });
    expect(dishNames()).toEqual(["Tom Yum Goong"]);
    fireEvent.change(box, { target: { value: "ส้มตำ" } });                 // Thai name of the Papaya Salad
    expect(dishNames()).toEqual(["Papaya Salad"]);
    fireEvent.change(box, { target: { value: "zzzz" } });
    expect(screen.getByText(T("none"))).toBeTruthy();
  });
  it("a category tab shows only that category, 'All' shows everything again", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Drinks" }));
    expect(dishNames()).toEqual(["Thai Iced Tea"]);
    fireEvent.click(screen.getByRole("button", { name: T("all") }));
    expect(dishNames()).toHaveLength(13);
  });
  it("the vegetarian, under ฿100, spicy and no-peanuts filters work, and the badge counts them", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("filters")) }));
    fireEvent.click(screen.getByRole("button", { name: T("vegetarian") }));
    expect(dishNames().sort()).toEqual(["Coconut Ice Cream", "Mango Sticky Rice", "Thai Iced Tea", "Vegetable Tofu Stir-fry"]);
    fireEvent.click(screen.getByRole("button", { name: T("vegetarian") }));
    fireEvent.click(screen.getByRole("button", { name: T("spicy") }));
    expect(dishNames().sort()).toEqual(["Chicken Green Curry", "Papaya Salad", "Steamed Fish with Lime", "Tom Yum Goong"]);
    fireEvent.click(screen.getByRole("button", { name: T("under100") }));
    expect(dishNames()).toEqual(["Papaya Salad"]);
    expect(screen.getByRole("button", { name: new RegExp(`${T("filters")} · 2`) })).toBeTruthy();
  });
  it("'No peanuts' hides dishes that list peanuts AND dishes with no allergen data", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("filters")) }));
    fireEvent.click(screen.getByRole("button", { name: T("noPeanuts") }));
    const names = dishNames();
    expect(names).not.toContain("Papaya Salad");
    expect(names).not.toContain("Shrimp Pad Thai");
    expect(names).not.toContain("Fresh Spring Rolls");                // no data: never assumed to be fine
    expect(names).toContain("Tom Yum Goong");
  });
});

describe("DM-5: language", () => {
  it("switching to Thai or Burmese changes the labels and dish names at once, and is remembered", async () => {
    const { unmount } = await open();
    fireEvent.click(screen.getByRole("button", { name: "TH" }));
    expect(screen.getByLabelText(T("search", "th"))).toBeTruthy();
    expect(dishNames()).toContain("ต้มยำกุ้ง");
    expect(document.documentElement.lang).toBe("th");
    fireEvent.click(screen.getByRole("button", { name: "MY" }));
    expect(screen.getByLabelText(T("search", "my"))).toBeTruthy();
    expect(document.documentElement.lang).toBe("my");
    expect(localStorage.getItem("lang")).toBe("my");
    unmount();
    await open("/?t=5", "တွမ်ယမ်ကွန်း");                              // a new visit starts in the saved language
    expect(screen.getByLabelText(T("search", "my"))).toBeTruthy();
  });
  it("starts in the language of the phone when nothing is saved", async () => {
    setPhoneLanguage("th-TH");
    await open("/?t=5", "ต้มยำกุ้ง");
    expect(screen.getByLabelText(T("search", "th"))).toBeTruthy();
  });
});

describe("DM-7: dish detail, quantity and adding", () => {
  it("shows ingredients and all allergens, and adds the chosen quantity", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Shrimp Pad Thai" }));
    const dlg = screen.getByRole("dialog", { name: "Shrimp Pad Thai" });
    expect(within(dlg).getByText(T("ingredients"))).toBeTruthy();
    const tags = dlg.querySelector(".sa-dish__tags") as HTMLElement;
    for (const a of ["peanut", "shellfish", "egg", "fish"]) expect(within(tags).getByText(a)).toBeTruthy();   // all four, no "+1" (the ingredient pills below have their own list)
    fireEvent.click(within(dlg).getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "Increase quantity" }));
    expect(within(dlg).getByText("3")).toBeTruthy();
    expect(within(dlg).getByRole("button", { name: /Add.*฿\s*360/ })).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: new RegExp(T("add")) }));
    expect(screen.queryByRole("dialog", { name: "Shrimp Pad Thai" })).toBeNull();
    expect(document.querySelector(".picks-bar__line")?.textContent).toBe("3× Shrimp Pad Thai");
  });
  it("the stepper stays between 1 and 20", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Tom Yum Goong" }));
    const dlg = screen.getByRole("dialog");
    const minus = within(dlg).getByRole("button", { name: "Decrease quantity" }) as HTMLButtonElement;
    const plus = within(dlg).getByRole("button", { name: "Increase quantity" }) as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
    for (let i = 0; i < 30; i++) if (!plus.disabled) fireEvent.click(plus);
    expect(within(dlg).getByText("20")).toBeTruthy();
    expect(plus.disabled).toBe(true);
    fireEvent.click(minus);
    expect(within(dlg).getByText("19")).toBeTruthy();
  });
  it("Escape and the close button close the detail", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Tom Yum Goong" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tom Yum Goong" }));
    fireEvent.click(screen.getByRole("button", { name: T("close") }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("a sold-out dish has no Add button in its detail", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Coconut Ice Cream" }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).queryByRole("button", { name: new RegExp(`^${T("add")}`) })).toBeNull();
  });
});

describe("PC-1: My picks", () => {
  it("adding the same dish twice makes quantity 2; the bar names it; picks survive leaving the page", async () => {
    const { unmount } = await open();
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(addBtn("Papaya Salad"));
    expect(document.querySelector(".picks-bar__line")?.textContent).toBe("2× Tom Yum Goong, Papaya Salad");
    expect(document.querySelector(".picks-bar .sa-label")?.textContent).toContain(`3 ${T("dishes")}`);
    unmount();
    await open();                                                     // kept in the browser
    expect(document.querySelector(".picks-bar__line")?.textContent).toBe("2× Tom Yum Goong, Papaya Salad");
  });
  it("change the quantity with − and +, and remove a dish with the bin", async () => {
    await open();
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("myPicks")) }));
    const dlg = screen.getByRole("dialog", { name: T("myPicks") });
    expect(within(dlg).getByText(B(360))).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: "-" }));
    expect(within(dlg).getByText(B(180))).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: "+" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "-" }));
    fireEvent.click(within(dlg).getByRole("button", { name: T("remove") }));   // quantity 1 shows the bin
    expect(within(dlg).getByText(T("picksEmpty"))).toBeTruthy();
    expect(document.querySelector(".picks-bar")).toBeNull();
  });
  it("a dish that has since sold out is dropped from the picks and the total", async () => {
    localStorage.setItem("picks:golden-lotus", JSON.stringify([{ id: 11, qty: 2 }, { id: 3, qty: 1 }]));   // 11 = Coconut Ice Cream (sold out)
    await open();
    expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Tom Yum Goong");
    expect(document.querySelector(".picks-bar .sa-label")?.textContent).toContain(`1 ${T("dish")}`);
  });
});

describe("PC-2 / PC-5: sending the order and the table bill", () => {
  it("sends the picks with the table, shows a confirmation with the total, clears the picks and remembers the table", async () => {
    run("DELETE FROM orders");
    await open("/?t=7");
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(addBtn("Thai Iced Tea"));
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));
    const dlg = await screen.findByRole("dialog", { name: T("sent") });
    expect(within(dlg).getByText(`${T("table")} 7`)).toBeTruthy();
    expect(within(dlg).getByText("2× Tom Yum Goong")).toBeTruthy();
    expect(within(dlg).getByText(B(410))).toBeTruthy();
    expect(sentOrders()).toHaveLength(1);
    expect(sentOrders()[0].body).toMatchObject({ table: "7", items: [{ id: 3, qty: 2 }, { id: 10, qty: 1 }] });
    expect(document.querySelector(".picks-bar")).toBeNull();
    // the phone saves its picks from an effect that runs just after the state changes: on a slow machine that is a moment later than the dialog
    await waitFor(() => expect(JSON.parse(localStorage.getItem("picks:golden-lotus") || "x")).toEqual([]));
    expect(all("SELECT table_no FROM orders").map((r: any) => r.table_no)).toEqual(["7"]);
    fireEvent.click(within(dlg).getByRole("button", { name: T("done") }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("the table number survives a reload without the QR parameter", async () => {
    const { unmount } = await open("/?t=9");
    expect(sessionStorage.getItem("table:golden-lotus")).toBe("9");
    unmount();
    await open("/");
    expect(document.querySelector(".sa-sign__meta")?.textContent).toContain(`${T("table")} 9`);
  });
  it("after sending and the waiter taking the order, the table's bill shows; asking for the bill calls the staff once and then says 'requested'", async () => {
    run("DELETE FROM orders"); resetCalls();
    const first = await open("/?t=11");
    fireEvent.click(addBtn("Papaya Salad"));
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));
    await screen.findByRole("dialog", { name: T("sent") });
    fireEvent.click(screen.getByRole("button", { name: T("done") }));
    expect(localStorage.getItem("receipt:golden-lotus:11")).toBeTruthy();         // the code the server issued to this phone
    const orderId = get("SELECT id FROM orders WHERE table_no = '11'").id;
    await staffLogin("1111");
    await fetch(`/api/staff/orders/${orderId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "take" }) });
    first.unmount();
    await open("/?t=11");                                                            // a fresh visit asks for the bill with the saved code
    const billBtn = await screen.findByRole("button", { name: new RegExp(T("tableBill")) });
    expect(billBtn.textContent).toContain(priceLabel("en", 70));
    fireEvent.click(billBtn);
    const bill = await screen.findByRole("dialog", { name: T("tableBill") });
    expect(within(bill).getByText("1× Papaya Salad")).toBeTruthy();
    expect(within(bill).getByText(T("billTotal"))).toBeTruthy();
    fireEvent.click(within(bill).getByRole("button", { name: new RegExp(T("askBill")) }));
    await waitFor(() => expect(apiCalls.filter((c) => c.url.endsWith("/calls") && c.body?.kind === "bill")).toHaveLength(1));
    await waitFor(() => expect(all("SELECT kind, status FROM calls")).toEqual([{ kind: "bill", status: "open" }]));
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(T("tableBill")) }));
    const again = await screen.findByRole("dialog", { name: T("tableBill") });
    const requested = within(again).getByRole("button", { name: new RegExp(T("billRequested")) }) as HTMLButtonElement;
    expect(requested.disabled).toBe(true);                                           // a second tap cannot send it again
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("a bill with picks the waiter has not taken yet lists them as 'waiting', outside the total", async () => {
    run("DELETE FROM orders"); resetCalls();
    const first = await open("/?t=12");
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));
    await screen.findByRole("dialog", { name: T("sent") });
    first.unmount();
    await open("/?t=12");
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(T("tableBill")) }));
    const bill = await screen.findByRole("dialog", { name: T("tableBill") });
    expect(within(bill).getByText(T("billEmpty"))).toBeTruthy();
    expect(within(bill).getByText(T("billPending"))).toBeTruthy();
    expect(within(bill).getByText("1× Tom Yum Goong")).toBeTruthy();
    expect(within(bill).queryByRole("button", { name: new RegExp(T("askBill")) })).toBeNull();     // nothing to pay yet
  });
  it("the bill is never requested without the receipt code of this phone", async () => {
    await open("/?t=3");
    expect(apiCalls.some((c) => c.url.includes("/bill"))).toBe(false);
  });
  it("a failed order shows the error and keeps the picks", async () => {
    await open("/?t=4");
    fireEvent.click(addBtn("Tom Yum Goong"));
    failNext("/api/public/golden-lotus/orders", 500);
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("forced failure"));
    expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Tom Yum Goong");
  });
});

describe("PC-3: call the staff", () => {
  it("the bell calls the staff for this table; a second press does not create a second open call", async () => {
    resetCalls();
    await open("/?t=6");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("callStaff")) }));
    await screen.findByText(T("staffCalled"));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("callStaff")) }));
    await waitFor(() => expect(apiCalls.filter((c) => c.url.endsWith("/calls"))).toHaveLength(2));
    await flush();
    expect(all("SELECT table_no, kind, status FROM calls")).toEqual([{ table_no: "6", kind: "help", status: "open" }]);
  });
});

describe("DM-11: allergy profile", () => {
  it("choosing peanut is saved on the phone, marks the dishes that list it, and adds a 'without my allergens' filter that also hides dishes with no data", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("setAllergies")) }));
    const dlg = screen.getByRole("dialog", { name: T("myAllergies") });
    fireEvent.click(within(dlg).getByRole("button", { name: /^peanut$/i }));
    expect(JSON.parse(localStorage.getItem("allergyProfile") || "[]")).toEqual(["peanut"]);
    fireEvent.click(within(dlg).getByRole("button", { name: T("done") }));
    const tag = within(cardOf("Papaya Salad")).getByText("peanut");                  // the allergen the diner chose is marked with a drawn alert icon, not a glyph
    expect(tag.className).toContain("sa-tag--alert");
    expect(tag.querySelector("svg")).toBeTruthy();
    expect(tag.textContent).not.toMatch(/[\u26A0\u{1F000}-\u{1FAFF}]/u);
    expect(within(cardOf("Fresh Spring Rolls")).getByText(new RegExp(T("allergenUnknown")))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("filters")) }));
    fireEvent.click(screen.getByRole("button", { name: T("mine") }));
    const names = dishNames();
    expect(names).toContain("Tom Yum Goong");
    for (const hidden of ["Papaya Salad", "Shrimp Pad Thai", "Beef Massaman Curry", "Fresh Spring Rolls"]) expect(names).not.toContain(hidden);
  });
  it("adding a dish that lists the diner's allergen is allowed but warned", async () => {
    localStorage.setItem("allergyProfile", JSON.stringify(["peanut"]));
    await open();
    fireEvent.click(addBtn("Papaya Salad"));
    const toast = screen.getByRole("status");                                       // a warning toast carries the alert icon and the allergen
    expect(toast.className).toContain("toast--warn");
    expect(toast.querySelector("svg")).toBeTruthy();
    expect(toast.textContent).toContain("peanut");
    expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Papaya Salad");
  });
  it("the profile is sent with the order so the staff see it", async () => {
    localStorage.setItem("allergyProfile", JSON.stringify(["peanut"]));
    await open("/?t=8");
    fireEvent.click(addBtn("Papaya Salad"));
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));
    await screen.findByRole("dialog", { name: T("sent") });
    expect(sentOrders().at(-1)?.body.profile).toEqual(["peanut"]);
  });
  it("'Clear' removes the profile and the filter", async () => {
    localStorage.setItem("allergyProfile", JSON.stringify(["peanut", "egg"]));
    await open();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("myAllergies")) }));
    fireEvent.click(screen.getByRole("button", { name: T("clearAll") }));
    expect(JSON.parse(localStorage.getItem("allergyProfile") || "x")).toEqual([]);
  });
});

describe("DM-6 / DM-9: fresh data and no connection", () => {
  it("refreshes the menu every 10 seconds, so a sold-out change shows within 20", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await open();
    const before = apiCalls.filter((c) => c.url.startsWith("/api/public/golden-lotus/menu")).length;
    await act(async () => { vi.advanceTimersByTime(10_000); await flush(); });
    expect(apiCalls.filter((c) => c.url.startsWith("/api/public/golden-lotus/menu")).length).toBe(before + 1);
    run("UPDATE menu_items SET available = 0 WHERE id = 6");
    await act(async () => { vi.advanceTimersByTime(10_000); await flush(); });
    await waitFor(() => expect(within(cardOf("Chicken Fried Rice")).getAllByText(T("soldOut")).length).toBeGreaterThan(0));
    run("UPDATE menu_items SET available = 1 WHERE id = 6");
  });
  it("shows the saved copy with an 'offline' notice when the server cannot be reached", async () => {
    const { unmount } = await open();
    unmount();
    failNext("/api/public/golden-lotus/menu", 500);
    window.history.replaceState({}, "", "/?t=1");
    render(<Diner slug="golden-lotus" />);
    expect(await screen.findByText("Tom Yum Goong")).toBeTruthy();
    expect(screen.getByText(T("offline"))).toBeTruthy();
  });
  it("with no saved copy and no server, says the menu was not found", async () => {
    failNext("/api/public/golden-lotus/menu", 500);
    render(<Diner slug="golden-lotus" />);
    expect(await screen.findByText("Menu not found")).toBeTruthy();
  });
  it("an unknown restaurant code says the menu was not found", async () => {
    render(<Diner slug="no-such-place" />);
    expect(await screen.findByText("Menu not found")).toBeTruthy();
  });
});

describe("FR-2 / AI-13: the AI waiter chat on the phone", () => {
  const ask = async (text: string) => {
    fireEvent.change(screen.getByLabelText(T("typeQ")), { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
  };
  it("opens in place with the greeting, answers a rule question from the data (no model needed), and shows dish cards with an Add button", async () => {
    await open("/?t=5");
    fireEvent.click(screen.getByRole("button", { name: T("askWaiter") }));
    expect(await screen.findByText(T("hello"))).toBeTruthy();
    await ask("How much is the Massaman curry?");
    expect(await screen.findByText(/฿\s160/)).toBeTruthy();
    const post = apiCalls.find((c) => c.url.endsWith("/chat"))!;
    expect(post.body).toMatchObject({ message: "How much is the Massaman curry?", table: "5" });
    expect(await screen.findByRole("button", { name: `${T("add")} Beef Massaman Curry` })).toBeTruthy();
  });
  it("an allergen question is answered from the database and never says 'safe'", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: T("askWaiter") }));
    await ask("I'm allergic to peanuts. Can I eat the Pad Thai?");
    expect(await screen.findByText(/peanut/i, { selector: ".sa-msg__text, .sa-msg p, div" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bis safe\b|safe to eat/i);
  });
  it("a question for the model shows the model's checked answer; the AI being off shows the unavailable notice and the menu stays usable", async () => {
    setModel("We do not make birthday cakes, but the Mango Sticky Rice is a lovely dessert.");
    await open();
    fireEvent.click(screen.getByRole("button", { name: T("askWaiter") }));
    await ask("do you do birthday cakes?");
    expect(await screen.findByText(/lovely dessert/)).toBeTruthy();
    setModel(new Error("down"));
    await ask("anything good for a hot day?");
    expect(await screen.findByText(/unavailable/i)).toBeTruthy();
    expect(dishNames()).toHaveLength(13);
  });
  it("'Helpful' sends feedback", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: T("askWaiter") }));
    await ask("What time do you close?");
    await screen.findByText(/22:00/);
    fireEvent.click(await screen.findByRole("button", { name: T("helpful") }));
    await waitFor(() => expect(apiCalls.some((c) => c.url.endsWith("/feedback") && c.body?.value === 1)).toBe(true));
  });
  it("saying 'add the Tom Yum' puts it in My picks", async () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })) as any;   // reduced motion: no animated cursor
    await open();
    fireEvent.click(screen.getByRole("button", { name: T("askWaiter") }));
    await ask("I'll have the Tom Yum Goong please");
    await waitFor(() => expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Tom Yum Goong"));
  });
  it("a quick-ask chip opens the chat and asks", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: T("heroChip2") }));        // "Vegan options?"
    await waitFor(() => expect(apiCalls.some((c) => c.url.endsWith("/chat"))).toBe(true), { timeout: 3000 });
    expect(await screen.findByText(/Vegan dishes/)).toBeTruthy();
  });
});
