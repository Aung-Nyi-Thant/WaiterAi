import { get, run, db } from "@/modules/platform/db";
import { hashPassword, setOwnerCookie } from "@/modules/platform/auth";
import { json, bad, body, tooMany } from "@/modules/platform/http";
import { uniqueSlug } from "@/modules/platform/menu";
import { hit, setting, clientIp } from "@/modules/platform/rateLimit";

export async function POST(req: Request) {
  const b = await body(req);
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const name = String(b.restaurantName || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("Please enter a valid email.");
  if (password.length < 8) return bad("Password must be at least 8 characters.");
  if (!name) return bad("Please enter your restaurant name.");
  if (get("SELECT 1 FROM users WHERE email = ?", email)) return bad("This email already has an account.", 409);
  // each registration costs a password hash and creates data, so limit how many accounts can be created per window
  const win = setting("RATE_LIMIT_REGISTER_WINDOW_SEC", 3600), ip = clientIp(req);
  for (const [key, max] of [["register:all", setting("RATE_LIMIT_REGISTER_MAX", 20)], [ip ? `register:ip:${ip}` : null, setting("RATE_LIMIT_REGISTER_IP_MAX", 5)]] as [string | null, number][]) {
    const v = key ? hit(key, max, win) : null;
    if (v && !v.allowed) return tooMany(v.retryAfter);
  }
  const passwordHash = await hashPassword(password);      // before BEGIN: nothing may be awaited inside a transaction (the connection is shared)
  db.exec("BEGIN");
  try {
    const userId = run("INSERT INTO users (email, password_hash) VALUES (?, ?)", email, passwordHash).id;
    const slug = uniqueSlug(name);
    const rid = run("INSERT INTO restaurants (owner_id, slug, name, city) VALUES (?,?,?,?)", userId, slug, name, String(b.city || "").trim()).id;
    ["Starters", "Mains", "Desserts", "Drinks"].forEach((c, i) => { run("INSERT INTO categories (restaurant_id, name_en, sort) VALUES (?,?,?)", rid, c, i); });
    db.exec("COMMIT");
    await setOwnerCookie({ userId, restaurantId: rid, slug });
    return json({ ok: true, slug });
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
