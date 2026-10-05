import { describe, it, expect } from "vitest";
import { all, get } from "@/modules/platform/db";

describe("NFR-R2 database setup", () => {
  it("uses write-ahead logging and enforces foreign keys", () => {
    expect(get("PRAGMA journal_mode")!.journal_mode).toBe("wal");
    expect(get("PRAGMA foreign_keys")!.foreign_keys).toBe(1);
  });
  it("has the 14 tables of the data model (SRS 4.2)", () => {
    const names = all("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").map((t: any) => t.name).sort();
    expect(names).toEqual(["calls", "categories", "chat_messages", "chat_sessions", "events", "faqs", "imports", "menu_items", "order_items", "orders", "restaurants", "specials", "staff", "users"]);
  });
  it("only accepts the allowed order statuses and staff roles", () => {
    expect(() => all("INSERT INTO orders (restaurant_id, status) VALUES (1, 'teleported')")).toThrow(/CHECK/);
    expect(() => all("INSERT INTO staff (restaurant_id, name, role, pin_hash) VALUES (1, 'x', 'manager', 'h')")).toThrow(/CHECK/);
  });
  it("deleting a restaurant deletes its data (cascade)", () => {
    const uid = get("INSERT INTO users (email, password_hash) VALUES ('tmp@x.co', 'h') RETURNING id")!.id;
    const rid = get("INSERT INTO restaurants (owner_id, slug, name) VALUES (?, 'tmp-r', 'Tmp') RETURNING id", uid)!.id;
    all("INSERT INTO menu_items (restaurant_id, name_en) VALUES (?, 'Dish')", rid);
    all("DELETE FROM restaurants WHERE id = ?", rid);
    expect(get("SELECT COUNT(*) AS n FROM menu_items WHERE restaurant_id = ?", rid)!.n).toBe(0);
  });
});
