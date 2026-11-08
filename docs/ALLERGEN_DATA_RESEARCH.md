# Allergen data: what "verified" means, and what Shop AI now does about it

Research date: 28 Oct 2026. Method: web search plus reading of the FSA best-practice guidance. It is desk research with secondary sources; the limits are in section 6. Nothing here is legal advice.

## 1. The question

Shop AI shows and speaks allergen lists for dishes. Until now a list was either present or "not provided". The HaChi Kyu lists are estimates from typical recipes (`docs`/`reports/dish-data-research-2026-10-23.md`). The question was: **what would make a list "verified", what do regulators and the food-safety literature expect a restaurant to keep, and what should the software record so it never claims more than the restaurant knows?**

## 2. Findings

Confidence: **High** = read in an official source; **Medium** = reported by a reliable secondary source; **Low** = trade or marketing source, or only a search summary.

### 2.1 The law treats allergen information as something a business must keep accurate, not as one-time data entry

| Finding | Source | Confidence |
|---|---|---|
| In the EU, since 13 Dec 2014 the 14 listed allergens must be declared for non-prepacked food too (restaurants, takeaways, caterers, delivery). Written information at the point of sale; the word "contains" is the suggested form. | FSAI, [Allergen information for non-prepacked food](https://www.fsai.ie/business-advice/running-a-food-business/allergens/allergen-information-for-non-prepacked-food) | High (Irish regulator describing Reg. 1169/2011) |
| UK FSA best practice: information "easily available in writing" and "underpinned with a conversation" (para 21); staff trained to back it up (para 28, 62); the conversation covers what the customer must avoid and cross-contact risk (para 73). | FSA/GOV.UK, [Allergen information for non-prepacked foods: best practice](https://www.gov.uk/government/publications/allergen-information-for-non-prepacked-foods-best-practice/allergen-information-for-non-prepacked-foods-best-practice) | High (read directly) |
| Same guidance: keep "records of ingredients" and "a record of recipes so they are made to the same specification each time"; keep allergen information "accurate and up to date at all times"; regularly check "whether ingredients in products have changed"; minimise "last minute substitutions"; use approved suppliers who "inform the businesses of any allergen changes" (paras 55, 58, 59). | same | High |
| Cross-contact must be considered even where an allergen is not an ingredient, and customers told if there is a risk (paras 36, 49, 65). | same | High |
| The guidance is not binding but "will inform enforcement authorities". | CMS law firm summary, [Changes to food allergen labelling requirements](https://cms.law/en/gbr/legal-updates/changes-to-food-allergen-labelling-requirements-are-you-ready) (about the PPDS rules) | Medium |
| Distance sales (website, phone) fall under Art. 14 of Reg. 1169/2011. A chat assistant that gives allergen information is plausibly a form of distance information; the sources do not say so explicitly. | Czech inspection authority, [SZPI](https://www.szpi.gov.cz/en/article/business-information-new-obligation-of-operators-of-public-catering-to-provide-information-on-allergenic-ingredients.aspx) | Medium (the chat inference is mine) |

### 2.2 Thailand: the written rules found concern prepacked food

| Finding | Source | Confidence |
|---|---|---|
| MOPH Notification No. 450 (B.E. 2567) on prepacked food labels took effect 19 Jul 2024; full compliance by 19 Jul 2026; "shellfish, squid and their products" were added to the allergen list. | Tilleke & Gibbins, [Thailand updates food labeling requirements](https://www.tilleke.com/insights/thailand-updates-food-labeling-requirements/) | Medium |
| The same summary lists prepacked food made for immediate consumption in food service among the exemptions. | same | Medium |
| A draft "Labeling of Pre-packaged Foods (No. 2)" notified to the WTO in Jan 2026 would add sesame, celery, mustard and lupin and require "may contain" wording. It is a **proposal, not law**. | Freyr, [Thailand notifies draft amendment](https://www.freyrsolutions.com/consumer-industry-news/thailand-notifies-draft-amendment-to-pre-packaged-food-labeling-requirements) (search summary; page itself returned 403) | Low to Medium |

**I found no Thai rule in these sources that sets a legal duty for restaurant menus (non-prepacked food).** So the EU/UK expectations above are the best published benchmark, not a Thai legal requirement. Say exactly that in the exam.

### 2.3 Why a list can be wrong even when the cook meant well

| Finding | Source | Confidence |
|---|---|---|
| A supplier substitution can change a dish's allergen profile while the packaging looks the same; build the allergen list per finished dish from the recipe and define how it is kept current. | Restaurant Dive, [Restaurants are about to inherit the food industry's hardest labeling problem](https://www.restaurantdive.com/news/restaurants-are-about-to-inherit-the-food-industrys-hardest-labeling-probl/833533/) | Low to Medium (trade press) |
| Suppliers apply "may contain" labels so often that restaurants find them unreliable and some defensive; consumers also mistrust them. (2015 UK report, seen through news coverage, original not read.) | Morning Advertiser, [Pubs and restaurants struggling with "unreliable" allergen warnings](https://morningadvertiser.co.uk/Article/2015/09/28/Pubs-and-restaurants-struggling-with-unreliable-allergen-warnings-report-claims) | Low to Medium |
| Cross-contamination is not covered by the labelling rules themselves; catering will have to assess that risk too. | Ernährungs-Umschau 2013, [PDF](https://www.ernaehrungs-umschau.de/fileadmin/Ernaehrungs-Umschau/pdfs/pdf_2013/07_13/EU07_2013_M378_M383_-_e104_e109_engl.pdf) (search summary) | Low |
| Audit templates for restaurants ask: do declared allergens match the **current** recipe and ingredient specifications, and are supplier specification sheets on file? | GoAudits [menu compliance template](https://goaudits.com/checklist/menu-compliance-audit-template/907/217/) | Low (checklist vendor) |
| Reference doses: FAO/WHO expert consultations used VITAL 3.0 and expressed reference doses in mg protein at ED05; VITAL's own panel used ED01. The dose numbers themselves were **not retrieved**. | UK COT paper [cot.food.gov.uk](https://cot.food.gov.uk/print/pdf/node/5791); BfR [opinion 015/2020](https://www.BFR.bund.de/cm/349/vital-30-new-and-updated-proposals-for-reference-doses-of-food-allergens.pdf) | Medium |
| Codex adopted a revised General Standard in Nov 2024 that adds **sesame** to the priority allergen list. One trade source also reports other list changes; unverified. | [Food Allergy Canada](https://www.foodallergycanada.ca/codex-updates/), [Romer Labs](https://issuu.com/romer-labs/docs/mag_romerlabs_spoton_16_en) | Medium for sesame, Low for the rest |

### 2.4 Hidden allergens in Thai and Burmese cooking (why an estimate from the dish name is risky)

| Finding | Source | Confidence |
|---|---|---|
| Shrimp paste is common in curry paste; fish sauce and shrimp paste are default seasonings; oyster sauce is a mollusc source; peanut oil and peanut sauces are common; pad thai can contain shrimp, fish sauce, peanuts, soy and wheat. | travel and restaurant allergen notes found by search, e.g. [Insure&Go](https://insureandgo.com.au/travel-hub/travelling-thailand-with-allergies/), [FoodNavigator](https://www.foodnavigator.com/Article/2011/07/06/Thai-food-products-may-contain-undeclared-allergens/) | Low (not authoritative, but consistent) |
| A US recall involved Thai peanut and curry sauces with **undeclared shrimp**, showing that even labelled sauces can hide an allergen. | [FDA recall notice](https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/delicae-gourmet-llc-issues-allergy-alert-undeclared-shrimp-allergen-thai-peanut-sauce-panang-curry) | High (official) |
| Burmese cooking: ngapi (fermented fish or shrimp paste), fish sauce and dried shrimp are core flavourings; peanut oil and sesame oil are common cooking fats; roasted peanuts and sesame appear in salads; chickpea flour appears in several dishes. | [Wikipedia: Ngapi](https://en.wikipedia.org/wiki/Ngapi), [Burmese ingredients](https://en.wikipedia.org/wiki/List_of_ingredients_in_Burmese_cuisine) | Low (encyclopedia; no allergy source found) |

### 2.5 AI and allergen answers

| Finding | Source | Confidence |
|---|---|---|
| A 2025 *Journal of Allergy and Clinical Immunology* study of ChatGPT answers, summarised by AAAAI: good overall, but errors in a large share of answers and critical errors in about 5%. (Summary only, paper not read, wording of the summary was unclear.) | [AAAAI summary](https://www.aaaai.org/tools-for-the-public/latest-research-summaries/the-journal-of-allergy-and-clinical-immunology-in/2025/chat) | Medium for the 5% figure, Low for the rest |
| A study of ChatGPT meal plans for allergic people: 1 unsafe plan out of 56 (almond milk in a nut-free plan). | reported by [Fox News](https://noticias.foxnews.com/health/chatgpt-meal-planning-food-allergies-study-measured-robo-diet-safety-experts-warnings.print) | Low to Medium |
| A Ljubljana master's thesis extracting allergens from restaurant web pages with a neural network reached F1 = 68%; the author judged it fit for warnings only, with a check by staff. | [repozitorij.uni-lj.si](https://repozitorij.uni-lj.si/IzpisGradiva.php?id=122064) | Medium (a thesis, not peer-reviewed) |
| Vendor advice: restrict the bot to a verified allergen source and route dish-specific questions to staff; the business is responsible for the information however it is delivered. | [horecahub](https://horecahub.ai/en/blog/ai-allergenen-chatbot-restaurant), [Hostie](https://www.hostie.ai/resources/voice-ai-allergy-dietary-questions-menu-aware-bots-2025) | Low (marketing) |

## 3. What this means for the design

1. **Three honest states.** A list is *unknown* (none), *estimated* (present, nobody at the restaurant compared it with recipe and labels) or *verified* (somebody did, on a date). Only the owner can set *verified*; imports, seeds and AI-extracted lists are always *estimated*.
2. **Verification is about a specific recipe, so it ends when the recipe changes.** Editing the allergens or the ingredients drops the status back to *estimated* (FSA paras 58-59: keep information accurate and check for changed ingredients).
3. **Verification expires.** After 180 days a check stops counting and the owner is told a recheck is due. The 180 days is a **policy choice, not a figure from the sources**; the sources say only "regularly".
4. **A missing list can never be verified**, and "none recorded" is not "safe".
5. **Say who stands behind the list.** The diner's dish page says either "checked by the restaurant on <date>" or "an estimate from typical recipes, not checked yet: ask the staff". The owner's Insights show how much is checked.
6. **Keep the conversation.** The guidance wants written information plus a conversation; the AI's allergen answers already end with "please confirm with the staff", and the verified label does not replace that.

## 4. What was built (28 Oct 2026)

| Piece | Where |
|---|---|
| Columns `allergen_status`, `allergens_checked_at`, `allergens_checked_by` on `menu_items`; status derived on read (unknown / estimated / verified, 180-day expiry) | `platform/db.ts`, `platform/menu.ts` |
| Server rules: verified only on request, needs a list, resets when list or ingredients change, who checked is stored but never sent to diners | `owner/api/items.ts` (`allergenCheck`), `itemsById.ts` |
| Owner menu: status under each dish, "checked by you / estimated / not provided" meter, "Not checked yet" filter, tick box "I compared this list with the kitchen recipe and the supplier labels today" | `owner/MenuPage.tsx` |
| Diner dish page: status line in Thai, Burmese, English | `diner/Diner.tsx`, `diner/i18n.ts` (Burmese wording needs a native speaker) |
| Insights: allergen data quality; "answered" split into menu rules / language model / sent to staff; popular dishes count only orders staff accepted | `platform/api/insights.ts`, `InsightsPage.tsx`, `platform/menu.ts` |
| Tests | `app/tests/allergen-status.test.ts` (9), plus AI, order and staff UI tests |

## 5. Still needed at the restaurant

- The AI's dish-specific allergen answers now say whether a list is estimated or restaurant-checked. Staff tickets show estimated or missing lists alongside the diner's allergy flags. These labels do not verify any recipe.
- No supplier-document upload, no per-ingredient records, no change history, no cross-contact field, no reference-dose reasoning. A real kitchen needs at least the first three.
- Existing HaChi Kyu and Golden Lotus lists are all *estimated*. Nobody has checked a real kitchen.

## 6. Limits of this research

- Search-engine summaries and secondary sources; the full text of Regulation 1169/2011, the Thai notification and the Codex standard was not read. Several sources are trade or marketing pages (marked Low).
- Two pages could not be fetched (Freyr 403; FSA redirect needed a second request) and the AAAAI study text was not opened.
- No academic study measuring how accurate restaurant allergen menus are against verified recipes was found; do not claim one exists.
- The 180-day recheck interval, the three-state model and the "reset on edit" rule are design decisions justified by the guidance, not requirements found in it.
- Before quoting a number or a law in the exam, open the primary source in the links above.

## Sources

FSAI non-prepacked food: https://www.fsai.ie/business-advice/running-a-food-business/allergens/allergen-information-for-non-prepacked-food ·
FSA best practice: https://www.gov.uk/government/publications/allergen-information-for-non-prepacked-foods-best-practice/allergen-information-for-non-prepacked-foods-best-practice ·
Tilleke (Thailand): https://www.tilleke.com/insights/thailand-updates-food-labeling-requirements/ ·
Freyr (Thai draft): https://www.freyrsolutions.com/consumer-industry-news/thailand-notifies-draft-amendment-to-pre-packaged-food-labeling-requirements ·
Food Allergy Canada (Codex): https://www.foodallergycanada.ca/codex-updates/ ·
UK COT: https://cot.food.gov.uk/print/pdf/node/5791 ·
BfR VITAL 3.0: https://www.BFR.bund.de/cm/349/vital-30-new-and-updated-proposals-for-reference-doses-of-food-allergens.pdf ·
Restaurant Dive: https://www.restaurantdive.com/news/restaurants-are-about-to-inherit-the-food-industrys-hardest-labeling-probl/833533/ ·
Morning Advertiser: https://morningadvertiser.co.uk/Article/2015/09/28/Pubs-and-restaurants-struggling-with-unreliable-allergen-warnings-report-claims ·
FDA recall: https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/delicae-gourmet-llc-issues-allergy-alert-undeclared-shrimp-allergen-thai-peanut-sauce-panang-curry ·
AAAAI: https://www.aaaai.org/tools-for-the-public/latest-research-summaries/the-journal-of-allergy-and-clinical-immunology-in/2025/chat ·
Ljubljana thesis: https://repozitorij.uni-lj.si/IzpisGradiva.php?id=122064
