import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { expect } from "vitest";
import type { Item, Restaurant, Category } from "../../src/modules/platform/menu";

export const slug = "golden-lotus";
export const base = process.env.E2E_BASE_URL!;
export type Menu = { restaurant: Restaurant; items: Item[]; categories: Category[]; specials: any[] };
export type Chat = { sessionId: string; messageId: number; reply: string; answered: boolean; usedModel?: boolean; lang: string; action: { type: string; ids?: number[] }; dishes: Item[] };
export const openFixtureDb = () => new DatabaseSync(path.join(process.env.E2E_DATA_DIR!, "shop.db"), { readOnly: true });

export async function request(route: string, body?: unknown, cookie = "") {
  const res = await fetch(base + route, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  expect(res.status, `${route}: ${res.status}`).toBe(200);
  return res;
}

export async function chat(message: string, options: Record<string, unknown> = {}, cookie = ""): Promise<Chat> {
  return (await request(`/api/public/${slug}/chat`, { message, sessionId: randomUUID(), table: "ai-test", lang: "en", ...options }, cookie)).json();
}

export function storedChat(db: DatabaseSync, result: Chat) {
  return db.prepare("SELECT role, text, source, answered, lang FROM chat_messages WHERE session_id = ? ORDER BY id").all(result.sessionId);
}

export function effects(db: DatabaseSync) {
  return ["orders", "order_items", "calls"].map((table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n);
}

export function expectCards(result: Chat, menu: Menu) {
  expect(result.dishes.map((d) => d.id)).toEqual(result.action.ids || []);
  for (const dish of result.dishes) {
    const actual = menu.items.find((i) => i.id === dish.id);
    expect(actual, `unknown dish card ${dish.id}`).toBeDefined();
    expect(actual!.available).toBe(true);
    expect(dish).toEqual(actual);
  }
  expect(["add_to_picks", "call_staff", "place_order"]).not.toContain(result.action.type);
  expect(result.reply).not.toContain("ACTION:");
}
