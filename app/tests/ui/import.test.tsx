// @vitest-environment jsdom
// Menu import from a photo (FR-6): upload → review and edit every row → nothing live until confirmed. MI-1 … MI-5, UC-6.
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import OwnerShell from "@/modules/owner/OwnerShell";
import ImportPage from "@/modules/platform/ImportPage";
import { all, get, run } from "@/modules/platform/db";
import { IMAGE_BYTES, ownerLogin } from "../helpers";
import { apiCalls, setModel, withRealApi } from "./harness";
import { router } from "./harness";

withRealApi();
const MENU = JSON.stringify({ items: [
  { name: "Som Tam", price: "฿ 65", category: "Salads", description: "Papaya salad" },
  { name: "Mystery", price: "n/a" },
  { name: "Green Tea", price: 30, category: "Drinks" },
] });
const count = () => get("SELECT COUNT(*) AS n FROM menu_items").n as number;
async function openImport() {
  await ownerLogin();
  router.pathname = "/owner/import";
  render(<OwnerShell><ImportPage /></OwnerShell>);
  await screen.findByRole("heading", { name: "Import a menu" });
}
const choose = (file: File) => fireEvent.change(document.querySelector("input[type=file]") as HTMLInputElement, { target: { files: [file] } });
const png = () => new File([IMAGE_BYTES.png], "menu.png", { type: "image/png" });
const review = async () => { setModel(MENU); await openImport(); choose(png()); await screen.findByRole("heading", { name: "Check your menu" }); };
const rowOf = (name: string) => (screen.getAllByLabelText("Dish name") as HTMLInputElement[]).find((i) => i.value === name)!.closest(".sa-plate") as HTMLElement;

