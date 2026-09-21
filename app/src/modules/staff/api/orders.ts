import { staffSession } from "@/modules/platform/auth";
import { get, run } from "@/modules/platform/db";
import { json, bad, body, unauthorized } from "@/modules/platform/http";

// who may move an order to which status
const FLOW: Record<string, { from: string[]; to: string; roles: string[] }> = {
  take: { from: ["picked"], to: "new", roles: ["waiter"] },
  later: { from: ["picked"], to: "cancelled", roles: ["waiter"] },
  cooking: { from: ["new"], to: "cooking", roles: ["chef"] },
  ready: { from: ["cooking"], to: "ready", roles: ["chef"] },
  served: { from: ["ready"], to: "served", roles: ["waiter", "chef"] },
};
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await staffSession(); if (!s) return unauthorized();
  const { action } = await body(req);
  const f = FLOW[action];
  if (!f) return bad("Unknown action.");
  if (!f.roles.includes(s.role)) return bad("This action is not allowed for your role.", 403);
  const o = get("SELECT id, status FROM orders WHERE id = ? AND restaurant_id = ?", Number((await params).id), s.restaurantId);
  if (!o) return bad("Order not found.", 404);
  if (!f.from.includes(o.status)) return bad(`This order is already ${o.status}.`, 409);
  run("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", f.to, o.id);
  return json({ ok: true, status: f.to });
}
