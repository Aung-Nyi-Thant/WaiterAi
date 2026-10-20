import Link from "next/link";
import { all } from "@/modules/platform/db";

export const dynamic = "force-dynamic";

// The demo accounts the seed scripts create, by restaurant code (npm run db:seed and npm run db:seed:hachi).
const DEMO_OWNER: Record<string, string> = { "golden-lotus": "demo@shop.ai", "hachi-kyu": "hachi@shop.ai" };

export default function Home() {
  // The demo restaurants each get their own door (the first one used to be the only one a visitor could reach). A server with only the
  // owners' own restaurants shows the first one, as before: other owners' restaurants are not advertised on the home page.
  const all_ = all("SELECT r.slug, r.name, (SELECT COUNT(*) FROM menu_items m WHERE m.restaurant_id = r.id) AS dishes FROM restaurants r ORDER BY r.id") as { slug: string; name: string; dishes: number }[];
  const demo = all_.filter((s) => DEMO_OWNER[s.slug]);
  const shops = demo.length ? demo : all_.slice(0, 1);
  const cards = [
    ...(shops.length
      ? shops.map((s) => [`/r/${s.slug}?t=5`, "Diner", s.name, `${s.dishes} ${s.dishes === 1 ? "dish" : "dishes"}. Open the demo menu as a guest at table 5. No login.`])
      : [["/register", "Diner", "Scan & ask", "Create a restaurant first, then open its menu as a guest."]]),
    ["/login", "Owner", "Manage the menu", "Dishes, allergens, AI settings, QR codes, insights."],
    ["/staff", "Staff", "Floor & kitchen", "Live calls, picks and the kitchen board, with a PIN."],
  ];
  return (
    <div className="sa-app center-screen" data-theme="night">
      <main style={{ maxWidth: 880, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 48, lineHeight: "56px" }}>Shop AI</h1>
          <p className="muted" style={{ fontSize: 18, margin: "8px 0 0" }}>An AI Waiter that knows your menu. Chat in Thai, Burmese and English.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {cards.map(([href, who, title, text]) => (
            <Link key={href} href={href} className="sa-plate home-card">
              <div className="sa-label">{who}</div><h2 style={{ fontSize: 26, margin: "6px 0" }}>{title}</h2>
              <p className="muted" style={{ margin: 0 }}>{text}</p>
            </Link>
          ))}
        </div>
        <div className="muted" style={{ textAlign: "center", marginTop: 28, fontSize: 13, display: "grid", gap: 4 }}>
          {demo.map((s) => (
            <p key={s.slug} style={{ margin: 0 }}>{s.name}: owner <b>{DEMO_OWNER[s.slug]}</b> / <b>demo1234</b> · floor PIN <b>1111</b> · chef PIN <b>2222</b> · restaurant <b>{s.slug}</b></p>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 8 }}><Link href="/register" className="muted">Create a new restaurant</Link></p>
      </main>
    </div>
  );
}
