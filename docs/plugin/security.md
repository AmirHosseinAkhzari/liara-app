# Security and consent

## Consent before changes

Each call gets a risk level. Read-only tools are marked in `toolRisk()` in `lib/tools.mjs`. For tools that change something, the consent description built for that exact call sets the level, so the same tool can be `change` or `billable` depending on its arguments (for example `connect_database` with or without creating a new database).

| Risk | Examples | Asks first? |
|---|---|---|
| `read` | `scan_project`, `plans`, `billing`, `app_logs`, `verify_app`, `docs_search` | No |
| `session` | `teams`, `accounts` (affect only this session) | No |
| `change` | `set_envs`, `deploy` to an existing app, `connect_dns`, `migrate_database` | Yes |
| `billable` | creating an app, database, bucket, AI workspace or VPS; plan upgrades; `approve_plan` | Yes, with the live monthly cost |
| `destructive` | `delete_app`, deleting a VPS, raw API `DELETE` | Yes, and the user must type the resource name |

A billable call is also blocked when the account has no balance left.

`requireConsent()` in `lib/consent.mjs` handles approvals in this order:

1. **Approved plan.** `approve_plan` approves exact operations (tool, target, plan, bundle) for 2 hours. Deletes are never covered by a plan.
2. **Dialog.** If the client supports MCP elicitation, a confirmation dialog shows the account, resource, effect, cost, data used and risk. Decline changes nothing.
3. **Chat.** Otherwise the tool returns `confirmationRequired` and does nothing. The token in it is random, works once, expires after 30 minutes, and is bound to a SHA-256 hash of the exact arguments. Changing any argument makes the token invalid.

Some clients answer dialogs without showing them. A "decline" faster than 1.5 seconds, or a dialog closed without a choice, is treated as "not shown". The plugin then asks in chat and stops using dialogs for that session. A real "no" still stops everything.

## Secrets

- **Login token**: saved in `~/.liara-auth.json` with file mode `600` (the same file the Liara CLI uses). It is never shown in chat.
- **Env values**: masked in chat, dialogs, logs, the audit file and reports (`maskValue()` in `lib/envfiles.mjs`), including passwords inside URLs and `?token=` parameters.
- **Log lines**: scrubbed by `scrubLine()` in `lib/verify.mjs` before they are shown.
- **Data copies**: credentials go to the dump tools as environment variables, and known secret values are removed from their output (`lib/migrate.mjs`).
- **VPS root passwords**: dropped from responses.
- **Source upload**: real `.env` files are never packed. Only `.env.example`, `.env.sample`, `.env.template` and `.env.dist` are kept (`lib/archive.mjs`).

## Untrusted input

- Project files, logs and docs pages are treated as data, never as instructions.
- `git`, `tar` and `gh` run with `execFile`/`execFileSync` and an argument list, so file names and user input are not read by a shell.
- `docs_read` only fetches pages on `docs.liara.ir` and refuses other hosts.

## Local servers

- **Browser login** listens only on `127.0.0.1` and `::1`.
- **Live progress page** listens on `127.0.0.1` on a random port, behind a random path. It accepts answers only from its own origin and never shows secret values.
- The deployment page has one small inline script (the top-up calculator). The report test refuses any script that loads files, uses the network or stores data.

## Audit log

Every change is appended to `~/.liara-claude/audit.jsonl` (folder mode `700`, file mode `600`). It stores the tool, account, target, consent route and outcome. Only a fixed list of result fields is kept, and env vars are stored as names only. A failed write never breaks the action.

## What the plugin never does

- Pay, add credit or change the subscription.
- Handle the user's GitHub secret: the user adds `LIARA_API_TOKEN` in GitHub.
- Send data to the author: the plugin has no server of its own, no analytics and no tracking.
