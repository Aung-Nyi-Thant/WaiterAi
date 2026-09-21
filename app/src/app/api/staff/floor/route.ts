import { staffSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { ordersWith, openCalls } from "@/lib/orders";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  const s = await staffSession(); if (!s) return unauthorized();
  const rid = s.restaurantId;
  const orders = ordersWith(rid, ["picked", "new", "cooking", "ready"]);
  return json({
    me: s, calls: openCalls(rid),
    picks: orders.filter((o) => o.status === "picked"),
    active: orders.filter((o) => o.status !== "picked"),
    soldOut: all("SELECT id, name_en AS name FROM menu_items WHERE restaurant_id = ? AND available = 0 ORDER BY name_en", rid),
    dishes: all("SELECT id, name_en AS name, available FROM menu_items WHERE restaurant_id = ? ORDER BY name_en", rid),
  });
}
