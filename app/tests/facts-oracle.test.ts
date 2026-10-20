// Exhaustive check of the other safety-critical facts against the database: for every dish in English, Thai and Burmese,
// the price, the sold-out state, ordering and the vegetarian/vegan lists must equal the stored data, with no model call.
import { describe, it, expect, afterEach, vi } from "vitest";
import { aiCtx, noModel } from "./helpers";
import { answer } from "@/modules/ai/ai";

afterEach(() => { vi.unstubAllGlobals(); });
const LANGS = ["en", "th", "my"] as const;
const BD = "၀၁၂၃၄၅၆၇၈၉";
const asBurmese = (n: number) => String(n).replace(/\d/g, (d) => BD[+d]);
const hasPrice = (reply: string, n: number, lang: "en" | "th" | "my") => reply.includes(lang === "my" ? asBurmese(n) : String(n));
// the reply must not contain a menu price other than the dish's own (it would be a wrong price shown for this dish)
const otherPrices = (reply: string, own: number, prices: number[], lang: "en" | "th" | "my") =>
  [...new Set(prices)].filter((p) => p !== own && !String(own).includes(String(p)) && new RegExp(`(?<![0-9၀-၉])${lang === "my" ? asBurmese(p) : p}(?![0-9၀-၉])`).test(reply));

const ask = async (msg: string, lang: "en" | "th" | "my", over: Record<string, unknown> = {}) => {
  const calls = noModel();
  const r = await answer(msg, lang, await aiCtx(over));
  vi.unstubAllGlobals();
  return { r, viaModel: calls.length > 0 };
};

describe.each(LANGS)("price and availability of every dish, %s", (lang) => {
  const Q = {
    en: { price: (n: string) => `How much is the ${n}?`, have: (n: string) => `Do you have ${n}?`, order: (n: string) => `I'll have 1 ${n}` },
    th: { price: (n: string) => `${n}ราคาเท่าไหร่`, have: (n: string) => `มี${n}ไหม`, order: (n: string) => `เอา${n} 1 จาน` },
    my: { price: (n: string) => `${n} ဘယ်လောက်လဲ`, have: (n: string) => `${n} ရှိလား`, order: (n: string) => `${n} 1 ပွဲ မှာမယ်` },
  }[lang];

  it("a price question returns exactly the stored price (or says sold out), never the model", async () => {
    const ctx = await aiCtx(); const prices = ctx.items.map((i) => i.price); const wrong: string[] = [];
    for (const d of ctx.items) {
      const { r, viaModel } = await ask(Q.price(d.name[lang]), lang);
      if (viaModel) wrong.push(`model used: ${d.name.en}`);
      else if (!d.available) { if (!/sold out|หมด|မှာလို့မရ|ကုန်/.test(r.reply)) wrong.push(`sold-out ${d.name.en} not reported as sold out: ${r.reply}`); }   // a sold-out dish is reported as sold out instead of quoting a price
      else if (!hasPrice(r.reply, d.price, lang)) wrong.push(`${d.name.en} should be ${d.price}: ${r.reply}`);
      else { const extra = otherPrices(r.reply, d.price, prices, lang); if (extra.length) wrong.push(`${d.name.en} also shows ${extra}: ${r.reply}`); }
    }
    expect(wrong, wrong.join("\n")).toEqual([]);
  });

  it("a sold-out dish is reported as sold out and can never be added to the picks; a dish on sale can", async () => {
    const ctx = await aiCtx(); const wrong: string[] = [];
    for (const d of ctx.items) {
      const { r, viaModel } = await ask(Q.order(d.name[lang]), lang);
      if (viaModel) { wrong.push(`model used: ${d.name.en}`); continue; }
      const added = r.action.type === "add_to_picks" && Object.keys(r.action.qty ?? {}).includes(String(d.id));
      if (!d.available && added) wrong.push(`SOLD-OUT dish added to picks: ${d.name.en}: ${r.reply}`);
      if (d.available && !added) wrong.push(`dish on sale was not added: ${d.name.en}: ${JSON.stringify(r.action)} ${r.reply}`);
    }
    expect(wrong, wrong.join("\n")).toEqual([]);
  });

  it("'do you have X?' for a sold-out dish never offers it", async () => {
    const ctx = await aiCtx(); const wrong: string[] = [];
    for (const d of ctx.items.filter((i) => !i.available)) {
      const { r } = await ask(Q.have(d.name[lang]), lang);
      if (r.action.type === "add_to_picks") wrong.push(`added: ${r.reply}`);
      if ((r.action.ids ?? []).includes(d.id)) wrong.push(`sold-out dish shown as a card: ${r.reply}`);
    }
    expect(wrong, wrong.join("\n")).toEqual([]);
  });
});

describe.each(LANGS)("vegetarian and vegan lists, %s", (lang) => {
  it.each([["vegetarian", false], ["vegan", true]] as const)("%s list = dishes tagged so that are on sale (a dish with another tag or sold out is never listed)", async (kind, vegan) => {
    const ctx = await aiCtx();
    const q = { en: `What ${kind} dishes do you have?`, th: vegan ? "มีเมนูวีแกนไหม" : "มีเมนูมังสวิรัติไหม", my: vegan ? "ဗီဂန် ဟင်းလျာတွေ ဘာရှိလဲ" : "သက်သတ်လွတ် ဟင်းလျာတွေ ဘာရှိလဲ" }[lang];
    const { r, viaModel } = await ask(q, lang);
    expect(viaModel).toBe(false);
    const ok = (i: (typeof ctx.items)[number]) => i.available && (vegan ? i.tags.includes("vegan") : i.tags.includes("vegan") || i.tags.includes("vegetarian"));
    const wrong = ctx.items.filter((i) => r.reply.includes(i.name[lang]) !== ok(i)).map((i) => `${i.name.en} ${ok(i) ? "missing" : "wrongly listed"} [${i.tags.join(",")}${i.available ? "" : ", sold out"}]`);
    expect(wrong, `${wrong.join("\n")}\n${r.reply}`).toEqual([]);
  });
});
