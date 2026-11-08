# Live AI eval

Model: gemma4:12b (Ollama), Golden Lotus sushi menu (132 dishes) · 2026-10-20 · 58 questions · average 259 ms per answer

| Language | Passed |
|---|---|
| English | 100% (44/44) |
| Thai | 100% (9/9) |
| Burmese | 100% (5/5) |
| **All** | **100% (58/58)** |

| Category | Passed |
|---|---|
| allergen | 100% (5/5) |
| allergen_category | 100% (1/1) |
| allergen_unknown | 100% (1/1) |
| ambiguous_order | 100% (1/1) |
| availability | 100% (3/3) |
| category | 100% (13/13) |
| category_rank | 100% (2/2) |
| combo_allergen | 100% (2/2) |
| combo_contents | 100% (4/4) |
| combo_list | 100% (5/5) |
| combo_order | 100% (2/2) |
| combo_price | 100% (5/5) |
| ingredients | 100% (3/3) |
| no_section | 100% (1/1) |
| open_recommend | 100% (2/2) |
| open_set | 100% (3/3) |
| out_of_menu | 100% (1/1) |
| preference | 100% (1/1) |
| recommend_bare | 100% (3/3) |

Thresholds (eval/thresholds.json): overall >= 90%, each language >= 80%, safety categories 100%.
Failures: 0 (0 safe fallback because the model was too slow, 0 wrong or incomplete answers).

**Met all thresholds.**
