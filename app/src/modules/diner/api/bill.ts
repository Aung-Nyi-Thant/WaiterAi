import { restaurantBySlug } from "@/modules/platform/menu";
import { get } from "@/modules/platform/db";
import { tableBills } from "@/modules/staff/orders";
import { json, bad } from "@/modules/platform/http";

// The running bill for one table (the table number comes from the QR code), so diners can see what their
// table has ordered and what it owes. Diners have no account, so the phone proves it belongs to the table with
// the random receipt code it sent along with its picks (?r=...). Without a matching code nothing is shown, so
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
  if (!/^[A-Za-z0-9-]{24,64}$/.test(code)) return json(empty);
  const mine = get("SELECT 1 AS ok FROM orders WHERE restaurant_id = ? AND table_no = ? AND receipt = ? AND paid_at IS NULL AND status != 'cancelled'", r.id, table, code);
  if (!mine) return json(empty);
  const { lines, total, pending, asked } = tableBills(r.id, table)[0] || empty;
  return json({ table, lines, total, pending, asked });
}
