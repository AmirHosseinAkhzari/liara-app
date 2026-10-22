---
description: Deploy this project to Liara — detect the stack, connect Liara database/storage/mail/DNS/AI, move production services after asking, then deploy
argument-hint: "[app-name] [path] [team]"
---

Deploy the project to Liara using the `liara-deploy` skill and the `liara` MCP tools.

Arguments: $ARGUMENTS
- First word, if given: the Liara app name to use.
- Second word, if given: the project folder (default: the current directory).
- If the arguments or the request name a team (e.g. `team "تیم ۲"` or "deploy to team 2"), deploy there: `teams {use: <name>}` before anything else. Otherwise the skill asks personal account or team.

Follow every step of the skill: preflight → scan → show the findings table → auto-connect what Liara has, ask before switching anything that runs in production elsewhere (and transfer its data when the user agrees) → set env vars → prepare the code → deploy → fix failures → final report.
