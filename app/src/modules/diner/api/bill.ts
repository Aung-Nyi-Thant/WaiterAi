import { restaurantBySlug } from "@/modules/platform/menu";
import { tableBills } from "@/modules/staff/orders";
import { json, bad } from "@/modules/platform/http";

// The running bill for one table (the table number comes from the QR code), so diners can see
// what their table has ordered and what it owes.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const r = restaurantBySlug((await params).slug);
  if (!r) return bad("Restaurant not found.", 404);
  const table = (new URL(req.url).searchParams.get("t") || "").slice(0, 10);
  if (!table) return bad("Table number missing.");
  return json(tableBills(r.id, table)[0] || { table, lines: [], total: 0, pending: [], inKitchen: 0, asked: false });
}
