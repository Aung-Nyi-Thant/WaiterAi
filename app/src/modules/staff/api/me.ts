import { staffSession } from "@/modules/platform/auth";
import { json, unauthorized } from "@/modules/platform/http";
export async function GET() {
  const s = await staffSession();
  return s ? json(s) : unauthorized();
}
