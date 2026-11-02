// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Diner from "@/modules/diner/Diner";
import { tr } from "@/modules/diner/i18n";
import { withRealApi } from "../ui/harness";

withRealApi();

describe("diner detail through the real menu API", () => {
  it("shows the right allergen state for listed, empty, and missing data", async () => {
    render(<Diner slug="golden-lotus" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Shrimp Pad Thai" })).toBeTruthy());

    const open = (name: string) => {
      fireEvent.click(screen.getByRole("button", { name }));
      return screen.getByRole("dialog", { name });
    };
    const close = (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole("button", { name: tr("en", "close") }));

    const listed = open("Shrimp Pad Thai");
    expect(within(listed).getByText(tr("en", "estAllergens"))).toBeTruthy();
    expect(within(listed).getByText(tr("en", "estNote1"))).toBeTruthy();
    close(listed);

    const empty = open("Mango Sticky Rice");
    expect(within(empty).queryByText(tr("en", "estAllergens"))).toBeNull();
    expect(within(empty).queryByText(tr("en", "allergenUnknown"))).toBeNull();
    close(empty);

    const unknown = open("Fresh Spring Rolls");
    expect(within(unknown).getByText(tr("en", "allergenUnknown"))).toBeTruthy();
    expect(within(unknown).getByText(tr("en", "allergenUnknownNote"))).toBeTruthy();
  });
});
