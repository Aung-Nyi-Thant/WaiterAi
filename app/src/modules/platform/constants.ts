export const ALLERGENS = ["gluten", "shellfish", "egg", "fish", "peanut", "soy", "milk", "tree_nut", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs"] as const;
export const TAGS = ["vegetarian", "vegan", "spicy", "halal", "contains_pork", "gluten_free"] as const;
export const ALLERGEN_LABEL: Record<string, string> = { gluten: "Gluten", shellfish: "Shellfish", egg: "Egg", fish: "Fish", peanut: "Peanut", soy: "Soy", milk: "Milk", tree_nut: "Tree nuts", celery: "Celery", mustard: "Mustard", sesame: "Sesame", sulphites: "Sulphites", lupin: "Lupin", molluscs: "Molluscs" };
const ALLERGEN_TH: Record<string, string> = { peanut: "ถั่วลิสง", tree_nut: "ถั่วเปลือกแข็ง", shellfish: "กุ้ง/สัตว์น้ำมีเปลือก", fish: "ปลา", egg: "ไข่", milk: "นม", soy: "ถั่วเหลือง", gluten: "กลูเตน", sesame: "งา", celery: "คื่นช่าย", mustard: "มัสตาร์ด", molluscs: "หอย", sulphites: "ซัลไฟต์", lupin: "ลูพิน" };
// An allergen's name for the diner: Thai names in Thai, English names (as the owner asked) in English and Burmese.
export const allergenName = (key: string, lang: "en" | "th" | "my"): string => (lang === "th" ? ALLERGEN_TH[key] || key : (ALLERGEN_LABEL[key] || key).toLowerCase());
// The allergy profile a diner chose, from a request body: only known allergens, once each.
export const cleanProfile = (x: unknown): string[] =>
  Array.isArray(x) ? [...new Set(x.filter((a): a is string => typeof a === "string" && (ALLERGENS as readonly string[]).includes(a)))] : [];
export const TAG_LABEL: Record<string, string> = { vegetarian: "Vegetarian", vegan: "Vegan", spicy: "Spicy", halal: "Halal", contains_pork: "Contains pork", gluten_free: "Gluten free" };
