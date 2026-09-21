import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { get } from "./db";

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(process.cwd(), "data", "secret");
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
  return verify<StaffSession>((await cookies()).get("staff")?.value);
}
