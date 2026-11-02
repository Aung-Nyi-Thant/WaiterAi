// Variant 2 · Showcase. Axis: image-led layout. A two-column grid of tiles with a big art area and a price sticker.
// With no photo the tile shows a tinted sunburst with the dish's initial, so a menu with no photos still looks finished.
import { clash } from "@/modules/diner/filters";
import Icon from "@/modules/platform/Icon";
import type { Item } from "@/modules/platform/menu";
import { Adder, DietTags, Spice, allergenLabel, nameOf, otherNames, price, type VariantProps } from "./shared";

function Tile({ item, i, lang, profile, qty, bump, t }: { item: Item; i: number; lang: VariantProps["lang"]; profile: string[]; qty: number; bump: VariantProps["bump"]; t: VariantProps["t"] }) {
  const nm = nameOf(item, lang);
  const other = otherNames(item, lang)[0];
  const hit = clash(item, profile);
  const mine = Array.isArray(hit) ? hit : [];
  const rest = (item.allergens ?? []).filter((a) => !mine.includes(a));
  return (
    <article className="pv-tile pv-enter" style={{ "--i": Math.min(i, 8) } as React.CSSProperties} data-cat={item.category_id ?? 0} data-soldout={!item.available || undefined} data-conflict={mine.length > 0 || undefined}>
      <div className="pv-tile__art" aria-hidden="true">
        {item.photo_url ? <img src={item.photo_url} alt="" /> : <span className="pv-tile__initial">{Array.from(item.name.en)[0]}</span>}
        <span className="sa-price pv-tile__price">{price(lang, item.price)}</span>
        {!item.available && <span className="sa-stamp pv-tile__stamp">{t("soldOut")}</span>}
      </div>
      {mine.length > 0 && <div className="pv-tile__alert" role="note"><Icon name="alert" size={14} /> {t("yourAllergen")}: {mine.map(allergenLabel).join(", ")}</div>}
      <div className="pv-tile__body">
        <h3 className="pv-tile__name">{nm}</h3>
        {other && <p className="pv-tile__alt">{other}</p>}
        <div className="pv-tile__tags">
          <Spice level={item.spice} />
          <DietTags item={item} max={1} />
          {hit === "unknown" || item.allergens === null
            ? <span className="sa-tag sa-tag--unknown">{t("allergenUnknown")}</span>
            : rest.slice(0, 2).map((a) => <span key={a} className="sa-tag">{allergenLabel(a)}</span>)}
          {rest.length > 2 && <span className="sa-tag">+{rest.length - 2}</span>}
        </div>
        <Adder item={item} qty={qty} bump={bump} nm={nm} t={t} block />
      </div>
    </article>
  );
}

export default function Showcase({ items, lang, profile, picks, bump, t }: VariantProps) {
  return (
    <div className="pv-grid">
      {items.map((item, i) => <Tile key={item.id} item={item} i={i} lang={lang} profile={profile} qty={picks[item.id] ?? 0} bump={bump} t={t} />)}
    </div>
  );
}