describe("step 1: choose a photo", () => {
  it("explains the limits and that nothing goes live until the owner confirms, and offers the by-hand way", async () => {
    await openImport();
    expect(screen.getByText(/up to 8 MB/)).toBeTruthy();
    expect(screen.getByText(/Nothing goes live until you confirm/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Or add dishes by hand" }).getAttribute("href")).toBe("/owner/menu");
  });
  it("only offers JPG, PNG and WebP", async () => {
    await openImport();
    expect(document.querySelector("input[type=file]")?.getAttribute("accept")).toBe("image/jpeg,image/png,image/webp");
  });
});

describe("MI-2 step 2: review", () => {
  it("shows what the AI read: rows to edit, a flag on a missing price, and the photo; the live menu is untouched", async () => {
    const before = count();
    await review();
    expect(screen.getByText("Found 3 dishes · 1 need a check")).toBeTruthy();
    expect(within(rowOf("Som Tam")).getByText("Looks right")).toBeTruthy();
    expect(within(rowOf("Som Tam")).getByLabelText("Price ฿")).toHaveProperty("value", "65");        // "฿ 65" was read as 65
    expect(within(rowOf("Mystery")).getByText("Check price")).toBeTruthy();
    expect(screen.getByAltText("Your uploaded menu").getAttribute("src")).toMatch(/^\/api\/uploads\//);
    expect(count()).toBe(before);                                                                       // MI-3: nothing live
    expect(get("SELECT status FROM imports ORDER BY id DESC LIMIT 1").status).toBe("review");
  });
  it("the photo went to the vision model", async () => {
    await review();
    expect(apiCalls.some((c) => c.url === "/api/owner/import")).toBe(true);
  });
  it("editing a price clears its flag; a name with a digit or under 3 letters is flagged", async () => {
    await review();
    const mystery = rowOf("Mystery");
    fireEvent.change(within(mystery).getByLabelText("Price ฿"), { target: { value: "45" } });
    expect(within(rowOf("Mystery")).getByText("Looks right")).toBeTruthy();
    fireEvent.change(within(rowOf("Mystery")).getByLabelText("Dish name"), { target: { value: "M2" } });
    expect(within(screen.getAllByLabelText("Dish name").map((i) => (i as HTMLInputElement).value === "M2" ? (i.closest(".sa-plate") as HTMLElement) : null).find(Boolean)!).getByText("Check name")).toBeTruthy();
  });
  it("a row can be removed, and a blank row added for a dish the AI missed", async () => {
    await review();
    fireEvent.click(within(rowOf("Green Tea")).getByLabelText("Remove dish"));
    expect(screen.getByText(/Found 2 dishes/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a missing dish" }));
    expect(screen.getByText(/Found 3 dishes/)).toBeTruthy();
    expect(screen.getAllByText("Check price").length).toBeGreaterThan(1);                                // the blank row has no price
  });
  it("'Suggest Thai & Burmese names' fills editable suggestions the owner must review", async () => {
    await review();
    setModel(JSON.stringify({ items: [{ th: "ส้มตำ", my: "သင်္ဘောသီးသုပ်" }, { th: "ลึกลับ", my: "လျှို့ဝှက်" }, { th: "ชาเขียว", my: "လက်ဖက်ရည်စိမ်း" }] }));
    fireEvent.click(screen.getByRole("button", { name: /Suggest Thai/ }));
    expect(await screen.findByText(/Suggestions added/)).toBeTruthy();
    expect((screen.getAllByLabelText("Thai (AI suggestion)")[0] as HTMLInputElement).value).toBe("ส้มตำ");
    expect(screen.getAllByLabelText("Burmese (AI suggestion)")).toHaveLength(3);
  });
  it("says that allergens are not read from photos", async () => {
    await review();
    expect(screen.getByText(/Allergens are not read from photos/)).toBeTruthy();
  });
});

describe("MI-4 step 3: confirm and publish", () => {
  it("adds the reviewed rows (edits included) as dishes with allergens 'not provided', and says how many", async () => {
    run("DELETE FROM menu_items WHERE name_en IN ('Som Tam','Mystery','Green Tea','Green Tea!')");
    const before = count();
    await review();
    fireEvent.change(within(rowOf("Green Tea")).getByLabelText("Dish name"), { target: { value: "Green Tea!" } });
    fireEvent.change(within(rowOf("Mystery")).getByLabelText("Price ฿"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm & publish/ }));
    expect(await screen.findByRole("heading", { name: "3 dishes added" })).toBeTruthy();
    expect(count()).toBe(before + 3);
    const added = all("SELECT name_en, price, allergens_json FROM menu_items WHERE name_en IN ('Som Tam','Mystery','Green Tea!') ORDER BY name_en");
    expect(added).toEqual([
      { name_en: "Green Tea!", price: 30, allergens_json: null },
      { name_en: "Mystery", price: 45, allergens_json: null },
      { name_en: "Som Tam", price: 65, allergens_json: null },
    ]);
    expect(get("SELECT status FROM imports ORDER BY id DESC LIMIT 1").status).toBe("confirmed");
    expect(screen.getByRole("link", { name: "Go to menu items" }).getAttribute("href")).toBe("/owner/menu");
    run("DELETE FROM menu_items WHERE name_en IN ('Som Tam','Mystery','Green Tea!')");
  });
  it("with every row removed, 'Confirm' is disabled", async () => {
    await review();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getAllByLabelText("Remove dish")[0]);
    expect((screen.getByRole("button", { name: /Confirm & publish/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("when the photo cannot be read", () => {
  it("a file that is not really an image is refused with the server's message", async () => {
    await openImport();
    choose(new File(["<html>not a menu</html>"], "menu.png", { type: "image/png" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/not a real/);
    expect(screen.queryByRole("heading", { name: "Check your menu" })).toBeNull();
  });
  it("when the AI is not running, says so and stays on step 1 so the owner can try again", async () => {
    await openImport();                                              // the model is off by default in these tests
    choose(png());
    expect((await screen.findByRole("alert")).textContent?.length).toBeGreaterThan(10);
    expect(screen.getByRole("heading", { name: "Import a menu" })).toBeTruthy();
  });
  it("when the AI finds no dishes, it suggests a clearer photo or adding by hand", async () => {
    setModel(JSON.stringify({ items: [] }));
    await openImport();
    choose(png());
    expect((await screen.findByRole("alert")).textContent).toMatch(/clearer, straight-on photo/);
  });
});
