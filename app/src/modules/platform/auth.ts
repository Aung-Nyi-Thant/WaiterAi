import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { get } from "@/modules/platform/db";
import { DATA_DIR } from "@/modules/platform/paths";

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

export const hashPassword = (p: string) => bcrypt.hashSync(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compareSync(p, h);

export type OwnerSession = { userId: number; restaurantId: number; slug: string };
export type StaffSession = { staffId: number; restaurantId: number; role: "waiter" | "chef"; slug: string; name: string };

export async function setOwnerCookie(s: Omit<OwnerSession, never>) {
  (await cookies()).set("owner", sign(s, 60 * 60 * 24 * 7), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function setStaffCookie(s: StaffSession) {
  (await cookies()).set("staff", sign(s, 60 * 60 * 12), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
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
const MAX_FAILS = 5, LOCK_MS = 10 * 60_000;
const fails = new Map<string, { n: number; until: number; last: number }>();
export const pinLockedFor = (key: string): number => {
  const f = fails.get(key);
  return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
};
export const pinFailed = (key: string) => {
  const now = Date.now();
  let f = fails.get(key);
  if (!f || f.until <= now && now - f.last > LOCK_MS) f = { n: 0, until: 0, last: now };   // old failures do not add up forever
  f.n++; f.last = now;
  if (f.n >= MAX_FAILS) { f.until = now + LOCK_MS; f.n = 0; }
  fails.set(key, f);
  if (fails.size > 5000) for (const [k, v] of fails) if (v.until <= now && now - v.last > LOCK_MS) fails.delete(k);
};
export const pinOk = (key: string) => { fails.delete(key); };
