import { staffSession } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";
export async function GET() {
  const s = await staffSession();
  return s ? json(s) : unauthorized();
}
