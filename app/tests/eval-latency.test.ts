// The helpers behind `npm run eval:smooth` (scripts/eval-smooth.mts): percentiles, a latency summary and the share within a limit.
import { describe, expect, it } from "vitest";
import { latencyOf, percentile, shareWithin } from "./evalScore";

describe("percentile (nearest rank)", () => {
  it("picks the value at or above the given share of the sorted list", () => {
    const ms = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(ms, 50)).toBe(50);
    expect(percentile(ms, 90)).toBe(90);
    expect(percentile(ms, 95)).toBe(100);
    expect(percentile(ms, 100)).toBe(100);
    expect(percentile(ms, 0)).toBe(10);
  });
  it("does not depend on the order of the input and does not change it", () => {
    const ms = [90, 10, 50, 30, 70];
    expect(percentile(ms, 50)).toBe(50);
    expect(ms).toEqual([90, 10, 50, 30, 70]);
  });
  it("is 0 for an empty list and the value itself for one value", () => {
    expect(percentile([], 95)).toBe(0);
    expect(percentile([7], 1)).toBe(7);
    expect(percentile([7], 99)).toBe(7);
  });
});

describe("latencyOf and shareWithin", () => {
  it("summarises a list", () => {
    expect(latencyOf([1000, 2000, 3000, 4000])).toEqual({ n: 4, mean: 2500, p50: 2000, p90: 4000, p95: 4000, max: 4000 });
    expect(latencyOf([])).toEqual({ n: 0, mean: 0, p50: 0, p90: 0, p95: 0, max: 0 });
  });
  it("counts the share at or under a limit, and an empty list is fine", () => {
    expect(shareWithin([100, 200, 15_000, 15_001], 15_000)).toBe(0.75);
    expect(shareWithin([], 15_000)).toBe(1);
  });
});
