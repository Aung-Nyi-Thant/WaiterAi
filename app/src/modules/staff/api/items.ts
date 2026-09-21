import { staffSession } from "@/modules/platform/auth";
import { run } from "@/modules/platform/db";
import { json, body, unauthorized } from "@/modules/platform/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await staffSession(); if (!s) return unauthorized();
  const { available } = await body(req);
  run("UPDATE menu_items SET available = ? WHERE id = ? AND restaurant_id = ?", available ? 1 : 0, Number((await params).id), s.restaurantId);
  return json({ ok: true });
}
