// The AI provider layer: always local Ollama (SRS 2.2 / NFR-5: no customer data to a cloud AI service).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockModel } from "./helpers";
import { complete, completeJson, IMPORT_TIMEOUT_MS, AiBusyError } from "@/modules/ai/provider";

const O = { temperature: 0.2, maxTokens: 100, timeoutMs: 5000 };
const MSG = [{ role: "system" as const, content: "sys" }, { role: "user" as const, content: "hi" }];
const KEYS = ["AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "AI_BASE_URL", "OLLAMA_MODEL", "OLLAMA_URL"];
let saved: Record<string, string | undefined>;
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); for (const k of KEYS) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]); });

describe("ollama", () => {
  it("calls the local /api/chat with the configured model and options", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434"; process.env.OLLAMA_MODEL = "my-model";
    const calls = mockModel("hello");
    expect(await complete(MSG, O)).toBe("hello");
    expect(calls[0].url).toBe("http://localhost:11434/api/chat");
    expect(calls[0].body).toMatchObject({ model: "my-model", stream: false, think: false, keep_alive: "12h", options: { temperature: 0.2, num_ctx: 8192, num_predict: 100 } });
    expect(calls[0].body.format).toBeUndefined();
  });
  it("keeps the model loaded for 12 hours by default so the first diner after a quiet period is not sent to the fallback; OLLAMA_KEEP_ALIVE overrides it", async () => {
    process.env.OLLAMA_KEEP_ALIVE = "5m";
    const calls = mockModel("x");
    await complete(MSG, O);
    expect(calls[0].body.keep_alive).toBe("5m");
    delete process.env.OLLAMA_KEEP_ALIVE;
  });
  it("uses gemma4:12b when no model is configured", async () => {
    delete process.env.OLLAMA_MODEL;
    const calls = mockModel("x");
    await complete(MSG, O);
    expect(calls[0].body.model).toBe("gemma4:12b");
  });
  it("asks for JSON and sends images when needed", async () => {
    const calls = mockModel('{"a":1}');
    expect(await completeJson("read this", ["QUJD"], 500)).toEqual({ a: 1 });
    expect(calls[0].body.format).toBe("json");
    expect(calls[0].body.options.temperature).toBe(0);
    expect(calls[0].body.messages[0].images).toEqual(["QUJD"]);
  });
  it("finds the JSON when the model wraps it in text, and fails clearly when there is none", async () => {
    mockModel('Sure! Here you go: {"items":[1,2]} Hope that helps.');
    expect(await completeJson("p")).toEqual({ items: [1, 2] });
    mockModel("no json here");
    await expect(completeJson("p")).rejects.toThrow(/did not return JSON/);
  });
  it("throws on an HTTP error", async () => {
    vi.stubGlobal("fetch", async () => new Response("x", { status: 503 }));
    await expect(complete(MSG, O)).rejects.toThrow("Ollama 503");
  });
});

describe("no cloud AI (SRS 2.2 constraint, NFR-5)", () => {
  it("only ever talks to the local Ollama address, even if old cloud settings are present", async () => {
    process.env.AI_PROVIDER = "openai"; process.env.AI_API_KEY = "sk-test"; process.env.AI_MODEL = "cloud-model"; process.env.AI_BASE_URL = "https://api.example.com/v1";
    process.env.OLLAMA_URL = "http://localhost:11434";
    const calls = mockModel("local answer");
    expect(await complete(MSG, O)).toBe("local answer");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://localhost:11434/api/chat");
    expect(calls[0].headers.authorization).toBeUndefined();
  });
  it("does not fall back to a cloud API when Ollama fails", async () => {
    process.env.AI_PROVIDER = "auto"; process.env.AI_API_KEY = "sk-test"; process.env.OLLAMA_URL = "http://localhost:11434";
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => { urls.push(String(url)); throw new Error("ECONNREFUSED"); });
    await expect(complete(MSG, O)).rejects.toThrow("ECONNREFUSED");
    expect(urls).toEqual(["http://localhost:11434/api/chat"]);
  });
});

describe("SRS 2.2 / NFR-7: one AI answer at a time, first come first served, bounded waiting", () => {
  // a model that needs `ms` per answer; records how many requests were running at once and in which order they started
  const slowModel = (ms: number, fail = (_n: number) => false) => {
    const seen = { running: 0, peak: 0, order: [] as string[], calls: 0 };
    vi.stubGlobal("fetch", async (_u: string, init: any) => {
      const n = ++seen.calls;
      seen.order.push(JSON.parse(init.body).messages.at(-1).content);
      seen.running++; seen.peak = Math.max(seen.peak, seen.running);
      await new Promise((r) => setTimeout(r, ms));
      seen.running--;
      return fail(n) ? new Response("x", { status: 503 }) : new Response(JSON.stringify({ message: { content: "ok" } }));
    });
    return seen;
  };
  const ask = (q: string, extra = {}) => complete([{ role: "user", content: q }], { ...O, ...extra });

  it("never runs two requests at once, and serves them in the order they arrived", async () => {
    const seen = slowModel(30);
    await Promise.all(["a", "b", "c", "d"].map((q) => ask(q)));
    expect(seen.peak).toBe(1);
    expect(seen.order).toEqual(["a", "b", "c", "d"]);
  });
  it("a request that would wait longer than maxWaitMs gets AiBusyError and never reaches the model", async () => {
    const seen = slowModel(80);
    const results = await Promise.allSettled([ask("first", { maxWaitMs: 120 }), ask("second", { maxWaitMs: 120 }), ask("third", { maxWaitMs: 120 })]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("fulfilled");                       // waited ~80 ms
    expect((results[2] as PromiseRejectedResult).reason).toBeInstanceOf(AiBusyError);   // would have waited ~160 ms
    expect(seen.order).toEqual(["first", "second"]);                   // the third was never sent to the model
  });
  it("the line keeps moving after a failed request and after a request that gave up waiting", async () => {
    const seen = slowModel(40, (n) => n === 1);
    const r = await Promise.allSettled([ask("fails"), ask("gives-up", { maxWaitMs: 10 }), ask("after")]);
    expect((r[0] as PromiseRejectedResult).reason.message).toBe("Ollama 503");
    expect((r[1] as PromiseRejectedResult).reason).toBeInstanceOf(AiBusyError);
    expect(r[2].status).toBe("fulfilled");
    expect(seen.order).toEqual(["fails", "after"]);
    expect((await ask("later")).length).toBeGreaterThan(0);            // and it is not stuck afterwards
  });
  it("the time limit counts from when a request starts, not from when it joined the line", async () => {
    slowModel(50);
    const spy = vi.spyOn(AbortSignal, "timeout");
    await Promise.all([ask("one", { timeoutMs: 777 }), ask("two", { timeoutMs: 777 })]);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(777);
  });
});

describe("FR-6: the menu photo is read within 120 seconds", () => {
  it("completeJson gives the model at most IMPORT_TIMEOUT_MS", async () => {
    expect(IMPORT_TIMEOUT_MS).toBe(120_000);
    const spy = vi.spyOn(AbortSignal, "timeout");
    mockModel('{"items":[]}');
    await completeJson("read");
    expect(spy).toHaveBeenCalledWith(120_000);
  });
});
