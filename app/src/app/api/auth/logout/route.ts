import { clearCookies } from "@/lib/auth";
import { json } from "@/lib/http";
export async function POST() { await clearCookies(); return json({ ok: true }); }
