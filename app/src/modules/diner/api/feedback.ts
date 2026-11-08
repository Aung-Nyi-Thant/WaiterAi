import { restaurantBySlug } from "@/modules/platform/menu";
import { run } from "@/modules/platform/db";
import { json, bad, body } from "@/modules/platform/http";

// A thumbs-down can optionally carry a one-tap reason. Keeping this to a fixed, small set (rather
// than free text) matches the low-friction, anonymous, no-account nature of a diner's QR session.
const REASONS = new Set(["wrong", "confused", "allergen", ""]);

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await body(req);
  const r = restaurantBySlug(slug);
  if (!r) return bad("Restaurant not found.", 404);
  const value = Number(b.value) === -1 ? -1 : 1;
  const reason = REASONS.has(String(b.reason || "")) ? String(b.reason || "") : "";
  // the message id alone is a counter anyone can count up: the caller must also name the chat session the message belongs to
  run("UPDATE chat_messages SET feedback = ?, flagged = ?, feedback_reason = ? WHERE id = ? AND restaurant_id = ? AND role = 'assistant' AND session_id = ?",
    value, value === -1 ? 1 : 0, reason, Number(b.messageId), r.id, String(b.sessionId || ""));
  return json({ ok: true });
}
