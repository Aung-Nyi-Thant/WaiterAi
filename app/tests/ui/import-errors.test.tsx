// @vitest-environment jsdom
// Menu import (FR-6) when something goes wrong or is left out: no file chosen, a photo the AI reads nothing from, the Thai and Burmese
// suggestions failing, a refused confirm, and editing the price, category and names of a row. The happy path is in import.test.tsx.
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import OwnerShell from "@/modules/owner/OwnerShell";
import ImportPage from "@/modules/platform/ImportPage";
import { get } from "@/modules/platform/db";
import { IMAGE_BYTES, ownerLogin } from "../helpers";
import { failNext, router, setModel, withRealApi } from "./harness";

withRealApi();
const MENU = JSON.stringify({ items: [{ name: "Som Tam", price: 65, category: "Salads" }, { name: "Green Tea", price: 30, category: "Drinks" }] });
const count = () => get("SELECT COUNT(*) AS n FROM menu_items").n as number;
async function openImport() {
  await ownerLogin();
  router.pathname = "/owner/import";
  render(<OwnerShell><ImportPage /></OwnerShell>);
  await screen.findByRole("heading", { name: "Import a menu" });
}
const input = () => document.querySelector("input[type=file]") as HTMLInputElement;
const png = () => new File([IMAGE_BYTES.png], "menu.png", { type: "image/png" });
const review = async () => { setModel(MENU); await openImport(); fireEvent.change(input(), { target: { files: [png()] } }); await screen.findByRole("heading", { name: "Check your menu" }); };
const rowOf = (name: string) => (screen.getAllByLabelText("Dish name") as HTMLInputElement[]).find((i) => i.value === name)!.closest(".sa-plate") as HTMLElement;

describe("step 1 problems", () => {
  it("choosing no file does nothing", async () => {
    await openImport();
    fireEvent.change(input(), { target: { files: [] } });
    expect(screen.getByRole("heading", { name: "Import a menu" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("a photo the AI finds no dishes in shows how to try again, and the owner can still add dishes by hand", async () => {
    setModel(JSON.stringify({ items: [] }));
    await openImport();
    fireEvent.change(input(), { target: { files: [png()] } });
    await screen.findByText(/did not find any dishes/);
    expect(screen.getByRole("button", { name: "Add a missing dish" })).toBeTruthy();       // the review step is open with no rows: a dish can be added
  });
  it("a photo the server refuses shows the reason and stays on step 1", async () => {
    await openImport();
    failNext("/api/owner/import", 500);
    fireEvent.change(input(), { target: { files: [png()] } });
    await screen.findByText("forced failure");
    expect(screen.queryByRole("heading", { name: "Check your menu" })).toBeNull();
  });
});

describe("step 2 problems and edits", () => {
  it("when the Thai and Burmese suggestions fail, the message is shown and the rows are unchanged", async () => {
    await review();
    failNext("/api/owner/import/translate", 500);
    fireEvent.click(screen.getByRole("button", { name: /Suggest Thai & Burmese/ }));
    await screen.findByText("forced failure");
    expect(screen.queryByLabelText("Thai (AI suggestion)")).toBeNull();                  // no suggestion boxes appeared
  });
  it("the price, category, Thai and Burmese names of a row can be edited and are kept on confirm", async () => {
    await review();
    const row = rowOf("Som Tam");
    fireEvent.change(within(row).getByLabelText("Price ฿"), { target: { value: "70" } });
    fireEvent.change(within(row).getByLabelText("Category"), { target: { value: "Starters" } });
    setModel(JSON.stringify({ items: [{ th: "ส้มตำ", my: "သင်္ဘောသီးသုပ်" }, { th: "ชาเขียว", my: "လက်ဖက်ရည်စိမ်း" }] }));
    fireEvent.click(screen.getByRole("button", { name: /Suggest Thai/ }));
    await screen.findByText(/Suggestions added/);
    fireEvent.change(within(rowOf("Som Tam")).getByLabelText("Thai (AI suggestion)"), { target: { value: "ส้มตำไทย" } });
    fireEvent.change(within(rowOf("Som Tam")).getByLabelText("Burmese (AI suggestion)"), { target: { value: "သင်္ဘောသီး" } });
    const before = count();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & publish" }));
    await waitFor(() => expect(count()).toBe(before + 2));
    const saved = get("SELECT price, name_th, name_my FROM menu_items WHERE name_en = 'Som Tam'");
    expect(saved).toMatchObject({ price: 70, name_th: "ส้มตำไทย", name_my: "သင်္ဘောသီး" });
  });
  it("a confirm the server refuses shows the reason, publishes nothing, and the review stays open", async () => {
    await review();
    const before = count();
    failNext("/api/owner/import/confirm", 500);
    fireEvent.click(screen.getByRole("button", { name: "Confirm & publish" }));
    await screen.findByText("forced failure");
    expect(count()).toBe(before);
    expect(screen.getByRole("heading", { name: "Check your menu" })).toBeTruthy();
  });
});
