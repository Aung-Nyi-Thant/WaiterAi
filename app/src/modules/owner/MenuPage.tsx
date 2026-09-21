"use client";
import { useEffect, useState, useCallback } from "react";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api } from "@/modules/platform/client";
import { ALLERGENS, TAGS, ALLERGEN_LABEL, TAG_LABEL } from "@/modules/platform/constants";
import type { Item, Category } from "@/modules/platform/menu";

const blank = (category_id: number | null): any => ({ category_id, name: { en: "", th: "", my: "" }, desc: { en: "", th: "", my: "" }, price: 0, ingredients: "", allergens: null, tags: [], spice: 0, available: true, photo_url: "" });

export default function MenuPage() {
  const { toast } = useOwner();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<(Category & { name_en?: string })[]>([]);
  const [tab, setTab] = useState(0);
  const [edit, setEdit] = useState<any | null>(null);
  const [catEdit, setCatEdit] = useState<any | null>(null);
  const load = useCallback(async () => {
    const [i, c] = await Promise.all([api<Item[]>("/api/owner/items"), api<any[]>("/api/owner/categories")]);
    setItems(i); setCats(c.map((x) => ({ id: x.id, sort: x.sort, name: { en: x.name_en, th: x.name_th, my: x.name_my } })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = items.filter((i) => !tab || i.category_id === tab);
  const complete = items.filter((i) => i.allergens !== null).length;
  const toggle = async (i: Item) => { await api(`/api/owner/items/${i.id}`, { method: "PUT", body: { available: !i.available } }); load(); };
  const missing = items.filter((i) => i.allergens === null);

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div><h1 style={{ fontSize: 40 }}>Menu items</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>What diners see, and what the AI waiter is allowed to say.</p></div>
        <div className="gl r-l" style={{ width: 320, padding: "14px 18px" }}>
          <div className="eyebrow soft-l">Allergen data</div>
          <div style={{ font: "700 17px var(--font-b)", margin: "2px 0 10px" }}>{complete} of {items.length} dishes complete</div>
          <div className="meter">{items.map((i, k) => <i key={k} className={i.allergens !== null ? "on" : ""} />)}</div>
          {missing.length > 0 && <div className="soft-l" style={{ fontSize: 12, marginTop: 8 }}>{missing.slice(0, 2).map((m) => m.name.en).join(", ")}{missing.length > 2 ? ` and ${missing.length - 2} more` : ""} — no allergen info yet.</div>}
        </div>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className={`pill pill-l ${!tab ? "on" : ""}`} onClick={() => setTab(0)}>All · {items.length}</button>
        {cats.map((c) => <button key={c.id} className={`pill pill-l ${tab === c.id ? "on" : ""}`} onClick={() => setTab(c.id)}>{c.name.en}</button>)}
        <button className="pill pill-l" onClick={() => setCatEdit({ name_en: "", name_th: "", name_my: "" })}><Icon name="plus" size={16} />Category</button>
        {tab > 0 && <button className="pill pill-l" onClick={() => { const c = cats.find((x) => x.id === tab)!; setCatEdit({ id: c.id, name_en: c.name.en, name_th: c.name.th === c.name.en ? "" : c.name.th, name_my: c.name.my === c.name.en ? "" : c.name.my }); }}><Icon name="edit" size={16} />Edit category</button>}
        <div style={{ flex: 1 }} />
        <button className="btn btn-p" onClick={() => setEdit(blank(tab || cats[0]?.id || null))}><Icon name="plus" size={18} />Add dish</button>
      </div>
      <div className="gl r-xl" style={{ overflow: "hidden" }}>
        <div className="table-head"><div>Dish</div><div>Price</div><div>Allergens</div><div>Tags</div><div>Today</div><div /></div>
        {shown.length === 0 && <div className="soft-l" style={{ padding: 24 }}>No dishes here yet. Add one, or import a menu photo.</div>}
        {shown.map((i) => (
          <div className="table-row" key={i.id}>
            <div className="row" style={{ gap: 12 }}>
              {i.photo_url ? <img className="photo" src={i.photo_url} alt="" /> : <div className="photo">PHOTO</div>}
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700 }}>{i.name.en}</div><div className="soft-l" style={{ fontSize: 12, lineHeight: 1.7 }}>{[i.name.th !== i.name.en && i.name.th, i.name.my !== i.name.en && i.name.my].filter(Boolean).join(" · ")}</div></div>
            </div>
            <div style={{ font: "700 16px var(--font-h)" }}>฿{i.price}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{i.allergens === null ? <span className="chip chip-l chip-r">Not provided</span> : i.allergens.length === 0 ? <span className="chip chip-l chip-y">None listed</span> : i.allergens.map((a) => <span key={a} className="chip chip-l">{ALLERGEN_LABEL[a] || a}</span>)}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{i.tags.filter((t) => t !== "vegetarian" || !i.tags.includes("vegan")).map((t) => <span key={t} className="chip chip-l chip-g">{TAG_LABEL[t] || t}</span>)}</div>
            <div className="row" style={{ gap: 8, fontWeight: 700, fontSize: 13, color: i.available ? "#0b6b57" : "#9b1c1c" }}>
              <button className={`switch ${i.available ? "on" : ""}`} role="switch" aria-checked={i.available} aria-label={`${i.name.en} on sale`} onClick={() => toggle(i)} />{i.available ? "On sale" : "Sold out"}
            </div>
            <button className="btn btn-ol btn-icon" style={{ borderRadius: 14 }} aria-label={`Edit ${i.name.en}`} onClick={() => setEdit(JSON.parse(JSON.stringify(i)))}><Icon name="edit" size={18} /></button>
          </div>))}
      </div>
      {edit && <ItemForm item={edit} cats={cats} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); toast("Saved."); }} />}
      {catEdit && <CatForm cat={catEdit} onClose={() => setCatEdit(null)} onSaved={(deleted) => { setCatEdit(null); if (deleted) setTab(0); load(); toast(deleted ? "Category deleted." : "Saved."); }} />}
    </>
  );
}

