# Dish data research and update — 23 October 2026

## Scope and result

I reviewed the two sample menus in this repository: Golden Lotus (13 dishes) and HaChi Kyu (132 dishes). Before this update, Golden Lotus had one dish with no complete allergen list, and HaChi Kyu had 37. Six HaChi Kyu dishes had an empty ingredient line; 34 had an unnamed component that was hidden from the displayed ingredient line. The source data now explicitly says **“Other ingredients (not listed on this menu)”** for those 34 dishes, including the six whose ingredient line was empty. All 132 HaChi Kyu dishes now have a nonempty English and Thai ingredient line.

The 37 HaChi Kyu dishes and one Golden Lotus dish still have `allergens: null`. This is intentional. An example recipe can suggest allergens that may be present, but it cannot establish the complete allergen list for this restaurant's sauce, seasoning, dressing, platter, or set. The HaChi Kyu source now separately records `estimated_allergens_from_listed_parts` for the 37 incomplete dishes. Ten have a positive signal from a named part; the other 27 have an empty signal list, which **does not mean allergen-free**. This extra field is research metadata and is not treated by the app as a verified allergen list.

The Golden Lotus Fresh Spring Rolls description now tells diners that the dipping sauce recipe is not recorded and to ask staff. Its allergen field remains unknown.
The menu AI treats the unlisted-ingredient marker as missing information, not as an ingredient. When only that marker exists it says the contents are unknown; when a dish has incomplete allergen data it adds the staff-confirmation prompt to ingredient answers.

## Evidence and decision rule

The [UK Food Standards Agency's restaurant allergen guidance](https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses) says allergen information should be based on current recipes and ingredient labels, with cross-contact considered. Its [guidance for non-prepacked food](https://www.food.gov.uk/business-guidance/allergen-information-for-non-prepacked-foods-best-practice-voluntary-information) specifically warns against guessing from assumed ingredients. I used this as a research method, not as a claim about Thai law.

Public recipe examples show why the unresolved parts matter. [Yakitori-style vegetables](https://www.justonecookbook.com/yakitori-style-grilled-vegetables/) may be seasoned with salt or a soy-based tare. [Japanese garlic fried rice](https://www.justonecookbook.com/japanese-garlic-fried-rice/) can contain butter and soy sauce. [Japanese salad dressings](https://www.justonecookbook.com/wafu-dressing-japanese-salad-dressing/) and [sesame dressing](https://www.justonecookbook.com/sesame-dressing/) use different combinations of soy, wheat, sesame and egg. A [Japanese clear soup](https://www.justonecookbook.com/japanese-clear-soup/) may use fish-based dashi, soy sauce and wheat-containing toppings. [Fresh spring-roll dipping sauces](https://www.justonecookbook.com/sweet-chili-sauce/) also vary. These are examples of possible recipes, **not evidence that HaChi Kyu or Golden Lotus uses those ingredients**.

For named components, I improved provenance with the [Kikkoman soy-sauce ingredient explanation](https://www.kikkoman.com/en/cookbook/glossary/soysauce.html), a [sushi-rice recipe](https://www.justonecookbook.com/how-to-make-sushi-rice/), and [Kewpie's egg-yolk mayonnaise information](https://www.kewpie.com/en/products/pdf/brochure_english_202412.pdf). Product formulations differ, so the kitchen's actual labels remain necessary.

I did not find an authoritative recipe sheet or allergen matrix for the specific restaurant dishes in the public sources checked. The repository's menu photos and prior dish-detail source files support the names and some visible parts, but not a complete recipe.

## Incomplete dishes with positive signals from named parts

These signals are estimates from the menu's named ingredients and the source component mapping. The full list remains unknown.

| HaChi Kyu dish | Estimated allergen signal | Unresolved part |
|---|---|---|
| Mori Ebi; Hokuto Ebi | Crustacean shellfish | Preparation and other ingredients |
| Salmon Skin Salad; Salmon Salad | Fish | House dressing and other ingredients |
| Japanese-style Pla Ra | Fish | Preparation and seasonings |
| Tuna in Sweet Sauce | Fish | Sweet sauce recipe |
| Soft-Shell Crab Salad | Crustacean shellfish, gluten from the estimated flour coating | House dressing and coating product |
| Tofu Salad | Soy | House dressing and other ingredients |
| Grilled Salmon Belly | Fish | Salt or sauce, and other seasonings |
| Salmon Garlic Fried Rice | Fish | Other rice seasonings |

The remaining 27 HaChi Kyu dishes still have no *positive signal from a named part*: `[Coke Combo] Garlic Fried Rice with Coke`, Wagyu Sushi, Special Sushi, Assorted Sashimi, Foie Gras Sushi, Wagyu Beef in Sweet Sauce, Chicken Steak, Japanese Pizza, Bacon-wrapped Enoki, Pork Neck in Special Sauce, Grilled Chicken Skin, Grilled Chicken Tail, Grilled Chicken Liver, Grilled Chicken Gizzard, Grilled Chicken Heart, Japanese Leek Skewer, Garlic Skewer, Okra Skewer, Pumpkin Skewer, King Oyster Mushroom Skewer, Shiitake Skewer, Clear Soup, Garlic Fried Rice, Three-Topping Don, Tontoro Happy Set, Buta Set, and Omori Set. An empty signal list is **not** an estimate of absence; each dish still has an unresolved component.

Golden Lotus Fresh Spring Rolls is the 38th incomplete dish. The rolls' vegetables and rice paper are listed, but the dipping sauce formula is not. No allergen conclusion was added for the sauce.

## Remaining data to confirm

For each incomplete dish, the restaurant needs its current recipe, every sauce and garnish recipe, packaged-product labels, substitutions, and cross-contact procedure before replacing `allergens: null` with a complete list. The source also still lacks 90 Burmese dish names, 132 Burmese descriptions, and 37 complete Burmese ingredient lines for HaChi Kyu; the app falls back to English. I left uncertain translations blank for native review.

The regenerated seed file affects new HaChi Kyu database seeds. It does not overwrite an existing restaurant database or an owner's edits. No live restaurant records were changed in this workspace.
