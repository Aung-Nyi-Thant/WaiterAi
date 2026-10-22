// NFR-P1 on a big menu: the warm-up must send the very same system prompt as a real chat. A big menu's prompt carries the dishes' categories, so the
// warm-up has to be given them too (it was not, once): then the model read one prompt at start-up and the first diner paid for another.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { call, mockModel } from "./helpers";
import { POST as chat } from "@/modules/ai/api/chat";
import { warmUpAll } from "@/modules/ai/warmup";
import { BIG_MENU } from "@/modules/ai/ai";
import { seedSushiMenu } from "./sushiMenu";

beforeAll(() => seedSushiMenu(), 60_000);
afterEach(() => { vi.unstubAllGlobals(); });

describe("NFR-P1 the warm-up of a big menu is byte-identical to a real chat prompt", () => {
  it("includes the categories, like api/chat.ts does", async () => {
    const calls = mockModel("Try the Salmon Sushi.\nACTION: none");
    const r = await call(chat, { method: "POST", params: { slug: "golden-lotus" }, body: { message: "What would you recommend on a hot day?", sessionId: "wb-1", table: "5", lang: "en" } });
    expect(r.status).toBe(200);
    expect(await warmUpAll(1)).toBe(1);
    expect(calls).toHaveLength(2);
    const [real, warm] = calls.map((c) => c.body.messages[0].content as string);
    expect(real).toContain('"categories":["Sets & Combos"');                       // the sushi menu has more than BIG_MENU dishes, so the compact form
    expect(BIG_MENU).toBeLessThan(132);
    expect(warm).toBe(real);
  });
});
