---
description: Schedule jobs with Liara's cron system (liara.json "cron"), e.g. the Laravel scheduler or vercel.json crons
argument-hint: "[\"<schedule> <command>\"]"
---

Arguments: $ARGUMENTS

Use `scan_project` cronSuggestions plus any job in the arguments, confirm the schedule and command with the user, then `set_cron {jobs}`. Tell the user it applies on the next deploy and offer to deploy now.
