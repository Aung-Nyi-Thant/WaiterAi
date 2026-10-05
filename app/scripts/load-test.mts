// Simulates diners using a RUNNING server and reports response times (SRS NFR-P1, NFR-P3, NFR-P4).
//
//   npm run load-test                      3 diners, rule-based chat only
//   npm run load-test -- --diners 30       30 diners at once
//   npm run load-test -- --diners 3 --ai   each diner also asks one open question (needs the AI model)
//   npm run load-test -- --diners 3 --staff 2 --minutes 10 --ai
//                                          timed run (SRS capacity target): 3 diners keep chatting, ordering and asking AI
//                                          questions for 10 minutes while 2 staff screens poll every 3 s (needs LOAD_WAITER_PIN
//                                          and LOAD_CHEF_PIN, the PINs of the restaurant's waiter and chef)
//
//   npm run load-test -- --ai-questions 100
//                                          one diner asks 100 different open questions one after another and the script reports
//                                          the median, 90th percentile and the share answered within 15 s (SRS NFR-1)
//
// Each diner: opens the page and the menu, asks 3 rule-based questions (price, allergy, hours), sends picks, asks for the bill;
// with --ai also one open question. All diners start together. Chat limits should be off for a fair test (RATE_LIMIT_CHAT_*=0).
// This measures the SERVER on this computer. It does not measure a phone's browser or Wi-Fi.
const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const base = (process.env.LOAD_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const slug = process.env.LOAD_SLUG || "golden-lotus";
const diners = Number(arg("diners", "3"));
const withAi = process.argv.includes("--ai");
const minutes = Number(arg("minutes", "0")), staffScreens = Number(arg("staff", "0")), aiQuestions = Number(arg("ai-questions", "0"));

const times = new Map<string, number[]>();
let errors = 0;
async function timed(label: string, req: () => Promise<Response>) {
  const t0 = performance.now();
  try {
    const res = await req();
    const body = await res.text();
    if (!res.ok) { errors++; console.error(`  ${label}: HTTP ${res.status} ${body.slice(0, 80)}`); }
    (times.get(label) || times.set(label, []).get(label)!).push(performance.now() - t0);
    try { return JSON.parse(body); } catch { return body; }
  } catch (e: any) { errors++; console.error(`  ${label}: ${e?.message}`); return null; }
}
const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function diner(n: number) {
  const sessionId = `load-${Date.now()}-${n}`, table = String((n % 12) + 1);
  await timed("page /r/<slug>", () => fetch(`${base}/r/${slug}?t=${table}`));
  const menu = await timed("menu API", () => fetch(`${base}/api/public/${slug}/menu?open=1`));
  const chat = (label: string, message: string) => timed(label, () => post(`/api/public/${slug}/chat`, { message, sessionId, table, preview: true }));
  await chat("chat: price (rules)", "How much is the Massaman curry?");
  await chat("chat: allergy (rules)", "I'm allergic to peanuts");
  await chat("chat: hours (rules)", "What time do you close?");
  if (withAi) await chat("chat: open question (AI model)", "What would you recommend on a hot day?");
  const dish = menu?.items?.find((i: any) => i.available);
  if (dish) await timed("send picks", () => post(`/api/public/${slug}/orders`, { table, lang: "en", sessionId, items: [{ id: dish.id, qty: 1 }] }));
  await timed("bill", () => fetch(`${base}/api/public/${slug}/bill?t=${table}`));
}

const pct = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
const report = (title: string, seconds: string) => {
  console.log(`\n${title}, ${seconds} s, ${errors} errors\n`);
  console.log("| Step | Requests | Median | 95th percentile | Slowest |\n|---|---|---|---|---|");
  for (const [label, a] of times) console.log(`| ${label} | ${a.length} | ${pct(a, 50).toFixed(0)} ms | ${pct(a, 95).toFixed(0)} ms | ${Math.max(...a).toFixed(0)} ms |`);
};

// ---- timed run: diners that keep going, plus staff screens that poll like the real ones
async function staffScreen(role: "waiter" | "chef", stopAt: number) {
  const pin = process.env[role === "waiter" ? "LOAD_WAITER_PIN" : "LOAD_CHEF_PIN"];
  if (!pin) { console.error(`Set LOAD_${role.toUpperCase()}_PIN`); errors++; return; }
  const login = await fetch(`${base}/api/staff/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, pin }) });
  const cookie = (login.headers.getSetCookie()[0] || "").split(";")[0];
  if (!login.ok) { errors++; console.error(`${role} login failed (${login.status})`); return; }
  while (performance.now() < stopAt) {
    await timed(`${role} screen poll (every 3 s)`, () => fetch(`${base}/api/staff/${role === "waiter" ? "floor" : "kitchen"}`, { headers: { cookie } }));
    await new Promise((r) => setTimeout(r, 3000));
  }
}
async function keepGoing(n: number, stopAt: number) {
  while (performance.now() < stopAt) {
    await diner(n);
    await new Promise((r) => setTimeout(r, 5000 + Math.random() * 10000));        // a diner reads the answer before asking again
  }
}

const OPEN_QUESTIONS = ["What would you recommend on a hot day?", "What's your most popular dish?", "I'm hungry, what should I order?", "What's good for two people sharing?", "I like spicy food, any suggestions?", "Do you have anything with chicken?", "What desserts do you have?", "What drinks do you have?", "Can you suggest a light meal?", "What goes well with the Pad Thai?", "Is there Wi-Fi?", "Is there parking?", "Do you have burgers?", "Do you serve breakfast?", "Can I get a refund?", "What is Tom Yum?", "Tell me about the Massaman curry", "Do you take credit cards?", "Which dish is best for a child?", "What would you eat if you were me?", "แนะนำเมนูหน่อย", "มีอะไรอร่อยบ้าง", "ร้านมีวายฟายไหม", "ဘာစားသင့်လဲ", "ဝိုင်ဖိုင် ရှိလား"];
const t0 = performance.now();
if (aiQuestions > 0) {
  const sessionId = `timing-${Date.now()}`, a: number[] = [];
  for (let i = 0; i < aiQuestions; i++) {
    const s = performance.now();
    await timed("open question", () => post(`/api/public/${slug}/chat`, { message: OPEN_QUESTIONS[i % OPEN_QUESTIONS.length], sessionId: `${sessionId}-${Math.floor(i / 15)}`, table: "5", preview: true }));
    a.push(performance.now() - s);
  }
  const within = a.filter((x) => x <= 15000).length;
  console.log(`\n${aiQuestions} open questions, one at a time, ${errors} errors`);
  console.log(`median ${(pct(a, 50) / 1000).toFixed(1)} s, 90th percentile ${(pct(a, 90) / 1000).toFixed(1)} s, slowest ${(Math.max(...a) / 1000).toFixed(1)} s`);
  console.log(`answered within 15 s: ${within} of ${a.length} (${Math.round((100 * within) / a.length)}%; target 90%)`);
  process.exit(errors ? 1 : 0);
}
if (minutes > 0) {
  const stopAt = t0 + minutes * 60_000;
  await Promise.all([...Array.from({ length: diners }, (_, i) => keepGoing(i, stopAt)), ...Array.from({ length: staffScreens }, (_, i) => staffScreen(i % 2 ? "chef" : "waiter", stopAt))]);
  report(`${diners} diners and ${staffScreens} staff screens for ${minutes} minutes${withAi ? " (with AI questions)" : ""}`, ((performance.now() - t0) / 1000).toFixed(0));
  const ai = times.get("chat: open question (AI model)");
  if (ai) console.log(`\nAI answers: ${ai.length}, slowest ${(Math.max(...ai) / 1000).toFixed(1)} s (target: every answer within 30 s)`);
} else {
  await Promise.all(Array.from({ length: diners }, (_, i) => diner(i)));
  report(`${diners} diners at once${withAi ? " (with an AI question each)" : ""}`, ((performance.now() - t0) / 1000).toFixed(1));
}
process.exit(errors ? 1 : 0);
