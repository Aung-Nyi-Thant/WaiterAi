// @vitest-environment jsdom
// The home page, the thin route pages that connect an address to a screen, and the icon set.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import OwnerHome from "@/app/owner/page";
import OwnerLayout from "@/app/owner/layout";
import DinerRoute from "@/app/r/[slug]/page";
import LoginRoute from "@/app/login/page";
import RegisterRoute from "@/app/register/page";
import StaffRoute from "@/app/staff/page";
import WaiterRoute from "@/app/staff/waiter/page";
import ChefRoute from "@/app/staff/chef/page";
import MenuRoute from "@/app/owner/menu/page";
import Icon from "@/modules/platform/Icon";
import { ownerLogin } from "../helpers";
import { router, withRealApi } from "./harness";

withRealApi();

describe("home page", () => {
  it("offers the three ways in, with the demo menu at table 5, and the demo logins", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Shop AI");
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/r/golden-lotus?t=5", "/login", "/staff", "/register"]));
    expect(screen.getByText("demo@shop.ai")).toBeTruthy();
    expect(screen.getByText("1111")).toBeTruthy();
    expect(screen.getByText("2222")).toBeTruthy();
  });
});

describe("route pages", () => {
  it("/owner goes to the menu page", () => {
    OwnerHome();
    expect(router.push).toHaveBeenCalledWith("/owner/menu");
  });
  it("/r/<code> shows that restaurant's menu", async () => {
    render(await DinerRoute({ params: Promise.resolve({ slug: "golden-lotus" }) }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Golden Lotus Kitchen"));
  });
  it("/login and /register show the matching card", () => {
    const { unmount } = render(<LoginRoute />);
    expect(screen.getByRole("heading", { name: "Owner sign in" })).toBeTruthy();
    unmount();
    render(<RegisterRoute />);
    expect(screen.getByRole("heading", { name: "Create your restaurant" })).toBeTruthy();
  });
  it("/staff shows the PIN page, /staff/waiter the floor and /staff/chef the kitchen (each page opens its own screen)", () => {
    for (const [Route, who] of [[StaffRoute, "Staff sign in"], [WaiterRoute, "Loading…"], [ChefRoute, "Loading…"]] as const) {
      const { unmount } = render(<Route />);
      expect(screen.getByText(who, { selector: "h1, div" })).toBeTruthy();
      unmount();
    }
  });
  it("every /owner page sits inside the dashboard frame (sign-in is checked once, in the layout)", async () => {
    await ownerLogin();
    router.pathname = "/owner/menu";
    render(<OwnerLayout><MenuRoute /></OwnerLayout>);
    expect(await screen.findByRole("navigation", { name: "Shop AI" })).toBeTruthy();
    expect(await screen.findByText("Tom Yum Goong")).toBeTruthy();
  });
});

describe("icons", () => {
  const files: string[] = [];
  (function walk(d: string) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx$/.test(e.name)) files.push(p); } })(path.resolve(__dirname, "../../src"));
  const used = [...new Set(files.flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/<Icon name="([a-zA-Z]+)"/g)].map((m) => m[1])))];
  it("finds the icons the screens use", () => { expect(used.length).toBeGreaterThan(15); });
  it("every icon name used on a screen has a drawing (a typo would show an empty square)", () => {
    const empty = used.filter((n) => { const { container, unmount } = render(<Icon name={n} />); const has = container.querySelector("svg")!.children.length > 0; unmount(); return !has; });
    expect(empty).toEqual([]);
  });
  it("is decorative (hidden from screen readers) and takes a size and a colour", () => {
    const { container } = render(<Icon name="check" size={32} color="red" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("stroke")).toBe("red");
  });
});
