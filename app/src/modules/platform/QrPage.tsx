
"use client";

import { useEffect, useState } from "react";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

export default function QrPage() {
  const { restaurant } = useOwner();
  const [base, setBase] = useState("");
  const [lan, setLan] = useState<string[]>([]);
  const [tables, setTables] = useState(8);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    setBase(location.origin);
    api<{ urls: string[] }>("/api/owner/lan").then((r) => {
      setLan(r.urls);
    });
  }, []);

  useEffect(() => {
    if (!printMode) return;

    const handleAfterPrint = () => setPrintMode(false);
    window.addEventListener("afterprint", handleAfterPrint);
    window.print();

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printMode]);

  const q = (t?: number) =>
    `/api/owner/qr?base=${encodeURIComponent(base)}${t ? `&table=${t}` : ""}`;

  const isLocal = /localhost|127\.0\.0\.1/.test(base);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            background: white !important;
            color: black !important;
          }

          .no-print {
            display: none !important;
          }

          .qr-print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8mm !important;
          }

          .qr-card {
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
            padding: 8mm !important;
            border: 1px solid #999 !important;
            border-radius: 4mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .qr-card img {
            display: block;
            width: 100% !important;
            max-width: 42mm !important;
            height: auto !important;
            margin: 5mm auto !important;
          }

          .qr-card .restaurant-name {
            font-size: 12pt !important;
            overflow-wrap: anywhere;
          }

          .qr-card .table-number {
            font-size: 20pt !important;
            font-weight: bold;
          }

          .qr-card .table-caption {
            font-size: 9pt !important;
          }

          .qr-card a {
            display: none !important;
          }

          .table-tent-mode .qr-card {
            min-height: 80mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      <div className="no-print">
        <h1 style={{ fontSize: 40 }}>QR codes</h1>
        <p className="soft-l" style={{ margin: "6px 0 0" }}>
          Print QR codes for your restaurant tables.
        </p>
      </div>

      <div
        className="sa-plate r-xl no-print"
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="grid2" style={{ gap: 12 }}>
          <div>
            <label className="lbl" htmlFor="qb">
              Address diners will open
            </label>
            <input
              id="qb"
              className="in-l"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </div>

          <div>
            <label className="lbl" htmlFor="qt">
              Number of tables
            </label>
            <input
              id="qt"
              type="number"
              min={1}
              max={60}
              className="in-l"
              value={tables}
              onChange={(e) =>
                setTables(
                  Math.max(1, Math.min(60, Number(e.target.value) || 1)),
                )
              }
            />
          </div>
        </div>

        {lan.length > 0 && (
          <div
            className="row"
            style={{ gap: 8, flexWrap: "wrap" }}
          >
            <span className="soft-l" style={{ fontSize: 13 }}>
              This computer on your Wi-Fi:
            </span>
            {lan.map((u) => (
              <button
                type="button"
                key={u}
                className="pill pill-l"
                style={{ minHeight: 34 }}
                onClick={() => setBase(u)}
              >
                {u}
              </button>
            ))}
          </div>
        )}

        {isLocal && (
          <div className="soft-l" style={{ fontSize: 13 }}>
            “localhost” only works on this computer. To scan with a phone on
            the same Wi-Fi, pick your Wi-Fi address above before printing.
          </div>
        )}

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-p"
            onClick={() => window.print()}
          >
            <Icon name="qr" size={18} />
            Print all codes
          </button>

          <button
            type="button"
            className="btn btn-p"
            onClick={() => setPrintMode(true)}
          >
            <Icon name="qr" size={18} />
            Print Table Tents
          </button>

          <a
            className="btn btn-ol"
            href={q()}
            download={`${restaurant.slug}-menu.svg`}
          >
            Download restaurant code (SVG)
          </a>
        </div>
      </div>

      <div
        className={`qr-print-grid ${printMode ? "table-tent-mode" : ""}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: tables }, (_, i) => i + 1).map((t) => (
          <div
            key={t}
            className="sa-plate r-xl qr-card"
            style={{ padding: 16, textAlign: "center" }}
          >
            <div
              className="soft-l restaurant-name"
              style={{
                font: "600 13px var(--font-b)",
                letterSpacing: ".1em",
              }}
            >
              {restaurant.name.toUpperCase()}
            </div>

            <img
              src={q(t)}
              alt={`QR code for table ${t}`}
              style={{
                width: "100%",
                maxWidth: 170,
                background: "#fff",
                borderRadius: 12,
                margin: "8px auto",
              }}
            />

            <div
              className="table-number"
              style={{ font: "600 26px var(--font-h)" }}
            >
              Table {t}
            </div>

            <div
              className="soft-l table-caption"
              style={{ fontSize: 12 }}
            >
              Scan to see the menu and ask the AI
            </div>

            <a
              className="no-print soft-l"
              style={{ fontSize: 12 }}
              href={q(t)}
              download={`table-${t}.svg`}
            >
              Download SVG
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
