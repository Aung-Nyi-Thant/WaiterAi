// Keeps docs/TRACEABILITY.md honest: every SRS requirement is listed, the files exist, and each test file
// named for a requirement really mentions that requirement's ID.
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const srs = read("docs/SRS_Shop_AI.md");
const matrix = read("docs/TRACEABILITY.md");

const srsIds = [
  ...[...srs.matchAll(/^\| ([A-Z]{2,3}-\d+) \|/gm)].map((m) => m[1]),
  ...[...srs.matchAll(/^- (NFR-[A-Z]+\d+):/gm)].map((m) => m[1]),
  ...[...srs.matchAll(/^- (BR-\d+) /gm)].map((m) => m[1]),
];
type Row = { id: string; code: string[]; tests: string[]; status: string };
// the FR-1..FR-10 mapping table above the per-requirement tables is not a requirement list
const rows: Row[] = matrix.slice(matrix.indexOf("## Diner menu (DM)")).split("\n").filter((l) => /^\| [A-Z]{2,3}(-[A-Z]+)?-?\d+ \|/.test(l)).map((l) => {
  const c = l.split(/(?<!\\)\|/).map((x) => x.trim());
  const paths = (cell: string) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  return { id: c[1], code: paths(c[3]), tests: paths(c[4]), status: (c[5].match(/\*\*([^*]+)\*\*/) || [])[1] };
});
const mentions = (file: string, id: string) => new RegExp(`(?<![A-Z0-9-])${id}(?![0-9])`).test(read(file));

describe("docs/TRACEABILITY.md", () => {
  it("found the requirement IDs in the SRS", () => {
    expect(srsIds.length).toBeGreaterThanOrEqual(96);
    expect(new Set(srsIds).size).toBe(srsIds.length);
  });
  it("lists every SRS requirement exactly once", () => {
    const listed = rows.map((r) => r.id);
    expect(srsIds.filter((id) => !listed.includes(id)), "in the SRS but not in TRACEABILITY.md").toEqual([]);
    expect(listed.filter((id) => !srsIds.includes(id)), "in TRACEABILITY.md but not in the SRS").toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
  });
  it("only uses known statuses, and 'Tested'/'Partly' always name a test", () => {
    for (const r of rows) {
      expect(["Tested", "Partly", "Manual", "Not measured"], r.id).toContain(r.status);
      if (r.status === "Tested" || r.status === "Partly") expect(r.tests.length, `${r.id} is ${r.status} but lists no test`).toBeGreaterThan(0);
      if (r.status === "Manual") expect(r.tests, `${r.id} is Manual`).toEqual([]);
    }
  });
  it("every file it names exists", () => {
    const missing = rows.flatMap((r) => [...r.code, ...r.tests]).filter((p) => !p.includes("*")).filter((p) => !fs.existsSync(path.join(root, p)));
    expect(missing).toEqual([]);
  });
  it("every test file it names for a requirement mentions that requirement's ID", () => {
    const wrong = rows.flatMap((r) => r.tests.filter((t) => !t.includes("*") && !mentions(t, r.id)).map((t) => `${r.id} -> ${t}`));
    expect(wrong, "these test files do not mention the ID they are listed for").toEqual([]);
  });
});

describe("docs/AI_SAFETY.md", () => {
  const safety = read("docs/AI_SAFETY.md");
  const ruleRows = safety.split("\n").filter((l) => /^\| R\d+ \|/.test(l));
  const refs = [...safety.matchAll(/`(app\/tests\/[^`]+)` › "([^"]+)"/g)].map((m) => ({ file: m[1], phrase: m[2] }));
  it("has a rule table, and every rule points to at least one test", () => {
    expect(ruleRows.length).toBeGreaterThanOrEqual(13);
    for (const row of ruleRows) expect(row, "no test named in this rule").toMatch(/`app\/tests\/[^`]+` › "|live eval/);
  });
  it("every test file and test title it cites exists", () => {
    expect(refs.length).toBeGreaterThanOrEqual(25);
    const bad = refs.filter((r) => !fs.existsSync(path.join(root, r.file)) || !read(r.file).includes(r.phrase)).map((r) => `${r.file} › "${r.phrase}"`);
    expect(bad).toEqual([]);
  });
});
