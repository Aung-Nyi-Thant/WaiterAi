# Shop AI on Windows (for beginners)

You do not need to know programming. You only double-click a few files. Everything below is for **Windows 10 or 11**.

> **Not sure you need this?** To just *look at* the project, open the live prototype from the top of the main README. No install.
> This page is for running the **real app** on your own laptop.

## Quick start (about 15 minutes, plus the AI download if you want it)

1. **Get the project.** On GitHub press the green **Code** button, then **Download ZIP**, then right-click the ZIP and choose **Extract All**. (If you use Git, `git clone` works too.) Keep the folder somewhere simple, for example `C:\ShopAI`.
2. **Open the `windows` folder** inside it.
3. **Double-click `setup-windows.bat`.**
   - Windows may say *"Windows protected your PC"*. Click **More info**, then **Run anyway**. The file only runs the scripts in this folder, and you can read them first.
   - Windows asks to allow installs: click **Yes**.
   - It installs **Node.js**, then asks if you want the **AI** (Ollama and a model of about 9 GB). Answer **n** if your laptop has less than 16 GB of memory; the app works without the AI.
   - At the end it says *Setup finished.*
4. **Double-click `start.bat`.** A black window opens and stays open; after about a minute your browser opens the app. **Close that black window to stop the app.**
5. Use the app:

| For | Address | Sign-in |
|---|---|---|
| Diner (a customer at table 5) | <http://localhost:3000/r/golden-lotus?t=5> | none |
| Owner | <http://localhost:3000/login> | `demo@shop.ai` / `demo1234` |
| Staff | <http://localhost:3000/staff> | restaurant `golden-lotus`, PIN `1111` (waiter) or `2222` (chef) |

These demo logins exist only in this development mode, on your own laptop.

## What each file does

| Double-click | What it does |
|---|---|
| `setup-windows.bat` | One-time setup: Node.js, the AI (optional) and the app packages. Safe to run again. |
| `start.bat` | Starts the app and opens the browser. |
| `stop.bat` | Stops the app. |
| `check-windows.bat` | **Check my computer**: green/red lines saying what is missing. Changes nothing. Send a screenshot of it when you ask for help. |
| `reset-data.bat` | Deletes the local database so you start again with the sample restaurant. Asks you to type YES. |
| `prepare-offline-pack.bat`, `install-from-offline-pack.bat` | For slow internet: see below. |

## Do all of us need the AI?

No. Only the laptop you use for the **demo** needs it. On the others, rule-based answers (allergens, prices, orders, the bill) work without it, and open questions show *"AI unavailable"*. The AI model needs about **9 GB** of disk and a laptop with **16 GB** of memory; on less it is slow.

## If something goes wrong

Double-click **`check-windows.bat`** first; it usually names the problem.

| What you see | What to do |
|---|---|
| `Node.js is not installed` after setup | Close the black window, open `setup-windows.bat` again. If it still fails, restart the laptop. |
| The browser says the page cannot be reached | Wait one more minute (the first start is slow); watch the black window for errors. |
| `Something is already using port 3000` | Double-click `stop.bat`, then `start.bat`. Close other programs that use port 3000. |
| `AI unavailable` for open questions | Open **Ollama** from the Start menu and wait a moment; `start.bat` also tries to start it. The first AI answer after starting can take a minute. |
| The AI model download stops | Run `setup-windows.bat` again; it continues. Or in a terminal: `ollama pull gemma4:12b`. |
| You want a clean start | `stop.bat`, then `reset-data.bat`, then `start.bat`. |
| An antivirus blocks a script | The scripts are plain text in this folder. Ask your team before turning anything off. |

## Slow or no internet: the offline pack

The AI model is about 9 GB. Download it **once** and share it by USB stick.

1. On one laptop with a good connection: run `setup-windows.bat` and say **yes** to the AI. Then double-click **`prepare-offline-pack.bat`**. It creates a folder `offline-pack` next to the app folder with the Node.js installer, the Ollama installer and the model files. Add `-IncludeNodeModules` (open a terminal in the `windows` folder and run `powershell -ExecutionPolicy Bypass -File prepare-offline-pack.ps1 -IncludeNodeModules`) to include the app packages too (only for laptops with the same kind of Windows).
2. Copy the **whole project folder** (with `offline-pack` inside) to a USB stick.
3. On each other laptop: copy the folder, then double-click **`install-from-offline-pack.bat`**, then `start.bat`. Laptops with less than 16 GB of memory skip the AI automatically.

## For developers

- The scripts are plain PowerShell (`*.ps1`) started by `*.bat` files with `-ExecutionPolicy Bypass`, so no setting has to be changed. All text is ASCII so Windows PowerShell 5.1 reads it correctly.
- Every script has a safe test mode: `check-windows.ps1`, `setup-windows.ps1 -DryRun -NoPause`, `start.ps1 -CheckOnly -NoPause`, `prepare-offline-pack.ps1 -DryRun -NoPause`, `install-from-offline-pack.ps1 -DryRun -NoPause`. CI runs them on a real Windows machine (`windows` job in `.github/workflows/ci.yml`), together with the app's build and tests.
- The scripts use `winget` (built into current Windows 10/11). If it is missing, install Node.js 22 LTS from <https://nodejs.org> and Ollama from <https://ollama.com/download> by hand, then run `setup-windows.bat` again.
