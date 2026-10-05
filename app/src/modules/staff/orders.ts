import { all } from "@/modules/platform/db";

const iso = (s: string) => (s ? s.replace(" ", "T") + "Z" : s);
export function ordersWith(rid: number, statuses: string[]) {
  const rows = all(`SELECT * FROM orders WHERE restaurant_id = ? AND status IN (${statuses.map(() => "?").join(",")}) ORDER BY id`, rid, ...statuses);
  return rows.map((o: any) => ({
    id: o.id, table: o.table_no, status: o.status, lang: o.lang, allergy: o.allergy_note, createdAt: iso(o.created_at), updatedAt: iso(o.updated_at),
    items: all("SELECT name, qty, price FROM order_items WHERE order_id = ?", o.id),
  }));
}
export const openCalls = (rid: number) =>
  all("SELECT id, table_no AS 'table', kind, created_at FROM calls WHERE restaurant_id = ? AND status = 'open' ORDER BY id", rid).map((c: any) => ({ id: c.id, table: c.table, kind: c.kind, createdAt: iso(c.created_at) }));

// Orders staff have accepted count toward the table's bill until it is marked paid. Picks the
// diner sent but staff have not taken yet are listed as pending and are not in the total.
const BILLED = ["new", "cooking", "ready", "served"];
type Line = { name: string; qty: number; price: number };
const merge = (lines: Line[]) => {
  const m = new Map<string, Line>();
  for (const l of lines) { const k = `${l.name}|${l.price}`; const x = m.get(k); if (x) x.qty += l.qty; else m.set(k, { ...l }); }
  return [...m.values()];
};
export function tableBills(rid: number, table?: string) {
  const rows = all(
    `SELECT o.table_no AS tbl, o.status, i.name, i.qty, i.price FROM orders o JOIN order_items i ON i.order_id = o.id
     WHERE o.restaurant_id = ? AND o.paid_at IS NULL AND o.status IN ('picked', ${BILLED.map(() => "?").join(",")})${table === undefined ? "" : " AND o.table_no = ?"}
     ORDER BY o.id, i.id`, rid, ...BILLED, ...(table === undefined ? [] : [table]));
  const by = new Map<string, { billed: Line[]; pending: Line[]; inKitchen: number }>();
  for (const r of rows as any[]) {
    const b = by.get(r.tbl) || { billed: [], pending: [], inKitchen: 0 };
    const line = { name: r.name, qty: r.qty, price: r.price };
    if (r.status === "picked") b.pending.push(line); else { b.billed.push(line); if (r.status !== "served") b.inKitchen += r.qty; }
    by.set(r.tbl, b);
  }
  // tables that have asked for the bill (an open "bill" call) - one request per table at a time
  const asked = new Set(all("SELECT DISTINCT table_no FROM calls WHERE restaurant_id = ? AND kind = 'bill' AND status = 'open'", rid).map((c: any) => c.table_no as string));
  return [...by.entries()]
    .map(([tbl, b]) => { const lines = merge(b.billed); return { table: tbl, lines, total: lines.reduce((s, l) => s + l.qty * l.price, 0), pending: merge(b.pending), inKitchen: b.inKitchen, asked: asked.has(tbl) }; })
    .sort((a, b) => a.table.localeCompare(b.table, undefined, { numeric: true }));
}
