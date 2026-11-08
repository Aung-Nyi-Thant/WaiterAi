// The AI provider layer: always local Ollama (SRS 2.2 / NFR-5: no customer data to a cloud AI service).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockModel } from "./helpers";
import { complete, completeJson, IMPORT_TIMEOUT_MS, AiBusyError, trimToSentence, tokenBudget, modelSpeed } from "@/modules/ai/provider";

const O = { temperature: 0.2, maxTokens: 100, timeoutMs: 5000 };
const MSG = [{ role: "system" as const, content: "sys" }, { role: "user" as const, content: "hi" }];
const KEYS = ["AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "AI_BASE_URL", "OLLAMA_MODEL", "OLLAMA_URL"];
let saved: Record<string, string | undefined>;
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); });
afterEach(() => { delete (globalThis as any).__aiSpeed; vi.unstubAllGlobals(); vi.restoreAllMocks(); for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

describe("NFR-M2 ollama: the model and address are settings (OLLAMA_URL, OLLAMA_MODEL)", () => {
  it("calls the local /api/chat with the configured model and options", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434"; process.env.OLLAMA_MODEL = "my-model";
    const calls = mockModel("hello");
    expect(await complete(MSG, O)).toBe("hello");
    expect(calls[0].url).toBe("http://localhost:11434/api/chat");
    expect(calls[0].body).toMatchObject({ model: "my-model", stream: false, think: false, keep_alive: "12h", options: { temperature: 0.2, num_ctx: 16384, num_predict: 100 } });
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

describe("SRS 2.2 / NFR-P4 / NFR-7: one AI answer at a time, first come first served, bounded waiting", () => {
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

describe("a reply cut off by the token cap is trimmed to its last full sentence", () => {
  const reply = (content: string, done_reason?: string) => vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ message: { content }, done_reason }), { status: 200, headers: { "content-type": "application/json" } }));

  it("when the model stopped at the cap (done_reason length), the unfinished sentence is dropped", async () => {
    reply("Try the Tom Yum Goong. It is a hot and sour soup with prawns. It also comes with a spicy", "length");
    expect(await complete(MSG, O)).toBe("Try the Tom Yum Goong. It is a hot and sour soup with prawns.");
  });
  it("a reply that finished on its own is left exactly as it is", async () => {
    reply("Try the Tom Yum Goong. It is a hot and sour soup with prawns. It also comes with a spicy", "stop");
    expect(await complete(MSG, O)).toBe("Try the Tom Yum Goong. It is a hot and sour soup with prawns. It also comes with a spicy");
    reply("No reason given", undefined);
    expect(await complete(MSG, O)).toBe("No reason given");
  });
  it("a JSON answer is never trimmed (it is parsed whole)", async () => {
    reply('{"a": 1, "b": "x', "length");
    expect(await complete(MSG, { ...O, json: true })).toBe('{"a": 1, "b": "x');
  });
  it("English, Burmese, line breaks and an ellipsis count as sentence ends", () => {
    expect(trimToSentence("One. Two! Three? Four and")).toBe("One. Two! Three?");
    expect(trimToSentence("ဒီဟင်းကို စားကြည့်ပါ။ အရသာ ကောင်းပါတယ်။ နောက်ထပ်")).toBe("ဒီဟင်းကို စားကြည့်ပါ။ အရသာ ကောင်းပါတယ်။");
    expect(trimToSentence("First line\nSecond line is longer than the first\nThird cut off")).toBe("First line\nSecond line is longer than the first");
    expect(trimToSentence("I am happy to help you today\u2026 and the")).toBe("I am happy to help you today\u2026");
  });
  it("Thai (no full stop) is cut back to the last space, dropping the partial word", () => {
    expect(trimToSentence("แนะนำต้มยำกุ้งครับ เป็นซุปรสเปรี้ยวเผ็ด มีกุ้งสด และเครื่องเทศหลา")).toBe("แนะนำต้มยำกุ้งครับ เป็นซุปรสเปรี้ยวเผ็ด มีกุ้งสด");
  });
  it("never throws most of a reply away: a very short first sentence is not a cut point", () => {
    expect(trimToSentence("Ok. A very long sentence that never ends and keeps going on and on without a stop")).toBe("Ok. A very long sentence that never ends and keeps going on and on without a");
    expect(trimToSentence("word")).toBe("word");
    expect(trimToSentence("")).toBe("");
    expect(trimToSentence("Short. then a really long unfinished sentence that goes on")).toBe("Short. then a really long unfinished sentence that goes");
  });
});

describe("the length of a reply follows the model's measured speed (it halves under sustained load)", () => {
  const FIT = 12_750;                                          // 85% of the 15 s limit
  const speaking = (tokens: number, seconds: number) => { const bodies: any[] = []; vi.stubGlobal("fetch", async (_u: string, init: any) => { bodies.push(JSON.parse(init.body)); return new Response(JSON.stringify({ message: { content: "ok" }, eval_count: tokens, eval_duration: seconds * 1e9 }), { status: 200 }); }); return bodies; };

  it("tokenBudget: the cap while the model is fast or unknown, fewer tokens when it is slow, never fewer than 60", () => {
    expect(tokenBudget(130, FIT, undefined)).toBe(130);       // speed not measured yet
    expect(tokenBudget(130, undefined, 5)).toBe(130);          // no time limit given
    expect(tokenBudget(130, FIT, 12)).toBe(130);               // 11.25 s x 12 = 135: the cap wins
    expect(tokenBudget(130, FIT, 6)).toBe(67);                 // throttled: 11.25 s x 6
    expect(tokenBudget(100, FIT, 3)).toBe(60);                 // very slow: the floor
    expect(tokenBudget(40, FIT, 1)).toBe(40);                  // a cap below the floor is respected
    for (const speed of [4, 6, 8, 10, 12, 20]) expect(1.5 + tokenBudget(130, FIT, speed) / speed, `${speed} tokens/s`).toBeLessThanOrEqual(Math.max(15, 1.5 + 60 / speed));
  });
  it("measures the speed from Ollama's numbers and uses it for the next reply", async () => {
    const bodies = speaking(100, 8.3);                         // 12 tokens/s
    await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT });
    expect(bodies[0].options.num_predict).toBe(130);
    expect(modelSpeed()).toBeCloseTo(12.05, 1);
    speaking(100, 16.6);                                       // it slows to 6 tokens/s
    await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT });
    expect(modelSpeed()).toBeCloseTo(9.03, 1);                 // smoothed, not a jump
    const bodies2 = speaking(100, 16.6);
    await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT });
    await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT });
    expect(bodies2[1].options.num_predict).toBeLessThan(90);   // the budget shrank to follow the speed
    expect(bodies2[1].options.num_predict).toBeGreaterThanOrEqual(60);
  });
  it("recovers when the model speeds up again", async () => {
    speaking(100, 16.6); await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT }); await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT });
    const slow = modelSpeed()!;
    speaking(100, 8.3); for (let i = 0; i < 4; i++) await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT });
    expect(modelSpeed()!).toBeGreaterThan(slow + 3);
  });
  it("ignores very short replies (a noisy figure), JSON answers keep their own cap, and no fitMs means no change", async () => {
    speaking(5, 5);                                            // 1 token/s from a 5-token reply: not used
    await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT });
    expect(modelSpeed()).toBeUndefined();
    const bodies = speaking(100, 16.6);
    await complete(MSG, { ...O, maxTokens: 130, fitMs: FIT }); await complete(MSG, { ...O, maxTokens: 130 });
    expect(bodies[1].options.num_predict).toBe(130);           // no fitMs: the cap as given (the photo import)
  });
});
