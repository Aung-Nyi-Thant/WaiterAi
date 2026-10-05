import { all, get, run } from "@/modules/platform/db";
import { hashPassword, checkPassword } from "@/modules/platform/auth";

type Conf = { table: string; fields: string[]; order: string; publicCols?: string };
export const RESOURCES: Record<string, Conf> = {
  categories: { table: "categories", fields: ["name_en", "name_th", "name_my", "sort"], order: "sort, id" },
  faqs: { table: "faqs", fields: ["q", "a", "sort"], order: "sort, id" },
  specials: { table: "specials", fields: ["title", "text", "starts_on", "ends_on", "active"], order: "id DESC" },
  staff: { table: "staff", fields: ["name", "role"], order: "id", publicCols: "id, name, role" },
};

// Staff sign in with the restaurant code and a PIN only, so two people in one restaurant must not share a PIN.
// (Checked one by one with the async compare. The owner is the only one creating staff, so two creations of the same PIN at the very
// same moment are not a case worth a lock; the sign-in simply takes the first match.)
const pinTaken = async (rid: number, pin: string, exceptId = 0): Promise<boolean> => {
  for (const s of all("SELECT id, pin_hash FROM staff WHERE restaurant_id = ?", rid)) if (s.id !== exceptId && await checkPassword(pin, s.pin_hash)) return true;
  return false;
};
const PIN_TAKEN = "This PIN is already used by another staff member. Choose a different one.";

export function list(rid: number, c: Conf) {
  return all(`SELECT ${c.publicCols || "*"} FROM ${c.table} WHERE restaurant_id = ? ORDER BY ${c.order}`, rid);
}
export async function create(rid: number, c: Conf, b: any): Promise<{ error?: string; id?: number; conflict?: boolean }> {
  if (c.table === "staff") {
    if (!["waiter", "chef"].includes(b.role)) return { error: "Role must be waiter or chef." };
    if (!/^\d{4,8}$/.test(String(b.pin || ""))) return { error: "PIN must be 4 to 8 digits." };
    if (!String(b.name || "").trim()) return { error: "Please enter a name." };
    if (await pinTaken(rid, String(b.pin))) return { error: PIN_TAKEN };
    const pinHash = await hashPassword(String(b.pin));
    return { id: run("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (?,?,?,?)", rid, String(b.name).trim(), b.role, pinHash).id };
  }
  const cols = c.fields.filter((f) => b[f] !== undefined);
  if (c.table === "categories" && !String(b.name_en || "").trim()) return { error: "Please enter a category name." };
  if (c.table === "faqs" && (!String(b.q || "").trim() || !String(b.a || "").trim())) return { error: "Question and answer are both needed." };
  if (c.table === "specials" && !String(b.title || "").trim()) return { error: "Please enter a title." };
  const sql = `INSERT INTO ${c.table} (restaurant_id${cols.map((x) => ", " + x).join("")}) VALUES (?${cols.map(() => ",?").join("")})`;
  return { id: run(sql, rid, ...cols.map((f) => b[f])).id };
}
export async function update(rid: number, c: Conf, id: number, b: any): Promise<{ error?: string; notFound?: boolean; conflict?: boolean }> {
  if (!get(`SELECT 1 FROM ${c.table} WHERE id = ? AND restaurant_id = ?`, id, rid)) return { error: "Not found.", notFound: true };
  if (c.table === "staff" && b.role !== undefined && !["waiter", "chef"].includes(b.role)) return { error: "Role must be waiter or chef." };
  if (c.table === "staff" && b.pin !== undefined) {
    if (!/^\d{4,8}$/.test(String(b.pin))) return { error: "PIN must be 4 to 8 digits." };
    if (await pinTaken(rid, String(b.pin), id)) return { error: PIN_TAKEN };
    run("UPDATE staff SET pin_hash = ? WHERE id = ? AND restaurant_id = ?", await hashPassword(String(b.pin)), id, rid);
  }
  const cols = c.fields.filter((f) => b[f] !== undefined);
  if (cols.length) run(`UPDATE ${c.table} SET ${cols.map((x) => x + " = ?").join(", ")} WHERE id = ? AND restaurant_id = ?`, ...cols.map((f) => b[f]), id, rid);
  return {};
}
// false when nothing was deleted: the row does not exist or belongs to another restaurant (the API answers 404)
export function remove(rid: number, c: Conf, id: number): boolean {
  return run(`DELETE FROM ${c.table} WHERE id = ? AND restaurant_id = ?`, id, rid).changes > 0;
}
