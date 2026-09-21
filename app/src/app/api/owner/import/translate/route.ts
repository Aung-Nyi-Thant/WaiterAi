import { ownerSession } from "@/lib/auth";
import { ollamaJson } from "@/lib/ollama";
import { json, bad, body, unauthorized } from "@/lib/http";

export const maxDuration = 300;
export async function POST(req: Request) {
  const s = await ownerSession(); if (!s) return unauthorized();
  const names: string[] = (await body(req)).names?.map((n: any) => String(n).slice(0, 80)).slice(0, 40) || [];
  if (!names.length) return bad("No dish names.");
  try {
    const r = await ollamaJson(`Translate these restaurant dish names into Thai and Burmese (Myanmar, Unicode). Keep them short and natural, the way they are written on a menu. Return ONLY JSON: {"items":[{"en":"...","th":"...","my":"..."}]} in the same order.\n${JSON.stringify(names)}`, [], 3000);
    const out = names.map((n, i) => ({ en: n, th: String(r.items?.[i]?.th || ""), my: String(r.items?.[i]?.my || "") }));
    return json({ items: out });
  } catch (e: any) { return bad("Translation failed: " + (e?.message || "error"), 502); }
}
