import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";

const folder = path.resolve(__dirname, "../../prototype");
const html = fs.readFileSync(path.join(folder, "index.html"), "utf8");
const openDemos: JSDOM[] = [];
function open(query = "") {
  const dom = new JSDOM(html, { url: `http://prototype.local/index.html${query}`, runScripts: "outside-only", pretendToBeVisual: true });
  openDemos.push(dom);
  dom.window.requestAnimationFrame = callback => { callback(0); return 1; };
  Object.assign(dom.window, { IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} } });
  const context = dom.getInternalVMContext();
  for (const script of dom.window.document.querySelectorAll("script")) {
    const source = script.src ? fs.readFileSync(path.join(folder, script.getAttribute("src")!), "utf8") : script.textContent!;
    new vm.Script(source).runInContext(context);
  }
  return dom.window;
}
afterEach(() => { openDemos.splice(0).forEach(dom => dom.window.close()); });

function clickPreviewAdd(doc: Document, englishName: string) {
  const dish = [...doc.querySelectorAll(".lp-dish")].find(d => d.querySelector("b")?.textContent?.trim() === englishName);
  const btn = dish?.querySelector("button[data-preview-add]") as HTMLElement | null;
  expect(btn, `preview add button for "${englishName}"`).not.toBeNull();
  btn!.click();
}

describe("the redesigned standalone prototype", () => {
  it("opens the landing page by default and keeps existing table links on the diner menu", () => {
    expect(open().document.querySelector("h1")?.textContent).toContain("Every table.");
    expect(open("?table=7").document.querySelector(".tt")?.textContent).toContain("7");
    expect(open("?view=customer&lang=en").document.querySelector(".lang .on")?.textContent).toBe("EN");
  });
  it("switches all three layouts by keyboard and preserves a valid selection in the URL", () => {
    const win = open("?v=99");
    expect(win.document.querySelector(".lp-service")).not.toBeNull();
    for (const [key, name] of [["2", "table"], ["3", "workspace"], ["1", "service"]]) {
      win.document.dispatchEvent(new win.KeyboardEvent("keydown", { key, bubbles: true }));
      expect(win.document.querySelector(`.lp-${name}`)).not.toBeNull();
      expect(new URL(win.location.href).searchParams.get("v")).toBe(key);
      expect(win.document.querySelectorAll('.proto-picker-item[aria-current="true"]')).toHaveLength(1);
    }
  });
  it("calculates preview picks from real prices, switches language, and clears without changing orders", () => {
    const win = open();
    const doc = win.document;
    const ordersBefore = win.localStorage.getItem("shopai_db3");
    clickPreviewAdd(doc, "Salmon Belly Sushi");
    clickPreviewAdd(doc, "Sprite");
    expect([...doc.querySelectorAll(".lp-menu-total output")].map(el => el.textContent)).toEqual(["฿147", "฿147"]);
    (doc.querySelector('[data-preview-lang="th"]') as HTMLElement).click();
    expect(doc.querySelector(".lp-dish b")?.textContent).toBe("ซูชิท้องปลาแซลม่อน");
    (doc.querySelector("[data-preview-clear]") as HTMLElement).click();
    expect(doc.querySelector(".lp-menu-total output")?.textContent).toBe("฿0");
    expect(win.localStorage.getItem("shopai_db3")).toBe(ordersBefore);
  });
  it("shows every role with a real demo destination and keeps keyboard focus on the selected role", () => {
    const win = open();
    for (const role of ["waiter", "chef", "owner", "diner"]) {
      (win.document.querySelector(`[data-preview-role="${role}"]`) as HTMLElement).click();
      expect(win.document.querySelector(`[data-preview-role="${role}"]`)?.getAttribute("aria-pressed")).toBe("true");
      expect(win.document.activeElement?.getAttribute("data-preview-role")).toBe(role);
      expect(win.document.querySelector("[data-role-panel] a")?.getAttribute("href")).toMatch(/index.html\?view=(customer|staff|owner)/);
    }
  });
});
