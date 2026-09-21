import { staffSession } from "@/lib/auth";
import { run } from "@/lib/db";
import { json, unauthorized } from "@/lib/http";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await staffSession(); if (!s) return unauthorized();
  run("UPDATE calls SET status = 'done', done_at = datetime('now') WHERE id = ? AND restaurant_id = ?", Number((await params).id), s.restaurantId);
  return json({ ok: true });
}
