// Starts the real, built Next.js server on a free port with a fresh database seeded by scripts/seed.mts,
// the way a deployment would be set up. The stub defaults to unavailable; only ai-chat tests control it.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";
import { startOllamaStub } from "./ollamaStub";

const root = path.resolve(__dirname, "../..");

const freePort = () => new Promise<number>((res, rej) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = (s.address() as net.AddressInfo).port; s.close(() => res(p)); });
  s.on("error", rej);
});

export default async function setup(project: TestProject) {
  if (!fs.existsSync(path.join(root, ".next", "BUILD_ID"))) throw new Error("No production build found. Run `npm run build` first.");
  const live = project.config.name === "ai-live";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-e2e-"));
  let server: ChildProcess | undefined;
  let stub: Awaited<ReturnType<typeof startOllamaStub>> | undefined;
  const cleanup = async () => {
    try {
      if (server?.pid && server.exitCode === null && server.signalCode === null) {
        const exited = new Promise<void>((resolve) => server!.once("exit", () => resolve()));
        server.kill("SIGTERM");
        const timer = setTimeout(() => server!.kill("SIGKILL"), 5000);
        try { await exited; } finally { clearTimeout(timer); }
      }
    } finally {
      try { await stub?.close(); }
      finally { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); }
    }
  };
  try {
    if (!live) stub = await startOllamaStub();
    const ollamaUrl = live ? process.env.OLLAMA_URL || "http://localhost:11434" : stub!.url;
    const ollamaModel = live ? process.env.OLLAMA_MODEL || "gemma4:12b" : "shopai-e2e:latest";
    if (live) {
      try {
        const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const name = ollamaModel.includes(":") ? ollamaModel : `${ollamaModel}:latest`;
        if (!data.models?.some((m: { name?: string; model?: string }) => m.name === name || m.model === name)) {
          throw new Error(`model ${name} is not installed`);
        }
      } catch (error) {
        throw new Error(`Live AI prerequisite failed at ${ollamaUrl} for ${ollamaModel}: ${(error as Error).message}. Start local Ollama and install the configured model; this suite never skips or substitutes a stub.`);
      }
    }
    const creds = { SEED_OWNER_EMAIL: "e2e-owner@test.local", SEED_OWNER_PASSWORD: "e2e-password-123", SEED_WAITER_PIN: "4821", SEED_CHEF_PIN: "7305" };
    const env = { ...process.env, NODE_ENV: "production" as const, DATA_DIR: dir, SESSION_SECRET: "e2e-secret", AI_PROVIDER: "ollama", OLLAMA_URL: ollamaUrl, OLLAMA_MODEL: ollamaModel, AI_WARMUP: "0", RATE_LIMIT_LOGIN_MAX: "5", RATE_LIMIT_CHAT_MAX: "10", ...creds };
    const seeded = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/seed.mts"], { cwd: root, env, encoding: "utf8" });
    if (seeded.status !== 0) throw new Error("seed failed: " + seeded.stdout + seeded.stderr);
    // the second sample restaurant (HaChi Kyu, 104 dishes), with its own owner and PINs, the way a deployment would add it
    const hachiCreds = { SEED_HACHI_OWNER_EMAIL: "e2e-hachi@test.local", SEED_HACHI_OWNER_PASSWORD: "e2e-hachi-pass-123", SEED_HACHI_WAITER_PIN: "5937", SEED_HACHI_CHEF_PIN: "6048" };
    const seededHachi = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/seed-hachi-kyu.mts"], { cwd: root, env: { ...env, ...hachiCreds }, encoding: "utf8" });
    if (seededHachi.status !== 0) throw new Error("hachi seed failed: " + seededHachi.stdout + seededHachi.stderr);

    const port = await freePort();
    server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: root, env, stdio: "pipe" });
    let log = "";
    let spawnError: Error | undefined;
    server.on("error", (error) => { spawnError = error; });
    server.stdout?.on("data", (d) => (log += d)); server.stderr?.on("data", (d) => (log += d));
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 120; i++) {
      try { if ((await fetch(`${base}/api/public/golden-lotus/menu`, { signal: AbortSignal.timeout(1000) })).ok) break; } catch {}
      if (spawnError) throw spawnError;
      if (server.exitCode !== null) throw new Error("server exited early:\n" + log);
      await new Promise((r) => setTimeout(r, 500));
      if (i === 119) throw new Error("server did not start in 60 s:\n" + log);
    }
    process.env.E2E_BASE_URL = base;
    process.env.E2E_DATA_DIR = dir;
    if (stub) process.env.E2E_OLLAMA_CONTROL_URL = stub.controlUrl;
    else {
      delete process.env.E2E_OLLAMA_CONTROL_URL;
      process.env.OLLAMA_URL = ollamaUrl;
      process.env.OLLAMA_MODEL = ollamaModel;
    }
    process.env.E2E_OWNER_EMAIL = creds.SEED_OWNER_EMAIL;
    process.env.E2E_OWNER_PASSWORD = creds.SEED_OWNER_PASSWORD;
    process.env.E2E_WAITER_PIN = creds.SEED_WAITER_PIN;
    process.env.E2E_CHEF_PIN = creds.SEED_CHEF_PIN;
    process.env.E2E_HACHI_OWNER_EMAIL = hachiCreds.SEED_HACHI_OWNER_EMAIL;
    process.env.E2E_HACHI_OWNER_PASSWORD = hachiCreds.SEED_HACHI_OWNER_PASSWORD;
    process.env.E2E_HACHI_WAITER_PIN = hachiCreds.SEED_HACHI_WAITER_PIN;
    process.env.E2E_HACHI_CHEF_PIN = hachiCreds.SEED_HACHI_CHEF_PIN;
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
