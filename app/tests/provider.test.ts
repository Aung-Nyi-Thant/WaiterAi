// The AI provider layer: always local Ollama (SRS 2.2 / NFR-5: no customer data to a cloud AI service).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockModel } from "./helpers";
import { complete, completeJson, IMPORT_TIMEOUT_MS } from "@/modules/ai/provider";

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

describe("FR-6: the menu photo is read within 120 seconds", () => {
  it("completeJson gives the model at most IMPORT_TIMEOUT_MS", async () => {
    expect(IMPORT_TIMEOUT_MS).toBe(120_000);
    const spy = vi.spyOn(AbortSignal, "timeout");
    mockModel('{"items":[]}');
    await completeJson("read");
    expect(spy).toHaveBeenCalledWith(120_000);
  });
});
