// @vitest-environment jsdom
// The AI chat inside the diner screen, the parts diner.test.tsx does not reach: the "not helpful" reasons, the offer to call the staff after
// two misses, the follow-up chips, sending the picks from the chat, the visible cursor that presses Add, and keyboard use.
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Diner from "@/modules/diner/Diner";
import { priceLabel, tr } from "@/modules/diner/i18n";
import { all, run } from "@/modules/platform/db";
import { apiCalls, setModel, withRealApi } from "./harness";

withRealApi();
const T = (k: string) => tr("en", k);
const dishNames = () => Array.from(document.querySelectorAll(".sa-dish__name")).map((e) => e.textContent);
const open = async (url = "/?t=5") => {
  window.history.replaceState({}, "", url);
  window.scrollTo = vi.fn() as any;
  render(<Diner slug="golden-lotus" />);
  await waitFor(() => expect(dishNames()).toHaveLength(13));
};
const motion = (reduce: boolean) => { window.matchMedia = ((q: string) => ({ matches: reduce, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })) as any; };
const openChat = async () => { fireEvent.click(screen.getByRole("button", { name: T("heroBar") })); await screen.findByRole("log"); };
const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText(T("typeQ")), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
};
const chatCalls = () => apiCalls.filter((c) => c.url.endsWith("/chat"));

