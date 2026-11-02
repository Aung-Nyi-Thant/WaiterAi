// @vitest-environment jsdom
// The home page, the thin route pages that connect an address to a screen, and the icon set.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
import { get, run } from "@/modules/platform/db";
import { ownerLogin } from "../helpers";
import { router, withRealApi } from "./harness";

withRealApi();

describe("home page", () => {
  it("offers the real menu at table 5 and owner, staff and registration entry points", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Every table.In good hands.");
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/r/golden-lotus?t=5", "/login", "/staff", "/register"]));
    expect(screen.getAllByRole("link", { name: /Try the menu/ })[0].getAttribute("href")).toBe("/r/golden-lotus?t=5");
    expect(screen.queryByText("demo@shop.ai")).toBeNull();
    expect(screen.queryByText("demo1234")).toBeNull();
  });
});

describe("home page with more than one restaurant", () => {
  const addShop = (slug: string, name: string, dishes: number) => {
    const uid = run("INSERT INTO users (email, password_hash) VALUES (?, 'x')", `${slug}@example.com`).id;
    const rid = run("INSERT INTO restaurants (owner_id, slug, name, city) VALUES (?,?,?,?)", uid, slug, name, "").id;
    for (let i = 0; i < dishes; i++) run("INSERT INTO menu_items (restaurant_id, name_en, price) VALUES (?,?,?)", rid, `Dish ${i}`, 10);
    return { uid, rid };
  };
  const removeShop = ({ uid, rid }: { uid: number; rid: number }) => { run("DELETE FROM menu_items WHERE restaurant_id = ?", rid); run("DELETE FROM restaurants WHERE id = ?", rid); run("DELETE FROM users WHERE id = ?", uid); };
  it.each(["constructor", "toString", "__proto__"])("keeps an unexpected photo address %s as a string instead of an inherited object property", (photo) => {
    const hachi = addShop("hachi-kyu", "HaChi Kyu", 1);
    try {
      run("UPDATE menu_items SET photo_url = ? WHERE restaurant_id = ?", photo, hachi.rid);
      render(<Home />);
      const preview = screen.getByRole("heading", { name: "Find your next favorite" }).parentElement!;
      expect(preview.querySelector("img")?.getAttribute("src")).toBe(photo);
      expect(within(preview).getByRole("link", { name: "View the full menu" }).getAttribute("href")).toBe("/r/hachi-kyu?t=5");
    } finally { removeShop(hachi); }
  });
  it("previews available photo-backed dishes from the selected restaurant using local reference photos", () => {
    const hachi = addShop("hachi-kyu", "HaChi Kyu", 2);
    try {
      const photo = "https://img.wongnai.com/p/256x256/2020/03/25/3488a09942a04c009e3b8e42ac30b822.jpg";
      run("UPDATE menu_items SET photo_url = ? WHERE restaurant_id = ?", photo, hachi.rid);
      const item = get("SELECT id FROM menu_items WHERE restaurant_id = ? ORDER BY id LIMIT 1", hachi.rid)!;
      run("UPDATE menu_items SET available = 0 WHERE restaurant_id = ? AND id != ?", hachi.rid, item.id);
      render(<Home />);
      expect(screen.getByRole("link", { name: /Try the menu/ }).getAttribute("href")).toBe("/r/hachi-kyu?t=5");
      const preview = screen.getByRole("heading", { name: "Find your next favorite" }).parentElement!;
      const dishes = within(preview).getAllByRole("link").filter(link => link.getAttribute("href")?.includes("&dish="));
      expect(dishes).toHaveLength(1);
      expect(dishes[0].getAttribute("href")).toBe(`/r/hachi-kyu?t=5&dish=${item.id}`);
      expect(dishes[0].querySelector("img")?.getAttribute("src")).toBe("/landing/salmon-sushi.jpg");
    } finally { removeShop(hachi); }
  });
  it("gives each demo restaurant its own door with its name and dish count, so HaChi Kyu can be reached from the site", () => {
    const hachi = addShop("hachi-kyu", "HaChi Kyu", 3);
    try {
      render(<Home />);
      const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
      expect(hrefs).toEqual(expect.arrayContaining(["/r/golden-lotus?t=5", "/r/hachi-kyu?t=5"]));
      expect(screen.getByRole("link", { name: /Open the menu · 3 dishes/ }).getAttribute("href")).toBe("/r/hachi-kyu?t=5");
      expect(screen.getByRole("link", { name: /Open the menu · 13 dishes/ }).getAttribute("href")).toBe("/r/golden-lotus?t=5");
    } finally { removeShop(hachi); }
  });
  it("shows a strip of real dishes for each restaurant, each linking to that dish's sheet", () => {
    const hachi = addShop("hachi-kyu", "HaChi Kyu", 3);
    try {
      render(<Home />);
      const golden = screen.getByRole("region", { name: "Golden Lotus Kitchen" });
      const cards = within(golden).getAllByRole("link").filter((a) => /dish=\d+/.test(a.getAttribute("href") || ""));
      expect(cards).toHaveLength(12);                                                        // 13 dishes, one sold out
      const tom = within(golden).getByRole("link", { name: /Tom Yum Goong/ });
      expect(tom.getAttribute("href")).toMatch(/^\/r\/golden-lotus\?t=5&dish=\d+$/);
      expect(tom.textContent).toContain("ต้มยำกุ้ง");
      expect(tom.textContent).toContain("฿\u2009180");
      const small = screen.getByRole("region", { name: "HaChi Kyu" });
      expect(within(small).getAllByRole("link").filter((a) => /dish=/.test(a.getAttribute("href") || ""))).toHaveLength(3);
    } finally { removeShop(hachi); }
  });
  it("does not publish sample passwords, emails or staff PINs on the public landing page", () => {
    const hachi = addShop("hachi-kyu", "HaChi Kyu", 1);
    try {
      render(<Home />);
      for (const value of ["demo@shop.ai", "hachi@shop.ai", "demo1234", "1111", "2222"]) expect(screen.queryByText(value)).toBeNull();
    } finally { removeShop(hachi); }
  });
  it("says '1 dish' for one dish", () => {
    const hachi = addShop("hachi-kyu", "HaChi Kyu", 1);
    try { render(<Home />); expect(screen.getByRole("link", { name: "Open the menu · 1 dish" })).toBeTruthy(); } finally { removeShop(hachi); }
  });
  it("does not advertise another owner's restaurant: without demo restaurants it shows the first one only", () => {
    const demo = get("SELECT slug FROM restaurants WHERE id = 1")!.slug;
    run("UPDATE restaurants SET slug = 'my-own-place' WHERE id = 1");
    const other = addShop("someone-else", "Someone Else", 2);
    try {
      render(<Home />);
      const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
      expect(hrefs).toContain("/r/my-own-place?t=5");
      expect(hrefs).not.toContain("/r/someone-else?t=5");
      expect(screen.queryByText("demo@shop.ai")).toBeNull();                              // no demo logins are shown for a restaurant that is not a demo one
    } finally { removeShop(other); run("UPDATE restaurants SET slug = ? WHERE id = 1", demo); }
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
