"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

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
    <div className="aurora-d" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={go} className="gd r-xl" style={{ width: "100%", maxWidth: 380, padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div><h1 style={{ fontSize: 32 }}>Staff sign in</h1><p className="soft-d" style={{ margin: "6px 0 0" }}>Enter your PIN. Waiters and chefs land on their own screen.</p></div>
        <div><label className="lbl soft-d" htmlFor="sl" style={{ color: "rgba(255,255,255,.76)" }}>Restaurant</label><input id="sl" className="in" value={slug} onChange={(e) => setSlug(e.target.value)} autoCapitalize="none" /></div>
        <div className="gd r-m" aria-live="polite" style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: ".5em", font: "600 26px var(--font-h)" }}>{"•".repeat(pin.length) || <span className="soft-d" style={{ fontSize: 14, letterSpacing: 0 }}>PIN</span>}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) => d ? <button key={i} type="button" className="btn btn-o" style={{ height: 56, fontSize: 20 }} onClick={() => press(d)} aria-label={d === "⌫" ? "Delete" : d}>{d}</button> : <span key={i} />)}
        </div>
        {err && <div className="err-d" role="alert">{err}</div>}
        <button className="btn btn-w" type="submit" style={{ minHeight: 48 }} disabled={pin.length < 4}>Sign in</button>
        <div style={{ textAlign: "center", fontSize: 14 }}><Link href="/">Home</Link></div>
      </form>
    </div>
  );
}
