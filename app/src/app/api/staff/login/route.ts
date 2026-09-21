import { all, get } from "@/lib/db";
import { checkPassword, setStaffCookie } from "@/lib/auth";
import { json, bad, body } from "@/lib/http";

export async function POST(req: Request) {
  const b = await body(req);
  const r = get("SELECT id, slug FROM restaurants WHERE slug = ?", String(b.slug || "").trim().toLowerCase());
  if (!r) return bad("Restaurant not found.", 404);
  const pin = String(b.pin || "");
  const rows = all("SELECT * FROM staff WHERE restaurant_id = ?", r.id).filter((x: any) => !b.role || x.role === b.role);
  const st = rows.find((x: any) => checkPassword(pin, x.pin_hash));
  if (!st) return bad("Wrong PIN.", 401);
  await setStaffCookie({ staffId: st.id, restaurantId: r.id, role: st.role, slug: r.slug, name: st.name });
  return json({ ok: true, role: st.role });
}
