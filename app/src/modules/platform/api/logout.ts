import { clearCookies } from "@/modules/platform/auth";
import { json } from "@/modules/platform/http";
export async function POST() { await clearCookies(); return json({ ok: true }); }
