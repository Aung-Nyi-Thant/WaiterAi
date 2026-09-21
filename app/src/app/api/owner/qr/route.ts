import QRCode from "qrcode";
import { ownerSession } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const u = new URL(req.url);
  const base = (u.searchParams.get("base") || u.origin).replace(/\/+$/, "");
  const table = u.searchParams.get("table");
  const url = `${base}/r/${s.slug}${table ? `?t=${encodeURIComponent(table)}` : ""}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#191A45", light: "#FFFFFF" } });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "x-qr-url": url } });
}
