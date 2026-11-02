// @vitest-environment jsdom
// The pieces added with the animation and photo work: a photo that cannot load, sheets that slide away, the "fresh" highlight for a
// new order, and the touch/motion rules in the stylesheet. Animation itself cannot be seen in jsdom, so these check the behaviour
// that decides whether it runs: what is mounted, when it leaves, which class an element gets.
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import DishPhoto, { Thumb } from "@/modules/platform/DishPhoto";
import Presence, { useFresh } from "@/modules/platform/Presence";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const css = fs.readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");
const motion = (reduce: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));

describe("DishPhoto: a photo that cannot load never shows broken-image text", () => {
  it("recovers when an image failed before hydration attached the error handler", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
    try {
      const { container } = render(<DishPhoto src="/uploads/already-failed.jpg" />);
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector(".sa-dish__plate--empty svg")).toBeTruthy();
    } finally { complete.mockRestore(); width.mockRestore(); }
  });
  it("shows the photo while it loads, then the plate with an icon when the file fails", () => {
    const { container } = render(<DishPhoto src="/uploads/missing.jpg" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/uploads/missing.jpg");
    expect(container.querySelector(".sa-dish__plate--empty")).toBeNull();
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".sa-dish__plate--empty svg")).toBeTruthy();
  });
  it("a dish with no photo at all gets the same plate, and a new photo URL is tried again", () => {
    const { container, rerender } = render(<DishPhoto src="" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".sa-dish__plate--empty svg")).toBeTruthy();
    rerender(<DishPhoto src="/uploads/a.jpg" />);
    fireEvent.error(container.querySelector("img")!);
    rerender(<DishPhoto src="/uploads/b.jpg" />);                  // the owner replaced the photo: try it
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/uploads/b.jpg");
  });
  it("the owner's small thumbnail falls back too", () => {
    const { container } = render(<Thumb src="/uploads/x.jpg" size={64} />);
    fireEvent.error(container.querySelector("img.photo")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("div.photo svg")).toBeTruthy();
    expect((container.querySelector("div.photo") as HTMLElement).style.width).toBe("64px");
  });
});

describe("Presence: a closed sheet slides away for 170 ms, then is gone", () => {
  const Sheet = ({ open }: { open: boolean }) => <Presence>{open && <div className="sheet-back">sheet</div>}</Presence>;

  it("with motion allowed: still mounted and marked as leaving, gone after 170 ms", () => {
    motion(false); vi.useFakeTimers();
    const { container, rerender } = render(<Sheet open />);
    rerender(<Sheet open={false} />);
    expect(screen.getByText("sheet")).toBeTruthy();
    expect(container.querySelector(".sa-leaving")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(169); });
    expect(screen.queryByText("sheet")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(2); });
    expect(screen.queryByText("sheet")).toBeNull();
  });
  it("reopening during the exit cancels it", () => {
    motion(false); vi.useFakeTimers();
    const { container, rerender } = render(<Sheet open />);
    rerender(<Sheet open={false} />);
    rerender(<Sheet open />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByText("sheet")).toBeTruthy();
    expect(container.querySelector(".sa-leaving")).toBeNull();
  });
  it("with reduced motion it closes at once", () => {
    motion(true);
    const { rerender } = render(<Sheet open />);
    rerender(<Sheet open={false} />);
    expect(screen.queryByText("sheet")).toBeNull();
  });
  it("without matchMedia (jsdom, old browsers) it also closes at once, never hangs", () => {
    const { rerender } = render(<Sheet open />);
    rerender(<Sheet open={false} />);
    expect(screen.queryByText("sheet")).toBeNull();
  });
  it("a sheet that was never open renders nothing", () => {
    const { container } = render(<Sheet open={false} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("useFresh: only what arrives after the first load counts as new", () => {
  const List = ({ ids }: { ids: number[] }) => { const fresh = useFresh(ids); return <ul>{ids.map((i) => <li key={i} className={fresh.has(i) ? "sa-fresh" : ""}>{`order ${i}`}</li>)}</ul>; };

  it("nothing is fresh on the first load; a new id is fresh for 1.6 s; an old one never is", () => {
    vi.useFakeTimers();
    const { rerender } = render(<List ids={[1, 2]} />);
    expect(document.querySelectorAll(".sa-fresh").length).toBe(0);
    rerender(<List ids={[1, 2, 3]} />);
    expect(screen.getByText("order 3").className).toBe("sa-fresh");
    expect(screen.getByText("order 1").className).toBe("");
    rerender(<List ids={[1, 2, 3]} />);                              // another refresh during the animation must not cut it short
    expect(screen.getByText("order 3").className).toBe("sa-fresh");
    act(() => { vi.advanceTimersByTime(1700); });
    expect(document.querySelectorAll(".sa-fresh").length).toBe(0);
  });
  it("an order that leaves and comes back counts as new again; two arriving together are both marked", () => {
    vi.useFakeTimers();
    const { rerender } = render(<List ids={[1]} />);
    rerender(<List ids={[1, 4, 5]} />);
    expect(document.querySelectorAll(".sa-fresh").length).toBe(2);
    act(() => { vi.advanceTimersByTime(1700); });
    rerender(<List ids={[1]} />);
    rerender(<List ids={[1, 4]} />);
    expect(screen.getByText("order 4").className).toBe("sa-fresh");
  });
});

describe("the stylesheet: touch, motion and hover rules", () => {
  it("every :hover rule is limited to devices that can hover (touch would keep it after a tap)", () => {
    const bad = css.split("\n").filter((l) => /:hover/.test(l) && !/@media \(hover: hover\) and \(pointer: fine\)/.test(l) && !/prefers-reduced-transparency/.test(l));
    // the one rule inside the reduced-transparency block is a colour fallback, not an effect; anything else must be gated
    expect(bad.filter((l) => !/^\s+\.sa-side a:hover/.test(l)), "ungated :hover rules").toEqual([]);
  });
  it("sets the touch basics: no tap flash, manipulation on controls, no text selection on buttons", () => {
    expect(css).toMatch(/-webkit-tap-highlight-color: transparent/);
    expect(css).toMatch(/touch-action: manipulation/);
    expect(css).toMatch(/\.sa-btn[^{]*\{[^}]*user-select: none/);
  });
  it("animates only transform, opacity and shadows, with the shared easing, in under 400 ms", () => {
    const motionBlock = css.slice(css.indexOf("/* ---------- Motion ----------"));
    for (const m of motionBlock.matchAll(/animation: ([^;]+);/g)) {
      const t = m[1].match(/(\.\d+|\d+(?:\.\d+)?)s\b/g) || [];
      for (const d of t) expect(parseFloat(d), m[1]).toBeLessThan(1.5);          // the glow is the one long one (1.4 s, shadow only)
    }
    expect(motionBlock).not.toMatch(/transition:\s*all/);
    expect(motionBlock).toMatch(/--ease-out: cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
    for (const k of motionBlock.matchAll(/@keyframes [\w-]+ \{([^@]*?)\}\s*(?=@keyframes|\n\n|\n@media|$)/g)) expect(k[1]).not.toMatch(/\b(width|height|top|left|margin|padding)\s*:/);
  });
  it("drops the movement but keeps a fade for prefers-reduced-motion", () => {
    const block = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toMatch(/\.sa-in[^{]*\{ animation: sa-fade-in/);
    expect(block).toMatch(/\.sa-page/);
  });
});
