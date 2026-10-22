---
description: Show recent runtime logs of a Liara app
argument-hint: "[app-name] [minutes]"
---

Arguments: $ARGUMENTS — app name (default: `app` in liara.json), then optional minutes back (default 60).

Call the `liara` MCP tool `app_logs` with `since` = now minus those minutes (Unix seconds) and `lines` = 200. Show the logs in a code block, then point out errors and their likely cause in one or two lines.