function ItemForm({ item, cats, onClose, onSaved }: { item: any; cats: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(item);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isNew = !f.id;
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const toggleIn = (k: "allergens" | "tags", v: string) => set(k, (f[k] || []).includes(v) ? f[k].filter((x: string) => x !== v) : [...(f[k] || []), v]);
  async function upload(file?: File) {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { set("photo_url", (await api<{ url: string }>("/api/owner/upload", { form: fd })).url); } catch (e: any) { setErr(e.message); }
  }
  async function save() {
    setErr(""); setBusy(true);
    try {
      const body = { category_id: f.category_id, name: f.name, desc: f.desc, price: f.price, ingredients: f.ingredients, allergens: f.allergens, tags: f.tags, spice: f.spice, available: f.available, photo_url: f.photo_url };
      if (isNew) await api("/api/owner/items", { body }); else await api(`/api/owner/items/${f.id}`, { method: "PUT", body });
      onSaved();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  async function del() {
    if (!confirm(`Delete "${f.name.en}"? This cannot be undone.`)) return;
    await api(`/api/owner/items/${f.id}`, { method: "DELETE" }); onSaved();
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={isNew ? "Add dish" : "Edit dish"} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 26 }}>{isNew ? "Add a dish" : "Edit dish"}</h2><button className="btn btn-ol btn-icon" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="lbl" htmlFor="n-en">Name (English)</label><input id="n-en" className="in-l" value={f.name.en} onChange={(e) => set("name", { ...f.name, en: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="pr">Price (฿)</label><input id="pr" type="number" min={0} className="in-l" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div><label className="lbl" htmlFor="n-th">Name (Thai)</label><input id="n-th" className="in-l" value={f.name.th} onChange={(e) => set("name", { ...f.name, th: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="n-my">Name (Burmese)</label><input id="n-my" className="in-l" value={f.name.my} onChange={(e) => set("name", { ...f.name, my: e.target.value })} /></div>
        </div>
        <div className="grid2" style={{ gap: 12 }}>
          <div><label className="lbl" htmlFor="cat">Category</label><select id="cat" className="in-l" value={f.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name.en}</option>)}</select></div>
          <div><label className="lbl" htmlFor="sp">Spice level</label><select id="sp" className="in-l" value={f.spice} onChange={(e) => set("spice", Number(e.target.value))}>{["Not spicy", "Mild", "Medium", "Hot"].map((s, i) => <option key={i} value={i}>{s}</option>)}</select></div>
        </div>
        <div><label className="lbl" htmlFor="ds">Description (English)</label><textarea id="ds" className="in-l" value={f.desc.en} onChange={(e) => set("desc", { ...f.desc, en: e.target.value })} style={{ minHeight: 60 }} /></div>
        <div><label className="lbl" htmlFor="ing">Ingredients</label><input id="ing" className="in-l" value={f.ingredients} onChange={(e) => set("ingredients", e.target.value)} placeholder="rice noodles, shrimp, egg…" /></div>
        <div>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span className="lbl" style={{ margin: 0 }}>Allergens</span>
            <label className="check"><input type="checkbox" checked={f.allergens === null} onChange={(e) => set("allergens", e.target.checked ? null : [])} />Allergen info not provided</label>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", opacity: f.allergens === null ? 0.45 : 1 }}>
            {ALLERGENS.map((a) => <label key={a} className="check"><input type="checkbox" disabled={f.allergens === null} checked={(f.allergens || []).includes(a)} onChange={() => toggleIn("allergens", a)} />{ALLERGEN_LABEL[a]}</label>)}
          </div>
          <div className="soft-l" style={{ fontSize: 12, marginTop: 6 }}>The AI waiter will never call a dish safe. Missing data shows as “not provided” to diners.</div>
        </div>
        <div><span className="lbl">Tags</span><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TAGS.map((t) => <label key={t} className="check"><input type="checkbox" checked={(f.tags || []).includes(t)} onChange={() => toggleIn("tags", t)} />{TAG_LABEL[t]}</label>)}</div></div>
        <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
          {f.photo_url ? <img className="photo" style={{ width: 64, height: 64 }} src={f.photo_url} alt="" /> : <div className="photo" style={{ width: 64, height: 64 }}>PHOTO</div>}
          <div><label className="btn btn-ol btn-sm" style={{ cursor: "pointer" }}>Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={(e) => upload(e.target.files?.[0])} /></label>
            {f.photo_url && <button className="btn btn-ol btn-sm" style={{ marginLeft: 8 }} onClick={() => set("photo_url", "")}>Remove</button>}</div>
          <label className="check" style={{ marginLeft: "auto" }}><input type="checkbox" checked={!!f.available} onChange={(e) => set("available", e.target.checked)} />On sale today</label>
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          {!isNew && <button className="btn btn-ol" style={{ marginRight: "auto", color: "#9b1c1c" }} onClick={del}><Icon name="trash" size={16} />Delete</button>}
          <button className="btn btn-ol" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save dish"}</button>
        </div>
      </div>
    </div>
  );
}

function CatForm({ cat, onClose, onSaved }: { cat: any; onClose: () => void; onSaved: (deleted?: boolean) => void }) {
  const [f, setF] = useState(cat);
  const [err, setErr] = useState("");
  async function save() {
    try { if (f.id) await api(`/api/owner/categories/${f.id}`, { method: "PUT", body: f }); else await api("/api/owner/categories", { body: f }); onSaved(); } catch (e: any) { setErr(e.message); }
  }
  async function del() {
    if (!confirm("Delete this category? Its dishes stay on the menu without a category.")) return;
    await api(`/api/owner/categories/${f.id}`, { method: "DELETE" }); onSaved(true);
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 24 }}>{f.id ? "Edit category" : "New category"}</h2>
        <div><label className="lbl" htmlFor="c-en">Name (English)</label><input id="c-en" className="in-l" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} /></div>
        <div><label className="lbl" htmlFor="c-th">Name (Thai)</label><input id="c-th" className="in-l" value={f.name_th} onChange={(e) => setF({ ...f, name_th: e.target.value })} /></div>
        <div><label className="lbl" htmlFor="c-my">Name (Burmese)</label><input id="c-my" className="in-l" value={f.name_my} onChange={(e) => setF({ ...f, name_my: e.target.value })} /></div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          {f.id && <button className="btn btn-ol" style={{ marginRight: "auto", color: "#9b1c1c" }} onClick={del}>Delete</button>}
          <button className="btn btn-ol" onClick={onClose}>Cancel</button><button className="btn btn-p" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
