import os from "node:os";
import { ownerSession } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const port = new URL(req.url).port || "3000";
  const ips: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) for (const n of list || []) if (n.family === "IPv4" && !n.internal) ips.push(n.address);
  return json({ slug: s.slug, urls: ips.map((ip) => `http://${ip}:${port}`) });
}
