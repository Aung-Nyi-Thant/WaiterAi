import { staffSession } from "@/modules/platform/auth";
import { db, run } from "@/modules/platform/db";
import { json, bad, unauthorized } from "@/modules/platform/http";

// Floor staff close a table's bill once it is paid: its accepted orders stop counting, and an
// open "bill, please" call for that table is cleared with it.
export async function POST(_: Request, { params }: { params: Promise<{ table: string }> }) {
  const s = await staffSession(); if (!s) return unauthorized();
  if (s.role !== "waiter") return bad("This action is not allowed for your role.", 403);
  const table = decodeURIComponent((await params).table).slice(0, 10);
  db.exec("BEGIN");
  try {
    const paid = run("UPDATE orders SET paid_at = datetime('now') WHERE restaurant_id = ? AND table_no = ? AND paid_at IS NULL AND status IN ('new','cooking','ready','served')", s.restaurantId, table).changes;
    run("UPDATE calls SET status = 'done', done_at = datetime('now') WHERE restaurant_id = ? AND table_no = ? AND kind = 'bill' AND status = 'open'", s.restaurantId, table);
    db.exec("COMMIT");
    return json({ ok: true, orders: paid });
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
