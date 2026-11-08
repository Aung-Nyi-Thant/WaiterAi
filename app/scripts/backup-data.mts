// Consistent SQLite snapshot plus uploads and cookie-signing secret. Restore only into a new directory.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const data = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const root = path.resolve(process.env.BACKUP_DIR || path.join(path.dirname(data), "shop-ai-backups"));
const hash = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const checkDb = (file: string) => {
  const db = new DatabaseSync(file, { readOnly: true });
  try { if (db.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok") throw new Error(`Database integrity check failed: ${file}`); }
  finally { db.close(); }
};
const files = (dir: string, prefix = ""): string[] => fs.readdirSync(dir).flatMap((name) => {
  const rel = path.join(prefix, name), full = path.join(dir, name), stat = fs.lstatSync(full);
  if (stat.isSymbolicLink()) throw new Error(`Symlink in backup data: ${rel}`);
  if (stat.isDirectory()) return files(full, rel);
  if (!stat.isFile()) throw new Error(`Unsupported backup file: ${rel}`);
  return [rel];
});

if (process.argv[2] === "backup") {
  if (!fs.existsSync(path.join(data, "shop.db")) || !fs.existsSync(path.join(data, "secret"))) throw new Error("Database or session secret is missing; start the app once before backup.");
  if (root === data || root.startsWith(data + path.sep)) throw new Error("BACKUP_DIR must be outside DATA_DIR.");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const snapshot = fs.mkdtempSync(path.join(root, "snapshot-"));
  fs.chmodSync(snapshot, 0o700);
  const db = new DatabaseSync(path.join(data, "shop.db"), { readOnly: true });
  try { db.exec(`VACUUM INTO '${path.join(snapshot, "shop.db").replace(/'/g, "''")}'`); }
  finally { db.close(); }
  checkDb(path.join(snapshot, "shop.db"));
  fs.copyFileSync(path.join(data, "secret"), path.join(snapshot, "secret"));
  fs.chmodSync(path.join(snapshot, "secret"), 0o600);
  if (fs.existsSync(path.join(data, "uploads"))) {
    files(path.join(data, "uploads"));
    fs.cpSync(path.join(data, "uploads"), path.join(snapshot, "uploads"), { recursive: true });
  }
  const manifest = Object.fromEntries(files(snapshot).map((rel) => [rel, hash(path.join(snapshot, rel))]));
  fs.writeFileSync(path.join(snapshot, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), files: manifest }, null, 2), { mode: 0o600 });
  console.log(snapshot);
} else if (process.argv[2] === "restore") {
  const snapshot = path.resolve(process.argv[3] || ""), target = path.resolve(process.argv[4] || "");
  if (!process.argv[3] || !process.argv[4] || target === data || fs.existsSync(target)) throw new Error("Usage: db:restore <snapshot-dir> <new-empty-target-dir>. Restore never overwrites DATA_DIR.");
  const manifest = JSON.parse(fs.readFileSync(path.join(snapshot, "manifest.json"), "utf8")) as { files: Record<string, string> };
  if (!manifest.files["shop.db"] || !manifest.files.secret) throw new Error("Snapshot is missing its database or session secret.");
  for (const [rel, expected] of Object.entries(manifest.files)) {
    if (path.isAbsolute(rel) || rel.split(path.sep).includes("..") || fs.lstatSync(path.join(snapshot, rel)).isSymbolicLink() || hash(path.join(snapshot, rel)) !== expected) throw new Error(`Invalid backup file: ${rel}`);
  }
  checkDb(path.join(snapshot, "shop.db"));
  fs.mkdirSync(target, { mode: 0o700 });
  for (const rel of Object.keys(manifest.files)) {
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
    fs.copyFileSync(path.join(snapshot, rel), dest);
    fs.chmodSync(dest, 0o600);
  }
  checkDb(path.join(target, "shop.db"));
  console.log(target);
} else throw new Error("Use 'backup' or 'restore <snapshot-dir> <new-target-dir>'.");
