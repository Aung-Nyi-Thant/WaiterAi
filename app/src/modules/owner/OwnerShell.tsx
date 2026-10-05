"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import TestChat from "@/modules/owner/TestChat";
import { api, useEscape } from "@/modules/platform/client";
import { tr } from "@/modules/owner/i18n";
import type { Restaurant, Lang } from "@/modules/platform/menu";

// The owner dashboard's language is fixed to English for now (see modules/owner/i18n.ts) - this is
// where a per-owner language preference would plug in once Thai/Burmese translation is added, so
// every page already reads its strings through `t()` rather than hardcoding English inline.
const OWNER_LANG: Lang = "en";
type Ctx = { restaurant: Restaurant; chatsUsed: number; refresh: () => void; toast: (m: string) => void; t: (key: string) => string };
const OwnerCtx = createContext<Ctx>(null as any);
export const useOwner = () => useContext(OwnerCtx);

const NAV: [string, string, string][] = [
  ["/owner/menu", "list", "navMenu"], ["/owner/import", "upload", "navImport"], ["/owner/hours", "clock", "navHours"], ["/owner/faq", "help", "navFaq"],
  ["/owner/ai", "bot", "navAi"], ["/owner/qr", "qr", "navQr"], ["/owner/insights", "chart", "navInsights"], ["/owner/staff", "users", "navStaff"],
];

export default function OwnerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ restaurant: Restaurant; chatsUsed: number } | null>(null);
  const [test, setTest] = useState(false);
  useEscape(() => setTest(false), test);
  const [msg, setMsg] = useState("");
  const refresh = useCallback(() => { api("/api/owner/me").then(setMe).catch(() => router.push("/login")); }, [router]);
  useEffect(refresh, [refresh]);
  const t = (key: string) => tr(OWNER_LANG, key);
  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2600); };
  const logout = async () => { await api("/api/auth/logout", { body: {} }); router.push("/login"); };
  if (!me) return <div className="sa-app" style={{ padding: 40 }}>{t("loading")}</div>;
  const r = me.restaurant;
  const pct = Math.min(100, Math.round((me.chatsUsed / r.chat_cap) * 100));
  const crumb = t(NAV.find((n) => path.startsWith(n[0]))?.[2] || "");

  return (
    <OwnerCtx.Provider value={{ restaurant: r, chatsUsed: me.chatsUsed, refresh, toast, t }}>
      <div className="sa-app">
        <div className="shell">
          <nav className="sa-side" aria-label={t("brand")}>
            <div className="sa-side__brand">{t("brand")}</div>
            {NAV.map(([href, icon, label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}><Icon name={icon} />{t(label)}</Link>)}
            <div className="sa-side__live" style={{ margin: "16px 0" }}><a className="sa-btn sa-btn--special sa-btn--sm sa-btn--block no-print" href={`/r/${r.slug}?t=1`} target="_blank" rel="noreferrer"><Icon name="eye" size={18} />{t("viewLiveMenu")}</a></div>
            <div className="sa-side__foot">
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div className="sa-side__muted">{r.city || "—"} · {t("freePlan")}</div>
              {/* biome-ignore lint/a11y/useSemanticElements: <meter> has default browser styling that would change the design */}
              <div className="sa-meter__bar" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("chatsThisMonth")} style={{ marginTop: 10 }}><div className="sa-meter__fill" style={{ width: `${pct}%` }} /></div>
              <div className="sa-side__muted" style={{ marginTop: 6 }}>{me.chatsUsed} {t("of")} {r.chat_cap} {t("chatsThisMonth")}</div>
              <button type="button" className="sa-btn sa-btn--quiet sa-btn--sm sa-btn--block" style={{ marginTop: 10 }} onClick={logout}><Icon name="logout" size={16} />{t("signOut")}</button>
            </div>
          </nav>
          <div className="main">
            <div className="topbar">
              <div className="sa-label">{crumb}</div>
              <button type="button" className="sa-btn sa-btn--ai sa-btn--sm no-print" onClick={() => setTest(true)}><Icon name="sparkles" size={18} />{t("testAssistant")}</button>
            </div>
            {children}
          </div>
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape) */}
        {test && <div className="modal-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setTest(false); }}><div className="modal" role="dialog" aria-label={t("testAssistant")}><div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ fontSize: 26 }}>{t("testAssistant")}</h2><button type="button" className="sa-btn sa-btn--quiet sa-btn--icon sa-btn--sm" onClick={() => setTest(false)} aria-label={t("close")}><Icon name="close" /></button></div><TestChat slug={r.slug} /></div></div>}
        {msg && <div className="toast" role="status" style={{ bottom: 32 }}>{msg}</div>}
      </div>
    </OwnerCtx.Provider>
  );
}
