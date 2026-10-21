---
description: Scan this project and show what Liara would need — language, framework, port, database, S3, email, DNS, AI and other APIs — without changing anything
argument-hint: "[path]"
---

Run the `liara` MCP tool `scan_project` on `$ARGUMENTS` (or the current directory if empty). If `liara.json` names an app, also pass it as `app`.

Present the result as the findings table from the `liara-deploy` skill (section 2): stack and platform/port, each service with where production points today and what would happen on Liara (auto-connect / ask to switch & transfer / already on Liara), other APIs that will be copied as env vars, env vars the code reads but nothing defines, and warnings.

Do not create, change or deploy anything. End by offering `/liara:deploy`.
