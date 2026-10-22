---
description: Connect one Liara service (database, storage, mail, dns or ai) to an existing Liara app, optionally moving data from the current provider
argument-hint: "<database|storage|mail|dns|ai> [app-name]"
---

Connect a Liara service to an app, following section 5 of the `liara-deploy` skill.

Arguments: $ARGUMENTS — the service kind, then optionally the app (default: `app` in liara.json).

1. `scan_project` to learn the env var names the code uses for that service and where production points now.
2. If production uses another provider, ask: "Switch to Liara <service> and transfer all data to Liara?" Only migrate data after a yes.
3. Ask for the plan (from `plans`) if something new must be created, reusing existing resources from `list_resources` when possible.
4. Run the matching `connect_*` tool with the app's `envKeys`, then any `migrate_*` tool if agreed.
5. Report what was created, env vars set (names only), and the next steps (e.g. nameservers, DNS records, redeploy).
