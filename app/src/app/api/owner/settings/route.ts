import { ownerSession } from "@/lib/auth";
import { restaurantById } from "@/lib/menu";
import { run } from "@/lib/db";
import { json, bad, body, unauthorized } from "@/lib/http";

const time = /^([01]\d|2[0-3]):[0-5]\d$/;
export async function GET() {
  const s = await ownerSession(); if (!s) return unauthorized();
  return json(restaurantById(s.restaurantId));
}
export async function PUT(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const b = await body(req);
  const r = restaurantById(s.restaurantId)!;
  if (b.name !== undefined) { if (!String(b.name).trim()) return bad("Restaurant name is required."); run("UPDATE restaurants SET name = ?, city = ? WHERE id = ?", String(b.name).trim(), String(b.city ?? r.city), r.id); }
  if (b.hours) {
    const h = b.hours;
    if (![h.open, h.close, h.lastOrder].every((x: string) => time.test(x))) return bad("Times must look like 10:00.");
    run("UPDATE restaurants SET hours_json = ? WHERE id = ?", JSON.stringify({ open: h.open, close: h.close, lastOrder: h.lastOrder, closedDays: Array.isArray(h.closedDays) ? h.closedDays.slice(0, 7) : [] }), r.id);
  }
  if (b.persona) {
    const p = b.persona;
    run("UPDATE restaurants SET persona_json = ? WHERE id = ?", JSON.stringify({
      name: String(p.name || "The Waiter").slice(0, 40), gender: p.gender === "female" ? "female" : "male",
      tone: ["friendly", "formal", "playful"].includes(p.tone) ? p.tone : "friendly",
      greeting: String(p.greeting || "").slice(0, 200), upsell: !!p.upsell, rules: String(p.rules || "").slice(0, 600),
    }), r.id);
  }
  return json({ ok: true });
}
