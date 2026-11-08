// Helpers for the component tests. The components talk to the real API through fetch("/api/..."); here that fetch is wired
// straight to the real route handlers and the real (temporary) database, so a click in the page goes through the same code as in
// production: no mocks of our own API. Only the AI model and the browser are replaced.
import fs from "node:fs";
import path from "node:path";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { signOut } from "../helpers";

// Waiting for the page: 1 s is too short when the machine is busy (a PIN change hashes with bcrypt, a slow CI runner takes seconds).
configure({ asyncUtilTimeout: 6000 });

const apiRoot = path.resolve(__dirname, "../../src/app/api");
type Route = { segments: string[]; file: string };
const routes: Route[] = [];
(function walk(dir: string, segs: string[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), [...segs, e.name]);
    else if (e.name === "route.ts") routes.push({ segments: segs, file: path.join(dir, e.name) });
  }
})(apiRoot, []);

function match(pathname: string): { route: Route; params: Record<string, string> } | null {
  const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  let best: { route: Route; params: Record<string, string>; score: number } | null = null;
  for (const route of routes) {
    if (route.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let score = 0, ok = true;
    route.segments.forEach((s, i) => {
      if (s.startsWith("[")) params[s.slice(1, -1)] = parts[i];
      else if (s === parts[i]) score += 1;
      else ok = false;
    });
    if (ok && (!best || score > best.score)) best = { route, params, score };
  }
  return best;
}

export type ApiCall = { method: string; url: string; body?: any };
/** Every request the page made, in order (read it to check what the screen sent). */
export const apiCalls: ApiCall[] = [];
/** Make a route fail or answer differently for one test: failNext("/api/public/golden-lotus/menu", 500). */
const forced = new Map<string, number>();
export const failNext = (pathname: string, status = 500) => forced.set(pathname, status);

/** What the AI model says to the next questions (the real model is never called). An Error means "model not running". */
let modelSays: string | Error = new Error("the model is not running");
export const setModel = (reply: string | Error) => { modelSays = reply; };

/** Requests still running. A screen may start one just before a test ends; if the next test signed out meanwhile, that request would be
 *  answered "Please sign in" after nobody is listening, and the unhandled error would fail an unrelated test (it did, on slow CI machines). */
const inflight = new Set<Promise<unknown>>();
function apiFetch(input: any, init: any = {}): Promise<Response> {
  const p = apiFetchNow(input, init);
  inflight.add(p);
  const done = () => inflight.delete(p);
  p.then(done, done);
  return p;
}
async function settle() {
  for (let i = 0; i < 10 && inflight.size; i++) { await Promise.allSettled([...inflight]); await new Promise<void>((r) => setTimeout(r, 0)); }
}

async function apiFetchNow(input: any, init: any = {}): Promise<Response> {
  const url = String(typeof input === "string" ? input : input.url);
  const u = new URL(url, "http://localhost");
  if (/^https?:/i.test(url) && !/^https?:\/\/(localhost|test\.local)/i.test(url)) {      // the language model (Ollama)
    if (modelSays instanceof Error) throw modelSays;
    return new Response(JSON.stringify({ message: { content: modelSays } }), { status: 200, headers: { "content-type": "application/json" } });
  }
  const method = String(init.method || "GET").toUpperCase();
  let body: any;
  try { body = typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  apiCalls.push({ method, url: u.pathname + u.search, body });
  if (forced.has(u.pathname)) { const s = forced.get(u.pathname)!; forced.delete(u.pathname); return new Response(JSON.stringify({ error: "forced failure" }), { status: s, headers: { "content-type": "application/json" } }); }
  const m = match(u.pathname);
  if (!m) return new Response(JSON.stringify({ error: `no route ${u.pathname}` }), { status: 404, headers: { "content-type": "application/json" } });
  const mod = await import(/* @vite-ignore */ m.route.file);
  const handler = mod[method];
  if (!handler) return new Response("method not allowed", { status: 405 });
  let reqBody: any = ["GET", "HEAD"].includes(method) ? undefined : init.body;
  let reqHeaders = init.headers;
  const g = globalThis as any;
  const jsdomFile = g.File;
  if (reqBody instanceof FormData) {
    // jsdom's FormData / File are not the ones Node's Request reads, so the form is sent as a plain multipart body, and while the route
    // runs, `File` is Node's, because the route checks `file instanceof File`
    const boundary = `----test${Math.random().toString(16).slice(2)}`;
    const parts: Buffer[] = [];
    for (const [key, value] of reqBody.entries()) {
      if (typeof value === "string") parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
      else {
        const bytes = await new Promise<Buffer>((res) => { const r = new FileReader(); r.onload = () => res(Buffer.from(r.result as ArrayBuffer)); r.readAsArrayBuffer(value as Blob); });
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${(value as File).name}"\r\nContent-Type: ${(value as File).type}\r\n\r\n`), bytes, Buffer.from("\r\n"));
      }
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    reqBody = Buffer.concat(parts);
    reqHeaders = { ...(reqHeaders || {}), "content-type": `multipart/form-data; boundary=${boundary}` };
    g.File = (await import("node:buffer")).File;
  }
  try {
    const req = new Request(`http://test.local${u.pathname}${u.search}`, { method, headers: reqHeaders, body: reqBody });
    return await handler(req, { params: Promise.resolve(m.params) });
  } finally { g.File = jsdomFile; }
}

/** Call once at the top of a component test file. */
export function withRealApi() {
  beforeEach(() => {
    apiCalls.length = 0;
    forced.clear();
    modelSays = new Error("the model is not running");
    signOut();
    (globalThis as any).__router.push.mockClear();
    (globalThis as any).__router.pathname = "/";
    (globalThis as any).__router.search = "";
    vi.stubGlobal("confirm", () => true);                     // window.confirm: "yes" unless a test says otherwise
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    window.history.replaceState({}, "", "/");
    // jsdom has no layout: these are what the browser would do when the page scrolls
    Element.prototype.scrollIntoView = () => {};
    Element.prototype.scrollTo = (() => {}) as any;
    vi.stubGlobal("fetch", apiFetch);
  });
  afterEach(async () => { cleanup(); await settle(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); setPhoneLanguage("en-US"); });
}

/** The language the phone reports (navigator.language). */
export const setPhoneLanguage = (l: string) => Object.defineProperty(window.navigator, "language", { value: l, configurable: true });

/** The mocked Next router: .push is a spy; .pathname / .search are what usePathname / useSearchParams return. */
export const router = (globalThis as any).__router as { push: any; pathname: string; search: string };

/** Let pending promises and effects finish (the components load data in effects). */
export const flush = () => new Promise<void>((r) => setTimeout(r, 0));
