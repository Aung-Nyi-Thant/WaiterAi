"use client";
import { useEffect, useState } from "react";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

export default function QrPage() {
  const { restaurant, t } = useOwner();
  const [base, setBase] = useState("");
  const [lan, setLan] = useState<string[]>([]);
  const [tables, setTables] = useState(8);
  useEffect(() => { setBase(location.origin); api<{ urls: string[] }>("/api/owner/lan").then((r) => { setLan(r.urls); }); }, []);
  const q = (t?: number) => `/api/owner/qr?base=${encodeURIComponent(base)}${t ? `&table=${t}` : ""}`;
  const isLocal = /localhost|127\.0\.0\.1/.test(base);
  return (
    <>
      <div className="no-print"><h1 style={{ fontSize: 40 }}>{t("qrTitle")}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{t("qrSubtitle")}</p></div>
      <div className="sa-plate r-xl no-print" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="lbl" htmlFor="qb">{t("dinerAddress")}</label><input id="qb" className="in-l" value={base} onChange={(e) => setBase(e.target.value)} /></div>
          <div><label className="lbl" htmlFor="qt">{t("numberOfTables")}</label><input id="qt" type="number" min={1} max={60} className="in-l" value={tables} onChange={(e) => setTables(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} /></div>
        </div>
        {lan.length > 0 && <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className="soft-l" style={{ fontSize: 13 }}>{t("thisComputerWifi")}</span>{lan.map((u) => <button type="button" key={u} className="pill pill-l" style={{ minHeight: 34 }} onClick={() => setBase(u)}>{u}</button>)}</div>}
        {isLocal && <div className="soft-l" style={{ fontSize: 13 }}>{t("localhostNotice")}</div>}
        <div className="row" style={{ gap: 10 }}><button type="button" className="btn btn-p" onClick={() => window.print()}><Icon name="qr" size={18} />{t("printAllCodes")}</button><a className="btn btn-ol" href={q()} download={`${restaurant.slug}-menu.svg`}>{t("downloadRestaurantCode")}</a></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
        {Array.from({ length: tables }, (_, i) => i + 1).map((tableNo) => (
          <div key={tableNo} className="sa-plate r-xl qr-card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ font: "600 13px var(--font-b)", letterSpacing: ".1em" }} className="soft-l">{restaurant.name.toUpperCase()}</div>
            <img src={q(tableNo)} alt={`${t("qrCodeForTable")} ${tableNo}`} style={{ width: "100%", maxWidth: 170, background: "#fff", borderRadius: 12, margin: "8px auto" }} />
            <div style={{ font: "600 26px var(--font-h)" }}>{t("table")} {tableNo}</div>
            <div className="soft-l" style={{ fontSize: 12 }}>{t("scanMenuAndAskAi")}</div>
            <a className="no-print soft-l" style={{ fontSize: 12 }} href={q(tableNo)} download={`table-${tableNo}.svg`}>{t("downloadSvg")}</a>
          </div>))}
      </div>
    </>
  );
}
