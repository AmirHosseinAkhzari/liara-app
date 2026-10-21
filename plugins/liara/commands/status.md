---
description: Show the Liara app's latest release, recent logs and env var names, and explain any failure
argument-hint: "[app-name]"
---

App: $ARGUMENTS (default: `app` in liara.json).

Use the `liara` MCP tools: `release_status` (latest release), `app_logs` (last 100 lines), and `get_envs` (names only — values stay masked).

Report in this order: is it up (state + `https://<app>.liara.run`), anything failing and the likely cause from the logs, then env var names. If it failed, offer a fix and a redeploy.
