"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

function Inner() {
  const { restaurant, toast, refresh, t } = useOwner();
  const sp = useSearchParams();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [nf, setNf] = useState({ q: sp.get("q") || "", a: "" });
  const [rules, setRules] = useState(restaurant.persona.rules);
  const [err, setErr] = useState("");
  const load = () => api<any[]>("/api/owner/faqs").then(setFaqs);
  // biome-ignore lint/correctness/useExhaustiveDependencies: loads once on mount
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/owner/faqs", { body: { ...nf, sort: faqs.length } }); setNf({ q: "", a: "" }); load(); toast(t("faqAdded")); } catch (x: any) { setErr(x.message); }
  }
  async function saveRules() {
    await api("/api/owner/settings", { method: "PUT", body: { persona: { ...restaurant.persona, rules } } }); toast(t("aiRulesSaved")); refresh();
  }
  return (
    <>
      <div><h1 style={{ fontSize: 40 }}>{t("faqTitle")}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{t("faqSubtitle")}</p></div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="sa-plate r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>{t("questionsAnswers")}</h2>
          <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label className="lbl" htmlFor="fq">{t("question")}</label><input id="fq" className="in-l" value={nf.q} onChange={(e) => setNf({ ...nf, q: e.target.value })} placeholder={t("kidsMenuPlaceholder")} required /></div>
            <div><label className="lbl" htmlFor="fa">{t("answer")}</label><textarea id="fa" className="in-l" value={nf.a} onChange={(e) => setNf({ ...nf, a: e.target.value })} style={{ minHeight: 60 }} required /></div>
            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn btn-p" style={{ alignSelf: "flex-start" }} type="submit"><Icon name="plus" size={18} />{t("addFaq")}</button>
          </form>
          {faqs.map((f) => (
            <div key={f.id} className="row" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--line)", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{f.q}</div><div className="soft-l">{f.a}</div></div>
              <button type="button" className="btn btn-ol btn-icon btn-sm" style={{ width: 36 }} aria-label={`${t("delete")} ${f.q}`} onClick={async () => { await api(`/api/owner/faqs/${f.id}`, { method: "DELETE" }); load(); }}><Icon name="trash" size={16} /></button>
            </div>))}
        </div>
        <div className="sa-plate r-xl" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>{t("shopRulesAi")}</h2>
          <p className="soft-l" style={{ margin: 0 }}>{t("rulesInstructions")}</p>
          <textarea className="in-l" aria-label={t("shopRules")} style={{ minHeight: 160 }} value={rules} onChange={(e) => setRules(e.target.value)} maxLength={600} />
          <button type="button" className="btn btn-p" style={{ alignSelf: "flex-start" }} onClick={saveRules}>{t("saveRules")}</button>
          <p className="soft-l" style={{ fontSize: 13, margin: 0 }}>{t("safetyRules")}</p>
        </div>
      </div>
    </>
  );
}
export default function FaqPage() { return <Suspense><Inner /></Suspense>; }
