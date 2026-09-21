"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

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
    <div className="aurora-l" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={submit} className="gl r-xl" style={{ width: "100%", maxWidth: 420, padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <div><h1 style={{ fontSize: 32 }}>{reg ? "Create your restaurant" : "Owner sign in"}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{reg ? "Set up your digital waiter in minutes." : "Manage your menu and AI waiter."}</p></div>
        {reg && <><div><label className="lbl" htmlFor="rn">Restaurant name</label><input id="rn" className="in-l" value={f.restaurantName} onChange={set("restaurantName")} required /></div>
          <div><label className="lbl" htmlFor="ct">City</label><input id="ct" className="in-l" value={f.city} onChange={set("city")} /></div></>}
        <div><label className="lbl" htmlFor="em">Email</label><input id="em" type="email" className="in-l" value={f.email} onChange={set("email")} required autoComplete="email" /></div>
        <div><label className="lbl" htmlFor="pw">Password</label><input id="pw" type="password" className="in-l" value={f.password} onChange={set("password")} required minLength={reg ? 8 : 1} autoComplete={reg ? "new-password" : "current-password"} /></div>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn btn-p" disabled={busy} type="submit" style={{ minHeight: 48 }}>{busy ? "Please wait…" : reg ? "Create account" : "Sign in"}</button>
        <div style={{ textAlign: "center", fontSize: 14 }}>{reg ? <>Already have an account? <Link href="/login"><b>Sign in</b></Link></> : <>New here? <Link href="/register"><b>Create a restaurant</b></Link></>} · <Link href="/">Home</Link></div>
      </form>
    </div>
  );
}
