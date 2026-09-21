"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useOwner } from "@/components/OwnerShell";
import { api } from "@/lib/client";

export default function QrPage() {
  const { restaurant } = useOwner();
  const [base, setBase] = useState("");
  const [lan, setLan] = useState<string[]>([]);
  const [tables, setTables] = useState(8);
  useEffect(() => { setBase(location.origin); api<{ urls: string[] }>("/api/owner/lan").then((r) => { setLan(r.urls); }); }, []);
  const q = (t?: number) => `/api/owner/qr?base=${encodeURIComponent(base)}${t ? `&table=${t}` : ""}`;
  const isLocal = /localhost|127\.0\.0\.1/.test(base);
  return (
    <>
      <div className="no-print"><h1 style={{ fontSize: 40 }}>QR codes</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>One code per table. Print, cut out and put them on the tables.</p></div>
      <div className="gl r-xl no-print" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="lbl" htmlFor="qb">Address diners will open</label><input id="qb" className="in-l" value={base} onChange={(e) => setBase(e.target.value)} /></div>
          <div><label className="lbl" htmlFor="qt">Number of tables</label><input id="qt" type="number" min={1} max={60} className="in-l" value={tables} onChange={(e) => setTables(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} /></div>
        </div>
        {lan.length > 0 && <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className="soft-l" style={{ fontSize: 13 }}>This computer on your Wi-Fi:</span>{lan.map((u) => <button key={u} className="pill pill-l" style={{ minHeight: 34 }} onClick={() => setBase(u)}>{u}</button>)}</div>}
        {isLocal && <div className="soft-l" style={{ fontSize: 13 }}>“localhost” only works on this computer. To scan with a phone on the same Wi-Fi, pick your Wi-Fi address above before printing.</div>}
        <div className="row" style={{ gap: 10 }}><button className="btn btn-p" onClick={() => window.print()}><Icon name="qr" size={18} />Print all codes</button><a className="btn btn-ol" href={q()} download={`${restaurant.slug}-menu.svg`}>Download restaurant code (SVG)</a></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
        {Array.from({ length: tables }, (_, i) => i + 1).map((t) => (
          <div key={t} className="gl r-xl qr-card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ font: "600 13px var(--font-b)", letterSpacing: ".1em" }} className="soft-l">{restaurant.name.toUpperCase()}</div>
            <img src={q(t)} alt={`QR code for table ${t}`} style={{ width: "100%", maxWidth: 170, background: "#fff", borderRadius: 12, margin: "8px auto" }} />
            <div style={{ font: "600 26px var(--font-h)" }}>Table {t}</div>
            <div className="soft-l" style={{ fontSize: 12 }}>Scan to see the menu and ask the AI</div>
            <a className="no-print soft-l" style={{ fontSize: 12 }} href={q(t)} download={`table-${t}.svg`}>Download SVG</a>
          </div>))}
      </div>
    </>
  );
}
