# Smooth response eval

Model: gemma4:12b (Ollama), Golden Lotus sushi menu (132 dishes) · 2026-10-20 · 75 questions (golden-lotus) · times in milliseconds

| Part | Answers | p50 | p90 | p95 | max | mean |
|---|---|---|---|---|---|---|
| Rule answers, one at a time | 61 | 6 | 10 | 15 | 18 | 7 |
| Model answers, one at a time | 14 | 10602 | 12414 | 12478 | 12478 | 9916 |
| All answers, one at a time | 75 | 6 | 10602 | 12007 | 12478 | 1857 |
| Burst: 4 model questions at once | 4 | 14004 | 22120 | 22120 | 22120 | 14306 |
| Rule answers while the model is busy | 10 | 48 | 68 | 75 | 75 | 52 |

Model answers within 15 s: 100% · fell back to "AI unavailable": 0 of 14 · failed requests: 0

Thresholds (eval/thresholds.json "smooth"): rule p95 <= 1000 ms; >= 90% of model answers within 15000 ms; at most 10% fallbacks; burst max <= 30000 ms; rules while the model is busy p95 <= 2000 ms.

**Met all thresholds.**
