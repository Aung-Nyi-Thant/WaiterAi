// @vitest-environment jsdom
// The message that pops up for 2.6 seconds (the diner's "Added: ...", the owner's "Saved"): one timer, restarted by a new message,
// stopped when the page is left. It used to start a timer per message, so the first message's timer cut the second one short, and a timer
// still running when a page closed tried to update a page that was gone (an unhandled error that failed a CI run).
import { describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Diner from "@/modules/diner/Diner";
import OwnerShell, { useOwner } from "@/modules/owner/OwnerShell";
import { tr } from "@/modules/diner/i18n";
import { ownerLogin } from "../helpers";
import { router, withRealApi } from "./harness";

withRealApi();
const toast = () => document.querySelector(".toast")?.textContent ?? null;
// Records the id of every 2.6-second timer and every id passed to clearTimeout, by wrapping the (fake) timer functions by hand, and puts the originals back in stop().
function watchTimers() {
  const realSet = globalThis.setTimeout, realClear = globalThis.clearTimeout;
  const toastIds: unknown[] = [], cleared: unknown[] = [];
  globalThis.setTimeout = ((fn: any, ms?: number, ...rest: any[]) => { const id = realSet(fn, ms, ...rest); if (ms === 2600) toastIds.push(id); return id; }) as any;
  globalThis.clearTimeout = ((id: any) => { cleared.push(id); return realClear(id); }) as any;
  return { toastIds, cleared, stop() { globalThis.setTimeout = realSet; globalThis.clearTimeout = realClear; } };
}

describe("the diner's message", () => {
  const open = async () => {
    window.history.replaceState({}, "", "/?t=5");
    render(<Diner slug="golden-lotus" />);
    await waitFor(() => expect(document.querySelectorAll(".sa-dish").length).toBeGreaterThan(5));
  };
  const add = (name: string) => fireEvent.click(screen.getByRole("button", { name: `${tr("en", "add")} ${name}` }));
  it("a second message gets its own full 2.6 seconds (the first one's timer does not cut it short)", async () => {
    await open();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    add("Tom Yum Goong");
    expect(toast()).toContain("Tom Yum Goong");
    act(() => { vi.advanceTimersByTime(2000); });
    add("Papaya Salad");                                                   // 2.0 s after the first message
    act(() => { vi.advanceTimersByTime(1000); });                          // 3.0 s after the first: its timer (2.6 s) has passed
    expect(toast()).toContain("Papaya Salad");                             // the second is still there
    act(() => { vi.advanceTimersByTime(1700); });                          // 2.7 s after the second
    expect(toast()).toBeNull();
    vi.useRealTimers();
  });
  it("a message is gone after 2.6 seconds, and not before", async () => {
    await open();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    add("Tom Yum Goong");
    act(() => { vi.advanceTimersByTime(2500); });
    expect(toast()).not.toBeNull();
    act(() => { vi.advanceTimersByTime(200); });
    expect(toast()).toBeNull();
    vi.useRealTimers();
  });
  it("leaving the page stops the toast's timer (the one set for 2.6 seconds)", async () => {
    await open();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const w = watchTimers();
    add("Tom Yum Goong");
    expect(w.toastIds).toHaveLength(1);
    cleanup();
    expect(w.cleared).toContain(w.toastIds[0]);
    w.stop();
    vi.useRealTimers();
  });
});

describe("the owner's message", () => {
  const Button = ({ text }: { text: string }) => { const { toast: say } = useOwner(); return <button type="button" onClick={() => say(text)}>{text}</button>; };
  const open = async () => {
    await ownerLogin();
    router.pathname = "/owner/menu";
    render(<OwnerShell><Button text="First" /><Button text="Second" /></OwnerShell>);
    await screen.findByRole("button", { name: "First" });
  };
  it("a second message gets its own full 2.6 seconds, and the message goes after that", async () => {
    await open();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fireEvent.click(screen.getByRole("button", { name: "First" }));
    expect(toast()).toBe("First");
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(toast()).toBe("Second");
    act(() => { vi.advanceTimersByTime(1700); });
    expect(toast()).toBeNull();
    vi.useRealTimers();
  });
  it("leaving the page stops the toast's timer", async () => {
    await open();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const w = watchTimers();
    fireEvent.click(screen.getByRole("button", { name: "First" }));
    expect(w.toastIds).toHaveLength(1);
    cleanup();
    expect(w.cleared).toContain(w.toastIds[0]);
    w.stop();
    vi.useRealTimers();
  });
});
