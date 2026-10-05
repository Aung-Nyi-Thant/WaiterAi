import Link from "next/link";
import { all } from "@/modules/platform/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const r: any = all("SELECT slug, name FROM restaurants ORDER BY id LIMIT 1")[0];
  const cards = [
    [r ? `/r/${r.slug}?t=5` : "/register", "Diner", "Scan & ask", "Open the demo menu as a guest at table 5. No login."],
    ["/login", "Owner", "Manage the menu", "Dishes, allergens, AI settings, QR codes, insights."],
    ["/staff", "Staff", "Floor & kitchen", "Live calls, picks and the kitchen board, with a PIN."],
  ];
  return (
    <div className="sa-app center-screen" data-theme="night">
      <main style={{ maxWidth: 880, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 className="sa-sign__name" style={{ fontSize: 56, lineHeight: "62px" }}>Shop AI</h1>
          <p className="muted" style={{ fontSize: 18, margin: "8px 0 0" }}>An AI Waiter that knows your menu. Chat in Thai, Burmese and English.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {cards.map(([href, who, title, text]) => (
            <Link key={who} href={href} className="sa-plate home-card">
              <div className="sa-label">{who}</div><h2 style={{ fontSize: 26, margin: "6px 0" }}>{title}</h2>
              <p className="muted" style={{ margin: 0 }}>{text}</p>
            </Link>
          ))}
        </div>
        <div className="sa-checker" style={{ marginTop: 28, borderRadius: 4 }} />
        <p className="muted sa-ticket-font" style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>Demo logins: owner <b>demo@shop.ai</b> / <b>demo1234</b> · floor PIN <b>1111</b> · chef PIN <b>2222</b> · restaurant <b>{r?.slug}</b></p>
        <p style={{ textAlign: "center", marginTop: 8 }}><Link href="/register" className="muted">Create a new restaurant</Link></p>
      </main>
    </div>
  );
}
