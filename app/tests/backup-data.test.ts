import { expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

it("backs up a live SQLite database, uploads and secret, then restores into a new directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "shop-ai-backup-test-"));
  try {
    const data = path.join(root, "data"), backups = path.join(root, "backups"), restored = path.join(root, "restored");
    fs.mkdirSync(path.join(data, "uploads"), { recursive: true });
    const db = new DatabaseSync(path.join(data, "shop.db"));
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('before')");
    fs.writeFileSync(path.join(data, "secret"), "test-secret");
    fs.writeFileSync(path.join(data, "uploads", "photo.jpg"), "photo-data");
    const env = { ...process.env, DATA_DIR: data, BACKUP_DIR: backups };
    const cmd = (args: string[]) => execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/backup-data.mts", ...args], { cwd: process.cwd(), env, encoding: "utf8" }).trim();
    const snapshot = cmd(["backup"]);
    db.exec("INSERT INTO sample VALUES ('after')");
    expect(() => cmd(["restore", snapshot, data])).toThrow();
    expect(cmd(["restore", snapshot, restored])).toBe(restored);
    const copy = new DatabaseSync(path.join(restored, "shop.db"), { readOnly: true });
    expect(copy.prepare("SELECT value FROM sample").all()).toEqual([{ value: "before" }]);
    copy.close(); db.close();
    expect(fs.readFileSync(path.join(restored, "secret"), "utf8")).toBe("test-secret");
    expect(fs.readFileSync(path.join(restored, "uploads", "photo.jpg"), "utf8")).toBe("photo-data");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
