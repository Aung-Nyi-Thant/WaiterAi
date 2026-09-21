import fs from "node:fs";
import path from "node:path";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9]{16}\.(jpg|png|webp)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "data", "uploads", name));
    return new Response(buf, { headers: { "content-type": MIME[name.split(".")[1]], "cache-control": "public, max-age=31536000, immutable" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
