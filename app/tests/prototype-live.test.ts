import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

const folder = path.resolve(__dirname, "../../prototype");
const html = fs.readFileSync(path.join(folder, "index.html"), "utf8");
const openDemos: JSDOM[] = [];

const statusReply = (modelReady = true, model = "gemma4:12b") => Response.json({ server: true, model, modelReady });

function open(fetch: typeof window.fetch, query = "", allergies: string[] = [], options: {
  statusFetch?: typeof window.fetch; live?: boolean; go?: string; lang?: string;
} = {}) {
  const dom = new JSDOM(html, {
    url: `http://prototype.local/index.html?view=customer&go=${options.go || 'ai'}&lang=${options.lang || 'en'}${options.live === false ? '' : '&ai=live'}${query}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  openDemos.push(dom);
  dom.window.sessionStorage.setItem("shopai3", JSON.stringify({ al: allergies }));
  dom.window.requestAnimationFrame = callback => { callback(0); return 1; };
  Object.assign(dom.window, {
    fetch: (url: string, init?: RequestInit) => url === '/api/public/hachi-kyu/ai-status'
      ? (options.statusFetch || (async () => statusReply()))(url, init) : fetch(url, init),
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  });
  const context = dom.getInternalVMContext();
  for (const script of dom.window.document.querySelectorAll("script")) {
    const source = script.src
      ? fs.readFileSync(path.join(folder, script.getAttribute("src")!), "utf8")
      : script.textContent!;
    new vm.Script(source).runInContext(context);
  }
  return dom.window;
}

afterEach(() => {
  for (const dom of openDemos.splice(0)) dom.window.close();
  vi.useRealTimers();
});

function send(doc: Document, message: string) {
  (doc.getElementById("ci") as HTMLInputElement).value = message;
  (doc.querySelector('[data-a="send"]') as HTMLElement).click();
}

const reply = (extra = {}) => new Response(JSON.stringify({ reply: "Live answer", sessionId: "live-session", ...extra }));
const dishes = [
  { id: "database-salmon", name: { en: "Salmon Sushi" } },
  { id: "database-shrimp", name: { en: "Shrimp Roe Sushi" } },
];

describe("opt-in live prototype AI", () => {
  it("labels the offline demo and makes no requests on opening, polling or scripted chat", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(), statusFetch = vi.fn();
    const doc = open(fetch, '', [], { live: false, statusFetch }).document;
    const chip = doc.querySelector('.ai-status');
    expect(chip?.getAttribute('role')).toBe('status');
    expect(chip?.textContent).toBe('Built-in demo AI (offline, scripted rules)');
    send(doc, 'What is the price of Salmon Sushi?');
    await vi.advanceTimersByTimeAsync(60000);
    expect(doc.querySelector('.chat')?.textContent).toContain('96');
    expect(fetch).not.toHaveBeenCalled();
    expect(statusFetch).not.toHaveBeenCalled();
  });

  it("checks on entry and every 30 seconds, without polling other pages or redrawing the input", async () => {
    vi.useFakeTimers();
    const statusFetch = vi.fn<typeof window.fetch>().mockImplementation(async () => statusReply());
    const doc = open(vi.fn(), '', [], { statusFetch, go: 'menu' }).document;
    expect(statusFetch).not.toHaveBeenCalled();
    (doc.querySelector('nav [data-v="ai"]') as HTMLElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(statusFetch).toHaveBeenCalledTimes(1);
    expect(statusFetch.mock.calls[0]).toEqual(['/api/public/hachi-kyu/ai-status', expect.objectContaining({ cache: 'no-store', signal: expect.anything() })]);
    expect(doc.querySelector('.ai-status')?.textContent).toBe('Live AI · gemma4:12b ready');
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('ready');
    const input = doc.getElementById('ci') as HTMLInputElement;
    input.value = 'Still typing'; input.focus();
    await vi.advanceTimersByTimeAsync(29999);
    expect(statusFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(statusFetch).toHaveBeenCalledTimes(2);
    expect(doc.activeElement).toBe(input);
    expect(input.value).toBe('Still typing');
    (doc.querySelector('nav [data-v="menu"]') as HTMLElement).click();
    await vi.advanceTimersByTimeAsync(30000);
    expect(statusFetch).toHaveBeenCalledTimes(2);
    (doc.querySelector('nav [data-v="ai"]') as HTMLElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(statusFetch).toHaveBeenCalledTimes(3);
  });

  it("renders a malicious model name as text without injecting HTML", async () => {
    const model = '<img src=x onerror=alert(1)>';
    const statusFetch = vi.fn<typeof window.fetch>().mockImplementation(async () => statusReply(true, model));
    const doc = open(vi.fn(), '', [], { statusFetch }).document;
    await vi.waitFor(() => expect(doc.querySelector('.ai-status')?.textContent).toBe(`Live AI · ${model} ready`));
    expect(doc.querySelector('.ai-status img, .ai-status script')).toBeNull();
  });

  it("shows amber for an unloaded model and red with Retry when the server cannot be reached", async () => {
    vi.useFakeTimers();
    const statusFetch = vi.fn<typeof window.fetch>()
      .mockResolvedValueOnce(statusReply(false))
      .mockRejectedValueOnce(new TypeError('Offline'))
      .mockImplementation(async () => statusReply());
    const win = open(vi.fn(), '', [], { statusFetch }), doc = win.document;
    await vi.advanceTimersByTimeAsync(0);
    expect(doc.querySelector('.ai-status')?.textContent).toBe('Live AI · model loading/slow');
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('loading');
    (doc.querySelector('nav [data-v="menu"]') as HTMLElement).click();
    (doc.querySelector('nav [data-v="ai"]') as HTMLElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(doc.querySelector('.ai-status')?.textContent).toContain('Live AI · server unreachable');
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('unreachable');
    const retry = doc.querySelector('[data-ai-retry]') as HTMLButtonElement;
    expect(retry.textContent).toBe('Retry');
    retry.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(doc.querySelector('.ai-status')?.textContent).toBe('Live AI · gemma4:12b ready');
    expect(statusFetch).toHaveBeenCalledTimes(3);
  });

  it.each([
    async () => new Response('not JSON'),
    async () => new Response('{}', { status: 503 }),
    async () => Response.json({ server: false, model: 'gemma4:12b', modelReady: true }),
  ])("shows red for invalid or failed status responses", async statusFetch => {
    const doc = open(vi.fn(), '', [], { statusFetch }).document;
    await vi.waitFor(() => expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('unreachable'));
    expect(doc.querySelector('[data-ai-retry]')).not.toBeNull();
  });

  it("times out a hung status check and retries without overlapping requests", async () => {
    vi.useFakeTimers();
    const statusFetch = vi.fn<typeof window.fetch>().mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
    })).mockImplementation(async () => statusReply());
    const doc = open(vi.fn(), '', [], { statusFetch }).document;
    await vi.advanceTimersByTimeAsync(4000);
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('unreachable');
    (doc.querySelector('[data-ai-retry]') as HTMLElement).click();
    (doc.querySelector('[data-ai-retry]') as HTMLElement).click();
    expect(statusFetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('ready');
  });

  it.each(['th', 'my'])("translates the status into %s", async lang => {
    const doc = open(vi.fn(), '', [], { lang }).document;
    await vi.waitFor(() => expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('ready'));
    expect(doc.querySelector('.ai-status')?.textContent).toContain('gemma4:12b');
    expect(doc.querySelector('.ai-status')?.textContent).not.toContain('ready');
    expect(doc.querySelector('.ai-status')?.getAttribute('role')).toBe('status');
  });

  it.each([
    'The AI waiter is unavailable right now. You can browse the menu or call the staff.',
    'ผู้ช่วย AI ใช้งานไม่ได้ในขณะนี้ค่ะ ดูเมนูหรือเรียกพนักงานได้ค่ะ',
    'AI စားပွဲထိုး ခဏမရနိုင်ပါဘူးရှင်။ မီနူးကို ကြည့်နိုင်ပါတယ်။',
    'AbortError',
  ])("keeps a failed reply visible for the session: %s", async text => {
    vi.useFakeTimers();
    const fetch = vi.fn<typeof window.fetch>().mockResolvedValue(reply({ reply: text }));
    const statusFetch = vi.fn<typeof window.fetch>().mockImplementation(async () => statusReply());
    const win = open(fetch, '', [], { statusFetch }), doc = win.document;
    await vi.advanceTimersByTimeAsync(0);
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('ready');
    send(doc, 'Help me choose');
    await vi.advanceTimersByTimeAsync(0);
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('failed');
    expect(doc.querySelector('.ai-status')?.textContent).toContain('Live AI · reply failed this session');
    expect(doc.querySelector('.ai-status [data-ai-retry]')).toBeNull();
    expect(win.sessionStorage.getItem('shopai_ai_failed')).toBe('1');
    await vi.advanceTimersByTimeAsync(30000);
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('failed');
    expect(doc.querySelector('.ai-status [data-ai-retry]')).toBeNull();
    (doc.querySelector('nav [data-v="menu"]') as HTMLElement).click();
    (doc.querySelector('nav [data-v="ai"]') as HTMLElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('failed');
    expect(doc.querySelector('.ai-status [data-ai-retry]')).toBeNull();
  });

  it("turns red when the chat request aborts", async () => {
    const fetch = vi.fn<typeof window.fetch>().mockRejectedValue(new DOMException('Timed out', 'AbortError'));
    const doc = open(fetch).document;
    send(doc, 'Help me choose');
    await vi.waitFor(() => expect(doc.querySelector('.chat')?.textContent).toContain('The AI took too long to answer.'));
    expect(doc.querySelector('.ai-status')?.getAttribute('data-state')).toBe('failed');
  });

  it("POSTs message, language, table and mapped allergies, then reuses the returned sessionId", async () => {
    const fetch = vi.fn<typeof window.fetch>().mockImplementation(async () => reply());
    const win = open(fetch, "&table=B-7", ["nut", "shell", "milk"]);
    send(win.document, "What can I eat?");
    await vi.waitFor(() => expect(win.document.querySelector(".chat")?.textContent).toContain("Live answer"));

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/public/hachi-kyu/chat");
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(init!.body as string)).toEqual({
      message: "What can I eat?", lang: "en", table: "B-7", profile: ["tree_nut", "shellfish", "milk"],
    });

    send(win.document, "And drinks?");
    await vi.waitFor(() => expect(win.document.querySelectorAll(".chat .m.a:not(.dots)")).toHaveLength(3));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1]!.body as string)).toEqual({
      message: "And drinks?", lang: "en", table: "B-7", sessionId: "live-session", profile: ["tree_nut", "shellfish", "milk"],
    });
  });

  it("renders server HTML as reply text without creating an img element", async () => {
    const text = '<img src=x onerror=alert(1)>';
    const fetch = vi.fn<typeof window.fetch>().mockResolvedValue(reply({ reply: text }));
    const doc = open(fetch).document;
    send(doc, "Show me a reply");
    await vi.waitFor(() => expect(doc.querySelector(".chat .m.a:last-child")?.textContent).toBe(text));
    expect(doc.querySelector(".chat img")).toBeNull();
    expect(doc.querySelector(".chat .m.a:last-child")?.innerHTML).toContain("&lt;img");
  });

  it("matches returned database dishes to local cards by English name", async () => {
    const fetch = vi.fn<typeof window.fetch>().mockResolvedValue(reply({ dishes }));
    const doc = open(fetch).document;
    send(doc, "Show sushi");
    await vi.waitFor(() => expect(doc.querySelectorAll(".chat .mc")).toHaveLength(2));
    expect([...doc.querySelectorAll(".chat .mc b")].map(el => el.textContent)).toEqual(["Salmon Sushi", "Shrimp Roe Sushi"]);
    const local = new Function("window", `${fs.readFileSync(path.join(folder, "data.js"), "utf8")}\nreturn MENU;`)({}) as { id: number; n: string[] }[];
    expect([...doc.querySelectorAll('.chat .mc [data-a="aiadd"]')].map(el => el.getAttribute("data-id"))).toEqual(
      dishes.map(d => String(local.find(m => m.n[1] === d.name.en)!.id)),
    );
  });

  it("applies add_to_picks quantities to the cart and its badge", async () => {
    const fetch = vi.fn<typeof window.fetch>().mockResolvedValue(reply({
      dishes,
      action: { type: "add_to_picks", ids: ["database-salmon"], qty: { "database-salmon": 3 } },
    }));
    const win = open(fetch);
    const doc = win.document;
    send(doc, "Add three salmon sushi");
    await vi.waitFor(() => expect(doc.querySelector('header [data-v="cart"] .bd')?.textContent).toBe("3"));
    const cart = JSON.parse(win.sessionStorage.getItem("shopai3")!).cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].qty).toBe(3);
    expect(String(cart[0].id)).toBe(doc.querySelector('.chat .mc [data-a="aiadd"]')?.getAttribute("data-id"));
    (doc.querySelector('nav [data-v="cart"]') as HTMLElement).click();
    expect(doc.querySelector(".ci b")?.textContent).toBe("Salmon Sushi");
    expect(doc.querySelector(".ci .qt span")?.textContent).toBe("3");
  });

  it.each([
    ["non-JSON 200", async () => new Response("<html>Not JSON</html>"), "The Shop AI server sent an unexpected answer."],
    ["429", async () => new Response(JSON.stringify({ error: "Too many questions" }), { status: 429 }), "Too many questions"],
    ["rejected fetch", async () => { throw new TypeError("Network offline"); }, "Cannot reach the Shop AI server."],
  ] as const)("shows an error and Retry without a typing bubble for %s", async (_name, response, error) => {
    const fetch = vi.fn<typeof window.fetch>().mockImplementationOnce(response).mockImplementation(async () => reply());
    const doc = open(fetch).document;
    const message = 'What about "salmon"?';
    send(doc, message);
    expect(doc.querySelectorAll(".chat .dots")).toHaveLength(1);
    await vi.waitFor(() => expect(doc.querySelector(".chat .m.a:last-child")?.textContent).toContain(error));
    expect(doc.querySelector(".chat .dots")).toBeNull();
    const retry = doc.querySelector('.chat .qa [data-a="ask"]') as HTMLButtonElement;
    expect(retry?.textContent).toBe("Retry");
    expect(retry.dataset.t).toBe(message);
    retry.click();
    await vi.waitFor(() => expect(doc.querySelector(".chat .m.a:last-child")?.textContent).toBe("Live answer"));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1]!.body as string).message).toBe(message);
    expect(doc.querySelector(".chat .dots")).toBeNull();
  });

  it("ignores a second send while the first request is pending", async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.fn<typeof window.fetch>().mockReturnValue(new Promise<Response>(done => { resolve = done; }));
    const doc = open(fetch).document;
    send(doc, "First question");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(doc.querySelectorAll(".chat .dots")).toHaveLength(1);
    send(doc, "Second question");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect([...doc.querySelectorAll(".chat .m.u")].map(el => el.textContent)).toEqual(["First question"]);
    expect(doc.querySelectorAll(".chat .dots")).toHaveLength(1);
    resolve(reply());
    await vi.waitFor(() => expect(doc.querySelector(".chat .m.a:last-child")?.textContent).toBe("Live answer"));
    expect(doc.querySelectorAll(".chat .m.a")).toHaveLength(2);
    expect(doc.querySelector(".chat .dots")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not render a script supplied as the URL table parameter as HTML", async () => {
    const fetch = vi.fn<typeof window.fetch>().mockResolvedValue(reply());
    const doc = open(fetch, `&table=${encodeURIComponent("<script>alert(1)</script>")}`).document;
    expect(doc.querySelector("#app script")).toBeNull();
    expect(doc.querySelector("header .tt small")?.textContent).toBe("Table 5");
    send(doc, "Which table?");
    await vi.waitFor(() => expect(doc.querySelector(".chat .m.a:last-child")?.textContent).toBe("Live answer"));
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string).table).toBe("5");
    expect(doc.querySelector("#app script")).toBeNull();
  });
});
