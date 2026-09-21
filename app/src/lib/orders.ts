import { all } from "./db";

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
