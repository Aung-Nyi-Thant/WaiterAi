// The AI provider layer: local Ollama by default, an OpenAI-compatible cloud API as an option.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockModel } from "./helpers";
import { complete, completeJson, providerName } from "@/modules/ai/provider";

const O = { temperature: 0.2, maxTokens: 100, timeoutMs: 5000 };
const MSG = [{ role: "system" as const, content: "sys" }, { role: "user" as const, content: "hi" }];
const KEYS = ["AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "AI_BASE_URL", "OLLAMA_MODEL", "OLLAMA_URL"];
let saved: Record<string, string | undefined>;
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); });
afterEach(() => { vi.unstubAllGlobals(); for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

describe("NFR-M2 AI_PROVIDER selects the model service", () => {
  it("defaults to ollama and ignores unknown values", () => {
    delete process.env.AI_PROVIDER;
    expect(providerName()).toBe("ollama");
    process.env.AI_PROVIDER = "banana";
    expect(providerName()).toBe("ollama");
    process.env.AI_PROVIDER = "OpenAI";
    expect(providerName()).toBe("openai");
  });
});

describe("ollama (default)", () => {
  it("calls the local /api/chat with the configured model and options", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434"; process.env.OLLAMA_MODEL = "my-model";
    const calls = mockModel("hello");
    expect(await complete(MSG, O)).toBe("hello");
    expect(calls[0].url).toBe("http://localhost:11434/api/chat");
    expect(calls[0].body).toMatchObject({ model: "my-model", stream: false, think: false, keep_alive: "30m", options: { temperature: 0.2, num_ctx: 8192, num_predict: 100 } });
    expect(calls[0].body.format).toBeUndefined();
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

describe("openai-compatible cloud provider", () => {
  beforeEach(() => { process.env.AI_PROVIDER = "openai"; process.env.AI_API_KEY = "sk-test"; process.env.AI_MODEL = "cloud-model"; });
  it("calls /chat/completions with the key, model and limits, and reads the answer", async () => {
    process.env.AI_BASE_URL = "https://api.example.com/v1/";
    const calls = mockModel("cloud answer");
    expect(await complete(MSG, O)).toBe("cloud answer");
    expect(calls[0].url).toBe("https://api.example.com/v1/chat/completions");
    expect(calls[0].headers.authorization).toBe("Bearer sk-test");
    expect(calls[0].body).toMatchObject({ model: "cloud-model", temperature: 0.2, max_tokens: 100 });
    expect(calls[0].body.messages).toEqual([{ role: "system", content: "sys" }, { role: "user", content: "hi" }]);
  });
  it("defaults to the OpenAI address", async () => {
    delete process.env.AI_BASE_URL;
    const calls = mockModel("x");
    await complete(MSG, O);
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
  });
  it("requests JSON mode and sends images as data URLs", async () => {
    const calls = mockModel('{"ok":true}');
    expect(await completeJson("read", ["QUJD"])).toEqual({ ok: true });
    expect(calls[0].body.response_format).toEqual({ type: "json_object" });
    expect(calls[0].body.messages[0].content).toEqual([{ type: "text", text: "read" }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,QUJD" } }]);
  });
  it("refuses to run without a key or a model name", async () => {
    mockModel("x");
    delete process.env.AI_API_KEY;
    await expect(complete(MSG, O)).rejects.toThrow(/AI_API_KEY/);
    process.env.AI_API_KEY = "k"; delete process.env.AI_MODEL;
    await expect(complete(MSG, O)).rejects.toThrow(/AI_MODEL/);
  });
});

describe("auto: Ollama first, cloud as the fallback", () => {
  beforeEach(() => { process.env.AI_PROVIDER = "auto"; process.env.AI_MODEL = "cloud-model"; process.env.OLLAMA_URL = "http://localhost:11434"; });
  const route = (ollamaOk: boolean) => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      if (url.includes("/api/chat")) { if (!ollamaOk) throw new Error("ECONNREFUSED"); return new Response(JSON.stringify({ message: { content: "local" } })); }
      return new Response(JSON.stringify({ choices: [{ message: { content: "cloud" } }] }));
    });
    return urls;
  };
  it("uses Ollama when it works", async () => {
    process.env.AI_API_KEY = "k";
    const urls = route(true);
    expect(await complete(MSG, O)).toBe("local");
    expect(urls).toHaveLength(1);
  });
  it("uses the cloud API when Ollama fails and a key is set", async () => {
    process.env.AI_API_KEY = "k";
    const urls = route(false);
    expect(await complete(MSG, O)).toBe("cloud");
    expect(urls).toHaveLength(2);
  });
  it("reports the Ollama error when there is no cloud key", async () => {
    delete process.env.AI_API_KEY;
    route(false);
    await expect(complete(MSG, O)).rejects.toThrow("ECONNREFUSED");
  });
});

describe("NFR-P4 / SRS 2.5 one AI answer at a time (queue)", () => {
  // a fake model that records how many calls are running at once; each call takes one 'tick' per step
  const slowModel = () => {
    const s = { inflight: 0, max: 0, order: [] as string[], total: 0 };
    vi.stubGlobal("fetch", async (_url: string, init: any) => {
      const label = String(JSON.parse(init.body).messages.at(-1).content);
      s.order.push(label); s.total++;
      s.inflight++; s.max = Math.max(s.max, s.inflight);
      await new Promise((r) => setTimeout(r, 15));
      s.inflight--;
      if (label.startsWith("boom")) return new Response("x", { status: 500 });
      return new Response(JSON.stringify({ message: { content: `ok ${label}` } }));
    });
    return s;
  };
  const ask = (label: string, background = false) => complete([{ role: "user", content: label }], { ...O, background });
  const QKEYS = ["AI_MAX_CONCURRENCY", "AI_MAX_QUEUE"];
  let savedQ: Record<string, string | undefined>;
  beforeEach(() => { savedQ = Object.fromEntries(QKEYS.map((k) => [k, process.env[k]])); for (const k of QKEYS) delete process.env[k]; });
  afterEach(() => { for (const k of QKEYS) { if (savedQ[k] === undefined) delete process.env[k]; else process.env[k] = savedQ[k]; } });

  it("runs model calls one at a time by default (ollama), in the order they arrived", async () => {
    const s = slowModel();
    const out = await Promise.all(["a", "b", "c", "d"].map((x) => ask(x)));
    expect(out).toEqual(["ok a", "ok b", "ok c", "ok d"]);
    expect(s.max).toBe(1);
    expect(s.order).toEqual(["a", "b", "c", "d"]);
  });
  it("AI_MAX_CONCURRENCY allows more at once", async () => {
    process.env.AI_MAX_CONCURRENCY = "3";
    const s = slowModel();
    await Promise.all(["a", "b", "c", "d", "e", "f"].map((x) => ask(x)));
    expect(s.max).toBe(3);
  });
  it("a cloud provider defaults to 4 at once", async () => {
    process.env.AI_PROVIDER = "openai"; process.env.AI_API_KEY = "k"; process.env.AI_MODEL = "m";
    let inflight = 0, max = 0;
    vi.stubGlobal("fetch", async () => { inflight++; max = Math.max(max, inflight); await new Promise((r) => setTimeout(r, 15)); inflight--; return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] })); });
    await Promise.all(Array.from({ length: 8 }, (_, i) => ask(String(i))));
    expect(max).toBe(4);
  });
  it("chat questions go before queued photo imports", async () => {
    const s = slowModel();
    const first = ask("first");                                  // takes the only slot
    const imp1 = ask("import1", true), imp2 = ask("import2", true), chat1 = ask("chat1"), chat2 = ask("chat2");
    await Promise.all([first, imp1, imp2, chat1, chat2]);
    expect(s.order).toEqual(["first", "chat1", "chat2", "import1", "import2"]);
  });
  it("refuses new calls when the queue is full, so a diner gets the 'unavailable' message instead of a minutes-long wait", async () => {
    process.env.AI_MAX_QUEUE = "2";
    slowModel();
    const running = [ask("a"), ask("b"), ask("c")];              // 1 running + 2 waiting
    await expect(ask("d")).rejects.toThrow(/busy/);
    expect(await Promise.all(running)).toEqual(["ok a", "ok b", "ok c"]);
    expect(await ask("e")).toBe("ok e");                         // and it recovers
  });
  it("a failing call frees its place: the next one still runs", async () => {
    const s = slowModel();
    const results = await Promise.allSettled([ask("boom1"), ask("after1"), ask("boom2"), ask("after2")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "fulfilled", "rejected", "fulfilled"]);
    expect(s.total).toBe(4);
  });
  it("AI_MAX_QUEUE=0 means no limit on waiting calls", async () => {
    process.env.AI_MAX_QUEUE = "0";
    slowModel();
    expect((await Promise.all(Array.from({ length: 25 }, (_, i) => ask(String(i))))).length).toBe(25);
  });
});
