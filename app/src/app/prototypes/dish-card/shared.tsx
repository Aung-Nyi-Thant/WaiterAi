// Prototype-only helpers shared by the three dish-card variants. Nothing here is imported by production code.
import Icon from "@/modules/platform/Icon";
import { priceLabel } from "@/modules/diner/i18n";
import type { Item, Lang } from "@/modules/platform/menu";

export type VariantProps = {
  items: Item[];
  lang: Lang;
  profile: string[];
  picks: Record<number, number>;
  bump: (id: number, delta: number) => void;
  setProfile: (p: string[]) => void;
  t: (k: string) => string;
};

export const DIET: Record<string, string> = { vegan: "sa-tag--veg", vegetarian: "sa-tag--veg", spicy: "sa-tag--spicy" };

export const nameOf = (item: Item, lang: Lang) => item.name[lang] || item.name.en;
export const otherNames = (item: Item, lang: Lang) => {
  const nm = nameOf(item, lang);
  return (["th", "my", "en"] as Lang[]).filter((l) => l !== lang).map((l) => item.name[l]).filter((n) => n && n !== nm);
};
export const allergenLabel = (a: string) => a.replace("_", " ");
export const price = (lang: Lang, p: number) => priceLabel(lang, p);

export function Spice({ level }: { level: number }) {
  if (!level) return null;
  return (
    <span className="pv-spice" role="img" aria-label={`Spice ${level} of 3`}>
      {[1, 2, 3].map((n) => <i key={n} data-on={n <= level || undefined} />)}
    </span>
  );
}

export function DietTags({ item, max = 2 }: { item: Item; max?: number }) {
  return <>{item.tags.filter((x) => DIET[x]).slice(0, max).map((x) => <span key={x} className={`sa-tag ${DIET[x]}`}>{x}</span>)}</>;
}

// Add button that turns into a − n + stepper once the dish is picked. The swap is a 150ms fade/scale, transform and opacity only.
export function Adder({ item, qty, bump, nm, t, round, block, tone }: { item: Item; qty: number; bump: (id: number, d: number) => void; nm: string; t: (k: string) => string; round?: boolean; block?: boolean; tone?: "special" | "quiet" }) {
  if (!item.available) return round ? null : <button type="button" className={`sa-btn sa-btn--sm${block ? " pv-block" : ""}`} disabled>{t("soldOut")}</button>;
  if (qty > 0) {
    return (
      <span className={`pv-step${block ? " pv-block" : ""}`} role="group" aria-label={nm}>
        <button type="button" aria-label={`Remove one ${nm}`} onClick={() => bump(item.id, -1)}>−</button>
        <output aria-live="polite">{qty}</output>
        <button type="button" aria-label={`Add one more ${nm}`} onClick={() => bump(item.id, 1)}>+</button>
      </span>
    );
  }
  if (round) return <button type="button" className="pv-plus" aria-label={`${t("add")} ${nm}`} onClick={() => bump(item.id, 1)}><Icon name="plus" size={22} /></button>;
  return (
    <button type="button" className={`sa-btn ${tone === "quiet" ? "" : "sa-btn--special"} sa-btn--sm${block ? " pv-block" : ""}`} onClick={() => bump(item.id, 1)} aria-label={`${t("add")} ${nm}`}>
      <Icon name="plus" />{t("add")}
    </button>
  );
}
