import { vi } from "vitest";

export const jar: Map<string, string> = (globalThis as any).__cookieJar;

type Handler = (req: Request, ctx: { params: Promise<any> }) => Promise<Response> | Response;
export type CallOpts = { method?: string; url?: string; body?: unknown; form?: FormData; params?: Record<string, string> };

// Calls a route handler directly (no HTTP server) and parses the JSON answer.
export async function call(handler: Handler, o: CallOpts = {}) {
  const method = o.method || "GET";
  const init: RequestInit = { method };
  if (o.form) init.body = o.form;
  else if (o.body !== undefined) { init.body = JSON.stringify(o.body); init.headers = { "content-type": "application/json" }; }
  const res = await handler(new Request(o.url || "http://test.local/api/x", init), { params: Promise.resolve(o.params || {}) });
  const text = await res.text();
  let data: any = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, data, headers: res.headers };
}

export const signOut = () => jar.clear();

// The first bytes of real image files (what the server checks), padded to a small body.
const pad = (head: number[], n = 64) => new Uint8Array([...head, ...new Array(Math.max(0, n - head.length)).fill(7)]);
export const IMAGE_BYTES = {
  png: pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: pad([0xff, 0xd8, 0xff, 0xe0]),
  webp: pad([...Buffer.from("RIFF"), 1, 0, 0, 0, ...Buffer.from("WEBP")]),
};
export const imageFile = (kind: keyof typeof IMAGE_BYTES = "png", declared = `image/${kind === "jpg" ? "jpeg" : kind}`, name = `a.${kind}`) => new File([IMAGE_BYTES[kind]], name, { type: declared });

export async function ownerLogin(email = "demo@shop.ai", password = "demo1234") {
  const { POST } = await import("@/modules/platform/api/login");
  signOut();
  return call(POST, { method: "POST", body: { email, password } });
}
export async function staffLogin(pin: string, slug = "golden-lotus", role?: string) {
  const { POST } = await import("@/modules/staff/api/login");
  signOut();
  return call(POST, { method: "POST", body: { slug, pin, role } });
}

// Replaces the global fetch (the only way the app talks to a model). Returns the list of calls made.
export function mockModel(reply: string | ((body: any) => string) | Error) {
  const calls: { url: string; body: any; headers: any }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    const body = init?.body ? JSON.parse(init.body) : {};
    calls.push({ url: String(url), body, headers: init?.headers });
    if (reply instanceof Error) throw reply;
    const text = typeof reply === "function" ? reply(body) : reply;
    const json = String(url).includes("/chat/completions") ? { choices: [{ message: { content: text } }] } : { message: { content: text } };
    return new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } });
  });
  return calls;
}
export const noModel = () => mockModel(new Error("the model must not be called for this question"));

// The demo restaurant, the way the AI sees it.
export async function aiCtx(overrides: Record<string, unknown> = {}) {
  const { restaurantBySlug, itemsOf, faqsOf, specialsOf } = await import("@/modules/platform/menu");
  const r = restaurantBySlug("golden-lotus")!;
  return { restaurant: r, items: itemsOf(r.id), faqs: faqsOf(r.id) as any[], specials: specialsOf(r.id) as any[], history: [] as any[], ...overrides };
}
