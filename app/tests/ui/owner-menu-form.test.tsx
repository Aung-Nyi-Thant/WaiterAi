// @vitest-environment jsdom
// The owner's dish form beyond the basics (owner-menu.test.tsx): tags and allergens, the Burmese name, the card preview, a failed upload,
// a server error on save, and closing by tapping outside. FR-5 / MM-2 / MM-4.
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import OwnerShell from "@/modules/owner/OwnerShell";
import MenuPage from "@/modules/owner/MenuPage";
import { all, get, run } from "@/modules/platform/db";
import { ownerLogin } from "../helpers";
import { failNext, router, withRealApi } from "./harness";

withRealApi();
const openMenu = async () => {
  await ownerLogin();
  router.pathname = "/owner/menu";
  render(<OwnerShell><MenuPage /></OwnerShell>);
  await screen.findByText("Tom Yum Goong");
};
const dbItem = (name: string) => get("SELECT * FROM menu_items WHERE name_en = ?", name);
const fill = (label: string | RegExp, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
const newDish = async () => { await openMenu(); fireEvent.click(screen.getByRole("button", { name: /Add dish/ })); return screen.getByRole("dialog", { name: "Add dish" }); };

describe("the dish form", () => {
  it("the card preview is the diner's card: a photo area, the name in each language, two tags, the price and an add button", async () => {
    const d = await newDish();
    fill("Name (English)", "Satay Skewers");
    fill("Name (Thai)", "สะเต๊ะ");
    fill("Name (Burmese)", "ဆာတေး");
    fill(/Price/, "75");
    const card = d.querySelector(".sa-dish") as HTMLElement;
    expect(card.querySelector(".sa-dish__plate--empty svg")).toBeTruthy();             // no photo yet: the plate icon
    expect(within(card).getByText("Satay Skewers")).toBeTruthy();
    expect(within(card).getByText("สะเต๊ะ · ဆာတေး")).toBeTruthy();
    expect(within(card).getByText("฿75")).toBeTruthy();
    expect((within(card).getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled).toBe(true);   // a preview: it cannot be pressed
  });
  it("ticking tags and allergens adds them to the preview (two of each at most) and saves them, and unticking removes them", async () => {
    const d = await newDish();
    fill("Name (English)", "Test Tags Dish");
    fill(/Price/, "50");
    fireEvent.click(within(d).getByLabelText("Allergen info not provided"));
    for (const a of ["Peanut", "Egg", "Soy"]) fireEvent.click(within(d).getByLabelText(a));
    fireEvent.click(within(d).getByLabelText("Egg"));                                    // off again
    const preview = d.querySelector(".sa-dish__tags") as HTMLElement;
    expect(preview.textContent).toContain("Peanut");
    expect(preview.textContent).toContain("Soy");
    expect(preview.textContent).not.toContain("Egg");
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    await waitFor(() => expect(dbItem("Test Tags Dish")).toBeTruthy());
    expect(JSON.parse(dbItem("Test Tags Dish").allergens_json)).toEqual(["peanut", "soy"]);
    run("DELETE FROM menu_items WHERE name_en = 'Test Tags Dish'");
  });
  it("saves the Burmese name, the spice level, the description and the ingredients", async () => {
    const d = await newDish();
    fill("Name (English)", "Test Full Dish");
    fill("Name (Burmese)", "စမ်းသပ်ဟင်း");
    fill(/Price/, "99");
    fill("Spice level", "2");
    fill("Description (English)", "A test dish.");
    fill("Ingredients", "rice, test");
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    await waitFor(() => expect(dbItem("Test Full Dish")).toBeTruthy());
    const row = dbItem("Test Full Dish");
    expect(row.name_my).toBe("စမ်းသပ်ဟင်း");
    expect(row.spice).toBe(2);
    expect(row.ingredients).toBe("rice, test");
    expect(row.desc_en).toBe("A test dish.");
    run("DELETE FROM menu_items WHERE name_en = 'Test Full Dish'");
  });
  it("an unknown category chosen in the form is refused with a message under the field", async () => {
    const d = await newDish();
    fill("Name (English)", "Orphan");
    fill(/Price/, "10");
    run("DELETE FROM categories WHERE name_en = 'Brand New'");
    const select = within(d).getByLabelText("Category") as HTMLSelectElement;
    const bogus = document.createElement("option"); bogus.value = "9999"; bogus.textContent = "Ghost"; select.appendChild(bogus);
    fireEvent.change(select, { target: { value: "9999" } });
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    expect(within(d).getByText("Unknown category.")).toBeTruthy();
    expect(all("SELECT id FROM menu_items WHERE name_en = 'Orphan'")).toEqual([]);
  });
  it("a server error on save is shown in the form, the form stays open, and Save works again afterwards", async () => {
    const d = await newDish();
    fill("Name (English)", "Retry Dish");
    fill(/Price/, "40");
    failNext("/api/owner/items", 500);
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    await within(d).findByText("forced failure");
    expect(screen.getByRole("dialog", { name: "Add dish" })).toBeTruthy();
    expect(dbItem("Retry Dish")).toBeFalsy();
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    await waitFor(() => expect(dbItem("Retry Dish")).toBeTruthy());
    run("DELETE FROM menu_items WHERE name_en = 'Retry Dish'");
  });
  it("a photo that cannot be uploaded shows the error and leaves the preview as it was", async () => {
    const d = await newDish();
    failNext("/api/owner/upload", 500);
    const input = d.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([new Uint8Array([1, 2, 3])], "x.png", { type: "image/png" })] } });
    await within(d).findByText("forced failure");
    expect(d.querySelector(".sa-dish__plate img")).toBeNull();
  });
  it("choosing no file does nothing", async () => {
    const d = await newDish();
    const input = d.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(d.querySelector(".sa-dish__plate img")).toBeNull();
  });
  it("tapping outside the form closes it without saving", async () => {
    const d = await newDish();
    fill("Name (English)", "Never Saved");
    fireEvent.click(d.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(dbItem("Never Saved")).toBeFalsy();
  });
});

