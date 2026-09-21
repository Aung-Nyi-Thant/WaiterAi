import Link from "next/link";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const r: any = all("SELECT slug, name FROM restaurants ORDER BY id LIMIT 1")[0];
  return (
    <div className="aurora-d" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <main style={{ maxWidth: 880, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="gd" style={{ display: "inline-flex", width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", font: "600 28px var(--font-h)" }}>S</div>
          <h1 style={{ fontSize: 48, fontWeight: 600, marginTop: 14 }}>Shop AI</h1>
          <p className="soft-d" style={{ fontSize: 18, margin: "8px 0 0" }}>The digital waiter. Menu-aware AI chat in Thai, Burmese and English.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <Link href={r ? `/r/${r.slug}?t=5` : "/register"} className="gd r-xl" style={{ padding: 24, textDecoration: "none", color: "#fff" }}>
            <div className="eyebrow soft-d">Diner</div><h2 style={{ fontSize: 26, margin: "6px 0" }}>Scan &amp; ask</h2>
            <p className="soft-d" style={{ margin: 0 }}>Open the demo menu as a guest at table 5. No login.</p>
          </Link>
          <Link href="/login" className="gd r-xl" style={{ padding: 24, textDecoration: "none", color: "#fff" }}>
            <div className="eyebrow soft-d">Owner</div><h2 style={{ fontSize: 26, margin: "6px 0" }}>Manage the menu</h2>
            <p className="soft-d" style={{ margin: 0 }}>Dishes, allergens, AI settings, QR codes, insights.</p>
          </Link>
          <Link href="/staff" className="gd r-xl" style={{ padding: 24, textDecoration: "none", color: "#fff" }}>
            <div className="eyebrow soft-d">Staff</div><h2 style={{ fontSize: 26, margin: "6px 0" }}>Waiter &amp; chef</h2>
            <p className="soft-d" style={{ margin: 0 }}>Live calls, picks and the kitchen queue with a PIN.</p>
          </Link>
        </div>
        <p className="soft-d" style={{ textAlign: "center", marginTop: 24, fontSize: 13 }}>Demo logins: owner <b>demo@shop.ai</b> / <b>demo1234</b> · waiter PIN <b>1111</b> · chef PIN <b>2222</b> · restaurant <b>{r?.slug}</b></p>
        <p style={{ textAlign: "center", marginTop: 8 }}><Link href="/register" className="soft-d">Create a new restaurant</Link></p>
      </main>
    </div>
  );
}
