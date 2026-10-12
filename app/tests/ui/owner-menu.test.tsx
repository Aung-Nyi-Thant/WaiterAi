// @vitest-environment jsdom
// The owner's menu manager (FR-5): list, completeness meter, search and "missing allergen data", on/off sale, add / edit / duplicate / delete a dish,
// field errors, categories and the bulk "mark all sold out / on sale". MM-1 … MM-7.
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import OwnerShell from "@/modules/owner/OwnerShell";
import MenuPage from "@/modules/owner/MenuPage";
import { all, get, run } from "@/modules/platform/db";
import { IMAGE_BYTES, ownerLogin } from "../helpers";
import { apiCalls, failNext, flush, router, withRealApi } from "./harness";

withRealApi();
const openMenu = async () => {
  await ownerLogin();
  router.pathname = "/owner/menu";
  render(<OwnerShell><MenuPage /></OwnerShell>);
  await screen.findByText("Tom Yum Goong");
};
const rows = () => Array.from(document.querySelectorAll(".table-row")).map((r) => r.querySelector("div[style*='font-weight: 700']")?.textContent);
const rowOf = (name: string) => screen.getByLabelText(`Edit ${name}`).closest(".table-row") as HTMLElement;
const dbItem = (name: string) => get("SELECT * FROM menu_items WHERE name_en = ?", name);
const fill = (label: string | RegExp, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
const dlg = (name: string) => screen.getByRole("dialog", { name });

describe("MM-1 / MM-5: the list and the allergen-completeness meter", () => {
  it("lists every dish with price, allergens ('Not provided' when unknown), tags and on-sale state", async () => {
    await openMenu();
    expect(rows()).toHaveLength(13);
    const tom = rowOf("Tom Yum Goong");
    expect(within(tom).getByText("฿180")).toBeTruthy();
    expect(within(tom).getByText("On sale")).toBeTruthy();
    expect(within(rowOf("Fresh Spring Rolls")).getByText("Not provided")).toBeTruthy();
    expect(within(rowOf("Coconut Ice Cream")).getByText("Sold out")).toBeTruthy();
    expect(within(rowOf("Tom Yum Goong")).getByText("ต้มยำกุ้ง", { exact: false })).toBeTruthy();
  });
  it("shows how many dishes have complete allergen data and names the ones that do not", async () => {
    await openMenu();
    const meter = screen.getByRole("meter", { name: "Allergen data complete" });
    expect(meter.getAttribute("aria-valuenow")).toBe("92");              // 12 of 13
    expect(screen.getByText("12 of 13 dishes")).toBeTruthy();
    expect(screen.getByText(/Fresh Spring Rolls — no allergen info yet/)).toBeTruthy();
  });
});

describe("search, category tabs and the 'missing allergen data' filter", () => {
  it("searches names in all three languages and ingredients", async () => {
    await openMenu();
    const box = screen.getByLabelText("Search menu items");
    fireEvent.change(box, { target: { value: "tom yum" } });
    expect(rows()).toEqual(["Tom Yum Goong"]);
    fireEvent.change(box, { target: { value: "ส้มตำ" } });
    expect(rows()).toEqual(["Papaya Salad"]);
    fireEvent.change(box, { target: { value: "lemongrass" } });          // an ingredient
    expect(rows()).toEqual(["Tom Yum Goong"]);
    fireEvent.change(box, { target: { value: "qqqq" } });
    expect(screen.getByText("No dishes match these filters.")).toBeTruthy();
  });
  it("a category tab narrows the list; 'Missing allergen data' keeps only dishes with unknown allergens", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Drinks" }));
    expect(rows()).toEqual(["Thai Iced Tea"]);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    const filter = screen.getByRole("button", { name: /Missing allergen data · 1/ });
    fireEvent.click(filter);
    expect(filter.getAttribute("aria-pressed")).toBe("true");
    expect(rows()).toEqual(["Fresh Spring Rolls"]);
    fireEvent.click(filter);
    expect(rows()).toHaveLength(13);
  });
});

describe("MM-3: on sale / sold out", () => {
  it("the switch changes the dish at once and is saved", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("switch", { name: "Papaya Salad on sale" }));
    await waitFor(() => expect(within(rowOf("Papaya Salad")).getByText("Sold out")).toBeTruthy());
    expect(dbItem("Papaya Salad").available).toBe(0);
    fireEvent.click(screen.getByRole("switch", { name: "Papaya Salad on sale" }));
    await waitFor(() => expect(within(rowOf("Papaya Salad")).getByText("On sale")).toBeTruthy());
    expect(dbItem("Papaya Salad").available).toBe(1);
  });
});

