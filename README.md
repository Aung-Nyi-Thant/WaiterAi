# Shop AI – the digital waiter

Menu-aware AI waiter for restaurants (Thai, Burmese, English). Diners scan a QR code, browse the menu and chat with the AI; owners manage the menu; waiters and chefs see live calls and orders.

| Folder | What it holds |
|---|---|
| `app/` | The web app (Next.js + SQLite + Ollama). Start here: `app/README.md` |
| `app/src/modules/` | The code, split into 5 modules: `diner`, `ai`, `owner`, `staff`, `platform`. Each has its own README |
| `eval/` | Test questions, sample menu and the model comparison scripts |
| `docs/` | SRS, feature plan, project explanation, team work plan |
| `design/` | UI design generators (Art Deco and Glass mock-ups) |

## Run it
```
cd app
npm install        # if you get an EACCES cache error: npm install --cache ./.npm-cache
npm run dev        # http://localhost:3000
```
Needs Node 22.13+ and Ollama with `ollama pull gemma4:12b`. Demo logins are in `app/README.md`.

## Team work
See `docs/TEAM_WORK_PLAN.md` (who owns what) and `CONTRIBUTING.md` (how to commit).
