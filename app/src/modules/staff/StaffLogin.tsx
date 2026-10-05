"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/modules/platform/client";

export default function StaffLogin() {
  const router = useRouter();
  const [slug, setSlug] = useState("golden-lotus");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { const r = await api<{ role: string }>("/api/staff/login", { body: { slug, pin } }); router.push(r.role === "chef" ? "/staff/chef" : "/staff/waiter"); }
    catch (x: any) { setErr(x.message); setPin(""); }
  }
  const press = (d: string) => setPin((p) => (d === "⌫" ? p.slice(0, -1) : (p + d).slice(0, 8)));
  return (
    <div className="sa-app center-screen" data-theme="night">
      <form onSubmit={go} className="sa-plate auth-card" style={{ maxWidth: 380 }}>
        <div><h1 style={{ fontSize: 32 }}>Staff sign in</h1><p className="muted" style={{ margin: "6px 0 0" }}>Enter your PIN. Floor staff and chefs land on their own screen.</p></div>
        <label className="sa-field"><span>Restaurant</span><input className="sa-input" value={slug} onChange={(e) => setSlug(e.target.value)} autoCapitalize="none" /></label>
        <div className="pin-display" aria-live="polite">{"•".repeat(pin.length) || <span className="muted" style={{ fontSize: 14, letterSpacing: 0 }}>PIN</span>}</div>
        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) => d ? <button key={i} type="button" className="sa-btn" onClick={() => press(d)} aria-label={d === "⌫" ? "Delete" : d}>{d}</button> : <span key={i} />)}
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="sa-btn sa-btn--special sa-btn--block" type="submit" disabled={pin.length < 4}>Sign in</button>
        <div style={{ textAlign: "center", fontSize: 14 }}><Link href="/">Home</Link></div>
      </form>
    </div>
  );
}
