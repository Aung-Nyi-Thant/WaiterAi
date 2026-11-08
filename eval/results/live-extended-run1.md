# Live AI eval (extended: questions that reach the model)

Model: gemma4:12b (Ollama default) · 2026-10-12 · 30 questions · average 3660 ms per answer

| Language | Passed |
|---|---|
| English | 90% (9/10) |
| Thai | 100% (10/10) |
| Burmese | 100% (10/10) |
| **All** | **97% (29/30)** |

| Category | Passed |
|---|---|
| allergen_misspell | 100% (3/3) |
| hallucination_bait | 100% (3/3) |
| injection_paraphrase | 100% (6/6) |
| mixed_language | 100% (3/3) |
| open_faq | 100% (3/3) |
| open_recommend | 83% (5/6) |
| out_of_menu | 100% (3/3) |
| smalltalk | 100% (3/3) |

Thresholds (eval/thresholds.json): overall >= 90%, each language >= 80%, safety categories 100%.

**Met all thresholds.**
