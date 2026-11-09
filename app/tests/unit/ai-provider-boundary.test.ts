import { afterEach, describe, expect, it, vi } from "vitest";
import { AiBusyError, complete, type Opts } from "@/modules/ai/provider";

const OPTIONS: Opts = { temperature: 0.2, maxTokens: 100, timeoutMs: 5000 };
const ask = (text: string, options: Partial<Opts> = {}) => complete([{ role: "user", content: text }], { ...OPTIONS, ...options });
const reply = (text: string) => Response.json({ message: { content: text } });
const requests = (fetch: ReturnType<typeof vi.fn>) => fetch.mock.calls.map(([, init]) => JSON.parse(init.body).messages[0].content);

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (globalThis as any).__aiLine;
  delete (globalThis as any).__aiSpeed;
});

describe("provider failures release the real serialized inference queue", () => {
  it.each(["malformed HTTP JSON", "fetch rejection"])("lets an already queued caller finish after %s", async (failure) => {
    const started = Promise.withResolvers<void>();
    const response = Promise.withResolvers<Response>();
    const fetch = vi.fn()
      .mockImplementationOnce(() => { started.resolve(); return response.promise; })
      .mockImplementation(async () => reply("recovered"));
    vi.stubGlobal("fetch", fetch);

    const first = ask("fails");
    const rejected = failure === "malformed HTTP JSON"
      ? expect(first).rejects.toBeInstanceOf(SyntaxError)
      : expect(first).rejects.toThrow("connection reset");
    await started.promise;
    const following = ask("following");
    expect(requests(fetch), "the follower must wait while the first network call is pending").toEqual(["fails"]);

    if (failure === "malformed HTTP JSON") response.resolve(new Response('{"message":'));
    else response.reject(new TypeError("connection reset"));

    await rejected;
    await expect(following).resolves.toBe("recovered");
    expect(requests(fetch)).toEqual(["fails", "following"]);
  });

  it("an inference abort releases the queue and the next caller gets its own full timeout", async () => {
    vi.useFakeTimers();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Inference timed out", "TimeoutError")), ms);
      return controller.signal;
    });
    const started = Promise.withResolvers<AbortSignal>();
    const fetch = vi.fn()
      .mockImplementationOnce((_url, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
        const signal = init.signal!;
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        started.resolve(signal);
      }))
      .mockImplementation(async () => reply("after abort"));
    vi.stubGlobal("fetch", fetch);

    const first = ask("times out", { timeoutMs: 50 });
    const rejected = expect(first).rejects.toMatchObject({ name: "TimeoutError" });
    const signal = await started.promise;
    const following = ask("following", { timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(49);
    expect(signal.aborted).toBe(false);
    expect(timeout, "queued callers must not start their inference timeout").toHaveBeenCalledTimes(1);
    expect(requests(fetch)).toEqual(["times out"]);

    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    await expect(following).resolves.toBe("after abort");
    expect(signal.aborted).toBe(true);
    expect(timeout.mock.calls).toEqual([[50], [50]]);
    expect((fetch.mock.calls[1][1] as RequestInit).signal!.aborted).toBe(false);
    expect(requests(fetch)).toEqual(["times out", "following"]);
  });

  it("consecutive queue timeouts never fetch or let later callers overtake active inference", async () => {
    vi.useFakeTimers();
    const started = Promise.withResolvers<void>();
    const response = Promise.withResolvers<Response>();
    const fetch = vi.fn()
      .mockImplementationOnce(() => { started.resolve(); return response.promise; })
      .mockImplementation(async () => reply("ok"));
    vi.stubGlobal("fetch", fetch);

    const active = ask("active");
    await started.promise;
    const expired = Promise.allSettled([
      ask("expired at 25", { maxWaitMs: 25 }),
      ask("expired at 50", { maxWaitMs: 50 }),
    ]);
    const survivor = ask("survivor", { maxWaitMs: 1000 });
    await vi.advanceTimersByTimeAsync(50);
    for (const result of await expired) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.reason).toBeInstanceOf(AiBusyError);
    }
    const newcomer = ask("newcomer");
    await vi.advanceTimersByTimeAsync(0);
    expect(requests(fetch), "giving up a queue slot must not release the active request's slot").toEqual(["active"]);

    response.resolve(reply("ok"));
    await expect(Promise.all([active, survivor, newcomer])).resolves.toEqual(["ok", "ok", "ok"]);
    await expect(ask("later")).resolves.toBe("ok");
    expect(requests(fetch), "expired requests must never reach fetch, even after the queue drains").toEqual(["active", "survivor", "newcomer", "later"]);
  });
});
