"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";

type Row = { name: string; price: number; category: string; description: string; name_th?: string; name_my?: string };
const flag = (r: Row) => (!r.price ? "price" : /\d/.test(r.name) || r.name.length < 3 ? "name" : "");

export default function ImportPage() {
  const { toast } = useOwner();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [img, setImg] = useState("");
  const [importId, setImportId] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [added, setAdded] = useState(0);

  async function upload(file?: File) {
    if (!file) return;
    setErr(""); setBusy("Reading your photo with AI. This can take up to a minute…");
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await api<any>("/api/owner/import", { form: fd });
      setImg(r.imageUrl); setImportId(r.importId); setRows(r.items); setStep(2);
      if (!r.items.length) setErr("The AI did not find any dishes. Try a clearer, straight-on photo, or add dishes by hand.");
    } catch (e: any) { setErr(e.message); }
    setBusy("");
  }
  const upd = (i: number, k: keyof Row, v: any) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  async function translate() {
    setBusy("Suggesting Thai and Burmese names…"); setErr("");
    try {
      const r = await api<{ items: { th: string; my: string }[] }>("/api/owner/import/translate", { body: { names: rows.map((x) => x.name) } });
      setRows((x) => x.map((row, i) => ({ ...row, name_th: r.items[i]?.th || row.name_th, name_my: r.items[i]?.my || row.name_my })));
      toast("Suggestions added. Please review the Thai and Burmese names.");
    } catch (e: any) { setErr(e.message); }
    setBusy("");
  }
  async function confirmAll() {
    setBusy("Publishing…"); setErr("");
    try { const r = await api<{ added: number }>("/api/owner/import/confirm", { body: { importId, items: rows } }); setAdded(r.added); setStep(3); }
    catch (e: any) { setErr(e.message); }
    setBusy("");
  }
  const bad = rows.filter((r) => flag(r)).length;
  const Step = ({ n, name }: { n: 1 | 2 | 3; name: string }) => (
    <div className="row" style={{ gap: 8 }}><div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, background: step === n ? "var(--purp)" : step > n ? "var(--green)" : "rgba(255,255,255,.6)", color: step >= n ? "#fff" : "var(--muted)", border: "1px solid rgba(46,42,120,.25)" }}>{step > n ? <Icon name="check" size={16} /> : n}</div><span style={{ fontWeight: step === n ? 700 : 500, color: step === n ? "var(--navy)" : "var(--muted)" }}>{name}</span></div>
  );

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div><h1 style={{ fontSize: 38 }}>{step === 1 ? "Import a menu" : step === 2 ? "Check your menu" : "Menu published"}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{step === 1 ? "Take a photo of your printed menu. The AI reads it, and you check the result." : step === 2 ? `The AI read ${rows.length} dishes from your photo. Fix anything that looks wrong.` : "Your new dishes are live."}</p></div>
        <div className="row" style={{ gap: 14 }}><Step n={1} name="Upload" /><span style={{ width: 30, height: 2, background: "rgba(46,42,120,.25)" }} /><Step n={2} name="Review" /><span style={{ width: 30, height: 2, background: "rgba(46,42,120,.25)" }} /><Step n={3} name="Publish" /></div>
      </div>
      {err && <div className="gl r-l err" role="alert" style={{ padding: "12px 16px" }}>{err}</div>}
      {busy && <div className="gl r-l" style={{ padding: 20 }} role="status">{busy}</div>}

      {step === 1 && !busy && (
        <div className="gl r-xl" style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(46,42,120,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="upload" size={32} color="var(--purp)" /></div>
          <h2 style={{ fontSize: 24 }}>Choose a photo of your menu</h2>
          <p className="soft-l" style={{ margin: 0, maxWidth: 440 }}>JPG, PNG or WebP, up to 8 MB. Lay the menu flat and take the photo straight on, in good light. Nothing goes live until you confirm.</p>
          <label className="btn btn-p" style={{ cursor: "pointer" }}>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr" onChange={(e) => upload(e.target.files?.[0])} /></label>
          <Link href="/owner/menu" className="soft-l">Or add dishes by hand</Link>
        </div>)}

      {step === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 400px) 1fr", gap: 24, alignItems: "start" }}>
          <div><div className="eyebrow soft-l" style={{ marginBottom: 8 }}>Your photo</div><img src={img} alt="Your uploaded menu" style={{ width: "100%", borderRadius: 20, border: "1px solid #fff" }} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div className="eyebrow soft-l">Found {rows.length} dishes · {bad} need a check</div>
              <button className="btn btn-ol btn-sm" onClick={translate} disabled={!!busy || !rows.length}>Suggest Thai &amp; Burmese names</button>
            </div>
            {rows.map((r, i) => {
              const fl = flag(r);
              return (
                <div key={i} className="gl r-l" style={{ padding: "12px 14px", background: fl ? "rgba(255,240,205,.8)" : undefined, outline: fl ? "2px dashed #b45309" : undefined, outlineOffset: -3, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "2 1 200px" }}><label className="lbl" htmlFor={`n${i}`}>Dish name</label><input id={`n${i}`} className="in-l" value={r.name} onChange={(e) => upd(i, "name", e.target.value)} /></div>
                  <div style={{ width: 90 }}><label className="lbl" htmlFor={`p${i}`}>Price ฿</label><input id={`p${i}`} className="in-l" inputMode="decimal" value={r.price} onChange={(e) => upd(i, "price", Number(e.target.value.replace(/[^\d.]/g, "")) || 0)} /></div>
                  <div style={{ flex: "1 1 120px" }}><label className="lbl" htmlFor={`c${i}`}>Category</label><input id={`c${i}`} className="in-l" value={r.category} onChange={(e) => upd(i, "category", e.target.value)} /></div>
                  {(r.name_th || r.name_my) && <div style={{ flex: "1 1 100%", display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}><label className="lbl">Thai (AI suggestion)</label><input className="in-l" value={r.name_th || ""} onChange={(e) => upd(i, "name_th", e.target.value)} /></div>
                    <div style={{ flex: 1 }}><label className="lbl">Burmese (AI suggestion)</label><input className="in-l" value={r.name_my || ""} onChange={(e) => upd(i, "name_my", e.target.value)} /></div></div>}
                  <div className="row" style={{ gap: 8 }}>{fl ? <span className="chip chip-l chip-r">{fl === "price" ? "Check price" : "Check name"}</span> : <span className="chip chip-l chip-g">Looks right</span>}
                    <button className="btn btn-ol btn-icon btn-sm" style={{ width: 36 }} aria-label="Remove dish" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button></div>
                </div>);
            })}
            <div className="gl row" style={{ borderRadius: 34, padding: "10px 12px 10px 22px", gap: 12, flexWrap: "wrap", justifyContent: "space-between", position: "sticky", bottom: 12 }}>
              <div className="row" style={{ gap: 10, fontWeight: 600, fontSize: 14 }}><Icon name="alert" color="#b45309" />Nothing goes live until you confirm.</div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ol" onClick={() => setRows((x) => [...x, { name: "", price: 0, category: "Mains", description: "" }])}>Add a missing dish</button>
                <button className="btn btn-p" onClick={confirmAll} disabled={!!busy || !rows.length}>Confirm &amp; publish</button>
              </div>
            </div>
            <p className="soft-l" style={{ fontSize: 13, margin: 0 }}>Allergens are not read from photos. After publishing, open each dish and tick its allergens; until then diners see “Allergen info not provided”.</p>
          </div>
        </div>)}

      {step === 3 && (
        <div className="gl r-xl" style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={30} color="#fff" /></div>
          <h2 style={{ fontSize: 26 }}>{added} dishes added</h2>
          <p className="soft-l" style={{ margin: 0 }}>Next: add allergens to each dish so the AI waiter can answer allergy questions.</p>
          <Link className="btn btn-p" href="/owner/menu">Go to menu items</Link>
        </div>)}
    </>
  );
}
