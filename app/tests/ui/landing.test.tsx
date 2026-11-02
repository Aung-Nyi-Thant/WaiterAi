// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Landing from "@/modules/landing/Landing";
import MenuPreview, { type PreviewDish } from "@/modules/landing/MenuPreview";

afterEach(cleanup);
const dishes: PreviewDish[] = [
  { id: 42, name: { en: "Salmon Sushi", th: "ซูชิแซลม่อน", my: "ဆော်လမွန် ဆူရှီ" }, price: 96, photo_url: "/landing/salmon-sushi.jpg" },
  { id: 43, name: { en: "Miso Soup", th: "ซุปมิโซะ", my: "" }, price: 42, photo_url: "/landing/miso-soup.jpg" },
];

describe("the real landing-page menu preview", () => {
  it("switches all three languages using actual dish translations and preserves dish deep links", () => {
    render(<MenuPreview name="HaChi Kyu" slug="hachi-kyu" dishes={dishes} />);
    expect(screen.getByRole("link", { name: /Salmon Sushi/ }).getAttribute("href")).toBe("/r/hachi-kyu?t=5&dish=42");
    const languages = screen.getByRole("group", { name: "Menu preview language" });
    fireEvent.click(within(languages).getByRole("button", { name: "ไทย" }));
    expect(screen.getByText("ซูชิแซลม่อน")).toBeTruthy();
    expect(within(languages).getByRole("button", { name: "ไทย" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(languages).getByRole("button", { name: "မြန်မာ" }));
    expect(screen.getByText("ဆော်လမွန် ဆူရှီ")).toBeTruthy();
    expect(screen.getByText("Miso Soup")).toBeTruthy();
    expect(screen.getByText("Miso Soup").getAttribute("lang")).toBe("en");
    expect(screen.getByRole("link", { name: /ဆော်လမွန် ဆူရှီ/ }).getAttribute("href")).toBe("/r/hachi-kyu?t=5&dish=42");
  });
  it("keeps an honest empty state and a real full-menu link when dishes are unavailable", () => {
    render(<MenuPreview name="HaChi Kyu" slug="hachi-kyu" dishes={[]} />);
    expect(screen.getByText(/restaurant is preparing its menu/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View the full menu" }).getAttribute("href")).toBe("/r/hachi-kyu?t=5");
  });
  it("tags English fallback names correctly after the database helper fills a missing translation", () => {
    const dish = { ...dishes[1], name: { ...dishes[1].name, my: "Miso Soup" } };
    render(<MenuPreview name="HaChi Kyu" slug="hachi-kyu" dishes={[dish]} />);
    fireEvent.click(screen.getByRole("button", { name: "မြန်မာ" }));
    expect(screen.getByText("Miso Soup").getAttribute("lang")).toBe("en");
  });
  it.each([["hachi-kyu", true], ["neighborhood-kitchen", false]] as const)("labels seeded menus without mislabeling %s", (slug, sample) => {
    const shop = { id: 1, slug, name: "Restaurant", dishes: 0, menu: [] };
    render(<Landing shops={[shop]} primary={shop} preview={[]} />);
    expect(!!screen.queryByText("Explore the sample restaurant menus. No account needed.")).toBe(sample);
    expect(!!screen.queryByText(/Sample menu\. Diner picks/)).toBe(sample);
  });
  it("offers registration instead of an invented restaurant when the directory is empty", () => {
    render(<Landing shops={[]} preview={[]} />);
    expect(screen.getByRole("heading", { name: "Your menu starts here" })).toBeTruthy();
    expect(screen.getAllByRole("link").some(link => link.getAttribute("href")?.startsWith("/r/"))).toBe(false);
    expect(screen.getAllByRole("link", { name: "Create a restaurant" }).every(link => link.getAttribute("href") === "/register")).toBe(true);
  });
});
