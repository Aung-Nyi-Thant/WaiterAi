// Variant 1 · Menu board. Axis: density. A typographic diner menu: name ···· price, no plate image, a round + at the end of the row.
import { useState } from "react";
import { clash } from "@/modules/diner/filters";
import Icon from "@/modules/platform/Icon";
import type { Item } from "@/modules/platform/menu";
import { Adder, DietTags, Spice, allergenLabel, nameOf, otherNames, price, type VariantProps } from "./shared";

function Row({ item, i, lang, profile, qty, bump, t }: { item: Item; i: number; lang: VariantProps["lang"]; profile: string[]; qty: number; bump: VariantProps["bump"]; t: VariantProps["t"] }) {
  const [open, setOpen] = useState(false);
  const nm = nameOf(item, lang);
  const other = otherNames(item, lang);
  const hit = clash(item, profile);
  const mine = Array.isArray(hit) ? hit : [];
  const rest = (item.allergens ?? []).filter((a) => !mine.includes(a));
  return (
    <article className="pv-row pv-enter" style={{ "--i": Math.min(i, 8) } as React.CSSProperties} data-soldout={!item.available || undefined} data-conflict={mine.length > 0 || undefined}>
      <div className="pv-row__text">
        <div className="pv-row__title">
          <h3 className="pv-row__name"><button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{nm}</button></h3>
          <span className="pv-leader" aria-hidden="true" />
          <span className="pv-row__price">{price(lang, item.price)}</span>
        </div>
        {other.length > 0 && <p className="sa-dish__alt">{other.join(" · ")}</p>}
        <div className="pv-row__meta">
          <Spice level={item.spice} />
          <DietTags item={item} />
          {mine.map((a) => <span key={a} className="sa-tag sa-tag--alert" title={t("yourAllergen")}><Icon name="alert" size={13} /> {allergenLabel(a)}</span>)}
          {hit === "unknown" && <span className="sa-tag sa-tag--unknown">{t("allergenUnknown")}</span>}
          {item.allergens === null && hit !== "unknown" && <span className="sa-tag sa-tag--unknown">{t("allergenUnknown")}</span>}
          {rest.length > 0 && <span className="pv-contains">{rest.map(allergenLabel).join(" · ")}</span>}
        </div>
        {!item.available && <p className="pv-row__sold">{t("soldOut")}</p>}
        {open && (
          <div className="pv-row__more">
            {item.desc[lang] && <p>{item.desc[lang]}</p>}
            {item.ingredients && <p className="muted"><b>{t("ingredients")}:</b> {item.ingredients}</p>}
          </div>
        )}
      </div>
      <div className="pv-row__act"><Adder item={item} qty={qty} bump={bump} nm={nm} t={t} round /></div>
    </article>
  );
}

export default function MenuBoard({ items, lang, profile, picks, bump, t }: VariantProps) {
  return (
    <div className="sa-plate pv-board">
      {items.map((item, i) => <Row key={item.id} item={item} i={i} lang={lang} profile={profile} qty={picks[item.id] ?? 0} bump={bump} t={t} />)}
    </div>
  );
}
