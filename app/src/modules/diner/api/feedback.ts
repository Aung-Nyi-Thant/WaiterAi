import { restaurantBySlug } from "@/modules/platform/menu";
import { run } from "@/modules/platform/db";
import { json, bad, body } from "@/modules/platform/http";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await body(req);
  const r = restaurantBySlug(slug);
  if (!r) return bad("Restaurant not found.", 404);
  const value = Number(b.value) === -1 ? -1 : 1;
  run("UPDATE chat_messages SET feedback = ?, flagged = ? WHERE id = ? AND restaurant_id = ? AND role = 'assistant'", value, value === -1 ? 1 : 0, Number(b.messageId), r.id);
  return json({ ok: true });
}
