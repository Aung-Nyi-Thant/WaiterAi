// @vitest-environment jsdom
// The look of the whole app (the prototype's design): the stylesheet's tokens, that every class and variable the screens use is defined,
// that the colour pairs stay readable (WCAG AA), and the page shell (fonts, theme colour, templates). A screen cannot silently lose its style.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render } from "@testing-library/react";
import RootLayout, { viewport } from "@/app/layout";
import OwnerTemplate from "@/app/owner/template";
import StaffTemplate from "@/app/staff/template";

const root = path.resolve(__dirname, "../..");
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

// every source file that draws the app (the design-study pages under app/prototypes are not part of it)
const sources: { file: string; text: string }[] = [];
(function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "prototypes" && e.name !== "api") walk(p); }
    else if (/\.tsx$/.test(e.name)) sources.push({ file: path.relative(root, p), text: fs.readFileSync(p, "utf8") });
  }
})(path.join(root, "src"));

const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? "";
function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe("the palette", () => {
  it("is the monochrome design: a light grey canvas, white cards, a near-black ink, and no colour at all", () => {
    expect(token("mustard")).toBe("#141414");
    expect(token("cherry")).toBe("#141414");
    expect(token("surface-page")).toBe("#f5f5f5");
    expect(token("surface-card")).toBe("#ffffff");
    expect(token("surface-sunk")).toBe("#e8e8e8");
    expect(token("ink")).toBe("#141414");
    expect(token("line")).toBe("#dedede");
  });
  it("has one theme: the staff, kitchen and home screens that ask for the night theme get the same palette", () => {
    expect(css).toMatch(/:root, \[data-theme\] \{/);
    expect(css).not.toMatch(/\[data-theme="night"\] \{/);
  });
  it("keeps every text and background pair readable (WCAG AA, 4.5 : 1)", () => {
    const pairs: [string, string, string][] = [
      ["ink", "surface-page", "text on the page"], ["ink", "surface-card", "text on a card"], ["ink", "surface-sunk", "text on a grey panel"],
      ["ink-muted", "surface-page", "grey text on the page"], ["ink-muted", "surface-card", "grey text on a card"], ["ink-muted", "surface-sunk", "grey text on a grey panel"],
      ["on-mustard", "mustard", "text on a yellow button"], ["ink", "mustard-soft", "text on the special's card"],
      ["on-teal", "ink", "white on the dark AI button"], ["on-cherry", "cherry", "white on the red calling table"],
      ["cherry-text", "cherry-soft", "red allergen tag"], ["cherry-text", "surface-card", "red text on a card"], ["on-allergy", "allergy", "allergy banner"],
      ["on-ok", "ok", "white on the green button"], ["on-ok", "ok", "ready status"],
    ];
    for (const [fg, bg, what] of pairs) expect(contrast(token(fg), token(bg)), `${what}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it("uses white on the ink bubble (the diner's) and ink on the grey one (the AI's)", () => {
    expect(contrast("#ffffff", token("ink"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("ink"), token("surface-sunk"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the type", () => {
  it("is the rounded Apple font for Latin (Nunito where there is none, then the Apple system font and Arial) with Noto Sans for Thai and Burmese, with tabular numbers and looser lines for Thai and Burmese", () => {
    expect(css).toMatch(/--font-sans: ui-rounded, "SF Pro Rounded", "Nunito", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, "Noto Sans Thai", "Noto Sans Myanmar"/);
    expect(css).toMatch(/--font-display: var\(--font-sans\)/);
    expect(css).toMatch(/font-variant-numeric: tabular-nums/);
    expect(css).toMatch(/\.sa-app :lang\(th\)[^{]*\{ line-height: 1\.6/);
    expect(css).toMatch(/\.sa-app :lang\(my\)[^{]*\{ line-height: 1\.8/);
  });
  it("does not use the old retro fonts or a 400-weight display face", () => {
    for (const f of ["Righteous", "Yellowtail", "Archivo", "Courier Prime"]) expect(css).not.toContain(f);
    expect(css).not.toMatch(/font: 400 [^;]*var\(--font-display\)/);
  });
  it("loads Nunito and the Noto Sans Thai and Myanmar fonts, and sets the browser's theme colour to the page colour", () => {
    const html = renderToStaticMarkup(<RootLayout><p>x</p></RootLayout>);
    expect(html).toContain("family=Nunito");
    expect(html).toContain("family=Noto+Sans+Thai");
    expect(html).toContain("family=Noto+Sans+Myanmar");
    for (const f of ["Righteous", "Yellowtail", "Archivo", "Courier"]) expect(html).not.toContain(f);
    expect(html).toContain('lang="en"');
    expect(viewport.themeColor).toBe(token("surface-page"));
  });
});

describe("the stylesheet and the screens agree", () => {
  const defined = new Set(Array.from(css.matchAll(/\.([a-zA-Z][\w-]*)/g)).map((m) => m[1]));
  // classes that are set by a condition in the code (a state or a status word) or only mark an element for the code or the tests
  const markers = new Set(["fresh", "late", "leaving", "ringing", "asked", "ok", "warn", "tab", "clash", "available", "missing", "long", "new", "ready", "cooking", "active", "ai", "chat", "rail", "role", "id", "user", "item", "profile", "key", "length", "has", "undefined", "days", "cursor", "ursor", "pen", "nly", "chip-l", "col-count--", "pick-", "ready-", "sa-table--", "rrow", "on", "open", "detail-qty", "sa-swipe"]);
  it("every class a screen uses has a style", () => {
    const missing: string[] = [];
    for (const { file, text } of sources) {
      for (const m of text.matchAll(/className=("[^"]*"|\{`[^`]*`\}|\{[^}]*\})/g)) {
        for (const c of m[1].match(/[a-z][a-z0-9_-]+/g) || []) {
          if (c.startsWith("sa-") || c.includes("-")) { if (!defined.has(c) && !markers.has(c) && !/--$/.test(c)) missing.push(`${file}: ${c}`); }
        }
      }
    }
    expect(missing).toEqual([]);
  });
  it("every CSS variable the stylesheet or a screen reads is defined", () => {
    const used = new Set<string>();
    for (const m of css.matchAll(/var\(--([\w-]+)/g)) used.add(m[1]);
    for (const { text } of sources) for (const m of text.matchAll(/var\(--([\w-]+)/g)) used.add(m[1]);
    const declared = new Set(Array.from(css.matchAll(/(?:^|[\s;{])--([\w-]+)\s*:/g)).map((m) => m[1]));
    expect(Array.from(used).filter((v) => !declared.has(v) && !["face", "txt", "ring-c", "edge"].includes(v))).toEqual([]);
  });
  it("no screen uses the retired retro classes (checker strip, enamel bell, wallpaper)", () => {
    for (const { file, text } of sources) for (const c of ["sa-checker", "sa-bell", "sa-sheet__grab--old"]) expect(text, `${file} still uses ${c}`).not.toContain(c);
    expect(css).not.toContain("sa-checker");
    expect(css).not.toMatch(/data:image\/svg\+xml[^"]*starburst/);
  });
  it("has no emoji or symbol glyph in the stylesheet", () => {
    expect(css).not.toMatch(/[←-⇿⌀-⏿☀-➿\u{1F000}-\u{1FAFF}]/u);
  });
});

describe("the diner layout rules", () => {
  it("shows the dishes as rows: a square photo on the left, the name, a line, the price and a black plus", () => {
    expect(css).toMatch(/\.sa-dish \{[^}]*grid-template-columns: 112px minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.sa-dish__top \{[^}]*width: 112px; height: 112px/);
  });
  it("keeps the navigation pill, the picks bar and the toast clear of each other", () => {
    expect(css).toMatch(/\.diner-nav \{[^}]*display: grid; grid-template-columns: repeat\(4, 1fr\)/);
    expect(css).toMatch(/\.diner \{[^}]*padding: 0 0 180px/);                             // room under the last card for the picks bar and the pill
    expect(css).toMatch(/\.toast \{[^}]*bottom: calc\(176px/);
  });
  it("asks for 44 px touch targets on the buttons, chips and tabs", () => {
    expect(css).toMatch(/--tap-min: 44px/);
    expect(css).toMatch(/\.sa-chip, \.sa-tab \{[^}]*min-height: var\(--tap-min\)/);
    expect(css).toMatch(/\.sa-btn--icon \{[^}]*width: var\(--tap-min\)/);
  });
  it("puts the diner in a phone-sized column on a wide screen", () => {
    expect(css).toMatch(/@media \(min-width: 561px\) \{[^}]*\.sa-app:has\(> \.diner\)/);
    expect(css).toMatch(/\.diner \{ max-width: 480px/);
  });
});

describe("page templates", () => {
  it("the owner and staff areas slide each page in (a template is mounted again on every navigation)", () => {
    for (const Template of [OwnerTemplate, StaffTemplate]) {
      const { container, unmount } = render(<Template><p>content</p></Template>);
      expect(container.querySelector(".sa-page")?.textContent).toBe("content");
      unmount();
    }
  });
});
