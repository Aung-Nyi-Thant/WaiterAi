import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { get } from "@/modules/platform/db";
import { DATA_DIR } from "@/modules/platform/paths";
import { clientIp, setting } from "@/modules/platform/rateLimit";

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, "secret");
  try { return fs.readFileSync(file, "utf8"); } catch {}
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const s = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(file, s);
  return s;
}
const SECRET = secret();

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const mac = (s: string) => crypto.createHmac("sha256", SECRET).update(s).digest("base64url");

function sign(payload: object, maxAgeSec: number): string {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + maxAgeSec * 1000 }));
  return `${body}.${mac(body)}`;
}
function verify<T>(token?: string): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = mac(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return p.exp > Date.now() ? (p as T) : null;
  } catch { return null; }
}

// Asynchronous bcrypt: a hash or compare takes ~50-100 ms of CPU, and the synchronous versions would freeze the whole server
// (every diner and the kitchen screens) for that long on each sign-in.
export const hashPassword = (p: string): Promise<string> => bcrypt.hash(p, 10);
export const checkPassword = (p: string, h: string): Promise<boolean> => bcrypt.compare(p, h);
// An unknown email must cost the same time as a wrong password, or the response time tells an attacker which emails have an account.
let dummyHash: Promise<string> | undefined;
export const checkPasswordUnknownUser = async (p: string): Promise<false> => { dummyHash ??= bcrypt.hash("dummy-password-for-timing", 10); await bcrypt.compare(p, await dummyHash); return false; };

export type OwnerSession = { userId: number; restaurantId: number; slug: string };
export type StaffSession = { staffId: number; restaurantId: number; role: "waiter" | "chef"; slug: string; name: string };

// The session cookies are "Secure" (sent only over HTTPS) in production. A demo on a shop's Wi-Fi served over plain http://192.168...
// would then never keep a sign-in (browsers drop Secure cookies on http, except on localhost), so COOKIE_SECURE=0 turns the flag off
// for that case; COOKIE_SECURE=1 forces it on. Do not use COOKIE_SECURE=0 on the internet.
export const cookieSecure = (): boolean => {
  const v = (process.env.COOKIE_SECURE || "").trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(v)) return false;
  if (["1", "true", "yes", "on"].includes(v)) return true;
  return process.env.NODE_ENV === "production";
};
const cookieOptions = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: cookieSecure(), path: "/", maxAge });

export async function setOwnerCookie(s: Omit<OwnerSession, never>) {
  (await cookies()).set("owner", sign(s, 60 * 60 * 24 * 7), cookieOptions(60 * 60 * 24 * 7));
}
export async function setStaffCookie(s: StaffSession) {
  (await cookies()).set("staff", sign(s, 60 * 60 * 12), cookieOptions(60 * 60 * 12));
}
export async function clearCookies() {
  const c = await cookies();
  c.delete("owner");
  c.delete("staff");
}
export async function ownerSession(): Promise<OwnerSession | null> {
  const s = verify<OwnerSession>((await cookies()).get("owner")?.value);
  if (!s) return null;
  // the restaurant must still belong to this user
  return get("SELECT id FROM restaurants WHERE id = ? AND owner_id = ?", s.restaurantId, s.userId) ? s : null;
}
export async function staffSession(): Promise<StaffSession | null> {
  const s = verify<StaffSession>((await cookies()).get("staff")?.value);
  if (!s) return null;
  // like the owner session: a staff member the owner deleted loses access at once, and a changed role applies at once
  const row = get("SELECT name, role FROM staff WHERE id = ? AND restaurant_id = ?", s.staffId, s.restaurantId);
  return row ? { ...s, name: row.name, role: row.role } : null;
}

// ---- PIN guessing limit: a 4-digit PIN has only 10,000 values, so repeated wrong PINs lock sign-in for a while.
// Two counters, both of wrong PINs only:
//   per caller   5 wrong PINs from one address lock that address out of this restaurant for 10 minutes. The address is only known
//                behind your own reverse proxy (RATE_LIMIT_TRUST_PROXY=1, see clientIp); without one every caller shares one
//                bucket, so 5 wrong PINs lock everybody out of this restaurant.
//   per restaurant  RATE_LIMIT_PIN_RESTAURANT_MAX (default 20) wrong PINs in total lock the restaurant's staff sign-in for 10 minutes,
//                whatever addresses or headers they came with. This is the cap that cannot be dodged by changing X-Forwarded-For.
// Trade-off: anyone who can reach the sign-in page can lock a restaurant's staff out for 10 minutes by sending wrong PINs (the owner
// still gets in with the password and can see the lock is running). A higher cap makes that harder and guessing easier:
// 20 per 10 minutes is at most 2,880 guesses a day out of 10,000 PINs, and a PIN the owner picks should not be 1234.
// A correct PIN clears the caller's counter (a mistyped PIN is forgiven) but never the restaurant's: an attacker who knows one valid
// PIN could otherwise mix it in to reset the count, and would then be held back only by the restaurant cap.
const MAX_FAILS = 5, LOCK_MS = 10 * 60_000;
type Counter = { n: number; until: number; last: number };
const fails = new Map<string, Counter>();
const lockLeft = (key: string, now: number): number => {
  const f = fails.get(key);
  return f && f.until > now ? Math.ceil((f.until - now) / 1000) : 0;
};
const bump = (key: string, max: number, now: number) => {
  if (max <= 0) return;
  let f = fails.get(key);
  if (!f || (f.until <= now && now - f.last > LOCK_MS)) f = { n: 0, until: 0, last: now };   // old failures do not add up forever
  f.n++; f.last = now;
  if (f.n >= max) { f.until = now + LOCK_MS; f.n = 0; }
  fails.set(key, f);
  if (fails.size > 5000) for (const [k, v] of fails) if (v.until <= now && now - v.last > LOCK_MS) fails.delete(k);
};
export function pinGate(req: Request, restaurantId: number): { waitSec: number; fail: () => void; ok: () => void } {
  const ip = clientIp(req);
  const caller = `${restaurantId}|${ip ?? "any"}`, whole = `${restaurantId}|all`;
  const wholeMax = setting("RATE_LIMIT_PIN_RESTAURANT_MAX", 20);
  const now = Date.now();
  return {
    waitSec: Math.max(lockLeft(caller, now), wholeMax > 0 ? lockLeft(whole, now) : 0),
    fail: () => { const t = Date.now(); bump(caller, MAX_FAILS, t); bump(whole, wholeMax, t); },
    ok: () => { fails.delete(caller); },
  };
}
export const clearPinLocks = () => fails.clear();
