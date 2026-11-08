import QRCode from "qrcode";
import { ownerSession } from "@/modules/platform/auth";
import { json, unauthorized } from "@/modules/platform/http";

function webOrigin(raw: string): string | null {
  try {
    const b = new URL(raw);
    return (b.protocol === "http:" || b.protocol === "https:") && !b.username && !b.password ? b.origin : null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const u = new URL(req.url);
  // The owner may point the code at their own domain or Wi-Fi address, but it must be a plain web address: nothing but
  // http(s), no user:password@ in front of the host, and only the origin is kept (a "javascript:" address is refused).
  const base = webOrigin(u.searchParams.get("base") || u.origin);
  if (!base) return json({ error: "base must be a plain http or https address" }, 400);
  const table = u.searchParams.get("table");
  const url = `${base}/r/${s.slug}${table ? `?t=${encodeURIComponent(table)}` : ""}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#191A45", light: "#FFFFFF" } });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "x-qr-url": url } });
}
