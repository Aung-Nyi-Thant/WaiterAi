// NFR-P1 (NFR-1 in the course SRS): the model has already read each restaurant's system prompt when the first diner asks,
// so the first question does not hit the 15 s limit.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, mockModel } from "./helpers";
import { answer } from "@/modules/ai/ai";
import { warmUpPrompt } from "@/modules/ai/ai";
import { warmUpAll } from "@/modules/ai/warmup";
import { run } from "@/modules/platform/db";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("NFR-P1 the warm-up sends the same system prompt as a real question", () => {
  it("is byte-identical, so Ollama can reuse what it already read (that is what makes the first question fast)", async () => {
    const ctx = await aiCtx();
    const calls = mockModel("Try the Thai Iced Tea.");
    await answer("What would you recommend on a hot day?", "en", ctx);          // goes to the model: not a rule question
    await warmUpPrompt(ctx);
    expect(calls).toHaveLength(2);
    const [real, warm] = calls.map((c) => c.body);
    expect(warm.messages[0]).toEqual(real.messages[0]);                          // system prompt: identical
    expect(warm.messages.at(-1)).toEqual({ role: "user", content: "Hi" });
    expect(warm.options.num_predict).toBe(1);                                    // nothing worth generating
    expect(warm.options.num_ctx).toBe(real.options.num_ctx);                     // a different context size makes Ollama reload the model
    expect(warm.model).toBe(real.model);
  });
});

describe("NFR-P1 warming every restaurant when the server starts", () => {
  it("warms each restaurant once, in order, up to the limit", async () => {
    const calls = mockModel("ok");
    run("INSERT INTO users (email, password_hash) VALUES ('w1@x.co','h'), ('w2@x.co','h')");
    run("INSERT INTO restaurants (owner_id, slug, name) SELECT id, 'warm-' || id, 'Warm ' || id FROM users WHERE email IN ('w1@x.co','w2@x.co')");
    expect(await warmUpAll(2)).toBe(2);
    expect(calls).toHaveLength(2);
    expect(calls[0].body.messages[0].content).toContain("Golden Lotus Kitchen");  // the first restaurant (the demo) comes first
    expect(calls[1].body.messages[0].content).toContain("Warm ");
  });
  it("does nothing when AI_WARMUP=0", async () => {
    const calls = mockModel("ok");
    vi.stubEnv("AI_WARMUP", "0");
    expect(await warmUpAll()).toBe(0);
    expect(calls).toHaveLength(0);
  });
  it("never throws when Ollama is not running, and stops after the first failure", async () => {
    const calls = mockModel(new Error("ECONNREFUSED"));
    expect(await warmUpAll()).toBe(0);
    expect(calls).toHaveLength(1);                                                 // did not hammer a missing server once per restaurant
  });
});

describe("NFR-P1 the server does not wait for the warm-up before accepting requests", () => {
  it("register() returns at once even if the model never answers, and does nothing outside the Node runtime", async () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));                          // a model that never answers
    const { register } = await import("@/instrumentation");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const t0 = Date.now();
    expect(register()).toBeUndefined();                                           // synchronous: not a promise the server could wait on
    expect(Date.now() - t0).toBeLessThan(200);
    vi.stubEnv("NEXT_RUNTIME", "edge");
    expect(register()).toBeUndefined();
  });
});
