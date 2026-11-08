// Icons are drawn (platform/Icon.tsx), never typed as emoji or pictograph characters: those render differently on every phone,
// cannot be coloured by the theme, and read badly in a screen reader. The AI's own replies use words ("Warning:") for the same reason.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const root = path.resolve(__dirname, "../src");
const files: string[] = [];
(function walk(d: string) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(e.name)) files.push(p); } })(root);
const PICTO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|\uFE0F/u;

describe("no emoji or pictograph characters in the app source", () => {
  it("finds the source files", () => { expect(files.length).toBeGreaterThan(40); });
  it("none of them contains one (screens, styles and AI reply text)", () => {
    const hits = files.flatMap((f) => fs.readFileSync(f, "utf8").split("\n").map((l, i) => [`${path.relative(root, f)}:${i + 1}`, l] as const).filter(([, l]) => PICTO.test(l)).map(([w, l]) => `${w} ${l.trim().slice(0, 60)}`));
    expect(hits).toEqual([]);
  });
  it("every icon name used as <Icon name=\"...\"> is drawn", () => {
    const icon = fs.readFileSync(path.join(root, "modules/platform/Icon.tsx"), "utf8");
    const drawn = new Set([...icon.matchAll(/^\s+(\w+):\s*</gm)].map((m) => m[1]).concat([...icon.matchAll(/,\s+(\w+):\s*</g)].map((m) => m[1])));
    const used = new Set(files.flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/<Icon name="(\w+)"/g)].map((m) => m[1])));
    expect([...used].filter((n) => !drawn.has(n))).toEqual([]);
  });
});
