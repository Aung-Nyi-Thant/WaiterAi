import { staffSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { ordersWith } from "@/lib/orders";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  const s = await staffSession(); if (!s) return unauthorized();
  const orders = ordersWith(s.restaurantId, ["new", "cooking", "ready"]);
  return json({
    me: s,
    tickets: { new: orders.filter((o) => o.status === "new"), cooking: orders.filter((o) => o.status === "cooking"), ready: orders.filter((o) => o.status === "ready") },
    dishes: all("SELECT id, name_en AS name, available FROM menu_items WHERE restaurant_id = ? ORDER BY sort, id", s.restaurantId),
  });
}
