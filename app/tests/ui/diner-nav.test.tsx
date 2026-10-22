// @vitest-environment jsdom
// The diner screen after the redesign (prototype look): the header, the bottom navigation pill, the dish grid and the detail sheet.
// Real component, real API routes, real temporary database (see harness.tsx). The older diner behaviour is in diner.test.tsx.
import { describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Diner from "@/modules/diner/Diner";
import { priceLabel, tr } from "@/modules/diner/i18n";
import { all, run } from "@/modules/platform/db";
import { staffLogin } from "../helpers";
import { apiCalls, failNext, flush, setPhoneLanguage, withRealApi } from "./harness";

withRealApi();
const T = (k: string, l: "en" | "th" | "my" = "en") => tr(l, k);
const B = (n: number) => priceLabel("en", n).replace(/ /g, " ");
const dishNames = () => Array.from(document.querySelectorAll(".sa-dish__name")).map((e) => e.textContent);
const open = async (url = "/?t=5") => {
  window.history.replaceState({}, "", url);
  window.scrollTo = vi.fn() as any;
  const view = render(<Diner slug="golden-lotus" />);
  await waitFor(() => expect(dishNames()).toHaveLength(13));
  return view;
};
const nav = () => document.querySelector(".diner-nav") as HTMLElement;      // the bottom pill (the category tabs are a navigation too)
const navBtn = (name: RegExp | string) => within(nav()).getByRole("button", { name });
// The sheet's Escape listener is attached by an effect that React may run a moment after the sheet appears (slowly, on a busy CI machine), so a single
// key press right after the sheet shows can be missed. Press until it is gone: a person who pressed Escape and saw nothing would press it again.
const escapeClosesDialog = () => waitFor(() => { fireEvent.keyDown(document, { key: "Escape" }); expect(screen.queryByRole("dialog")).toBeNull(); });
const addBtn = (name: string) => screen.getByRole("button", { name: `${T("add")} ${name}` });

const langBtn = () => document.querySelector(".sa-langbtn") as HTMLElement;
const langGroup = () => screen.getByRole("group", { name: "Language" });
const openPicks = () => { if (!screen.queryByRole("dialog", { name: T("myPicks") })) fireEvent.click(document.querySelector("[data-cart]") as HTMLElement); };

describe("the header", () => {
  it("shows Shop AI, the language button, the restaurant name big, and the table and city under it", async () => {
    await open("/?t=5");
    expect(document.querySelector(".sa-logo")?.textContent).toBe("Shop AI");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Golden Lotus Kitchen");
    expect(document.querySelector(".sa-sign__meta")?.textContent).toBe(`${T("table")} 5 / Bangkok`);
    expect(langBtn().textContent).toBe("EN");
    expect(langBtn().querySelector("svg")).toBeTruthy();
  });
  it("the search field has a filter button, and a row under the categories opens the allergy profile", async () => {
    await open();
    expect(screen.getByRole("button", { name: T("filters") }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: T("setAllergies") }).textContent).toContain(T("allergyProfile"));
  });
});

