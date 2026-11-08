// Variant 3 · Allergy first. Axis: information hierarchy. The allergen verdict for THIS diner leads the card;
// the colour rail is never the only signal (icon + words). It never says "safe": the app's own rule is that only staff confirm that.
import { clash } from "@/modules/diner/filters";
import Icon from "@/modules/platform/Icon";
import type { Item } from "@/modules/platform/menu";
import { Adder, DietTags, Spice, allergenLabel, nameOf, otherNames, price, type VariantProps } from "./shared";

const DEMO_PROFILE = ["peanut", "shellfish"];

function Card({ item, i, lang, profile, qty, bump, setProfile, t }: { item: Item; i: number; lang: VariantProps["lang"]; profile: string[]; qty: number; bump: VariantProps["bump"]; setProfile: VariantProps["setProfile"]; t: VariantProps["t"] }) {
  const nm = nameOf(item, lang);
  const other = otherNames(item, lang);
  const hit = clash(item, profile);
  const mine = Array.isArray(hit) ? hit : [];
  const state = !item.available ? "soldout" : !profile.length ? "none" : hit === "unknown" ? "unknown" : mine.length ? "alert" : "clear";
  return (
    <article className="sa-plate pv-safe pv-enter" style={{ "--i": Math.min(i, 8) } as React.CSSProperties} data-state={state}>
      <div className="pv-safe__verdict">
        {state === "clear" && <><Icon name="check" size={18} /><span>{t("mine")}</span></>}
        {state === "alert" && <><Icon name="alert" size={18} /><span>{t("yourAllergen")}: {mine.map(allergenLabel).join(", ")}</span></>}
        {state === "unknown" && <><Icon name="help" size={18} /><span>{t("allergenUnknown")}</span></>}
        {state === "none" && <button type="button" onClick={() => setProfile(DEMO_PROFILE)}><Icon name="sparkles" size={18} /><span>{t("setAllergies")}</span></button>}
        {state === "soldout" && <span>{t("soldOut")}</span>}
      </div>
      <div className="pv-safe__head">
        <h3 className="pv-safe__name">{nm}</h3>
        <span className="sa-price">{price(lang, item.price)}</span>
      </div>
      {other.length > 0 && <p className="sa-dish__alt">{other.join(" · ")}</p>}
      <p className="pv-safe__list">
        <span className="pv-safe__label">{t("allergens")}</span>{" "}
        {item.allergens === null ? t("allergenUnknown")
          : item.allergens.length === 0 ? t("allergenNone")
          : item.allergens.map((a, k) => <span key={a}>{k > 0 && ", "}{mine.includes(a) ? <mark>{allergenLabel(a)}</mark> : allergenLabel(a)}</span>)}
      </p>
      <div className="pv-safe__foot">
        <div className="pv-safe__tags"><Spice level={item.spice} /><DietTags item={item} /></div>
        <Adder item={item} qty={qty} bump={bump} nm={nm} t={t} tone={state === "alert" ? "quiet" : "special"} />
      </div>
      {state === "alert" && qty > 0 && <p className="pv-safe__note" role="status">{nm} {t("conflictToast")}</p>}
    </article>
  );
}

export default function AllergyFirst({ items, lang, profile, picks, bump, setProfile, t }: VariantProps) {
  return (
    <div className="pv-stack">
      {items.map((item, i) => <Card key={item.id} item={item} i={i} lang={lang} profile={profile} qty={picks[item.id] ?? 0} bump={bump} setProfile={setProfile} t={t} />)}
    </div>
  );
}