describe("rating an answer", () => {
  it("'not helpful' asks what was wrong, and the chosen reason is sent with the rating", async () => {
    motion(true);
    await open();
    await openChat();
    ask("What time do you close?");
    await screen.findByText(/22:00/);
    fireEvent.click(await screen.findByRole("button", { name: T("notHelpful") }));
    const group = screen.getByRole("group", { name: T("reasonPrompt") });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([T("reasonWrong"), T("reasonConfused"), T("reasonAllergen")]);
    fireEvent.click(within(group).getByRole("button", { name: T("reasonAllergen") }));
    await waitFor(() => expect(apiCalls.some((c) => c.url.endsWith("/feedback") && c.body?.value === -1 && c.body?.reason === "allergen")).toBe(true));
    expect(screen.queryByRole("group", { name: T("reasonPrompt") })).toBeNull();
    expect(screen.getByRole("button", { name: T("notHelpful") }).getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(all("SELECT feedback, feedback_reason, flagged FROM chat_messages WHERE feedback != 0")).toEqual([{ feedback: -1, feedback_reason: "allergen", flagged: 1 }]));   // stored on that answer and flagged for the owner
  });
  it("tapping 'not helpful' again hides the reasons without sending anything", async () => {
    await open();
    await openChat();
    ask("What time do you close?");
    await screen.findByText(/22:00/);
    const btn = await screen.findByRole("button", { name: T("notHelpful") });
    fireEvent.click(btn);
    expect(screen.getByRole("group", { name: T("reasonPrompt") })).toBeTruthy();
    fireEvent.click(btn);
    expect(screen.queryByRole("group", { name: T("reasonPrompt") })).toBeNull();
    expect(apiCalls.some((c) => c.url.endsWith("/feedback"))).toBe(false);
  });
  it("'helpful' is marked pressed and thanks the diner", async () => {
    await open();
    await openChat();
    ask("What time do you close?");
    await screen.findByText(/22:00/);
    fireEvent.click(await screen.findByRole("button", { name: T("helpful") }));
    await screen.findByText(T("thanks"));
    expect(screen.getByRole("button", { name: T("helpful") }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("when the AI cannot answer", () => {
  it("after two answers it could not give from the data, offers to call the staff, and the offer calls them", async () => {
    run("DELETE FROM calls");
    setModel(new Error("down"));
    await open("/?t=8");
    await openChat();
    ask("anything good for a hot day?");
    await screen.findByText(/unavailable/i);
    expect(screen.queryByText(T("escalate"))).toBeNull();                              // one miss is not enough
    ask("and for a cold day?");
    const offer = await screen.findByText(T("escalate"));
    fireEvent.click(within(offer.parentElement as HTMLElement).getByRole("button", { name: T("escalateCall") }));
    await waitFor(() => expect(all("SELECT table_no, kind FROM calls")).toEqual([{ table_no: "8", kind: "help" }]));
    await waitFor(() => expect(screen.queryByText(T("escalate"))).toBeNull());
  });
  it("an answered question resets the count, so a single later miss does not bring the offer back", async () => {
    setModel(new Error("down"));
    await open();
    await openChat();
    ask("anything good for a hot day?");
    await screen.findByText(/unavailable/i);
    ask("What time do you close?");
    await waitFor(() => expect(chatCalls()).toHaveLength(2));
    await screen.findAllByText(/22:00/);
    ask("another model question");
    await waitFor(() => expect(chatCalls()).toHaveLength(3));
    expect(screen.queryByText(T("escalate"))).toBeNull();
  });
  it("a chat request that fails shows the error line and keeps the chat usable", async () => {
    await open();
    await openChat();
    const { failNext } = await import("./harness");
    failNext("/api/public/golden-lotus/chat", 500);
    ask("What time do you close?");
    await screen.findByText(T("errorSend"));
    ask("What time do you close?");
    await screen.findByText(/22:00/);
  });
});

describe("using the chat", () => {
  it("the follow-up chips under an answer ask that question, and never repeat the one just asked", async () => {
    await open();
    await openChat();
    ask(T("chips1"));
    await waitFor(() => expect(chatCalls()).toHaveLength(1));
    const chips = await screen.findAllByRole("button", { name: new RegExp(`^(${T("chips2")}|${T("chips3")})$`) });
    expect(screen.queryByRole("button", { name: T("chips1") })).toBeNull();
    fireEvent.click(chips[0]);
    await waitFor(() => expect(chatCalls()).toHaveLength(2));
    expect(chatCalls()[1].body.message).toBe(T("chips2"));
  });
  it("sends nothing for an empty or blank message, and the send button is disabled until there is text", async () => {
    await open();
    await openChat();
    const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(T("typeQ")), { target: { value: "   " } });
    expect(send.disabled).toBe(true);
    fireEvent.submit(send.closest("form") as HTMLFormElement);
    await new Promise((r) => setTimeout(r, 50));
    expect(chatCalls()).toHaveLength(0);
    expect((screen.getByLabelText(T("typeQ")) as HTMLInputElement).maxLength).toBe(500);
  });
  it("the greeting is shown once, and the conversation is still there after the chat is closed and opened again", async () => {
    await open();
    await openChat();
    expect(screen.getAllByText(T("hello"))).toHaveLength(1);
    ask("What time do you close?");
    await screen.findByText(/22:00/);
    fireEvent.click(screen.getByRole("button", { name: T("close") }));
    await waitFor(() => expect(screen.queryByRole("log")).toBeNull());
    await openChat();
    expect(screen.getAllByText(T("hello"))).toHaveLength(1);
    expect(screen.getByText(/22:00/)).toBeTruthy();
  });
  it("Escape closes the chat", async () => {
    await open();
    await openChat();
    fireEvent.keyDown(document.querySelector(".ai-panel") as HTMLElement, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("log")).toBeNull());
  });
  it("a dish card in an answer adds that dish, with the usual toast", async () => {
    await open();
    await openChat();
    ask("How much is the Massaman curry?");
    const add = await screen.findAllByRole("button", { name: `${T("add")} Beef Massaman Curry` });
    fireEvent.click(add[add.length - 1]);
    await waitFor(() => expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Beef Massaman Curry"));
    expect((await screen.findByRole("status")).textContent).toContain(`${T("added")}: Beef Massaman Curry`);
  });
  it("with dishes in My picks, the picks bar is still there on the AI page, and its 'Send to staff' button sends the order", async () => {
    await open("/?t=3");
    fireEvent.click(screen.getByRole("button", { name: `${T("add")} Tom Yum Goong` }));
    fireEvent.click(screen.getByRole("button", { name: `${T("add")} Papaya Salad` }));
    await openChat();
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));                // the picks bar stays above the navigation while the AI page is open
    const dlg = await screen.findByRole("dialog", { name: T("sent") });
    expect(within(dlg).getByText(priceLabel("en", 250).replace(/ /g, " "))).toBeTruthy();
    expect(all("SELECT table_no FROM orders")).toEqual([{ table_no: "3" }]);
  });
});

describe("the AI pressing Add for the diner", () => {
  it("with motion allowed, a cursor scrolls to the dish's button, presses it, and goes away; the dish is then in My picks", async () => {
    motion(false);
    await open();
    await openChat();
    ask("I'll have the Tom Yum Goong please");
    await waitFor(() => expect(document.querySelector(".aiCursor")).toBeTruthy(), { timeout: 4000 });
    expect(document.querySelector(".aiCursorTrail")).toBeTruthy();
    await waitFor(() => expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Tom Yum Goong"), { timeout: 4000 });
    await waitFor(() => expect(document.querySelector(".aiCursor")).toBeNull(), { timeout: 4000 });
  });
  it("with reduced motion there is no cursor: the dish is simply added", async () => {
    motion(true);
    await open();
    await openChat();
    ask("I'll have the Tom Yum Goong please");
    await waitFor(() => expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Tom Yum Goong"));
    expect(document.querySelector(".aiCursor")).toBeNull();
  });
});

describe("the AI's answer to \"what's in it?\"", () => {
  it("shows the lead and the ingredients as pills, not one long sentence, with the dish card under them", async () => {
    motion(true);
    await open();
    await openChat();
    ask("What is in the Pad Thai?");
    const bubble = (await screen.findByRole("list", { name: T("ingredients") })).closest(".sa-msg") as HTMLElement;
    expect(within(bubble).getByText("Shrimp Pad Thai is made with:")).toBeTruthy();
    expect(within(bubble).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["rice noodles", "shrimp", "egg", "tamarind", "fish sauce", "crushed peanuts"]);
    expect(bubble.textContent).not.toContain("rice noodles, shrimp");                    // the comma sentence is not shown as well
    expect(within(bubble).getByRole("button", { name: `${T("add")} Shrimp Pad Thai` })).toBeTruthy();
  });
  it("marks an ingredient with the diner's own allergen in red with an icon and a note, and the dish's other allergens quietly", async () => {
    localStorage.setItem("allergyProfile", JSON.stringify(["peanut"]));
    motion(true);
    await open();
    await openChat();
    ask("What is in the Pad Thai?");
    const list = await screen.findByRole("list", { name: T("ingredients") });
    const items = within(list).getAllByRole("listitem");
    expect(items.filter((li) => li.className.includes("--mine")).map((li) => li.textContent)).toEqual(["crushed peanuts"]);
    expect(items.find((li) => li.className.includes("--mine"))?.querySelector("svg")).toBeTruthy();
    expect(items.filter((li) => li.className.includes("--allergen")).map((li) => li.textContent)).toEqual(["shrimp", "egg", "fish sauce"]);
    expect(within(list.closest(".sa-msg") as HTMLElement).getByText(T("ingYours"))).toBeTruthy();
  });
  it("other answers stay plain text with no pills", async () => {
    await open();
    await openChat();
    ask("What time do you close?");
    await screen.findByText(/22:00/);
    expect(screen.queryByRole("list", { name: T("ingredients") })).toBeNull();
  });
  it("an ingredient answer in Thai shows the Thai lead with the polite particle and the Thai ingredient names", async () => {
    await open();
    await openChat();
    ask("ส่วนผสมของส้มตำมีอะไรบ้าง");
    expect(await screen.findByText("ส่วนผสมของส้มตำมีดังนี้ครับ")).toBeTruthy();
    const items = within(await screen.findByRole("list", { name: T("ingredients") })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["มะละกอดิบ", "พริก", "มะนาว", "ถั่วลิสง", "กุ้งแห้ง"]);
    expect(items.filter((li) => li.className.includes("--allergen")).map((li) => li.textContent)).toEqual(["ถั่วลิสง", "กุ้งแห้ง"]);   // the dish lists peanut and shellfish
  });
});
