// Several processes opening the same brand-new database at once (the 9 build workers of `next build`, or two servers
// starting together) must all succeed. SQLite can answer "database is locked" while the file is first set up (WAL mode).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { retryWhileLocked } from "@/modules/platform/db";

const root = path.resolve(__dirname, "..");
const open = (dir: string) => new Promise<{ code: number | null; err: string }>((resolve) => {
  const p = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", "-e", 'import("./src/modules/platform/db.ts").then((m) => { m.db.prepare("SELECT 1").get(); process.exit(0); }, (e) => { console.error(e.message); process.exit(1); })'],
    { cwd: root, env: { PATH: process.env.PATH!, DATA_DIR: dir, NODE_ENV: "production" }, stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  p.stderr.on("data", (d) => { err += d; });
  p.on("close", (code) => resolve({ code, err }));
});

describe("NFR-R2 many processes can open a new database at the same time", () => {
  it("24 processes x 10 rounds, each on a fresh data folder: none fails with 'database is locked'", async () => {
    const failures: string[] = [];
    for (let round = 0; round < 10; round++) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-race-"));
      const results = await Promise.all(Array.from({ length: 24 }, () => open(dir)));
      for (const r of results) if (r.code !== 0) failures.push(r.err.trim().split("\n")[0]);
      fs.rmSync(dir, { recursive: true, force: true });
    }
    expect(failures).toEqual([]);
  }, 120_000);
});

describe("NFR-R2 retryWhileLocked (the fix for 'database is locked' on first setup)", () => {
  const locked = () => Object.assign(new Error("database is locked"), { errcode: 5 });
  const noSleep = () => {};
  it("tries again after 'database is locked' and returns the result once it works", () => {
    let calls = 0;
    expect(retryWhileLocked(() => { if (++calls < 4) throw locked(); return "ok"; }, 10, noSleep)).toBe("ok");
    expect(calls).toBe(4);
  });
  it("waits between attempts, a little longer each time, never more than about 270 ms", () => {
    const waits: number[] = [];
    let calls = 0;
    retryWhileLocked(() => { if (++calls < 6) throw locked(); }, 10, (ms) => waits.push(ms));
    expect(waits).toHaveLength(5);
    expect(waits[4]).toBeGreaterThan(waits[0] - 20);
    expect(Math.max(...waits)).toBeLessThanOrEqual(270);
  });
  it("gives up after the given number of tries and rethrows the lock error", () => {
    let calls = 0;
    expect(() => retryWhileLocked(() => { calls++; throw locked(); }, 5, noSleep)).toThrow("database is locked");
    expect(calls).toBe(5);
  });
  it("does not retry other errors", () => {
    let calls = 0;
    expect(() => retryWhileLocked(() => { calls++; throw new Error("no such table: x"); }, 5, noSleep)).toThrow("no such table");
    expect(calls).toBe(1);
  });
  it("the real sleep works (it blocks for about the requested time)", () => {
    let calls = 0;
    const t0 = Date.now();
    retryWhileLocked(() => { if (++calls < 3) throw locked(); });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(30);
  });
});