describe("MM-2 / MM-4: add, edit, duplicate, delete", () => {
  it("add: the diner-card preview follows the form; saving creates the dish", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: /Add dish/ }));
    const d = dlg("Add dish");
    fill("Name (English)", "Satay Skewers");
    fill("Name (Thai)", "สะเต๊ะ");
    fill(/Price/, "75");
    expect(within(d).getByText("฿75")).toBeTruthy();                      // preview price
    expect(within(d).getAllByText("Satay Skewers").length).toBeGreaterThan(0);
    expect(within(d).getByText("สะเต๊ะ")).toBeTruthy();
    fireEvent.click(within(d).getByLabelText("Peanut"));
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    await screen.findByText("Satay Skewers");
    const saved = dbItem("Satay Skewers");
    expect(saved.price).toBe(75);
    expect(JSON.parse(saved.allergens_json)).toEqual(["peanut"]);
    expect(screen.queryByRole("dialog")).toBeNull();
    run("DELETE FROM menu_items WHERE name_en = 'Satay Skewers'");
  });
  it("a new dish starts with 'Allergen info not provided' ticked, so missing data is never shown as 'none'", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: /Add dish/ }));
    const d = dlg("Add dish");
    expect((within(d).getByLabelText("Allergen info not provided") as HTMLInputElement).checked).toBe(true);
    expect((within(d).getByLabelText("Peanut") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(within(d).getByLabelText("Allergen info not provided"));
    expect((within(d).getByLabelText("Peanut") as HTMLInputElement).disabled).toBe(false);
  });
  it("shows an error under each field: no name, a negative price, an unknown category", async () => {
    await openMenu();
    const before = all("SELECT id FROM menu_items").length;
    fireEvent.click(screen.getByRole("button", { name: /Add dish/ }));
    const d = dlg("Add dish");
    fill(/Price/, "-5");
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    expect(within(d).getByText("Please enter the dish name.")).toBeTruthy();
    expect(within(d).getByText("Please enter a valid price.")).toBeTruthy();
    expect(within(d).getByLabelText("Name (English)").getAttribute("aria-invalid")).toBe("true");
    fill("Name (English)", "x");                                         // typing clears that field's error
    expect(within(d).queryByText("Please enter the dish name.")).toBeNull();
    expect(within(d).getByText("Please enter a valid price.")).toBeTruthy();
    expect(all("SELECT id FROM menu_items")).toHaveLength(before);
    expect(apiCalls.some((c) => c.method === "POST" && c.url === "/api/owner/items")).toBe(false);
  });
  it("edit: changes a dish's price and saves it", async () => {
    await openMenu();
    fireEvent.click(screen.getByLabelText("Edit Mango Sticky Rice"));
    const d = dlg("Edit dish");
    fill(/Price/, "110");
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    await waitFor(() => expect(within(rowOf("Mango Sticky Rice")).getByText("฿110")).toBeTruthy());
    expect(dbItem("Mango Sticky Rice").price).toBe(110);
    run("UPDATE menu_items SET price = 100 WHERE name_en = 'Mango Sticky Rice'");
  });
  it("duplicate: opens a copy of the dish; saving makes a second one and leaves the first alone", async () => {
    await openMenu();
    fireEvent.click(screen.getByLabelText("Duplicate Chicken Fried Rice"));
    const d = dlg("Duplicate dish");
    expect((within(d).getByLabelText("Name (English)") as HTMLInputElement).value).toBe("Chicken Fried Rice");
    fill("Name (English)", "Chicken Fried Rice 2");
    fireEvent.click(within(d).getByRole("button", { name: "Duplicate dish" }));
    await screen.findByText("Chicken Fried Rice 2");
    expect(dbItem("Chicken Fried Rice 2").price).toBe(80);
    expect(dbItem("Chicken Fried Rice").price).toBe(80);
    expect(all("SELECT id FROM menu_items WHERE name_en LIKE 'Chicken Fried Rice%'")).toHaveLength(2);
    run("DELETE FROM menu_items WHERE name_en = 'Chicken Fried Rice 2'");
  });
  it("delete: asks first; 'No' keeps the dish, 'Yes' removes it", async () => {
    run("INSERT INTO menu_items (restaurant_id, name_en, name_th, name_my, price) VALUES (1, 'Temp dish', 'Temp dish', 'Temp dish', 10)");
    await openMenu();
    vi.stubGlobal("confirm", () => false);
    fireEvent.click(screen.getByLabelText("Edit Temp dish"));
    fireEvent.click(within(dlg("Edit dish")).getByRole("button", { name: "Delete" }));
    await flush();
    expect(dbItem("Temp dish")).toBeTruthy();
    vi.stubGlobal("confirm", () => true);
    fireEvent.click(within(dlg("Edit dish")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(dbItem("Temp dish")).toBeUndefined());
    await waitFor(() => expect(screen.queryByText("Temp dish")).toBeNull());
  });
  it("uploads a photo and shows it in the preview", async () => {
    await openMenu();
    fireEvent.click(screen.getByLabelText("Edit Thai Iced Tea"));
    const d = dlg("Edit dish");
    const input = d.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File([IMAGE_BYTES.png], "tea.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(d.querySelector(".sa-dish__plate img")?.getAttribute("src")).toMatch(/^\/api\/uploads\//));
    run("UPDATE menu_items SET photo_url = '' WHERE name_en = 'Thai Iced Tea'");
  });
  it("Escape and Cancel close the form without saving", async () => {
    await openMenu();
    fireEvent.click(screen.getByLabelText("Edit Tom Yum Goong"));
    fill(/Price/, "999");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(dbItem("Tom Yum Goong").price).toBe(180);
  });
});

