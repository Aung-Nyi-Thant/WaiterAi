// QR-2: the owner's QR page offers this computer's Wi-Fi addresses (GET /api/owner/lan).
import { describe, it, expect } from "vitest";
import { call, ownerLogin, signOut, staffLogin } from "./helpers";
import { GET as lan } from "@/modules/platform/api/lan";

describe("GET /api/owner/lan", () => {
  it("needs an owner login", async () => {
    signOut();
    expect((await call(lan)).status).toBe(401);
    await staffLogin("1111");
    expect((await call(lan)).status).toBe(401);
  });
  it("returns the restaurant code and http addresses with the port of the request", async () => {
    await ownerLogin();
    const r = await call(lan, { url: "http://192.168.1.5:4321/api/owner/lan" });
    expect(r.status).toBe(200);
    expect(r.data.slug).toBe("golden-lotus");
    expect(Array.isArray(r.data.urls)).toBe(true);
    for (const u of r.data.urls) expect(u).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:4321$/);
    expect(r.data.urls.every((u: string) => !u.includes("127.0.0.1"))).toBe(true);        // never the loopback address
  });
  it("uses port 3000 when the request has none", async () => {
    await ownerLogin();
    const r = await call(lan, { url: "http://localhost/api/owner/lan" });
    for (const u of r.data.urls) expect(u.endsWith(":3000")).toBe(true);
  });
});
