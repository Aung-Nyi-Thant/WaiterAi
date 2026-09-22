"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import TestChat from "@/modules/owner/TestChat";
import { api } from "@/modules/platform/client";
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
  const [msg, setMsg] = useState("");
  const refresh = useCallback(() => { api("/api/owner/me").then(setMe).catch(() => router.push("/login")); }, [router]);
  useEffect(refresh, [refresh]);
  const t = (key: string) => tr(OWNER_LANG, key);
  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2600); };
  const logout = async () => { await api("/api/auth/logout", { body: {} }); router.push("/login"); };
  if (!me) return <div className="aurora-l" style={{ padding: 40 }}>{t("loading")}</div>;
  const r = me.restaurant;
  const pct = Math.min(100, Math.round((me.chatsUsed / r.chat_cap) * 100));
  const crumb = t(NAV.find((n) => path.startsWith(n[0]))?.[2] || "");

  return (
    <OwnerCtx.Provider value={{ restaurant: r, chatsUsed: me.chatsUsed, refresh, toast, t }}>
      <div className="aurora-l">
        <div className="shell">
          <aside className="sidebar gl">
            <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 22px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--purp)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "600 20px var(--font-h)" }}>S</div>
              <div><div style={{ font: "600 20px var(--font-h)", lineHeight: 1.1 }}>{t("brand")}</div><div className="soft-l" style={{ fontSize: 12 }}>{t("tagline")}</div></div>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV.map(([href, icon, label]) => <Link key={href} href={href} className={`navlink ${path.startsWith(href) ? "on" : ""}`}><Icon name={icon} />{t(label)}</Link>)}
            </nav>
            <div className="sidefoot" style={{ marginTop: "auto", padding: 14, borderRadius: 18, background: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.9)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
              <div className="soft-l" style={{ fontSize: 13 }}>{r.city || "—"} · {t("freePlan")}</div>
              <div className="meter" style={{ marginTop: 10, height: 6 }}><div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(46,42,120,.15)" }}><div style={{ width: `${pct}%`, height: 6, borderRadius: 3, background: "var(--purp)" }} /></div></div>
              <div className="soft-l" style={{ fontSize: 12, marginTop: 6 }}>{me.chatsUsed} {t("of")} {r.chat_cap} {t("chatsThisMonth")}</div>
              <button className="btn btn-ol btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={logout}><Icon name="logout" size={16} />{t("signOut")}</button>
            </div>
          </aside>
          <div className="main">
            <div className="topbar">
              <div className="eyebrow soft-l" style={{ fontSize: 13 }}>{crumb}</div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ol no-print" onClick={() => setTest(true)}><Icon name="bot" size={18} />{t("testAssistant")}</button>
                <a className="btn btn-p no-print" href={`/r/${r.slug}?t=1`} target="_blank" rel="noreferrer"><Icon name="eye" size={18} />{t("viewLiveMenu")}</a>
              </div>
            </div>
            {children}
          </div>
        </div>
        {test && <div className="modal-back" onClick={() => setTest(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ fontSize: 26 }}>{t("testAssistant")}</h2><button className="btn btn-ol btn-icon" onClick={() => setTest(false)} aria-label={t("close")}><Icon name="close" /></button></div><TestChat slug={r.slug} /></div></div>}
        {msg && <div className="toast" role="status" style={{ bottom: 32 }}>{msg}</div>}
      </div>
    </OwnerCtx.Provider>
  );
}
