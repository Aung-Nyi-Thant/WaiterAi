# How we work in Git

Every member commits their own work under their own GitHub account.

## One-time setup (each member, on your own computer)
```
git clone <repo-url>
cd shop-ai
git config user.name  "Your Real Name"
git config user.email "the-email-on-your-github-account@example.com"   # must match GitHub or your commits will not count
cd app && npm install && npm run dev
```

## For every task
1. Pick an Issue that is assigned to you (or assign it to yourself).
2. `git checkout main && git pull` then `git checkout -b feature/<your-name>-<short-task>`
3. Make small commits with clear messages, for example `Add sold-out sound alert to chef screen`.
4. Run the tests that match your change (`python3 app/scripts/e2e.py`, `python3 app/scripts/chat_smoke.py`) and write the result in the Pull Request.
5. `git push -u origin <branch>` and open a **Pull Request** to `main`. Write "Closes #<issue number>".
6. **Another member reviews it** (comments or approves). Do not merge your own Pull Request.

## Rules
- Do not push directly to `main`. Do not commit `node_modules`, `data/*.db`, passwords or `.env` files.
- Commit only work you did and understand. You must be able to explain your part in the oral exam.
- Working together on one laptop? Add `Co-authored-by: Name <email>` to the commit message, only if you really worked together.
- Never backdate commits or commit for someone else.
- Code written with an AI tool goes into the AI usage log in the SRS (Section 8), and you must read and test it before committing.
