import { ownerSession } from "@/modules/platform/auth";
import { RESOURCES, update, remove } from "@/modules/owner/crud";
import { json, bad, body, unauthorized } from "@/modules/platform/http";

type P = { params: Promise<{ resource: string; id: string }> };
export async function PUT(req: Request, { params }: P) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const { resource, id } = await params;
  const c = RESOURCES[resource]; if (!c) return bad("Unknown resource.", 404);
  const r = update(s.restaurantId, c, Number(id), await body(req));
  return r.error ? bad(r.error, 404) : json({ ok: true });
}
export async function DELETE(_: Request, { params }: P) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const { resource, id } = await params;
  const c = RESOURCES[resource]; if (!c) return bad("Unknown resource.", 404);
  remove(s.restaurantId, c, Number(id));
  return json({ ok: true });
}
