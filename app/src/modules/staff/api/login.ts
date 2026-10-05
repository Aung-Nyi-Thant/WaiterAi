import { all, get } from "@/modules/platform/db";
import { checkPassword, setStaffCookie } from "@/modules/platform/auth";
import { json, bad, body, tooMany } from "@/modules/platform/http";
import { loginGate } from "@/modules/platform/rateLimit";

export async function POST(req: Request) {
  const b = await body(req);
  const slug = String(b.slug || "").trim().toLowerCase();
  const gate = loginGate(req, "staff", slug);       // a 4-digit PIN can be guessed, so failed PINs are limited per restaurant
  if (gate.blocked) return tooMany(gate.blocked.retryAfter);
  const r = get("SELECT id, slug FROM restaurants WHERE slug = ?", slug);
  if (!r) return bad("Restaurant not found.", 404);
  const pin = String(b.pin || "");
  const rows = all("SELECT * FROM staff WHERE restaurant_id = ?", r.id).filter((x: any) => !b.role || x.role === b.role);
  const st = rows.find((x: any) => checkPassword(pin, x.pin_hash));
  if (!st) { gate.fail(); return bad("Wrong PIN.", 401); }
  gate.ok();
  await setStaffCookie({ staffId: st.id, restaurantId: r.id, role: st.role, slug: r.slug, name: st.name });
  return json({ ok: true, role: st.role });
}
