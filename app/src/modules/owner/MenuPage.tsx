"use client";
import { useEffect, useState, useCallback } from "react";
import Icon from "@/modules/platform/Icon";
import { useOwner } from "@/modules/owner/OwnerShell";
import { api, useEscape } from "@/modules/platform/client";
import { ALLERGENS, TAGS, ALLERGEN_LABEL, TAG_LABEL } from "@/modules/platform/constants";
import type { Item, Category } from "@/modules/platform/menu";

const blank = (category_id: number | null): any => ({ category_id, name: { en: "", th: "", my: "" }, desc: { en: "", th: "", my: "" }, price: 0, ingredients: "", allergens: null, tags: [], spice: 0, available: true, photo_url: "" });

export default function MenuPage() {
  const { toast, t } = useOwner();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<(Category & { name_en?: string })[]>([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [editingDuplicate, setEditingDuplicate] = useState(false);
  const [catEdit, setCatEdit] = useState<any | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const load = useCallback(async () => {
    const [i, c] = await Promise.all([api<Item[]>("/api/owner/items"), api<any[]>("/api/owner/categories")]);
    setItems(i); setCats(c.map((x) => ({ id: x.id, sort: x.sort, name: { en: x.name_en, th: x.name_th, my: x.name_my } })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const query = search.trim().toLowerCase();
  const shown = items.filter((i) =>
    (!tab || i.category_id === tab) &&
    (!missingOnly || i.allergens === null) &&
    (!query || [i.name.en, i.name.th, i.name.my, i.ingredients].some((value) => value.toLowerCase().includes(query))),
  );
  const complete = items.filter((i) => i.allergens !== null).length;
  const toggle = async (i: Item) => { await api(`/api/owner/items/${i.id}`, { method: "PUT", body: { available: !i.available } }); load(); };
  const missing = items.filter((i) => i.allergens === null);
  const categoryItems = items.filter((i) => i.category_id === tab);
  async function setCategoryAvailability(available: boolean) {
    const category = cats.find((c) => c.id === tab);
    if (!category) return;
    if (!confirm(t(available ? "confirmCategoryOnSale" : "confirmCategorySoldOut"))) return;
    setBulkBusy(true);
    setBulkError("");
    try {
      const result = await api<{ updated: number }>("/api/owner/items/bulk", {
        method: "PATCH",
        body: { category_id: tab, available },
      });
      setItems((current) => current.map((item) => item.category_id === tab ? { ...item, available } : item));
      toast(`${result.updated} ${t(available ? "dishesPutOnSale" : "dishesMarkedSoldOut")}`);
    } catch (error: any) {
      setBulkError(error.message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div><h1 style={{ fontSize: 40 }}>{t("menuTitle")}</h1><p className="soft-l" style={{ margin: "6px 0 0" }}>{t("menuSubtitle")}</p></div>
        <div className="sa-plate sa-meter" style={{ width: 320, padding: "14px 18px" }}>
          <div className="sa-meter__row"><b>{t("allergenDataComplete")}</b><span>{complete} {t("of")} {items.length} {t("dishes")}</span></div>
          {/* biome-ignore lint/a11y/useSemanticElements: <meter> has default browser styling that would change the design */}
          <div className="sa-meter__bar" role="meter" aria-valuenow={items.length ? Math.round((complete / items.length) * 100) : 0} aria-valuemin={0} aria-valuemax={100} aria-label={t("allergenDataComplete")}><div className="sa-meter__fill" style={{ width: `${items.length ? (complete / items.length) * 100 : 0}%` }} /></div>
          {missing.length > 0 && <div className="soft-l" style={{ fontSize: 13 }}>{missing.slice(0, 2).map((m) => m.name.en).join(", ")}{missing.length > 2 ? ` ${t("andMore")} ${missing.length - 2} ${t("more")}` : ""} {t("noAllergenInfoYet")}</div>}
        </div>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className={`pill pill-l ${!tab ? "on" : ""}`} onClick={() => setTab(0)}>{t("all")} · {items.length}</button>
        {cats.map((c) => <button type="button" key={c.id} className={`pill pill-l ${tab === c.id ? "on" : ""}`} onClick={() => setTab(c.id)}>{c.name.en}</button>)}
        <button type="button" className="pill pill-l" onClick={() => setCatEdit({ name_en: "", name_th: "", name_my: "" })}><Icon name="plus" size={16} />{t("category")}</button>
        {tab > 0 && <button type="button" className="pill pill-l" onClick={() => { const c = cats.find((x) => x.id === tab)!; setCatEdit({ id: c.id, name_en: c.name.en, name_th: c.name.th === c.name.en ? "" : c.name.th, name_my: c.name.my === c.name.en ? "" : c.name.my }); }}><Icon name="edit" size={16} />{t("editCategory")}</button>}
        {tab > 0 && <>
          <button type="button" className="btn btn-ol btn-sm" onClick={() => setCategoryAvailability(false)} disabled={bulkBusy || categoryItems.length === 0}>{t("markAllSoldOut")}</button>
          <button type="button" className="btn btn-ol btn-sm" onClick={() => setCategoryAvailability(true)} disabled={bulkBusy || categoryItems.length === 0}>{t("putAllOnSale")}</button>
        </>}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-p" onClick={() => { setEditingDuplicate(false); setEdit(blank(tab || cats[0]?.id || null)); }}><Icon name="plus" size={18} />{t("addDish")}</button>
      </div>
      {bulkBusy && <div className="soft-l" role="status">{t("updatingCategoryAvailability")}</div>}
      {bulkError && <div className="err" role="alert">{bulkError}</div>}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <input
          type="search"
          className="in-l"
          aria-label={t("searchMenuItems")}
          placeholder={t("searchDishesOrIngredients")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
        <button
          type="button"
          className={`pill pill-l ${missingOnly ? "on" : ""}`}
          aria-pressed={missingOnly}
          onClick={() => setMissingOnly((value) => !value)}
        >
          {t("missingAllergenData")} · {missing.length}
        </button>
      </div>
      <div className="sa-plate r-xl" style={{ overflow: "hidden" }}>
        <div className="table-head"><div>{t("dish")}</div><div>{t("price")}</div><div>{t("allergens")}</div><div>{t("tags")}</div><div>{t("today")}</div><div /></div>
        {shown.length === 0 && <div className="soft-l" style={{ padding: 24 }}>{items.length === 0 ? t("noDishesYet") : t("noDishesMatchFilters")}</div>}
        {shown.map((i) => (
          <div className="table-row" key={i.id}>
            <div className="row" style={{ gap: 12 }}>
              {i.photo_url ? <img className="photo" src={i.photo_url} alt="" /> : <div className="photo">{t("photo")}</div>}
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700 }}>{i.name.en}</div><div className="soft-l" style={{ fontSize: 12, lineHeight: 1.7 }}>{[i.name.th !== i.name.en && i.name.th, i.name.my !== i.name.en && i.name.my].filter(Boolean).join(" · ")}</div></div>
            </div>
            <div><span className="sa-price" style={{ fontSize: 17, lineHeight: "22px" }}>฿{i.price}</span></div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{i.allergens === null ? <span className="chip chip-l chip-r">{t("notProvided")}</span> : i.allergens.length === 0 ? <span className="chip chip-l chip-y">{t("noneListed")}</span> : i.allergens.map((a) => <span key={a} className="chip chip-l">{ALLERGEN_LABEL[a] || a}</span>)}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{i.tags.filter((t) => t !== "vegetarian" || !i.tags.includes("vegan")).map((t) => <span key={t} className="chip chip-l chip-g">{TAG_LABEL[t] || t}</span>)}</div>
            <div className="row" style={{ gap: 8, fontWeight: 700, fontSize: 13, color: i.available ? "var(--ok)" : "var(--cherry-text)" }}>
              <button type="button" className={`switch ${i.available ? "on" : ""}`} role="switch" aria-checked={i.available} aria-label={`${i.name.en} ${t("onSaleAria")}`} onClick={() => toggle(i)} />{i.available ? t("onSale") : t("soldOut")}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn btn-ol btn-icon" style={{ borderRadius: 14 }} aria-label={`${t("duplicate")} ${i.name.en}`} title={t("duplicateDish")} onClick={() => {
                const copy = JSON.parse(JSON.stringify(i));
                delete copy.id;
                setEditingDuplicate(true);
                setEdit(copy);
              }}><Icon name="copy" size={18} /></button>
              <button type="button" className="btn btn-ol btn-icon" style={{ borderRadius: 14 }} aria-label={`${t("edit")} ${i.name.en}`} onClick={() => { setEditingDuplicate(false); setEdit(JSON.parse(JSON.stringify(i))); }}><Icon name="edit" size={18} /></button>
            </div>
          </div>))}
      </div>
      {edit && <ItemForm item={edit} cats={cats} isDuplicate={editingDuplicate} onClose={() => { setEdit(null); setEditingDuplicate(false); }} onSaved={() => { setEdit(null); setEditingDuplicate(false); load(); toast(editingDuplicate ? t("dishDuplicated") : t("saved")); }} />}
      {catEdit && <CatForm cat={catEdit} onClose={() => setCatEdit(null)} onSaved={(deleted) => { setCatEdit(null); if (deleted) setTab(0); load(); toast(deleted ? t("categoryDeleted") : t("saved")); }} />}
    </>
  );
}

function ItemForm({ item, cats, isDuplicate, onClose, onSaved }: { item: any; cats: any[]; isDuplicate: boolean; onClose: () => void; onSaved: () => void }) {
  useEscape(onClose);
  const { t } = useOwner();
  const [f, setF] = useState<any>(item);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "price" | "category_id", string>>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isNew = !f.id;
  const set = (k: string, v: any) => {
    setF((x: any) => ({ ...x, [k]: v }));
    if (k === "name" || k === "price" || k === "category_id") {
      setFieldErrors((current) => ({ ...current, [k]: undefined }));
    }
  };
  const toggleIn = (k: "allergens" | "tags", v: string) => set(k, (f[k] || []).includes(v) ? f[k].filter((x: string) => x !== v) : [...(f[k] || []), v]);
  const previewName = f.name?.en || t("dishNamePlaceholder");
  const previewAlt = [f.name?.th && f.name.th !== f.name.en && f.name.th, f.name?.my && f.name.my !== f.name.en && f.name.my].filter(Boolean);
  async function upload(file?: File) {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { set("photo_url", (await api<{ url: string }>("/api/owner/upload", { form: fd })).url); } catch (e: any) { setErr(e.message); }
  }
  async function save() {
    setErr("");
    const errors: typeof fieldErrors = {};
    const price = Number(f.price);
    if (!f.name.en.trim()) errors.name = t("dishNameRequiredError");
    if (f.price === "" || !Number.isFinite(price) || price < 0 || price >= 100000) errors.price = t("validPriceRequiredError");
    if (f.category_id && !cats.some((category) => category.id === Number(f.category_id))) errors.category_id = t("unknownCategoryError");
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      const body = { category_id: f.category_id, name: f.name, desc: f.desc, price: f.price, ingredients: f.ingredients, allergens: f.allergens, tags: f.tags, spice: f.spice, available: f.available, photo_url: f.photo_url };
      if (isNew) await api("/api/owner/items", { body }); else await api(`/api/owner/items/${f.id}`, { method: "PUT", body });
      onSaved();
    } catch (e: any) {
      if (e.message === "Please enter the dish name.") setFieldErrors((current) => ({ ...current, name: t("dishNameRequiredError") }));
      else if (e.message === "Please enter a valid price.") setFieldErrors((current) => ({ ...current, price: t("validPriceRequiredError") }));
      else if (e.message === "Unknown category.") setFieldErrors((current) => ({ ...current, category_id: t("unknownCategoryError") }));
      else setErr(e.message);
      setBusy(false);
    }
  }
  async function del() {
    if (!confirm(`${t("delete")} "${f.name.en}"? ${t("cannotBeUndone")}`)) return;
    await api(`/api/owner/items/${f.id}`, { method: "DELETE" }); onSaved();
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
    <div className="modal-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-label={isDuplicate ? t("duplicateDish") : isNew ? t("addDish") : t("editDish")} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ fontSize: 26 }}>{isDuplicate ? t("duplicateDish") : isNew ? t("addADish") : t("editDish")}</h2><button type="button" className="btn btn-ol btn-icon" onClick={onClose} aria-label={t("close")}><Icon name="close" /></button></div>
        <div className="grid2" style={{ gap: 12 }}>
          <div>
            <label className="lbl" htmlFor="n-en">{t("nameEnglish")}</label>
            <input id="n-en" className="in-l" value={f.name.en} onChange={(e) => set("name", { ...f.name, en: e.target.value })} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "n-en-error" : undefined} />
            {fieldErrors.name && <div id="n-en-error" className="err-d" role="alert">{fieldErrors.name}</div>}
          </div>
          <div>
            <label className="lbl" htmlFor="pr">{t("priceBaht")}</label>
            <input id="pr" type="number" min={0} className="in-l" value={f.price} onChange={(e) => set("price", e.target.value)} aria-invalid={!!fieldErrors.price} aria-describedby={fieldErrors.price ? "pr-error" : undefined} />
            {fieldErrors.price && <div id="pr-error" className="err-d" role="alert">{fieldErrors.price}</div>}
          </div>
          <div><label className="lbl" htmlFor="n-th">{t("nameThai")}</label><input id="n-th" className="in-l" value={f.name.th} onChange={(e) => set("name", { ...f.name, th: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="n-my">{t("nameBurmese")}</label><input id="n-my" className="in-l" value={f.name.my} onChange={(e) => set("name", { ...f.name, my: e.target.value })} /></div>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>{t("dinerCardPreview")}</div>
          <article className="sa-plate sa-dish" style={{ maxWidth: 420, padding: 10 }}>
            <div className={`sa-dish__plate${f.photo_url ? "" : " sa-dish__plate--empty"}`} aria-hidden="true" style={{ width: 92, height: 92 }}>
              {f.photo_url && <img src={f.photo_url} alt="" />}
            </div>
            <div className="sa-dish__body">
              <h3 className="sa-dish__name" style={{ fontSize: 18 }}><button type="button" disabled style={{ cursor: "default" }}>{previewName}</button></h3>
              {previewAlt.length > 0 && <p className="sa-dish__alt">{previewAlt.join(" · ")}</p>}
              <div className="sa-dish__tags" style={{ minHeight: 18 }}>
                {(f.tags || []).slice(0, 2).map((tag: string) => <span key={tag} className="sa-tag" style={{ fontSize: 11 }}>{TAG_LABEL[tag] || tag}</span>)}
                {(f.allergens || []).slice(0, 2).map((allergen: string) => <span key={allergen} className="sa-tag" style={{ fontSize: 11 }}>{ALLERGEN_LABEL[allergen] || allergen}</span>)}
              </div>
              <div className="sa-dish__foot">
                <span className="sa-price" style={{ fontSize: 18, lineHeight: "24px" }}>฿{Number(f.price) || 0}</span>
                <button type="button" className="sa-btn sa-btn--special sa-btn--sm" disabled style={{ opacity: 0.8 }}>{t("add")}</button>
              </div>
            </div>
          </article>
        </div>
        <div className="grid2" style={{ gap: 12 }}>
          <div>
            <label className="lbl" htmlFor="cat">{t("category")}</label>
            <select id="cat" className="in-l" value={f.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)} aria-invalid={!!fieldErrors.category_id} aria-describedby={fieldErrors.category_id ? "cat-error" : undefined}><option value="">{t("none")}</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name.en}</option>)}</select>
            {fieldErrors.category_id && <div id="cat-error" className="err-d" role="alert">{fieldErrors.category_id}</div>}
          </div>
          <div><label className="lbl" htmlFor="sp">{t("spiceLevel")}</label><select id="sp" className="in-l" value={f.spice} onChange={(e) => set("spice", Number(e.target.value))}>{[t("notSpicy"), t("mild"), t("medium"), t("hot")].map((s, i) => <option key={s} value={i}>{s}</option>)}</select></div>
        </div>
        <div><label className="lbl" htmlFor="ds">{t("descriptionEnglish")}</label><textarea id="ds" className="in-l" value={f.desc.en} onChange={(e) => set("desc", { ...f.desc, en: e.target.value })} style={{ minHeight: 60 }} /></div>
        <div><label className="lbl" htmlFor="ing">{t("ingredients")}</label><input id="ing" className="in-l" value={f.ingredients} onChange={(e) => set("ingredients", e.target.value)} placeholder={t("ingredientsPlaceholder")} /></div>
        <div>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span className="lbl" style={{ margin: 0 }}>{t("allergens")}</span>
            <label className="check"><input type="checkbox" checked={f.allergens === null} onChange={(e) => set("allergens", e.target.checked ? null : [])} />{t("allergenInfoNotProvided")}</label>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", opacity: f.allergens === null ? 0.45 : 1 }}>
            {ALLERGENS.map((a) => <label key={a} className="check"><input type="checkbox" disabled={f.allergens === null} checked={(f.allergens || []).includes(a)} onChange={() => toggleIn("allergens", a)} />{ALLERGEN_LABEL[a]}</label>)}
          </div>
          <div className="soft-l" style={{ fontSize: 12, marginTop: 6 }}>{t("aiNeverCallsSafe")}</div>
        </div>
        <div><span className="lbl">{t("tags")}</span><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TAGS.map((tag) => <label key={tag} className="check"><input type="checkbox" checked={(f.tags || []).includes(tag)} onChange={() => toggleIn("tags", tag)} />{TAG_LABEL[tag]}</label>)}</div></div>
        <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
          {f.photo_url ? <img className="photo" style={{ width: 64, height: 64 }} src={f.photo_url} alt="" /> : <div className="photo" style={{ width: 64, height: 64 }}>{t("photo")}</div>}
          <div><label className="btn btn-ol btn-sm" style={{ cursor: "pointer" }}>{t("uploadPhoto")}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={(e) => upload(e.target.files?.[0])} /></label>
            {f.photo_url && <button type="button" className="btn btn-ol btn-sm" style={{ marginLeft: 8 }} onClick={() => set("photo_url", "")}>{t("remove")}</button>}</div>
          <label className="check" style={{ marginLeft: "auto" }}><input type="checkbox" checked={!!f.available} onChange={(e) => set("available", e.target.checked)} />{t("onSaleToday")}</label>
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          {!isNew && <button type="button" className="btn btn-ol" style={{ marginRight: "auto" }} onClick={del}><Icon name="trash" size={16} />{t("delete")}</button>}
          <button type="button" className="btn btn-ol" onClick={onClose}>{t("cancel")}</button>
          <button type="button" className="btn btn-p" onClick={save} disabled={busy}>{busy ? t("saving") : isDuplicate ? t("duplicateDish") : t("saveDish")}</button>
        </div>
      </div>
    </div>
  );
}

function CatForm({ cat, onClose, onSaved }: { cat: any; onClose: () => void; onSaved: (deleted?: boolean) => void }) {
  useEscape(onClose);
  const { t } = useOwner();
  const [f, setF] = useState(cat);
  const [err, setErr] = useState("");
  async function save() {
    try { if (f.id) await api(`/api/owner/categories/${f.id}`, { method: "PUT", body: f }); else await api("/api/owner/categories", { body: f }); onSaved(); } catch (e: any) { setErr(e.message); }
  }
  async function del() {
    if (!confirm(t("deleteCategoryConfirm"))) return;
    await api(`/api/owner/categories/${f.id}`, { method: "DELETE" }); onSaved(true);
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking outside is a mouse shortcut; keyboard users close this with Escape (useEscape)
    <div className="modal-back" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-label={f.id ? t("editCategory") : t("newCategory")} style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 24 }}>{f.id ? t("editCategory") : t("newCategory")}</h2>
        <div><label className="lbl" htmlFor="c-en">{t("nameEnglish")}</label><input id="c-en" className="in-l" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} /></div>
        <div><label className="lbl" htmlFor="c-th">{t("nameThai")}</label><input id="c-th" className="in-l" value={f.name_th} onChange={(e) => setF({ ...f, name_th: e.target.value })} /></div>
        <div><label className="lbl" htmlFor="c-my">{t("nameBurmese")}</label><input id="c-my" className="in-l" value={f.name_my} onChange={(e) => setF({ ...f, name_my: e.target.value })} /></div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          {f.id && <button type="button" className="btn btn-ol" style={{ marginRight: "auto" }} onClick={del}>{t("delete")}</button>}
          <button type="button" className="btn btn-ol" onClick={onClose}>{t("cancel")}</button><button type="button" className="btn btn-p" onClick={save}>{t("save")}</button>
        </div>
      </div>
    </div>
  );
}
