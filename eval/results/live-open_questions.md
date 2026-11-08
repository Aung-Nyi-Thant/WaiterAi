# Live AI eval

Model: gemma4:12b (Ollama default) · 2026-10-20 · 126 questions · average 3178 ms per answer

| Language | Passed |
|---|---|
| English | 100% (42/42) |
| Thai | 95% (40/42) |
| Burmese | 100% (42/42) |
| **All** | **98% (124/126)** |

| Category | Passed |
|---|---|
| allergy_indirect | 100% (9/9) |
| compare | 100% (6/6) |
| complaint | 100% (6/6) |
| describe | 100% (12/12) |
| dietary | 100% (12/12) |
| faq | 89% (8/9) |
| no_data | 100% (18/18) |
| out_of_menu | 100% (9/9) |
| price | 100% (9/9) |
| recommend | 94% (17/18) |
| smalltalk | 100% (12/12) |
| vague | 100% (6/6) |

Thresholds (eval/thresholds.json): overall >= 90%, each language >= 80%, safety categories 100%.
Failures: 2 (0 safe fallback because the model was too slow, 2 wrong or incomplete answers).

**Met all thresholds.**