describe("the list's finer points", () => {
  it("names the first two dishes without allergen data and counts the rest ('and N more')", async () => {
    run("UPDATE menu_items SET allergens_json = NULL WHERE name_en IN ('Tom Yum Goong', 'Papaya Salad', 'Thai Iced Tea')");
    await openMenu();
    expect(await screen.findByText(/and \d+ more — no allergen info yet/)).toBeTruthy();
    run("UPDATE menu_items SET allergens_json = '[\"shellfish\",\"fish\"]' WHERE name_en = 'Tom Yum Goong'");
    run("UPDATE menu_items SET allergens_json = '[\"peanut\"]' WHERE name_en = 'Papaya Salad'");
    run("UPDATE menu_items SET allergens_json = '[]' WHERE name_en = 'Thai Iced Tea'");
  });
  it("shows 'None listed' for a dish with an empty allergen list, and a vegan dish carries one tag, not two", async () => {
    await openMenu();
    const row = (n: string) => screen.getByLabelText(`Edit ${n}`).closest(".table-row") as HTMLElement;
    expect(within(row("Thai Iced Tea")).getByText("None listed")).toBeTruthy();
    const tags = Array.from(row("Mango Sticky Rice").querySelectorAll(".chip-g")).map((e) => e.textContent);
    expect(tags.filter((t) => /vegan/i.test(t || ""))).toHaveLength(1);
    expect(tags.filter((t) => /vegetarian/i.test(t || ""))).toHaveLength(0);
  });
  it("the Add dish button on a category tab starts the new dish in that category", async () => {
    await openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Desserts" }));
    fireEvent.click(screen.getByRole("button", { name: /Add dish/ }));
    const d = screen.getByRole("dialog", { name: "Add dish" });
    expect((within(d).getByLabelText("Category") as HTMLSelectElement).selectedOptions[0].textContent).toBe("Desserts");
  });
});

describe("ingredient names in Thai and Burmese (owner form)", () => {
  it("has two optional lines under the English one, with a hint that says what happens", async () => {
    const d = await newDish();
    expect(within(d).getByLabelText("Ingredients in Thai (optional)")).toBeTruthy();
    expect(within(d).getByLabelText("Ingredients in Burmese (optional)")).toBeTruthy();
    expect(within(d).getAllByText(/Same order as the English line/)).toHaveLength(2);
  });
  it("counts the parts against the English line: matching is confirmed, a different number is flagged as not used", async () => {
    const d = await newDish();
    fill("Ingredients", "rice, egg, lime");
    fill("Ingredients in Thai (optional)", "ข้าว, ไข่");
    expect(within(d).getByText(/2 parts, but the English line has 3/)).toBeTruthy();
    fill("Ingredients in Thai (optional)", "ข้าว, ไข่, มะนาว");
    expect(within(d).getByText(/3 of 3 names: shown to Thai diners/)).toBeTruthy();
    fill("Ingredients in Burmese (optional)", "ထမင်း, , ");
    expect(within(d).getByText(/3 of 3 names: shown to Burmese diners. An empty part keeps its English name/)).toBeTruthy();
  });
  it("saves both lines with the dish, and an edit shows them again", async () => {
    const d = await newDish();
    fill("Name (English)", "Lime Rice");
    fill(/Price/, "45");
    fill("Ingredients", "rice, lime");
    fill("Ingredients in Thai (optional)", "ข้าว, มะนาว");
    fill("Ingredients in Burmese (optional)", "ထမင်း, ");
    fireEvent.click(within(d).getByRole("button", { name: "Save dish" }));
    await waitFor(() => expect(dbItem("Lime Rice")).toBeTruthy());
    expect(dbItem("Lime Rice")).toMatchObject({ ingredients_th: "ข้าว, มะนาว", ingredients_my: "ထမင်း, " });
    fireEvent.click(await screen.findByLabelText("Edit Lime Rice"));
    const e = screen.getByRole("dialog", { name: "Edit dish" });
    expect((within(e).getByLabelText("Ingredients in Thai (optional)") as HTMLInputElement).value).toBe("ข้าว, มะนาว");
    run("DELETE FROM menu_items WHERE name_en = 'Lime Rice'");
  });
  it("the list search also finds a dish by its Thai ingredient name", async () => {
    await openMenu();
    fireEvent.change(screen.getByPlaceholderText(/Search dishes or ingredients/), { target: { value: "ถั่วลิสงบด" } });
    await waitFor(() => expect(screen.getByLabelText("Edit Shrimp Pad Thai")).toBeTruthy());
    expect(screen.queryByLabelText("Edit Tom Yum Goong")).toBeNull();
  });
});
