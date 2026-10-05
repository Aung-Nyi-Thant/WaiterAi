// Starts the real, built Next.js server on a free port with a fresh database seeded by scripts/seed.mts,
// the way a deployment would be set up. The model is deliberately unreachable: the diner flow must work
// from the rules alone, and an open question must fall back safely.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
let server: ChildProcess | undefined;

const freePort = () => new Promise<number>((res, rej) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = (s.address() as net.AddressInfo).port; s.close(() => res(p)); });
  s.on("error", rej);
});

export default async function setup() {
  if (!fs.existsSync(path.join(root, ".next", "BUILD_ID"))) throw new Error("No production build found. Run `npm run build` first.");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-e2e-"));
  const creds = { SEED_OWNER_EMAIL: "e2e-owner@test.local", SEED_OWNER_PASSWORD: "e2e-password-123", SEED_WAITER_PIN: "4821", SEED_CHEF_PIN: "7305" };
  const env = { ...process.env, NODE_ENV: "production" as const, DATA_DIR: dir, SESSION_SECRET: "e2e-secret", AI_PROVIDER: "ollama", OLLAMA_URL: "http://127.0.0.1:9", ...creds };
  const seeded = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/seed.mts"], { cwd: root, env, encoding: "utf8" });
  if (seeded.status !== 0) throw new Error("seed failed: " + seeded.stdout + seeded.stderr);

  const port = await freePort();
  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: root, env, stdio: "pipe" });
  let log = "";
  server.stdout?.on("data", (d) => (log += d)); server.stderr?.on("data", (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${base}/api/public/golden-lotus/menu`)).ok) break; } catch {}
    if (server.exitCode !== null) throw new Error("server exited early:\n" + log);
    await new Promise((r) => setTimeout(r, 500));
    if (i === 119) throw new Error("server did not start in 60 s:\n" + log);
  }
  process.env.E2E_BASE_URL = base;
  process.env.E2E_OWNER_EMAIL = creds.SEED_OWNER_EMAIL;
  process.env.E2E_OWNER_PASSWORD = creds.SEED_OWNER_PASSWORD;
  process.env.E2E_WAITER_PIN = creds.SEED_WAITER_PIN;
  process.env.E2E_CHEF_PIN = creds.SEED_CHEF_PIN;
  return async () => { server?.kill("SIGTERM"); fs.rmSync(dir, { recursive: true, force: true }); };
}
