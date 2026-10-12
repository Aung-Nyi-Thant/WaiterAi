// @vitest-environment jsdom
// The small browser helpers every screen uses: api() (errors with the server's message and status), usePoll, useEscape, minutesAgo.
import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, renderHook } from "@testing-library/react";
import { api, minutesAgo, useEscape, usePoll } from "@/modules/platform/client";
import { flush, withRealApi } from "./harness";

withRealApi();

describe("api()", () => {
  it("returns the parsed JSON of a good answer", async () => {
    const menu = await api<any>("/api/public/golden-lotus/menu");
    expect(menu.restaurant.name).toBe("Golden Lotus Kitchen");
  });
  it("throws an Error with the server's own message and the HTTP status", async () => {
    await expect(api("/api/owner/items")).rejects.toMatchObject({ message: "Please sign in.", status: 401 });
    await expect(api("/api/public/no-such-place/menu")).rejects.toMatchObject({ status: 404 });
  });
  it("falls back to a generic message when the answer has no JSON", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(api("/anything")).rejects.toMatchObject({ message: "Something went wrong (502).", status: 502 });
  });
  it("sends a body as JSON with a POST, a form untouched, and never caches", async () => {
    const seen: any[] = [];
    vi.stubGlobal("fetch", async (u: string, init: any) => { seen.push({ u, init }); return new Response("{}", { status: 200 }); });
    await api("/x", { body: { a: 1 } });
    await api("/y", { method: "PUT", body: { b: 2 } });
    const fd = new FormData(); fd.append("file", "v");
    await api("/z", { form: fd });
    await api("/w");
    expect(seen[0].init).toMatchObject({ method: "POST", body: '{"a":1}', cache: "no-store" });
    expect(seen[0].init.headers).toEqual({ "content-type": "application/json" });
    expect(seen[1].init.method).toBe("PUT");
    expect(seen[2].init.method).toBe("POST");
    expect(seen[2].init.body).toBe(fd);
    expect(seen[3].init.method).toBe("GET");
  });
});

describe("usePoll()", () => {
  it("runs at once, then every interval, always with the latest function; stops when the screen goes away", () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const { rerender, unmount } = renderHook(({ tag }) => usePoll(() => calls.push(tag), 1000), { initialProps: { tag: "a" } });
    expect(calls).toEqual(["a"]);
    act(() => { vi.advanceTimersByTime(1000); });
    rerender({ tag: "b" });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(calls).toEqual(["a", "a", "b"]);
    unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(calls).toHaveLength(3);
  });
  it("skips a beat while the tab is hidden", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    renderHook(() => usePoll(fn, 1000));
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(fn).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("useEscape()", () => {
  it("calls the closer on Escape only while active", () => {
    const close = vi.fn();
    const { rerender } = renderHook(({ on }) => useEscape(close, on), { initialProps: { on: true } });
    fireEvent.keyDown(document, { key: "Enter" });
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
    rerender({ on: false });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("removes its listener when the dialog closes", () => {
    const close = vi.fn();
    const { unmount } = renderHook(() => useEscape(close));
    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
  });
});

describe("minutesAgo()", () => {
  it("says 'just now' under a minute, then whole minutes; a future time is 'just now'", async () => {
    await flush();
    const at = (min: number) => new Date(Date.now() - min * 60000).toISOString();
    expect(minutesAgo(at(0))).toBe("just now");
    expect(minutesAgo(at(0.4))).toBe("just now");
    expect(minutesAgo(at(1))).toBe("1 min");
    expect(minutesAgo(at(12))).toBe("12 min");
    expect(minutesAgo(at(-5))).toBe("just now");
  });
});
