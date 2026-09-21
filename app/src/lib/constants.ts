export const ALLERGENS = ["gluten", "shellfish", "egg", "fish", "peanut", "soy", "milk", "tree_nut", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs"] as const;
export const TAGS = ["vegetarian", "vegan", "spicy", "halal", "contains_pork", "gluten_free"] as const;
export const ALLERGEN_LABEL: Record<string, string> = { gluten: "Gluten", shellfish: "Shellfish", egg: "Egg", fish: "Fish", peanut: "Peanut", soy: "Soy", milk: "Milk", tree_nut: "Tree nuts", celery: "Celery", mustard: "Mustard", sesame: "Sesame", sulphites: "Sulphites", lupin: "Lupin", molluscs: "Molluscs" };
export const TAG_LABEL: Record<string, string> = { vegetarian: "Vegetarian", vegan: "Vegan", spicy: "Spicy", halal: "Halal", contains_pork: "Contains pork", gluten_free: "Gluten free" };
