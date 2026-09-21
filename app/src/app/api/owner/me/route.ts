import { ownerSession } from "@/lib/auth";
import { restaurantById } from "@/lib/menu";
import { get } from "@/lib/db";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  const s = await ownerSession();
  if (!s) return unauthorized();
  const r = restaurantById(s.restaurantId)!;
  const used = get("SELECT COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND created_at >= date('now','start of month')", r.id)!.n;
  return json({ restaurant: r, chatsUsed: used });
}
