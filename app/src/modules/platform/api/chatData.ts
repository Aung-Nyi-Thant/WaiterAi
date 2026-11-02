import { ownerSession } from "@/modules/platform/auth";
import { all, run } from "@/modules/platform/db";
import { pruneExpiredChatsIfDue } from "@/modules/platform/chatRetention";
import { json, bad, body, unauthorized } from "@/modules/platform/http";

export async function GET() {
  const owner = await ownerSession(); if (!owner) return unauthorized();
  pruneExpiredChatsIfDue();
  const sessions = all("SELECT id, table_no, lang, started_at, profile FROM chat_sessions WHERE restaurant_id = ? ORDER BY started_at DESC", owner.restaurantId);
  const messages = all("SELECT session_id, role, text, lang, topic, allergens, answered, created_at FROM chat_messages WHERE restaurant_id = ? ORDER BY id", owner.restaurantId);
  return json({ exportedAt: new Date().toISOString(), retentionDays: 30, sessions, messages });
}

export async function DELETE(req: Request) {
  const owner = await ownerSession(); if (!owner) return unauthorized();
  if ((await body(req)).confirm !== "DELETE CHAT") return bad("Type DELETE CHAT to remove this restaurant's chat history.");
  const removed = run("DELETE FROM chat_sessions WHERE restaurant_id = ?", owner.restaurantId).changes;
  return json({ ok: true, removed });
}
