import { ownerSession } from "@/modules/platform/auth";
import { RESOURCES, list, create } from "@/modules/owner/crud";
import { json, bad, body, unauthorized } from "@/modules/platform/http";

export async function GET(_: Request, { params }: { params: Promise<{ resource: string }> }) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const c = RESOURCES[(await params).resource]; if (!c) return bad("Unknown resource.", 404);
  return json(list(s.restaurantId, c));
}
export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const c = RESOURCES[(await params).resource]; if (!c) return bad("Unknown resource.", 404);
  const r = create(s.restaurantId, c, await body(req));
  return r.error ? bad(r.error) : json({ ok: true, id: r.id });
}