describe("the language list (the EN button in the header)", () => {
  it("lists English, Thai and Burmese with the current one checked, and closes with Escape", async () => {
    await open();
    expect(screen.queryByRole("group", { name: "Language" })).toBeNull();
    fireEvent.click(langBtn());
    const rows = within(langGroup()).getAllByRole("button");
    expect(rows.map((b) => b.textContent)).toEqual(["English", "ไทย", "မြန်မာ"]);
    expect(rows.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    expect(rows[0].querySelector("svg")).toBeTruthy();                                 // the check mark
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("group", { name: "Language" })).toBeNull());
  });
  it("choosing a language changes the labels, the page language and is remembered on the phone, and closes the list", async () => {
    await open();
    fireEvent.click(langBtn());
    fireEvent.click(within(langGroup()).getByRole("button", { name: "ไทย" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("th"));
    expect(localStorage.getItem("lang")).toBe("th");
    expect(langBtn().textContent).toBe("TH");
    expect(screen.queryByRole("group", { name: "Language" })).toBeNull();
    expect(within(nav()).getByText(T("navMenu", "th"))).toBeTruthy();
    expect(screen.getByText(T("allergyProfile", "th"))).toBeTruthy();
  });
  it("a Burmese phone starts in Burmese, with Burmese labels on the navigation", async () => {
    setPhoneLanguage("my-MM");
    await open();
    expect(document.documentElement.lang).toBe("my");
    for (const k of ["navMenu", "navBills", "myPicks", "navStaff"]) expect(within(nav()).getByText(T(k, "my")), k).toBeTruthy();
  });
});

describe("the bottom navigation", () => {
  it("has four labelled buttons in a fixed order: menu, bills, My picks, staff", async () => {
    await open();
    expect(within(nav()).getAllByRole("button").map((b) => b.textContent)).toEqual([T("navMenu"), T("navBills"), T("myPicks"), T("navStaff")]);
  });
  it("every button has a drawn icon and the menu starts as the current view", async () => {
    await open();
    for (const b of within(nav()).getAllByRole("button")) {
      expect(b.querySelector("svg"), b.textContent || "").toBeTruthy();
      expect(b.textContent).not.toMatch(/[←-⇿⌀-⏿☀-➿\u{1F000}-\u{1FAFF}]/u);
    }
    expect(navBtn(T("navMenu")).className).toContain("on");
  });
  it("My picks shows how many dishes are picked and opens the My picks page", async () => {
    await open();
    fireEvent.click(addBtn("Tom Yum Goong"));
    const cart = navBtn(new RegExp(T("myPicks")));
    expect(cart.querySelector(".nav-badge")?.textContent).toBe("1");
    fireEvent.click(cart);
    expect(screen.getByRole("dialog", { name: T("myPicks") })).toBeTruthy();
    await escapeClosesDialog();
  });
  it("the AI is the bar at the top of the menu: it opens in place and its arrow closes it; the menu button also closes it and scrolls to the top", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: T("heroBar") }));
    await screen.findByRole("log");
    expect(navBtn(T("navMenu")).className).toContain("on");
    fireEvent.click(screen.getByRole("button", { name: T("close") }));
    await waitFor(() => expect(screen.queryByRole("log")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: T("heroBar") }));
    await screen.findByRole("log");
    fireEvent.click(navBtn(T("navMenu")));
    await waitFor(() => expect(screen.queryByRole("log")).toBeNull());
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
  it("Bills opens the table bill (empty before anything was sent, with no 'ask for the bill' button), and the My picks page has no bill row", async () => {
    await open();
    fireEvent.click(navBtn(new RegExp(T("tableBill"))));
    const dlg = await screen.findByRole("dialog", { name: T("tableBill") });
    expect(within(dlg).getByText(T("billEmpty"))).toBeTruthy();
    expect(within(dlg).queryByRole("button", { name: new RegExp(T("askBill")) })).toBeNull();
    await escapeClosesDialog();
    openPicks();
    const picks = await screen.findByRole("dialog", { name: T("myPicks") });
    expect(within(picks).queryByRole("button", { name: new RegExp(T("tableBill")) })).toBeNull();
    await escapeClosesDialog();
  });
  it("the staff button calls the staff for this table, rings, and says so", async () => {
    run("DELETE FROM calls");
    await open("/?t=9");
    fireEvent.click(navBtn(T("callStaff")));
    await screen.findByText(T("staffCalled"));
    expect(all("SELECT table_no, kind FROM calls")).toEqual([{ table_no: "9", kind: "help" }]);
  });
  it("when the call cannot be sent the diner is told, and no call is stored", async () => {
    run("DELETE FROM calls");
    await open("/?t=9");
    failNext("/api/public/golden-lotus/calls", 500);
    fireEvent.click(navBtn(T("callStaff")));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("forced failure"));
    expect(all("SELECT id FROM calls")).toEqual([]);
  });
});

