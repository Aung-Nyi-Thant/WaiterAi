import { all, get, run, db } from "@/lib/db";
import { hashPassword, setOwnerCookie } from "@/lib/auth";
import { json, bad, body } from "@/lib/http";
import { uniqueSlug } from "@/lib/menu";

export async function POST(req: Request) {
  const b = await body(req);
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const name = String(b.restaurantName || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("Please enter a valid email.");
  if (password.length < 8) return bad("Password must be at least 8 characters.");
  if (!name) return bad("Please enter your restaurant name.");
  if (get("SELECT 1 FROM users WHERE email = ?", email)) return bad("This email already has an account.", 409);
  db.exec("BEGIN");
  try {
    const userId = run("INSERT INTO users (email, password_hash) VALUES (?, ?)", email, hashPassword(password)).id;
    const slug = uniqueSlug(name);
    const rid = run("INSERT INTO restaurants (owner_id, slug, name, city) VALUES (?,?,?,?)", userId, slug, name, String(b.city || "").trim()).id;
    ["Starters", "Mains", "Desserts", "Drinks"].forEach((c, i) => run("INSERT INTO categories (restaurant_id, name_en, sort) VALUES (?,?,?)", rid, c, i));
    db.exec("COMMIT");
    await setOwnerCookie({ userId, restaurantId: rid, slug });
    return json({ ok: true, slug });
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
