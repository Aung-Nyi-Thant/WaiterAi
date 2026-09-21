import { all, get, run } from "@/modules/platform/db";
import { hashPassword } from "@/modules/platform/auth";

type Conf = { table: string; fields: string[]; order: string; publicCols?: string };
export const RESOURCES: Record<string, Conf> = {
  categories: { table: "categories", fields: ["name_en", "name_th", "name_my", "sort"], order: "sort, id" },
  faqs: { table: "faqs", fields: ["q", "a", "sort"], order: "sort, id" },
  specials: { table: "specials", fields: ["title", "text", "starts_on", "ends_on", "active"], order: "id DESC" },
  staff: { table: "staff", fields: ["name", "role"], order: "id", publicCols: "id, name, role" },
};

export function list(rid: number, c: Conf) {
  return all(`SELECT ${c.publicCols || "*"} FROM ${c.table} WHERE restaurant_id = ? ORDER BY ${c.order}`, rid);
}
export function create(rid: number, c: Conf, b: any): { error?: string; id?: number } {
  if (c.table === "staff") {
    if (!["waiter", "chef"].includes(b.role)) return { error: "Role must be waiter or chef." };
    if (!/^\d{4,8}$/.test(String(b.pin || ""))) return { error: "PIN must be 4 to 8 digits." };
    if (!String(b.name || "").trim()) return { error: "Please enter a name." };
    return { id: run("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)", rid, String(b.name).trim(), b.role, hashPassword(String(b.pin))).id };
  }
  const cols = c.fields.filter((f) => b[f] !== undefined);
  if (c.table === "categories" && !String(b.name_en || "").trim()) return { error: "Please enter a category name." };
  if (c.table === "faqs" && (!String(b.q || "").trim() || !String(b.a || "").trim())) return { error: "Question and answer are both needed." };
  if (c.table === "specials" && !String(b.title || "").trim()) return { error: "Please enter a title." };
  const sql = `INSERT INTO ${c.table} (restaurant_id${cols.map((x) => ", " + x).join("")}) VALUES (?${cols.map(() => ",?").join("")})`;
  return { id: run(sql, rid, ...cols.map((f) => b[f])).id };
}
export function update(rid: number, c: Conf, id: number, b: any): { error?: string } {
  if (!get(`SELECT 1 FROM ${c.table} WHERE id = ? AND restaurant_id = ?`, id, rid)) return { error: "Not found." };
  if (c.table === "staff" && b.pin !== undefined) {
    if (!/^\d{4,8}$/.test(String(b.pin))) return { error: "PIN must be 4 to 8 digits." };
    run("UPDATE staff SET pin_hash = ? WHERE id = ? AND restaurant_id = ?", hashPassword(String(b.pin)), id, rid);
  }
  const cols = c.fields.filter((f) => b[f] !== undefined);
  if (cols.length) run(`UPDATE ${c.table} SET ${cols.map((x) => x + " = ?").join(", ")} WHERE id = ? AND restaurant_id = ?`, ...cols.map((f) => b[f]), id, rid);
  return {};
}
export function remove(rid: number, c: Conf, id: number) {
  run(`DELETE FROM ${c.table} WHERE id = ? AND restaurant_id = ?`, id, rid);
}
