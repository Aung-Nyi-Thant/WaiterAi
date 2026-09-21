import { staffSession } from "@/modules/platform/auth";
import { all } from "@/modules/platform/db";
import { ordersWith } from "@/modules/staff/orders";
import { json, unauthorized } from "@/modules/platform/http";

export async function GET() {
  const s = await staffSession(); if (!s) return unauthorized();
  const orders = ordersWith(s.restaurantId, ["new", "cooking", "ready"]);
  return json({
    me: s,
    tickets: { new: orders.filter((o) => o.status === "new"), cooking: orders.filter((o) => o.status === "cooking"), ready: orders.filter((o) => o.status === "ready") },
    dishes: all("SELECT id, name_en AS name, available FROM menu_items WHERE restaurant_id = ? ORDER BY sort, id", s.restaurantId),
  });
}
