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
// the other test files make many logins and chats from one "address": keep rate limits out of their way
// (tests/ratelimit.test.ts sets its own values)
Object.assign(process.env, { RATE_LIMIT_LOGIN_MAX: "100000", RATE_LIMIT_CHAT_MAX: "100000", RATE_LIMIT_CHAT_RESTAURANT_MAX: "100000", RATE_LIMIT_CHAT_IP_MAX: "100000", RATE_LIMIT_REGISTER_MAX: "100000", RATE_LIMIT_REGISTER_IP_MAX: "100000" });
delete process.env.RATE_LIMIT_TRUST_PROXY;

// next/headers cookies() only works inside a real request, so tests use a plain map instead
const jar = new Map<string, string>();
const jarOptions = new Map<string, any>();            // the options each cookie was set with (httpOnly, secure ...)
(globalThis as any).__cookieJar = jar;
(globalThis as any).__cookieOptions = jarOptions;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n) } : undefined),
    set: (n: string, v: string, o?: any) => { jar.set(n, v); jarOptions.set(n, o); },
    delete: (n: string) => { jar.delete(n); },
  }),
}));

// Component tests (tests/ui): next/navigation and next/link need a mounted Next router, which does not exist in a test.
// The router is a set of spies the test can read: (globalThis as any).__router.push etc.
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn(), pathname: "/", search: "" };
(globalThis as any).__router = router;
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => router.pathname,
  useSearchParams: () => new URLSearchParams(router.search),
  useParams: () => ({}),
  redirect: (to: string) => { router.push(to); },
}));
vi.mock("next/link", async () => {
  const React = await import("react");
  return { default: ({ href, children, ...rest }: any) => React.createElement("a", { href: typeof href === "string" ? href : href?.pathname, ...rest }, children) };
});
