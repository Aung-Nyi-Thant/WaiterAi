import type { Lang } from "@/modules/platform/menu";

// The owner dashboard's dictionary mechanism, mirroring modules/diner/i18n.ts.
// Translation itself (th/my) is intentionally deferred - the diner-facing surface
// (what tourists and non-English-speaking diners actually use) came first - but per the UI
// improvement research report, the engineering infrastructure to translate this screen should
// exist now rather than be retrofitted later, so every string here goes through tr()/t() even
// though only English is filled in.
type Dict = Record<string, string>;
const en: Dict = {
  brand: "Shop AI", tagline: "The digital waiter", freePlan: "Free plan", signOut: "Sign out",
  navMenu: "Menu items", navImport: "Import a menu", navHours: "Specials & hours", navFaq: "FAQ & rules",
  navAi: "AI waiter", navQr: "QR codes", navInsights: "Insights", navStaff: "Staff",
  testAssistant: "Test the assistant", viewLiveMenu: "View live menu", close: "Close", of: "of",
  chatsThisMonth: "chats this month", loading: "Loading…",

  hoursTitle: "Specials & hours", hoursSubtitle: "The AI waiter answers opening-hour questions word for word from this page.",
  openingHours: "Opening hours", opens: "Opens", closes: "Closes", lastOrder: "Last order", closedOn: "Closed on", saveHours: "Save hours",
  specialsTitle: "Today's specials & promotions", title: "Title", details: "Details", from: "From (optional)", until: "Until (optional)",
  addSpecial: "Add special", hoursSaved: "Opening hours saved.", specialAdded: "Special added.",
};
const th: Dict = {};
const my: Dict = {};
export const DICT: Record<Lang, Dict> = { en, th, my };
export const tr = (lang: Lang, key: string) => DICT[lang]?.[key] ?? en[key] ?? key;
