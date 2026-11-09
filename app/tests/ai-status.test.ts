import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/public/[slug]/ai-status/route";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("read-only AI status", () => {
  it("uses provider defaults and reports only a loaded matching model as ready", async () => {
    vi.stubEnv("OLLAMA_URL", ""); vi.stubEnv("OLLAMA_MODEL", "");
    const fetch = vi.fn().mockResolvedValue(Response.json({ models: [{ name: "gemma4:12b" }] }));
    vi.stubGlobal("fetch", fetch);
    const res = await GET();
    expect(await res.json()).toEqual({ server: true, model: "gemma4:12b", modelReady: true });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).toHaveBeenCalledExactlyOnceWith("http://localhost:11434/api/ps", {
      cache: "no-store", signal: expect.any(AbortSignal),
    });
  });

  it("reads configuration on each check and accepts Ollama's model field and default tag", async () => {
    vi.stubEnv("OLLAMA_URL", "http://ollama.internal:11434"); vi.stubEnv("OLLAMA_MODEL", "custom");
    const fetch = vi.fn().mockResolvedValue(Response.json({ models: [{ model: "custom:latest" }] }));
    vi.stubGlobal("fetch", fetch);
    expect(await (await GET()).json()).toEqual({ server: true, model: "custom", modelReady: true });
    expect(fetch.mock.calls[0][0]).toBe("http://ollama.internal:11434/api/ps");
    vi.stubEnv("OLLAMA_MODEL", "another:12b");
    fetch.mockResolvedValue(Response.json({ models: [{ name: "custom:latest" }] }));
    expect(await (await GET()).json()).toEqual({ server: true, model: "another:12b", modelReady: false });
  });

  it.each([
    async () => Response.json({ models: [] }),
    async () => Response.json({ models: [{ name: "other:12b" }, null] }),
    async () => Response.json({ models: "invalid" }),
    async () => new Response("invalid JSON"),
    async () => new Response("Ollama failed", { status: 500 }),
    async () => { throw new TypeError("Ollama offline"); },
  ])("keeps server true and modelReady false when Ollama is unavailable or the model is not loaded", async response => {
    vi.stubEnv("OLLAMA_MODEL", "gemma4:12b");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(response));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ server: true, model: "gemma4:12b", modelReady: false });
  });

  it("sets a two-second abort deadline without sending a prompt", async () => {
    vi.useFakeTimers();
    const signal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(signal);
    const fetch = vi.fn().mockResolvedValue(Response.json({ models: [] }));
    vi.stubGlobal("fetch", fetch);
    try {
      await GET();
      expect(timeout).toHaveBeenCalledWith(2000);
      expect(fetch.mock.calls[0][1]).toEqual({ cache: "no-store", signal });
    } finally { timeout.mockRestore(); }
  });
});
