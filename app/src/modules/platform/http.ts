export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
export const unauthorized = () => json({ error: "Please sign in." }, 401);
export const tooMany = (retryAfter: number) =>
  new Response(JSON.stringify({ error: `Too many attempts. Please wait ${retryAfter} seconds and try again.`, retryAfter }), { status: 429, headers: { "content-type": "application/json", "retry-after": String(retryAfter) } });
export const bad = (msg: string, status = 400) => json({ error: msg }, status);
export async function body<T = any>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}
