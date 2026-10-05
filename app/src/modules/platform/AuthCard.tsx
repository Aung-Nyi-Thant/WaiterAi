"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/modules/platform/client";

export default function AuthCard({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const reg = mode === "register";
  const [f, setF] = useState({ email: reg ? "" : "demo@shop.ai", password: reg ? "" : "demo1234", restaurantName: "", city: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await api(`/api/auth/${mode}`, { body: f }); router.push("/owner/menu"); } catch (x: any) { setErr(x.message); setBusy(false); }
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="sa-app center-screen">
      <form onSubmit={submit} className="sa-plate auth-card">
        <div className="sa-display" style={{ color: "var(--cherry-text)", fontSize: 22 }}>Shop AI</div>
        <div><h1 style={{ fontSize: 32 }}>{reg ? "Create your restaurant" : "Owner sign in"}</h1><p className="muted" style={{ margin: "6px 0 0" }}>{reg ? "Set up your AI Waiter in minutes." : "Manage your menu and AI Waiter."}</p></div>
        {reg && <><label className="sa-field"><span>Restaurant name</span><input className="sa-input" value={f.restaurantName} onChange={set("restaurantName")} required /></label>
          <label className="sa-field"><span>City</span><input className="sa-input" value={f.city} onChange={set("city")} /></label></>}
        <label className="sa-field"><span>Email</span><input type="email" className="sa-input" value={f.email} onChange={set("email")} required autoComplete="email" /></label>
        <label className="sa-field"><span>Password</span><input type="password" className="sa-input" value={f.password} onChange={set("password")} required minLength={reg ? 8 : 1} autoComplete={reg ? "new-password" : "current-password"} /></label>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="sa-btn sa-btn--special sa-btn--block" disabled={busy} type="submit">{busy ? "Please wait…" : reg ? "Create account" : "Sign in"}</button>
        <div style={{ textAlign: "center", fontSize: 14 }}>{reg ? <>Already have an account? <Link href="/login"><b>Sign in</b></Link></> : <>New here? <Link href="/register"><b>Create a restaurant</b></Link></>} · <Link href="/">Home</Link></div>
      </form>
    </div>
  );
}
