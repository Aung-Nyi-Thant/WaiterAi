// Runs before every test file: gives it its own empty database folder and a fake cookie store.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "shopai-test-"));
process.env.SESSION_SECRET = "test-secret-not-for-production";
// the AI is always mocked in tests; these make sure nothing can reach a real model by accident
process.env.AI_PROVIDER = "ollama";
process.env.OLLAMA_URL = "http://ollama.invalid";
delete process.env.AI_API_KEY;

// next/headers cookies() only works inside a real request, so tests use a plain map instead
const jar = new Map<string, string>();
(globalThis as any).__cookieJar = jar;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n) } : undefined),
    set: (n: string, v: string) => { jar.set(n, v); },
    delete: (n: string) => { jar.delete(n); },
  }),
}));
