import { get } from "@/modules/platform/db";
import { checkPassword, setOwnerCookie } from "@/modules/platform/auth";
import { json, bad, body } from "@/modules/platform/http";

export async function POST(req: Request) {
  const b = await body(req);
  const email = String(b.email || "").trim().toLowerCase();
  const u = get("SELECT * FROM users WHERE email = ?", email);
  if (!u || !checkPassword(String(b.password || ""), u.password_hash)) return bad("Wrong email or password.", 401);
  const r = get("SELECT id, slug FROM restaurants WHERE owner_id = ? ORDER BY id LIMIT 1", u.id);
  if (!r) return bad("This account has no restaurant.", 404);
  await setOwnerCookie({ userId: u.id, restaurantId: r.id, slug: r.slug });
  return json({ ok: true, slug: r.slug });
}
