import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ownerSession } from "@/lib/auth";
import { ollamaJson } from "@/lib/ollama";
import { run } from "@/lib/db";
import { json, bad, unauthorized } from "@/lib/http";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const maxDuration = 300;

export async function POST(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return bad("Please choose a photo of the menu.");
  const ext = TYPES[file.type];
  if (!ext) return bad("Only JPG, PNG or WebP photos are allowed.");
  if (file.size > 8 * 1024 * 1024) return bad("The photo is larger than 8 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);

  let parsed: any;
  try {
    parsed = await ollamaJson(
      `This is a photo of a restaurant menu. Read every dish on it.
Return ONLY JSON: {"items":[{"name":"dish name exactly as printed","price":number,"category":"section heading, or Starters / Mains / Curries / Salads / Desserts / Drinks","description":"printed description or empty"}]}
Rules: price is a plain number without currency. Do not invent dishes or prices. If a price is unreadable use 0.`,
      [buf.toString("base64")], 3000);
  } catch (e: any) {
    return bad("The AI could not read this photo (" + (e?.message || "error") + "). Is Ollama running? You can also add dishes by hand.", 502);
  }
  const items = (Array.isArray(parsed?.items) ? parsed.items : [])
    .map((i: any) => ({ name: String(i.name || "").trim().slice(0, 80), price: Number(String(i.price).replace(/[^\d.]/g, "")) || 0, category: String(i.category || "").trim().slice(0, 40) || "Mains", description: String(i.description || "").trim().slice(0, 200) }))
    .filter((i: any) => i.name)
    .slice(0, 80);
  const id = run("INSERT INTO imports (restaurant_id, image_url, result_json) VALUES (?,?,?)", s.restaurantId, `/api/uploads/${name}`, JSON.stringify(items)).id;
  return json({ importId: id, imageUrl: `/api/uploads/${name}`, items });
}
