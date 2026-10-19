// @vitest-environment jsdom
// The rest of the owner's screens: FAQ and rules, hours and specials, AI voice, staff accounts, QR codes and insights.
// FR-5 (staff PINs, FR-9), FR-7 (ST-1 … ST-4), FR-8 (QR-1, QR-2), FR-10 (IN-1 … IN-4).
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import OwnerShell from "@/modules/owner/OwnerShell";
import FaqPage from "@/modules/owner/FaqPage";
import HoursPage from "@/modules/owner/HoursPage";
import AiPage from "@/modules/owner/AiPage";
import StaffPage from "@/modules/staff/ManageStaffPage";
import QrPage from "@/modules/platform/QrPage";
import InsightsPage from "@/modules/platform/InsightsPage";
import { all, get, run } from "@/modules/platform/db";
import { ownerLogin } from "../helpers";
import { apiCalls, router, withRealApi } from "./harness";

withRealApi();
async function page(node: React.ReactElement, path: string, wait: string | RegExp) {
  await ownerLogin();
  router.pathname = path;
  render(<OwnerShell>{node}</OwnerShell>);
  await screen.findByRole("heading", { name: wait });
}
const restaurant = () => get("SELECT * FROM restaurants WHERE id = 1");
const fill = (label: string | RegExp, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
const diner = async (message: string, extra: Record<string, unknown> = {}) =>
  (await fetch("/api/public/golden-lotus/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, table: "3", sessionId: `s-${message}`, ...extra }) })).json();

describe("FAQ and rules (ST-3)", () => {
  it("adds a question and answer, which then appears; deleting removes it", async () => {
    run("DELETE FROM faqs");
    await page(<FaqPage />, "/owner/faq", "FAQ & rules");
    fill("Question", "Do you have a kids menu?");
    fill("Answer", "Yes, ask the staff.");
    fireEvent.click(screen.getByRole("button", { name: /Add FAQ/ }));
    expect(await screen.findByText("Do you have a kids menu?")).toBeTruthy();
    expect(screen.getByText("FAQ added.")).toBeTruthy();
    expect(all("SELECT q, a FROM faqs")).toEqual([{ q: "Do you have a kids menu?", a: "Yes, ask the staff." }]);
    fireEvent.click(screen.getByLabelText("Delete Do you have a kids menu?"));
    await waitFor(() => expect(screen.queryByText("Do you have a kids menu?")).toBeNull());
    expect(all("SELECT id FROM faqs")).toHaveLength(0);
  });
  it("'Add FAQ' from an unanswered question in the insights arrives with the question filled in (?q=)", async () => {
    router.search = "q=Do+you+deliver%3F";
    await page(<FaqPage />, "/owner/faq", "FAQ & rules");
    expect((screen.getByLabelText("Question") as HTMLInputElement).value).toBe("Do you deliver?");
  });
  it("saves the shop rules for the AI, which the settings keep", async () => {
    await page(<FaqPage />, "/owner/faq", "FAQ & rules");
    fill("Shop rules", "No alcohol after 10pm.");
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    expect(await screen.findByText("Rules saved.")).toBeTruthy();
    expect(JSON.parse(restaurant().persona_json).rules).toBe("No alcohol after 10pm.");
    expect(screen.getByText(/cannot be switched off/)).toBeTruthy();       // the safety rules are built in
  });
});

describe("opening hours and specials (ST-1, ST-2)", () => {
  it("saves new opening hours and closed days", async () => {
    await page(<HoursPage />, "/owner/hours", "Opening hours");
    fill("Opens", "09:30");
    fireEvent.click(screen.getByLabelText("Mon"));
    fireEvent.click(screen.getByRole("button", { name: "Save hours" }));
    expect(await screen.findByText(tr("hoursSaved"))).toBeTruthy();
    const h = JSON.parse(restaurant().hours_json);
    expect(h.open).toBe("09:30");
    expect(h.closedDays).toContain("Monday");
  });
  it("an invalid opening time is rejected with the server's message and nothing is saved", async () => {
    const before = restaurant().hours_json;
    await page(<HoursPage />, "/owner/hours", "Opening hours");
    fill("Closes", "");
    fireEvent.click(screen.getByRole("button", { name: "Save hours" }));
    expect((await screen.findByRole("alert")).textContent?.length).toBeGreaterThan(5);
    expect(restaurant().hours_json).toBe(before);
  });
  it("adds a special with dates, switches it off and deletes it", async () => {
    run("DELETE FROM specials");
    await page(<HoursPage />, "/owner/hours", "Opening hours");
    fill("Title", "Mango week");
    fill("Details", "Two for one");
    fireEvent.click(screen.getByRole("button", { name: /Add special/ }));
    expect(await screen.findByText("Mango week")).toBeTruthy();
    const sw = screen.getByRole("switch", { name: "Mango week active" });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sw);
    await waitFor(() => expect(screen.getByRole("switch", { name: "Mango week active" }).getAttribute("aria-checked")).toBe("false"));
    expect(get("SELECT active FROM specials WHERE title = 'Mango week'").active).toBe(0);
    fireEvent.click(screen.getByLabelText("Delete Mango week"));
    await waitFor(() => expect(screen.queryByText("Mango week")).toBeNull());
  });
});
import { tr as ownerTr } from "@/modules/owner/i18n";
const tr = (k: string) => ownerTr("en", k);

describe("AI voice (ST-4)", () => {
  it("saves the assistant's name, voice and greeting, and the owner can try it on the page", async () => {
    await page(<AiPage />, "/owner/ai", "AI waiter");
    fill("Assistant name", "Lotus");
    fireEvent.change(screen.getByLabelText("Waiter voice"), { target: { value: "female" } });
    fill("Greeting (optional)", "Welcome to Golden Lotus!");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect(JSON.parse(restaurant().persona_json)).toMatchObject({ name: "Lotus", gender: "female", greeting: "Welcome to Golden Lotus!" });
    fireEvent.change(screen.getByLabelText("Test question"), { target: { value: "What time do you close?" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Send" })[0]);
    expect(await screen.findByText(/22:00/)).toBeTruthy();                  // the female voice does not change the facts
    run("UPDATE restaurants SET persona_json = ? WHERE id = 1", JSON.stringify({ ...JSON.parse(restaurant().persona_json), name: "The Waiter", gender: "male", greeting: "" }));
  });
});

describe("AI voice: tone, upsell and a refused save", () => {
  it("saves the tone and the 'suggest drinks and desserts' switch", async () => {
    const original = JSON.parse(restaurant().persona_json);
    await page(<AiPage />, "/owner/ai", "AI waiter");
    fireEvent.change(screen.getByLabelText("Tone"), { target: { value: "formal" } });
    fireEvent.click(screen.getByLabelText("Suggest drinks and desserts"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect(JSON.parse(restaurant().persona_json)).toMatchObject({ tone: "formal", upsell: !original.upsell });          // the switch flipped
    run("UPDATE restaurants SET persona_json = ? WHERE id = 1", JSON.stringify(original));
  });
  it("shows the server's reason when the settings are refused, and keeps the old name", async () => {
    const before = restaurant().name;
    await page(<AiPage />, "/owner/ai", "AI waiter");
    fill("Restaurant name", "");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect((await screen.findByRole("alert")).textContent?.length).toBeGreaterThan(5);
    expect(restaurant().name).toBe(before);
  });
});

describe("staff accounts (FR-9, SF-1, SF-2)", () => {
  it("adds a waiter with a PIN; a duplicate or too short PIN is refused; the PIN field accepts digits only", async () => {
    run("DELETE FROM staff WHERE name = 'Mali'");
    await page(<StaffPage />, "/owner/staff", "Add a team member");
    fill("Name", "Mali");
    fill(/PIN \(4 to 8 digits\)/, "12ab34");
    expect((screen.getByLabelText(/PIN/) as HTMLInputElement).value).toBe("1234");
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));        // 1111 is the demo waiter's PIN: use a free one first
    await screen.findByText("Mali");
    expect(get("SELECT role FROM staff WHERE name = 'Mali'").role).toBe("waiter");
    fill("Name", "Dup");
    fill(/PIN \(4 to 8 digits\)/, "1234");
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    expect((await screen.findByRole("alert")).textContent?.length).toBeGreaterThan(5);
    expect(all("SELECT id FROM staff WHERE name = 'Dup'")).toHaveLength(0);
    fill("Name", "Tiny");
    fill(/PIN \(4 to 8 digits\)/, "12");
    fireEvent.submit(screen.getByRole("button", { name: /^Add$/ }).closest("form")!);
    await waitFor(() => expect(all("SELECT id FROM staff WHERE name = 'Tiny'")).toHaveLength(0));
  });
  it("changes a PIN and removes a team member", async () => {
    await page(<StaffPage />, "/owner/staff", "Add a team member");
    await screen.findByText("Mali");
    vi.stubGlobal("prompt", () => "98765");
    const row = screen.getByText("Mali").closest(".row") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Change PIN" }));
    expect(await screen.findByText("PIN changed.")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Remove Mali"));
    await waitFor(() => expect(screen.queryByText("Mali")).toBeNull());
  });
});

describe("QR codes (FR-8)", () => {
  it("shows a QR code and a download link for each of the 8 default tables, and warns that 'localhost' only works on this computer", async () => {
    await page(<QrPage />, "/owner/qr", "QR codes");
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(8);
    expect(imgs[2].getAttribute("alt")).toBe("QR code for table 3");
    await waitFor(() => expect(screen.getAllByRole("img")[2].getAttribute("src")).toBe(`/api/owner/qr?base=${encodeURIComponent(window.location.origin)}&table=3`));
    expect(screen.getByText(/only works on this computer/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Download restaurant code/ }).getAttribute("download")).toBe("golden-lotus-menu.svg");
  });
  it("the number of tables is kept between 1 and 60, and the address can be changed", async () => {
    await page(<QrPage />, "/owner/qr", "QR codes");
    fill("Number of tables", "500");
    expect(screen.getAllByRole("img")).toHaveLength(60);
    fill("Number of tables", "0");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    fill("Address diners will open", "http://192.168.1.20:3000");
    expect(screen.getAllByRole("img")[0].getAttribute("src")).toContain(encodeURIComponent("http://192.168.1.20:3000"));
    expect(screen.queryByText(/only works on this computer/)).toBeNull();
  });
  it("the QR image address is served by the real endpoint as an SVG for that table", async () => {
    await page(<QrPage />, "/owner/qr", "QR codes");
    const src = screen.getAllByRole("img")[0].getAttribute("src")!;
    const res = await fetch(src);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<svg");
  });
  it("'Print all codes' opens the print dialog", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    await page(<QrPage />, "/owner/qr", "QR codes");
    fireEvent.click(screen.getByRole("button", { name: /Print all codes/ }));
    expect(print).toHaveBeenCalled();
  });
});

describe("insights (FR-10)", () => {
  it("with no chats yet it says so; the 1 / 7 / 30 day buttons reload the numbers", async () => {
    run("DELETE FROM chat_messages"); run("DELETE FROM chat_sessions"); run("DELETE FROM orders");
    await page(<InsightsPage />, "/owner/insights", "What diners asked");
    expect(await screen.findByText(/No chats in this period yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "30 days" }));
    await waitFor(() => expect(apiCalls.filter((c) => c.url.startsWith("/api/owner/insights")).map((c) => c.url)).toEqual(["/api/owner/insights?days=7", "/api/owner/insights?days=1", "/api/owner/insights?days=30"]));
  });
  it("counts chats and questions, lists the topics, the languages and the questions the AI could not answer with 'Add FAQ'", async () => {
    await diner("What time do you close?");
    await diner("How much is the Massaman curry?");
    await diner("Do you do karaoke nights?");                              // the model is off: could not answer
    await diner("ผมแพ้ถั่วลิสง", { lang: "th" });
    await page(<InsightsPage />, "/owner/insights", "What diners asked");
    await screen.findByText("Most asked");
    expect(screen.getByText("CHATS").nextElementSibling?.textContent).toBe("4");
    expect(screen.getByText("COULD NOT ANSWER").nextElementSibling?.textContent).not.toBe("0");
    expect(screen.getByText(/^Thai/)).toBeTruthy();
    const unanswered = screen.getByText("Could not answer").parentElement as HTMLElement;
    expect(within(unanswered).getByText("Do you do karaoke nights?")).toBeTruthy();
    const add = within(unanswered).getAllByRole("link").find((a) => a.getAttribute("href")?.includes("/owner/faq"))!;
    expect(add.getAttribute("href")).toBe(`/owner/faq?q=${encodeURIComponent("Do you do karaoke nights?")}`);
  });
  it("shows which allergies diners have, how many dishes fit them, and the dishes with no allergen data", async () => {
    await fetch("/api/public/golden-lotus/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "What can I eat?", table: "4", sessionId: "profile-1", profile: ["peanut", "shellfish"] }) });
    await page(<InsightsPage />, "/owner/insights", "What diners asked");
    const box = (await screen.findByText("Allergies your diners have")).parentElement as HTMLElement;
    expect(within(box).getByText("Peanut")).toBeTruthy();
    expect(within(box).getAllByText(/dishes? fits?/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 dish has/)).toBeTruthy();                   // the Fresh Spring Rolls
  });
  it("lists the most ordered dishes", async () => {
    await fetch("/api/public/golden-lotus/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ table: "5", items: [{ id: 3, qty: 2 }], sessionId: "o1", lang: "en" }) });
    await page(<InsightsPage />, "/owner/insights", "What diners asked");
    const top = (await screen.findByText("Most ordered dishes")).parentElement as HTMLElement;
    await waitFor(() => expect(within(top).getByText("Tom Yum Goong")).toBeTruthy());
    expect(within(top).getByText("2×")).toBeTruthy();
  });
});
