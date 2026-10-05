import { describe, it, expect } from "vitest";
import { call, ownerLogin } from "./helpers";

describe("test harness", () => {
  it("starts with the demo restaurant in a temporary database", async () => {
    const { GET } = await import("@/modules/diner/api/menu");
    const r = await call(GET, { params: { slug: "golden-lotus" } });
    expect(r.status).toBe(200);
    expect(r.data.items.length).toBe(13);
    expect((await ownerLogin()).status).toBe(200);
  });
});