describe("the allergy profile row", () => {
  it("is named 'Set my allergies' until a profile exists, then names the allergens and shows how many", async () => {
    await open();
    const first = screen.getByRole("button", { name: T("setAllergies") });
    expect(first.querySelector(".allergy-row__count")).toBeNull();
    fireEvent.click(first);
    const dlg = screen.getByRole("dialog", { name: T("myAllergies") });
    fireEvent.click(within(dlg).getByRole("button", { name: /^peanut$/i }));
    fireEvent.click(within(dlg).getByRole("button", { name: /^egg$/i }));
    fireEvent.click(within(dlg).getByRole("button", { name: T("applyProfile") }));
    const named = screen.getByRole("button", { name: new RegExp(`^${T("myAllergies")}: `) });
    expect(named.getAttribute("aria-label")).toContain("peanut");
    expect(named.querySelector(".allergy-row__count")?.textContent).toBe("2");
    expect(named.querySelector(".allergy-row__list")?.textContent).toContain("peanut");
  });
  it("the saved allergy profile is still there after a reload", async () => {
    localStorage.setItem("allergyProfile", JSON.stringify(["soy"]));
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: new RegExp(T("myAllergies")) }).querySelector(".allergy-row__count")?.textContent).toBe("1"));
  });
});

describe("the table bill", () => {
  it("shows the table's total once the staff have taken an order, and asking for the bill calls the staff", async () => {
    run("DELETE FROM calls");
    await open("/?t=12");
    fireEvent.click(addBtn("Papaya Salad"));
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));
    await waitFor(() => expect(apiCalls.some((c) => c.url.endsWith("/orders"))).toBe(true));
    await screen.findByRole("dialog", { name: T("sent") });
    const id = (all("SELECT id FROM orders WHERE table_no = '12'")[0] as any).id;
    await staffLogin("1111");
    await fetch(`/api/staff/orders/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "take" }) });
    fireEvent.click(screen.getByRole("button", { name: T("backMenu") }));
    fireEvent.click(navBtn(new RegExp(T("tableBill"))));                              // opens the sheet, which loads the bill again
    const dlg = await screen.findByRole("dialog", { name: T("tableBill") });
    await within(dlg).findByText("1× Papaya Salad");
    fireEvent.click(within(dlg).getByRole("button", { name: new RegExp(T("askBill")) }));
    await waitFor(() => expect(all("SELECT kind FROM calls WHERE table_no = '12'")).toEqual([{ kind: "bill" }]));
  });
});

describe("the dish grid", () => {
  it("lists the dishes in one grid, with the special across the whole row", async () => {
    run("INSERT INTO specials (restaurant_id, title, text) VALUES (1, 'Mango week', 'Two for one')");
    await open();
    expect(document.querySelectorAll(".diner-section .sa-dish")).toHaveLength(13);
    expect(document.querySelectorAll(".diner-section").length).toBeGreaterThan(1);          // one section per category
    expect(document.querySelector(".diner-special")?.textContent).toContain("Mango week");
  });
  it("a card's add button is only an icon, but has a name that says which dish it adds", async () => {
    await open();
    const b = addBtn("Tom Yum Goong");
    expect(b.textContent).toBe("");
    expect(b.querySelector("svg")).toBeTruthy();
    fireEvent.click(b);
    await waitFor(() => expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Tom Yum Goong"));
  });
  it("a card without a photo shows the plate icon, a sold-out card shows a badge and no add button", async () => {
    await open();
    const cards = Array.from(document.querySelectorAll(".sa-dish"));
    expect(cards.every((c) => c.querySelector(".sa-dish__plate--empty svg") || c.querySelector("img"))).toBe(true);
    const sold = cards.find((c) => c.textContent?.includes("Coconut Ice Cream")) as HTMLElement;
    expect(sold.className).toContain("sa-dish--soldout");
    expect(sold.querySelector(".sa-stamp")?.textContent).toBe(T("soldOut"));
  });
  it("filters by category and by search, and says so when nothing matches", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Desserts" }));
    expect(dishNames()).toEqual(["Mango Sticky Rice", "Coconut Ice Cream"]);
    fireEvent.click(screen.getByRole("button", { name: T("all") }));
    fireEvent.change(screen.getByRole("textbox", { name: T("search") }), { target: { value: "zzzz" } });
    expect(screen.getByText(T("none"))).toBeTruthy();
    expect(dishNames()).toEqual([]);
  });
});

describe("the dish sheet", () => {
  const openDish = async (name: string) => { fireEvent.click(screen.getByRole("button", { name })); return screen.findByRole("dialog", { name }); };
  it("opens from a card with the price, the allergens, the ingredients, a quantity control and two actions", async () => {
    await open();
    const dlg = await openDish("Shrimp Pad Thai");
    expect(within(dlg).getAllByText(B(120)).length).toBeGreaterThan(0);               // beside the name, and as the total next to the quantity
    for (const a of ["peanut", "shellfish", "egg", "fish"]) expect(within(dlg).getAllByText(a).length).toBeGreaterThan(0);      // an allergen tag (and an ingredient of the same name)
    expect(within(dlg).getByText(T("ingredients"))).toBeTruthy();
    expect(within(dlg).getByRole("button", { name: T("askAbout") })).toBeTruthy();
    expect(within(dlg).getByRole("button", { name: new RegExp(`^${T("add")}`) })).toBeTruthy();
  });
  it("the quantity control changes the total price next to it and on the add button, within 1 to 20", async () => {
    await open();
    const dlg = await openDish("Tom Yum Goong");
    const minus = within(dlg).getByRole("button", { name: "Decrease quantity" }) as HTMLButtonElement;
    const plus = within(dlg).getByRole("button", { name: "Increase quantity" }) as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
    fireEvent.click(plus); fireEvent.click(plus);
    expect(within(dlg).getAllByText(B(540)).length).toBeGreaterThan(0);                // 3 × 180, beside the stepper and on the button
    expect(within(dlg).getByRole("button", { name: new RegExp(`^${T("add")}.*540`) })).toBeTruthy();
    fireEvent.click(minus);
    expect(within(dlg).getAllByText(B(360)).length).toBeGreaterThan(0);
    for (let i = 0; i < 25; i++) fireEvent.click(plus);
    expect(plus.disabled).toBe(true);
    expect(within(dlg).getAllByText(B(3600)).length).toBeGreaterThan(0);               // 20 × 180
  });
  it("adding from the sheet puts that quantity in My picks and closes the sheet", async () => {
    await open();
    const dlg = await openDish("Tom Yum Goong");
    fireEvent.click(within(dlg).getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(within(dlg).getByRole("button", { name: new RegExp(`^${T("add")}`) }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.querySelector(".picks-bar__line")?.textContent).toBe("2× Tom Yum Goong");
  });
  it("a sold-out dish has no quantity control and no add button in its sheet", async () => {
    await open();
    const dlg = await openDish("Coconut Ice Cream");
    expect(within(dlg).queryByRole("button", { name: "Increase quantity" })).toBeNull();
    expect(within(dlg).queryByRole("button", { name: new RegExp(`^${T("add")}`) })).toBeNull();
    expect((within(dlg).getByRole("button", { name: T("soldOut") }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("closes with the close button, with Escape, and by tapping outside it", async () => {
    await open();
    let dlg = await openDish("Tom Yum Goong");
    fireEvent.click(within(dlg).getByRole("button", { name: T("close") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await openDish("Tom Yum Goong");
    await escapeClosesDialog();
    dlg = await openDish("Tom Yum Goong");
    fireEvent.click(dlg.parentElement as HTMLElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("'Ask AI' in the sheet closes it, opens the chat and asks about that dish", async () => {
    await open();
    const dlg = await openDish("Tom Yum Goong");
    fireEvent.click(within(dlg).getByRole("button", { name: T("askAbout") }));
    await screen.findByRole("log");
    await waitFor(() => expect(apiCalls.some((c) => c.url.endsWith("/chat") && /Tom Yum Goong/.test(c.body?.message))).toBe(true));
    expect(screen.queryByRole("dialog", { name: "Tom Yum Goong" })).toBeNull();
  });
});

describe("My picks and the sheets", () => {
  it("the picks bar opens the My picks sheet, where the quantity can be changed or a dish removed, and Escape closes it", async () => {
    await open();
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(document.querySelector(".picks-bar__open") as HTMLElement);
    const dlg = screen.getByRole("dialog", { name: T("myPicks") });
    expect(within(dlg).getAllByText(B(360)).length).toBeGreaterThan(0);
    fireEvent.click(within(dlg).getByRole("button", { name: "-" }));
    expect(within(dlg).getAllByText(B(180)).length).toBeGreaterThan(0);
    fireEvent.click(within(dlg).getByRole("button", { name: T("remove") }));
    expect(within(dlg).getByText(T("picksEmpty"))).toBeTruthy();
    await escapeClosesDialog();
    expect(document.querySelector(".picks-bar")).toBeNull();
  });
  it("sending the picks shows the confirmation with the table, the lines and the total, and Escape or Done closes it", async () => {
    await open("/?t=7");
    fireEvent.click(addBtn("Tom Yum Goong"));
    fireEvent.click(addBtn("Papaya Salad"));
    fireEvent.click(screen.getByRole("button", { name: T("showToWaiter") }));
    const dlg = await screen.findByRole("dialog", { name: T("sent") });
    expect(within(dlg).getByText(`${T("table")} 7`)).toBeTruthy();
    expect(within(dlg).getByText("1× Tom Yum Goong")).toBeTruthy();
    expect(within(dlg).getByText(B(250))).toBeTruthy();                                // 180 + 70
    await escapeClosesDialog();
    await flush();
  });
  it("the toast for an allergen warning is marked as a warning with an icon", async () => {
    localStorage.setItem("allergyProfile", JSON.stringify(["peanut"]));
    await open();
    fireEvent.click(addBtn("Papaya Salad"));
    const toast = await screen.findByRole("status");
    expect(toast.className).toContain("toast--warn");
    expect(toast.querySelector("svg")).toBeTruthy();
  });
});

describe("the ingredients in the dish sheet", () => {
  const openDish = async (name: string) => { fireEvent.click(screen.getByRole("button", { name })); return screen.findByRole("dialog", { name }); };
  it("shows each ingredient as its own pill, with how many there are, instead of one line of text", async () => {
    await open();
    const dlg = await openDish("Shrimp Pad Thai");
    const list = within(dlg).getByRole("list", { name: T("ingredients") });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["rice noodles", "shrimp", "egg", "tamarind", "fish sauce", "crushed peanuts"]);
    expect(dlg.querySelector(".sa-ing-count")?.textContent).toBe("6");
    expect(within(dlg).getByText(T("ingredients"))).toBeTruthy();
  });
  it("marks the ingredients behind the dish's allergens quietly, with a dot and a note that says what the dot means", async () => {
    await open();
    const dlg = await openDish("Shrimp Pad Thai");
    const items = within(dlg).getAllByRole("listitem");
    const marked = items.filter((li) => li.className.includes("sa-ing__item--allergen")).map((li) => li.textContent);
    expect(marked).toEqual(["shrimp", "egg", "fish sauce", "crushed peanuts"]);
    expect(items.find((li) => li.textContent === "rice noodles")?.className).toBe("sa-ing__item");       // an ingredient with no match is not marked, and not called safe
    expect(within(dlg).getByText(T("ingAllergen"))).toBeTruthy();
    expect(within(dlg).queryByText(T("ingYours"))).toBeNull();
  });
  it("marks an ingredient that holds the diner's own allergen in red with a warning icon and says so", async () => {
    localStorage.setItem("allergyProfile", JSON.stringify(["peanut"]));
    await open();
    const dlg = await openDish("Shrimp Pad Thai");
    const mine = within(dlg).getAllByRole("listitem").filter((li) => li.className.includes("sa-ing__item--mine"));
    expect(mine.map((li) => li.textContent)).toEqual(["crushed peanuts"]);
    expect(mine[0].querySelector("svg")).toBeTruthy();                                                     // not colour alone
    expect(within(dlg).getByText(T("ingYours"))).toBeTruthy();
  });
  it("a dish with no ingredients written shows no ingredients section", async () => {
    run("UPDATE menu_items SET ingredients = '' WHERE name_en = 'Thai Iced Tea'");
    await open();
    const dlg = await openDish("Thai Iced Tea");
    expect(within(dlg).queryByText(T("ingredients"))).toBeNull();
    expect(within(dlg).queryByRole("list")).toBeNull();
    run("UPDATE menu_items SET ingredients = 'black tea, sugar, evaporated milk, ice' WHERE name_en = 'Thai Iced Tea'");
  });
  it("a dish with no allergen data marks nothing as linked (no allergen is known), but still lists the ingredients", async () => {
    await open();
    const dlg = await openDish("Fresh Spring Rolls");
    expect(within(dlg).getAllByRole("listitem").length).toBeGreaterThan(1);
    expect(dlg.querySelector(".sa-ing__item--allergen")).toBeNull();
    expect(within(dlg).queryByText(T("ingAllergen"))).toBeNull();
  });
  it("the labels exist in Thai and Burmese", async () => {
    for (const k of ["ingYours", "ingAllergen"]) for (const l of ["th", "my"] as const) expect(T(k, l).length, `${l}.${k}`).toBeGreaterThan(0);
  });
});

describe("ingredient names in the diner's language", () => {
  const openDish = async (name: string) => { fireEvent.click(screen.getByRole("button", { name })); return screen.findByRole("dialog", { name }); };
  const T2 = (k: string) => tr("th", k);
  it("in Thai the pills are the Thai names and the heading is Thai", async () => {
    localStorage.setItem("lang", "th");
    await open();
    const dlg = await openDish("ผัดไทยกุ้ง");
    expect(within(dlg).getByText(T2("ingredients"))).toBeTruthy();
    const list = within(dlg).getByRole("list", { name: T2("ingredients") });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["เส้นผัดไทย", "กุ้ง", "ไข่", "น้ำมะขาม", "น้ำปลา", "ถั่วลิสงบด"]);
  });
  it("the allergen marks still work in Thai, also for a name that only the English line makes clear (soy sauce = ซีอิ๊วขาว)", async () => {
    localStorage.setItem("lang", "th");
    await open();
    const dlg = await openDish("ข้าวผัดไก่");
    const marked = within(dlg).getAllByRole("listitem").filter((li) => li.className.includes("--allergen")).map((li) => li.textContent);
    expect(marked).toEqual(["ไข่", "ซีอิ๊วขาว"]);                                                  // egg by the Thai word, soy by the English name at the same place
  });
  it("the diner's own allergen is found through the Thai name", async () => {
    localStorage.setItem("lang", "th");
    localStorage.setItem("allergyProfile", JSON.stringify(["peanut"]));
    await open();
    const dlg = await openDish("ผัดไทยกุ้ง");
    expect(within(dlg).getAllByRole("listitem").filter((li) => li.className.includes("--mine")).map((li) => li.textContent)).toEqual(["ถั่วลิสงบด"]);
  });
  it("in Burmese with no Burmese names written, the English names show; once written they show, an empty part keeping its English name", async () => {
    localStorage.setItem("lang", "my");
    await open();
    let dlg = await openDish("ပုစွန် ပတ်ထိုင်း");
    expect(within(dlg).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["rice noodles", "shrimp", "egg", "tamarind", "fish sauce", "crushed peanuts"]);
    cleanup();
    run("UPDATE menu_items SET ingredients_my = 'ခေါက်ဆွဲ, ပုစွန်, ဥ, , , မြေပဲ' WHERE name_en = 'Shrimp Pad Thai'");
    await open();
    dlg = await openDish("ပုစွန် ပတ်ထိုင်း");
    expect(within(dlg).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["ခေါက်ဆွဲ", "ပုစွန်", "ဥ", "tamarind", "fish sauce", "မြေပဲ"]);
    run("UPDATE menu_items SET ingredients_my = '' WHERE name_en = 'Shrimp Pad Thai'");
  });
  it("a Thai line that does not line up with the English one is not shown at all, so no name sits beside the wrong ingredient", async () => {
    run("UPDATE menu_items SET ingredients_th = 'เส้น, กุ้ง' WHERE name_en = 'Shrimp Pad Thai'");
    localStorage.setItem("lang", "th");
    await open();
    const dlg = await openDish("ผัดไทยกุ้ง");
    expect(within(dlg).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["rice noodles", "shrimp", "egg", "tamarind", "fish sauce", "crushed peanuts"]);
    run("UPDATE menu_items SET ingredients_th = 'เส้นผัดไทย, กุ้ง, ไข่, น้ำมะขาม, น้ำปลา, ถั่วลิสงบด' WHERE name_en = 'Shrimp Pad Thai'");
  });
  it("English diners are not affected by the Thai lines", async () => {
    await open();
    const dlg = await openDish("Shrimp Pad Thai");
    expect(within(dlg).getAllByRole("listitem").map((li) => li.textContent)).toContain("rice noodles");
  });
});

describe("a dish's names in the other languages", () => {
  it("are shown once each: a dish with no Burmese name does not show its English name twice", async () => {
    run("UPDATE menu_items SET name_my = '' WHERE name_en = 'Mango Sticky Rice'");
    localStorage.setItem("lang", "th");
    await open();
    const card = screen.getByRole("button", { name: "ข้าวเหนียวมะม่วง" }).closest("article") as HTMLElement;
    expect(card.querySelector(".sa-dish__alt")?.textContent).toBe("Mango Sticky Rice");
    run("UPDATE menu_items SET name_my = 'သရက်သီး ကောက်ညှင်းပေါင်း' WHERE name_en = 'Mango Sticky Rice'");
  });
});

describe("an address with ?dish= (the home page's dish strip)", () => {
  it("opens that dish's sheet once the menu has loaded, and the page behind it is the normal menu", async () => {
    const id = (all("SELECT id FROM menu_items WHERE name_en = 'Tom Yum Goong'")[0] as any).id;
    await open(`/?t=5&dish=${id}`);
    const dlg = await screen.findByRole("dialog", { name: "Tom Yum Goong" });
    expect(within(dlg).getAllByText(B(180)).length).toBeGreaterThan(0);
    expect(dishNames()).toHaveLength(13);
    fireEvent.click(within(dlg).getByRole("button", { name: T("close") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await flush();
    expect(screen.queryByRole("dialog")).toBeNull();                                      // it does not open again by itself
  });
  it("ignores a dish number that does not exist, or is not a number", async () => {
    await open("/?t=5&dish=99999");
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    await open("/?t=5&dish=abc");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("opens the dish with its photo area, price and an add button that adds it", async () => {
    const id = (all("SELECT id FROM menu_items WHERE name_en = 'Papaya Salad'")[0] as any).id;
    await open(`/?t=5&dish=${id}`);
    const dlg = await screen.findByRole("dialog", { name: "Papaya Salad" });
    fireEvent.click(within(dlg).getByRole("button", { name: new RegExp(`^${T("add")}`) }));
    await waitFor(() => expect(document.querySelector(".picks-bar__line")?.textContent).toBe("Papaya Salad"));
  });
});
