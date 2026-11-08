import { restaurantBySlug } from "@/modules/platform/menu";
import { all, get } from "@/modules/platform/db";
import { tableBills } from "@/modules/staff/orders";
import { json, bad } from "@/modules/platform/http";

// The running bill for one table (the table number comes from the QR code), so diners can see what their
// table has ordered and what it owes. Diners have no account, so the phone proves it belongs to the table with
// the random receipt code the server issued when it sent its picks (?r=..., see diner/api/orders.ts; a phone cannot choose its own). Without a matching code nothing is shown, so
// table numbers cannot be tried one by one to read other tables' orders. The diner is not shown kitchen
// progress: order status for diners is out of scope in the SRS.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const r = restaurantBySlug((await params).slug);
  if (!r) return bad("Restaurant not found.", 404);
  const q = new URL(req.url).searchParams;
  const table = (q.get("t") || "").slice(0, 10);
  if (!table) return bad("Table number missing.");
  const code = q.get("r") || "";
  const empty = { table, lines: [], total: 0, pending: [], asked: false };
  if (!/^[a-f0-9]{48}$/.test(code)) return json(empty);
  // The code is handed out to anyone who sends picks for a table, so it only opens the table's bill once staff have accepted one of its orders
  // (a person who invents picks for someone else's table is never accepted). Until then the phone sees its own picks and nothing else.
  const accepted = get("SELECT 1 AS ok FROM orders WHERE restaurant_id = ? AND table_no = ? AND receipt = ? AND paid_at IS NULL AND status NOT IN ('picked','cancelled')", r.id, table, code);
  if (!accepted) {
    const own = all("SELECT i.name, SUM(i.qty) AS qty, i.price FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.restaurant_id = ? AND o.table_no = ? AND o.receipt = ? AND o.paid_at IS NULL AND o.status = 'picked' GROUP BY i.name, i.price ORDER BY MIN(i.id)", r.id, table, code);
    return json({ ...empty, pending: own });
  }
  const { lines, total, pending, asked } = tableBills(r.id, table)[0] || empty;
  return json({ table, lines, total, pending, asked });
}
