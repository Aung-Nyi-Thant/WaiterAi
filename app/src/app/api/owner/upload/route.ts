import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ownerSession } from "@/lib/auth";
import { json, bad, unauthorized } from "@/lib/http";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return bad("Please choose an image.");
  const ext = TYPES[file.type];
  if (!ext) return bad("Only JPG, PNG or WebP images are allowed.");
  if (file.size > 8 * 1024 * 1024) return bad("The image is larger than 8 MB.");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return json({ url: `/api/uploads/${name}` });
}