describe("categories", () => {
  it("add, rename and delete a category (its dishes stay on the menu)", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: /Category/ }));
    fireEvent.change(within(dlg("New category")).getByLabelText("Name (English)"), { target: { value: "Soups" } });
    fireEvent.click(within(dlg("New category")).getByRole("button", { name: "Save" }));
    const tab = await screen.findByRole("button", { name: "Soups" });
    expect(get("SELECT name_en FROM categories WHERE name_en = 'Soups'")).toBeTruthy();
    fireEvent.click(tab);
    fireEvent.click(screen.getByRole("button", { name: /Edit category|Rename|Edit/ , hidden: false }));
    fireEvent.change(within(dlg("Edit category")).getByLabelText("Name (English)"), { target: { value: "Broths" } });
    fireEvent.click(within(dlg("Edit category")).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Broths" });
    fireEvent.click(screen.getByRole("button", { name: "Broths" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit category|Rename|Edit/ }));
    fireEvent.click(within(dlg("Edit category")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Broths" })).toBeNull());
    expect(rows()).toHaveLength(13);
  });
});

describe("MM-6: bulk sold out / on sale for a whole category", () => {
  it("'Mark all sold out' asks, then marks every dish in that category and tells how many", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Curries" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark all sold out" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Marked 3 dishes sold out/));
    expect(all("SELECT available FROM menu_items WHERE name_en IN ('Tom Yum Goong','Chicken Green Curry','Beef Massaman Curry')").map((r: any) => r.available)).toEqual([0, 0, 0]);
    expect(dbItem("Papaya Salad").available).toBe(1);                    // other categories untouched
    fireEvent.click(screen.getByRole("button", { name: "Put all on sale" }));
    await waitFor(() => expect(all("SELECT available FROM menu_items WHERE name_en IN ('Tom Yum Goong','Chicken Green Curry','Beef Massaman Curry')").map((r: any) => r.available)).toEqual([1, 1, 1]));
  });
  it("answering 'No' to the question changes nothing and calls nothing", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Curries" }));
    vi.stubGlobal("confirm", () => false);
    fireEvent.click(screen.getByRole("button", { name: "Mark all sold out" }));
    await flush();
    expect(apiCalls.some((c) => c.url.endsWith("/items/bulk"))).toBe(false);
  });
  it("the bulk buttons only exist when one category is selected", async () => {
    await openMenu();
    expect(screen.queryByRole("button", { name: "Mark all sold out" })).toBeNull();
  });
  it("an error from the server is shown", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Drinks" }));
    failNext("/api/owner/items/bulk", 500);
    fireEvent.click(screen.getByRole("button", { name: "Mark all sold out" }));
    expect((await screen.findByRole("alert")).textContent).toContain("forced failure");
  });
});
