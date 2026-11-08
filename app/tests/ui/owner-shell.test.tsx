// @vitest-environment jsdom
// The owner's dashboard frame and the sign-in / register cards: OA-1 … OA-3, ST-5, UC-5 (screen part).
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AuthCard from "@/modules/platform/AuthCard";
import OwnerShell from "@/modules/owner/OwnerShell";
import { tr } from "@/modules/owner/i18n";
import { all } from "@/modules/platform/db";
import { jar, ownerLogin } from "../helpers";
import { apiCalls, flush, router, setModel, withRealApi } from "./harness";

withRealApi();
const T = (k: string) => tr("en", k);
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("OA-1: sign in", () => {
  it("is filled with the demo account, signs in and goes to the menu page", async () => {
    render(<AuthCard mode="login" />);
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("demo@shop.ai");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/owner/menu"));
    expect(jar.has("owner")).toBe(true);
  });
  it("a wrong password shows the server's message, stays on the page and sets no session", async () => {
    render(<AuthCard mode="login" />);
    type("Password", "not-the-password");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Wrong email or password.");
    expect(router.push).not.toHaveBeenCalled();
    expect(jar.has("owner")).toBe(false);
    expect((screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement).disabled).toBe(false);   // can try again
  });
  it("links to the register page", () => {
    render(<AuthCard mode="login" />);
    expect(screen.getByRole("link", { name: "Create a restaurant" }).getAttribute("href")).toBe("/register");
  });
});

describe("OA-2: register", () => {
  it("creates the restaurant and its owner, starts signed in and goes to the menu page", async () => {
    render(<AuthCard mode="register" />);
    type("Restaurant name", "Blue Elephant");
    type("City", "Chiang Rai");
    type("Email", "elephant@example.com");
    type("Password", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/owner/menu"));
    expect(all("SELECT name, city FROM restaurants WHERE name = 'Blue Elephant'")).toEqual([{ name: "Blue Elephant", city: "Chiang Rai" }]);
    expect(jar.has("owner")).toBe(true);
  });
  it("shows the server's reason for a short password, and for an email that already has an account", async () => {
    render(<AuthCard mode="register" />);
    type("Restaurant name", "Another");
    type("Email", "short@example.com");
    type("Password", "short");
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);     // the browser's own minLength check is not part of the page
    expect((await screen.findByRole("alert")).textContent).toBe("Password must be at least 8 characters.");
    type("Email", "demo@shop.ai");
    type("Password", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("This email already has an account."));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("the dashboard frame", () => {
  const shell = async (path = "/owner/menu") => {
    await ownerLogin();
    router.pathname = path;
    render(<OwnerShell><p>page body</p></OwnerShell>);
    await screen.findByText("page body");
  };
  it("sends a visitor who is not signed in to the sign-in page", async () => {
    render(<OwnerShell><p>page body</p></OwnerShell>);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("page body")).toBeNull();
  });
  it("shows the restaurant, the eight pages with the current one marked, and a link to the live menu", async () => {
    await shell("/owner/insights");
    expect(screen.getAllByText("Golden Lotus Kitchen").length).toBeGreaterThan(0);
    const nav = screen.getByRole("navigation", { name: T("brand") });
    const links = within(nav).getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/owner/"));
    expect(links.map((a) => a.textContent)).toEqual(["navMenu", "navImport", "navHours", "navFaq", "navAi", "navQr", "navInsights", "navStaff"].map(T));
    expect(links.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent)).toEqual([T("navInsights")]);
    expect(screen.getByRole("link", { name: new RegExp(T("viewLiveMenu")) }).getAttribute("href")).toBe("/r/golden-lotus?t=1");
  });
  it("shows how many AI chats this month have been used, as a meter", async () => {
    await shell();
    const meter = screen.getByRole("meter", { name: T("chatsThisMonth") });
    expect(Number(meter.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(0);
    expect(screen.getByText(new RegExp(`\\d+ ${T("of")} 300 ${T("chatsThisMonth")}`))).toBeTruthy();
  });
  it("signing out clears the session and goes to the sign-in page", async () => {
    await shell();
    fireEvent.click(screen.getByRole("button", { name: T("signOut") }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
    expect(jar.has("owner")).toBe(false);
    expect(apiCalls.some((c) => c.url === "/api/auth/logout")).toBe(true);
  });
  it("ST-5: 'Test the assistant' opens a test chat that sends preview questions, and Escape closes it", async () => {
    setModel("We do not serve pizza.");
    await shell();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("testAssistant")) }));
    const dlg = screen.getByRole("dialog", { name: T("testAssistant") });
    fireEvent.change(within(dlg).getByLabelText("Test question"), { target: { value: "What time do you close?" } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Send" }));
    expect(await within(dlg).findByText(/22:00/)).toBeTruthy();
    expect(apiCalls.find((c) => c.url.endsWith("/chat"))?.body).toMatchObject({ preview: true });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("test chats are not saved or counted", async () => {
    await shell();
    const before = all("SELECT COUNT(*) AS n FROM chat_messages")[0].n;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(T("testAssistant")) }));
    const dlg = screen.getByRole("dialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "What time do you close?" }));        // a sample question
    await within(dlg).findByText(/22:00/);
    await flush();
    expect(all("SELECT COUNT(*) AS n FROM chat_messages")[0].n).toBe(before);
  });
});
