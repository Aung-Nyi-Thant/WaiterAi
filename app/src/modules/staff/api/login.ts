import { all, get } from "@/modules/platform/db";
import { checkPassword, setStaffCookie, pinLockedFor, pinFailed, pinOk } from "@/modules/platform/auth";
import { json, bad, body } from "@/modules/platform/http";

export async function POST(req: Request) {
  const b = await body(req);
  const r = get("SELECT id, slug FROM restaurants WHERE slug = ?", String(b.slug || "").trim().toLowerCase());
  if (!r) return bad("Restaurant not found.", 404);
  // wrong PINs are counted per restaurant and caller address (the caller's address is only known behind a proxy)
  const key = `${r.id}|${(req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local").split(",")[0].trim()}`;
  const wait = pinLockedFor(key);
  if (wait) return bad(`Too many wrong PINs. Try again in ${Math.ceil(wait / 60)} minute(s).`, 429);
  const pin = String(b.pin || "");
  const rows = all("SELECT * FROM staff WHERE restaurant_id = ?", r.id).filter((x: any) => !b.role || x.role === b.role);
  const st = rows.find((x: any) => checkPassword(pin, x.pin_hash));
  if (!st) { pinFailed(key); return bad("Wrong PIN.", 401); }
  pinOk(key);
  await setStaffCookie({ staffId: st.id, restaurantId: r.id, role: st.role, slug: r.slug, name: st.name });
  return json({ ok: true, role: st.role });
}
