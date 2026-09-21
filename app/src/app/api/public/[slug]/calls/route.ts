import { restaurantBySlug } from "@/lib/menu";
import { run, get } from "@/lib/db";
import { json, bad, body } from "@/lib/http";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await body(req);
  const r = restaurantBySlug(slug);
  if (!r) return bad("Restaurant not found.", 404);
  const table = String(b.table || "").slice(0, 10);
  const kind = ["bill", "help", "other"].includes(b.kind) ? b.kind : "help";
  // one open call of the same kind per table is enough
  const dup = get("SELECT id FROM calls WHERE restaurant_id = ? AND table_no = ? AND kind = ? AND status = 'open'", r.id, table, kind);
  const id = dup ? dup.id : run("INSERT INTO calls (restaurant_id, table_no, kind) VALUES (?,?,?)", r.id, table, kind).id;
  return json({ ok: true, id });
}
