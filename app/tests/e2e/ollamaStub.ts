import { randomBytes } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

type Reply = { status: number; body?: unknown; raw?: string };
type State = { ps: Reply; chat: Reply };
export type OllamaRequest = { path: string; body?: any };
const unavailable = (): State => ({ ps: { status: 503 }, chat: { status: 503 } });

// The control URL is random, loopback-only, and shared only with this run's tests.
export async function startOllamaStub() {
  const controlPath = `/__test/${randomBytes(24).toString("hex")}`;
  let state = unavailable();
  let requests: OllamaRequest[] = [];
  let warmups = 0;
  const server = http.createServer(async (req, res) => {
    const send = (reply: Reply) => {
      res.writeHead(reply.status, { "content-type": "application/json" });
      res.end(reply.raw ?? JSON.stringify(reply.body ?? {}));
    };
    try {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : undefined;
      if (req.url === controlPath) {
        if (req.method === "POST") {
          state = { ...unavailable(), ...body };
          requests = [];
          warmups = 0;
        } else if (req.method !== "GET") return send({ status: 405 });
        return send({ status: 200, body: { requests, warmups } });
      }
      // A failed chat starts a background rewarm even with AI_WARMUP=0. It must never consume a test reply.
      if (req.url === "/api/chat" && body?.options?.num_predict === 1) {
        warmups++;
        return send({ status: 200, body: { message: { role: "assistant", content: "Hi" }, done: true } });
      }
      requests.push({ path: req.url || "", ...(body ? { body } : {}) });
      if (req.url === "/api/ps" && req.method === "GET") return send(state.ps);
      if (req.url === "/api/chat" && req.method === "POST") return send(state.chat);
      send({ status: 404 });
    } catch { send({ status: 400 }); }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url, controlUrl: url + controlPath,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

export async function configureOllama(state: Partial<State> = {}) {
  const res = await fetch(process.env.E2E_OLLAMA_CONTROL_URL!, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(`Cannot configure Ollama test stub: HTTP ${res.status}`);
}

export async function ollamaRequests(): Promise<OllamaRequest[]> {
  const res = await fetch(process.env.E2E_OLLAMA_CONTROL_URL!);
  if (!res.ok) throw new Error(`Cannot inspect Ollama test stub: HTTP ${res.status}`);
  return (await res.json()).requests;
}
