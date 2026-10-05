import { all, get } from "@/modules/platform/db";
import { checkPassword, setStaffCookie, pinGate } from "@/modules/platform/auth";
import { json, bad, body } from "@/modules/platform/http";

export async function POST(req: Request) {
  const b = await body(req);
  const r = get("SELECT id, slug FROM restaurants WHERE slug = ?", String(b.slug || "").trim().toLowerCase());
  if (!r) return bad("Restaurant not found.", 404);
  // wrong PINs are counted per restaurant, and per address where the address can be trusted (see pinGate in auth.ts)
  const gate = pinGate(req, r.id);
  if (gate.waitSec) return bad(`Too many wrong PINs. Try again in ${Math.ceil(gate.waitSec / 60)} minute(s).`, 429);
  const pin = String(b.pin || "");
  const rows = all("SELECT * FROM staff WHERE restaurant_id = ?", r.id).filter((x: any) => !b.role || x.role === b.role);
  let st: any;
  for (const x of rows) if (await checkPassword(pin, x.pin_hash)) { st = x; break; }
  if (!st) { gate.fail(); return bad("Wrong PIN.", 401); }
  gate.ok();
  await setStaffCookie({ staffId: st.id, restaurantId: r.id, role: st.role, slug: r.slug, name: st.name });
  return json({ ok: true, role: st.role });
}
