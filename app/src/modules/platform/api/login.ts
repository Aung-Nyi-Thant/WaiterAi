import { get } from "@/modules/platform/db";
import { checkPassword, checkPasswordUnknownUser, setOwnerCookie } from "@/modules/platform/auth";
import { json, bad, body, tooMany } from "@/modules/platform/http";
import { loginGate } from "@/modules/platform/rateLimit";

export async function POST(req: Request) {
  const b = await body(req);
  const email = String(b.email || "").trim().toLowerCase();
  const gate = loginGate(req, "owner", email);
  if (gate.blocked) return tooMany(gate.blocked.retryAfter);
  const u = get("SELECT * FROM users WHERE email = ?", email);
  // always one bcrypt compare, also for an unknown email, so the time taken does not reveal which emails exist
  const good = u ? await checkPassword(String(b.password || ""), u.password_hash) : await checkPasswordUnknownUser(String(b.password || ""));
  if (!u || !good) { gate.fail(); return bad("Wrong email or password.", 401); }
  gate.ok();
  const r = get("SELECT id, slug FROM restaurants WHERE owner_id = ? ORDER BY id LIMIT 1", u.id);
  if (!r) return bad("This account has no restaurant.", 404);
  await setOwnerCookie({ userId: u.id, restaurantId: r.id, slug: r.slug });
  return json({ ok: true, slug: r.slug });
}
