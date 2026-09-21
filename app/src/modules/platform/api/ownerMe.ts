import { ownerSession } from "@/modules/platform/auth";
import { restaurantById } from "@/modules/platform/menu";
import { get } from "@/modules/platform/db";
import { json, unauthorized } from "@/modules/platform/http";

export async function GET() {
  const s = await ownerSession();
  if (!s) return unauthorized();
  const r = restaurantById(s.restaurantId)!;
  const used = get("SELECT COUNT(*) AS n FROM chat_messages WHERE restaurant_id = ? AND role = 'user' AND created_at >= date('now','start of month')", r.id)!.n;
  return json({ restaurant: r, chatsUsed: used });
}
