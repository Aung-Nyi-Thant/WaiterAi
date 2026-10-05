import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ownerSession } from "@/modules/platform/auth";
import { json, bad, unauthorized } from "@/modules/platform/http";
import { UPLOAD_DIR } from "@/modules/platform/paths";
import { MAX_IMAGE_BYTES, sniffImage } from "@/modules/platform/images";

export { UPLOAD_DIR };
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return bad("Please choose an image.");
  const ext = TYPES[file.type];
  if (!ext) return bad("Only JPG, PNG or WebP images are allowed.");
  if (file.size > MAX_IMAGE_BYTES) return bad("The image is larger than 8 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (sniffImage(buf) !== ext) return bad("This file is not a real JPG, PNG or WebP image.");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buf);
  return json({ url: `/api/uploads/${name}` });
}
