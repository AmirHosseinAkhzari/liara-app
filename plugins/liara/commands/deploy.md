---
description: Deploy this project to Liara — analyze it, show live prices, ask once, connect database/storage/mail/DNS/AI, deploy, verify with real checks, fix failures and write a report
argument-hint: "[app-name] [path] [team]"
---

Deploy the project to Liara using the `liara-deploy` skill and the `liara` MCP tools.

Arguments: $ARGUMENTS
- First word, if given: the Liara app name to use.
- Second word, if given: the project folder (default: the current directory).
- If the arguments or the request name a team (e.g. `team "تیم ۲"` or "deploy to team 2"), deploy there: `teams {use: <name>}` before anything else. Otherwise the skill asks personal account or team.

Follow every step of the skill: preflight (login, account or team) → scan → show the findings and ask only what the project can't tell → live prices and ONE approval (`approve_plan`) → create and connect services (move data only when the user agreed) → set env vars → prepare the code → deploy → `verify_app` → on failure `diagnose`, fix from evidence, redeploy → `write_report` and attach it → chat summary.
