// A small in-memory rate limiter (sliding window), used for the login and chat endpoints.
// State lives in this server process only: with several server instances each one counts separately.
//
// Settings (environment variables, read on every request; 0 switches that limit off):
//   RATE_LIMIT_LOGIN_MAX / _WINDOW_SEC        failed logins per account (and per address, see below)      default 10 / 60
//   RATE_LIMIT_CHAT_MAX / _WINDOW_SEC         chat messages per chat session                              default 20 / 60
//   RATE_LIMIT_CHAT_RESTAURANT_MAX            chat messages per restaurant in the window                  default 120
//   RATE_LIMIT_CHAT_IP_MAX                    chat messages per client address in the window              default 60
//   RATE_LIMIT_TRUST_PROXY=1                  use the client address from X-Forwarded-For (see clientIp)  default off
const g = globalThis as any;
if (!g.__rateLimitStore) g.__rateLimitStore = new Map();
const store: Map<string, number[]> = g.__rateLimitStore;

export const setting = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

function recent(key: string, windowMs: number, now: number): number[] {
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length) store.set(key, hits); else store.delete(key);
  return hits;
}
function sweep(now: number, windowMs: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) if (!v.length || now - v[v.length - 1] >= windowMs) store.delete(k);
}

export type Verdict = { allowed: boolean; retryAfter: number };
const verdict = (hits: number[], max: number, windowMs: number, now: number): Verdict =>
  max > 0 && hits.length >= max ? { allowed: false, retryAfter: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) } : { allowed: true, retryAfter: 0 };

/** Is this key currently over its limit? Does not count anything. */
export function peek(key: string, max: number, windowSec: number, now = Date.now()): Verdict {
  const windowMs = windowSec * 1000;
  return verdict(recent(key, windowMs, now), max, windowMs, now);
}
/** Counts one event for this key (for example one failed login). */
export function record(key: string, windowSec: number, now = Date.now()) {
  const windowMs = windowSec * 1000;
  const hits = recent(key, windowMs, now);
  hits.push(now);
  store.set(key, hits);
  sweep(now, windowMs);
}
/** Counts one request and says whether it is allowed. A request over the limit is not counted again. */
export function hit(key: string, max: number, windowSec: number, now = Date.now()): Verdict {
  const v = peek(key, max, windowSec, now);
  if (v.allowed && max > 0) record(key, windowSec, now);
  return v;
}
export const reset = (key: string) => { store.delete(key); };
export const clearAll = () => store.clear();

/**
 * The client's address, or null when it cannot be trusted. A client can send any X-Forwarded-For itself, so it is only
 * used when RATE_LIMIT_TRUST_PROXY=1 (the server runs behind a reverse proxy that appends the address it saw).
 * The LAST entry is the one the nearest proxy added.
 */
export function clientIp(req: Request): string | null {
  if (process.env.RATE_LIMIT_TRUST_PROXY !== "1") return null;
  const last = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean).pop();
  return last || req.headers.get("x-real-ip") || null;
}

/** Login protection: only FAILED attempts count. Returns a verdict before the password/PIN is checked. */
export function loginGate(req: Request, scope: "owner" | "staff", account: string): { blocked: Verdict | null; fail: () => void; ok: () => void } {
  const max = setting("RATE_LIMIT_LOGIN_MAX", 10), win = setting("RATE_LIMIT_LOGIN_WINDOW_SEC", 60);
  const ip = clientIp(req);
  const keys = [`login:${scope}:acct:${account.toLowerCase().slice(0, 100)}`, ...(ip ? [`login:${scope}:ip:${ip}`] : [])];
  const over = keys.map((k) => peek(k, max, win)).find((v) => !v.allowed);
  return {
    blocked: over || null,
    fail: () => { for (const k of keys) record(k, win); },
    ok: () => reset(keys[0]),            // a correct login clears the account's counter, never the address's (it could be used to dodge the limit)
  };
}
