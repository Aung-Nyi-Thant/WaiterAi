"use client";

import { useState } from "react";
import Link from "next/link";
import DishPhoto from "@/modules/platform/DishPhoto";
import Icon from "@/modules/platform/Icon";
import { priceLabel } from "@/modules/diner/i18n";
import type { Item, Lang } from "@/modules/platform/menu";
import styles from "./landing.module.css";

export type PreviewDish = Pick<Item, "id" | "name" | "price" | "photo_url">;

export default function MenuPreview({ name, slug, dishes }: { name: string; slug: string; dishes: PreviewDish[] }) {
  const [lang, setLang] = useState<Lang>("en");
  const labels = {
    en: { heading: "Find your next favorite", note: "Have an allergy? Ask staff to confirm the recipe.", menu: "View the full menu" },
    th: { heading: "ค้นหาเมนูโปรดของคุณ", note: "หากแพ้อาหาร กรุณาให้พนักงานยืนยันส่วนผสม", menu: "ดูเมนูทั้งหมด" },
    my: { heading: "သင့်အကြိုက်ဆုံးဟင်းကို ရှာပါ", note: "အစားအစာမတည့်မှုရှိပါက ပါဝင်ပစ္စည်းများကို ဝန်ထမ်းနှင့် အတည်ပြုပါ။", menu: "မီနူးအားလုံးကြည့်ရန်" },
  }[lang];
  return (
    <div className={styles.preview} data-ui>
      <div className={styles.previewTop}><b>{name}</b><span>Table 5</span></div>
      <h2 className={styles.previewTitle} lang={lang}>{labels.heading}</h2>
      <fieldset className={styles.languages} aria-label="Menu preview language">
        {([["en", "English"], ["th", "ไทย"], ["my", "မြန်မာ"]] as const).map(([key, label]) => (
          <button key={key} type="button" lang={key} aria-pressed={lang === key} onClick={() => setLang(key)}>{label}</button>
        ))}
      </fieldset>
      <ul className={styles.previewDishes}>
        {dishes.map(dish => (
          <li key={dish.id}>
            <Link href={`/r/${slug}?t=5&dish=${dish.id}`} className={styles.previewDish}>
              <DishPhoto src={dish.photo_url} />
              <span><b lang={dish.name[lang] && dish.name[lang] !== dish.name.en ? lang : "en"}>{dish.name[lang] || dish.name.en}</b><small>{priceLabel(lang, dish.price)}</small></span>
              <Icon name="arrowRight" size={18} />
            </Link>
          </li>
        ))}
      </ul>
      {!dishes.length && <p className={styles.previewEmpty}>The restaurant is preparing its menu. Check the full menu for updates.</p>}
      <p className={styles.allergyNote} lang={lang}><Icon name="alert" size={16} />{labels.note}</p>
      <Link href={`/r/${slug}?t=5`} className={styles.previewLink} lang={lang}>{labels.menu}<Icon name="arrowRight" size={18} /></Link>
    </div>
  );
}
