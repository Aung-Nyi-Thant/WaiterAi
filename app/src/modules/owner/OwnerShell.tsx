"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/modules/platform/Icon";
import TestChat from "@/modules/owner/TestChat";
import { api } from "@/modules/platform/client";
import type { Restaurant } from "@/modules/platform/menu";

type Ctx = { restaurant: Restaurant; chatsUsed: number; refresh: () => void; toast: (m: string) => void };
const OwnerCtx = createContext<Ctx>(null as any);
export const useOwner = () => useContext(OwnerCtx);

const NAV: [string, string, string][] = [
  ["/owner/menu", "list", "Menu items"], ["/owner/import", "upload", "Import a menu"], ["/owner/hours", "clock", "Specials & hours"], ["/owner/faq", "help", "FAQ & rules"],
  ["/owner/ai", "bot", "AI waiter"], ["/owner/qr", "qr", "QR codes"], ["/owner/insights", "chart", "Insights"], ["/owner/staff", "users", "Staff"],
];

export default function OwnerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ restaurant: Restaurant; chatsUsed: number } | null>(null);
  const [test, setTest] = useState(false);
  const [msg, setMsg] = useState("");
  const refresh = useCallback(() => { api("/api/owner/me").then(setMe).catch(() => router.push("/login")); }, [router]);
  useEffect(refresh, [refresh]);
  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2600); };
  const logout = async () => { await api("/api/auth/logout", { body: {} }); router.push("/login"); };
  if (!me) return <div className="aurora-l" style={{ padding: 40 }}>Loading…</div>;
  const r = me.restaurant;
  const pct = Math.min(100, Math.round((me.chatsUsed / r.chat_cap) * 100));
  const crumb = NAV.find((n) => path.startsWith(n[0]))?.[2] || "";

  return (
    <OwnerCtx.Provider value={{ restaurant: r, chatsUsed: me.chatsUsed, refresh, toast }}>
      <div className="aurora-l">
        <div className="shell">
          <aside className="sidebar gl">
            <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 22px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--purp)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "600 20px var(--font-h)" }}>S</div>
              <div><div style={{ font: "600 20px var(--font-h)", lineHeight: 1.1 }}>Shop AI</div><div className="soft-l" style={{ fontSize: 12 }}>The digital waiter</div></div>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV.map(([href, icon, label]) => <Link key={href} href={href} className={`navlink ${path.startsWith(href) ? "on" : ""}`}><Icon name={icon} />{label}</Link>)}
            </nav>
            <div className="sidefoot" style={{ marginTop: "auto", padding: 14, borderRadius: 18, background: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.9)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
              <div className="soft-l" style={{ fontSize: 13 }}>{r.city || "—"} · Free plan</div>
              <div className="meter" style={{ marginTop: 10, height: 6 }}><div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(46,42,120,.15)" }}><div style={{ width: `${pct}%`, height: 6, borderRadius: 3, background: "var(--purp)" }} /></div></div>
              <div className="soft-l" style={{ fontSize: 12, marginTop: 6 }}>{me.chatsUsed} of {r.chat_cap} chats this month</div>
              <button className="btn btn-ol btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={logout}><Icon name="logout" size={16} />Sign out</button>
            </div>
          </aside>
          <div className="main">
            <div className="topbar">
              <div className="eyebrow soft-l" style={{ fontSize: 13 }}>{crumb}</div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ol no-print" onClick={() => setTest(true)}><Icon name="bot" size={18} />Test the assistant</button>
                <a className="btn btn-p no-print" href={`/r/${r.slug}?t=1`} target="_blank" rel="noreferrer"><Icon name="eye" size={18} />View live menu</a>
              </div>
            </div>
            {children}
          </div>
        </div>
        {test && <div className="modal-back" onClick={() => setTest(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ fontSize: 26 }}>Test the assistant</h2><button className="btn btn-ol btn-icon" onClick={() => setTest(false)} aria-label="Close"><Icon name="close" /></button></div><TestChat slug={r.slug} /></div></div>}
        {msg && <div className="toast" role="status" style={{ bottom: 32 }}>{msg}</div>}
      </div>
    </OwnerCtx.Provider>
  );
}
