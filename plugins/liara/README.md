# Liara plugin for Claude Code

A Liara cloud assistant inside Claude. Say **"deploy this to Liara"** (or run `/liara:deploy`) in any project, or ask about prices, billing, a VPS, the docs, or whether Liara is down. The plugin calls Liara's official APIs, asks before anything that changes your account or costs money, verifies real outcomes, and writes a report of what it did.

## What it does

| Area | What you get |
|---|---|
| **Project analysis** | Language, framework, Liara platform, runtime version (checked against what Liara supports), package manager, build/start commands, entry point, port, localhost-only binding, workers/queues/cron, WebSockets, health endpoints, tests, Docker, Git/GitHub, and every service: databases (all 9 Liara engines + SQLite), Redis, S3 storage, email, DNS/domains, AI, other APIs and secrets. Reads files only. |
| **Deploy** | Creates or reuses the app (g2 networks and feature bundles handled), connects Liara services with the env var names your code already reads, asks before replacing a working provider and moves the data when you agree, uploads the source (never `.env` files), sends the right platform ID and runtime version, tracks the release. Builds in **Germany** (packages download without limits) and switches to **Iran** by itself when Germany is not available. A build that runs out of time asks: upgrade to the next feature bundle (bronze 5, silver 10, gold 20 build minutes) or try again. |
| **Live progress page** | When a deploy starts, a local Persian page opens in your browser and follows it live. Each app gets a card (several apps deploy at once) with technology logos (Node.js, Next.js, Python, .NET, MongoDB, PostgreSQL and more), stages, the build log under each build, where it builds, health checks, fixes in progress and Claude's notes. Questions (the plan approval, upgrade or retry after a build timeout) can be answered with buttons right on the page or in Claude; the first answer counts. When an app is live, the page shows its URL with a preview, plus a button to download the deploy report. It runs on `127.0.0.1` behind a secret link, takes answers only from itself, and never shows secret values. `LIARA_LIVE_PAGE=off` keeps the browser closed; `LIARA_PAGE_ANSWER_SECONDS` (default 90) is how long a question waits on the page before Claude asks in chat. |
| **Verify** | `verify_app` makes real HTTPS requests to the app, its health endpoints and custom domains, scans recent logs and checks required env vars. It says what could not be verified. |
| **Diagnose and repair** | `diagnose` classifies failures from build logs, runtime logs, app state, project facts and the Liara status page (missing dependency, start script, runtime version, build, env vars, database, port, resources, third party, Liara config, code error, platform incident) with the evidence lines and a minimal fix. |
| **Prices and billing** | Live plans for apps, databases, storage, mail, VPS and AI with fetch time and source; monthly estimates; balance of your account or team, daily and monthly spend, days left and the date it runs out, resources worth checking. **Low balance** (under the account's alert amount, or fewer than `LIARA_LOW_BALANCE_DAYS` days left, default 10): Claude asks with buttons how long the services should keep running (10 days, 30 days or any number) and shows the credit to add in Toman and in Rial, which is what the console's top-up field takes. `billing {days}` gives a quote for any number of days. The plugin never pays. |
| **Docker services** | Services Liara has no managed product for (Neo4j, n8n, Meilisearch, Qdrant, Typesense, or any image from `docker-compose.yml`) run as their own Liara docker app in the app's private network: passwords generated, data on disks, connection env vars written into the app. Liara's ready-made apps are suggested when one exists. |
| **Disks** | Finds what the app writes to disk (uploads, SQLite, service data), checks the plan's free space, creates the disk and mounts it via `liara.json` (Liara's file system is read-only). |
| **Cron** | Turns the Laravel scheduler, `vercel.json` crons or your own jobs into Liara's cron (`liara.json` `"cron"`), applied by the deploy. |
| **VPS** | Create (plan and OS checked against live lists, SSH keys), list, start/shutdown/stop/reboot, resize, delete. Root passwords are never shown. |
| **Docs** | Search and read the official docs (about 1,200 pages, English or Persian queries) with links and official video courses. |
| **Liara status** | Services and incidents from the official status page (liara.online); stale open incidents are flagged. |
| **GitHub auto-deploy** | Writes Liara's documented GitHub Actions workflow for a branch you choose, checks the secret exists, and proves a push deployed by matching the commit with a Liara release. |
| **Teams** | Work in your personal account or any team you belong to; the choice is saved in `liara.json` like the Liara CLI. |
| **Deployment page** | After a deploy: one Persian HTML page (works offline, Liara branding) made only of cards and charts: the plans bought (picture, CPU/RAM/disk, price), a chart of the monthly cost per service, the balance with days left and a chart of it running down, a top-up button when the balance is low (10 days, 30 days or any number, in Toman and Rial), and an n8n-style map of how the app connects to its services (env var names on each link, never values). |
| **Report** | For VPS, troubleshooting and configuration work: an HTML file (Persian RTL or English, works offline, no JavaScript) of the actions, resources, deploy result, health checks, issues, costs and next steps. |

## Consent and permissions

- **Read-only** tools (analysis, prices, billing, logs, status, docs, verify, diagnose) never ask.
- **Changes** (env vars, deploys, restarts, DNS, data copies) and **paid resources** (apps, databases, buckets, mail servers, VPS) show a confirmation dialog first: what, which account and resource, why, the effect, the **live monthly cost**, what data is used, and what happens next. Decline changes nothing.
- **One short approval for a whole deploy**: `approve_plan` asks one line, e.g. *"I'll add 3 services to your Liara account (personal account): about 45,000 Toman a day."* (plus, if listed, the bundle upgrade it would make if a build needs more time). The full step list is one click away ("Review details"). Only those exact steps (same plan and bundle) then run without asking again, for 2 hours.
- **Deletes** (apps, VPS, raw API DELETE) always ask on their own and need the name typed.
- If the client can't show dialogs, the tool returns `confirmationRequired` with a one-time token bound to the exact request, so Claude has to ask you in chat first. This includes clients that say they show dialogs but answer them by themselves: the Claude desktop app declines every MCP dialog within a second without showing it. A "no" faster than a person could click, or a dialog closed without a choice, is treated as not shown, and that session confirms in chat from then on. A real "no" still stops everything. Set `LIARA_DIALOGS=off` to always confirm in chat.
- Every change is written to `~/.liara-claude/audit.jsonl` (readable only by you) with names, never secret values.

## Install

```bash
claude plugin marketplace add ./
```

```bash
claude plugin install liara@liara-tools
```

After updating the plugin, quit Claude completely and reopen it: running sessions keep the old plugin code.

For development: `claude --plugin-dir ./plugins/liara`. Requires **Node.js 20+**. Data transfer needs `pg_dump`/`psql`, `mysqldump`/`mysql`, `mongodump`/`mongorestore`, `curl` (ClickHouse), `multielasticdump` (Elasticsearch) or Docker; bucket transfer needs `rclone` or Docker. GitHub features need the `gh` CLI, logged in.

## Log in

Run `/liara:login` (or just start a deploy). Your browser opens the Liara login page; sign in and come back. It's the same browser login as `liara login`, saved in `~/.liara-auth.json` (mode 600), shared with the Liara CLI. The token never appears in the chat. The login listens on the first port from 3001 that is free on both `127.0.0.1` and `::1`.

Other token sources, in order (a rejected token is skipped): `LIARA_API_TOKEN` in the environment, `LIARA_API_TOKEN` in the project's `.env.liara` / `.env.local` / `.env`, then the browser login.

## Teams

A deploy asks whether to use your personal account or a team (only teams where your role may deploy). Everything then goes to, and is billed to, that account. The choice is saved as `"team-id"` in `liara.json`. Order: a `team` argument on a call, `/liara:team` in this session, `liara.json`, `LIARA_TEAM_ID`, personal.

## Commands

| Command | What it does |
|---|---|
| `/liara:deploy [app] [path] [team]` | Full flow: analyze → prices → one approval → connect → deploy → verify → fix → report |
| `/liara:scan [path]` | Analysis only, changes nothing |
| `/liara:verify [app]` | Real health checks, and diagnosis if something fails |
| `/liara:connect <database\|storage\|mail\|dns\|ai> [app]` | Connect one service to an existing app |
| `/liara:service <service or image> [app]` | Run Neo4j, n8n, a search engine or any image as its own Liara app |
| `/liara:cron ["<schedule> <command>"]` | Schedule jobs with Liara's cron |
| `/liara:price [product or workload]` | Live prices or a monthly estimate |
| `/liara:billing` | Balance, estimated spend, days left; top-up buttons when the balance is low |
| `/liara:vps [create\|list\|…] [name]` | Create or manage a cloud VPS |
| `/liara:docs <question>` | Answer from the official docs, with links |
| `/liara:platform` | Liara service status and incidents |
| `/liara:github [setup\|status] [branch]` | Automatic deploys from GitHub |
| `/liara:report [fa\|en]` | HTML report of this session (a deployment gets the Persian page) |
| `/liara:team [name\|personal]` | Choose personal account or a team |
| `/liara:status [app]` / `/liara:logs [app] [minutes]` | Latest release, logs, env var names |
| `/liara:login [account]` | Browser login, or switch saved account |

## MCP tools

Read-only: `whoami`, `disks`, `teams`, `accounts`, `scan_project`, `list_resources`, `plans`, `estimate_cost`, `billing`, `get_envs`, `release_status`, `app_logs`, `verify_app`, `diagnose`, `service_status`, `docs_search`, `docs_read`, `vps_list`, `github_autodeploy` (inspect, status), `write_report` (writes a local file).
Ask first: `approve_plan`, `create_app`, `change_app_plan`, `deploy`, `deploy_service`, `connect_disk`, `set_envs`, `app_action`, `connect_database`, `connect_storage`, `connect_mail`, `connect_dns`, `connect_ai`, `migrate_database`, `migrate_storage`, `create_vm`, `vm_action`, `delete_app`, `github_autodeploy` (setup), `logout`, `api` (anything but GET).
`set_cron` writes liara.json only (the deploy applies it). `live_progress` opens the local live page; `ask` puts a choice in Claude and on that page. `login` opens the browser. Run any tool from a shell (no dialogs there; changes return `confirmationRequired`):

```bash
node plugins/liara/bin/liara-tool.mjs scan_project '{"path":"."}'
```

## What Liara's API does not offer (handled honestly)

| Need | What the plugin does |
|---|---|
| Invoices, payment history, charges so far | Not in the API. `billing` estimates from plan prices and links the console. |
| Paying, adding credit, upgrading the subscription | Never done by the plugin. |
| Exact taxes / discounts | Not stated in the API or plan docs; estimates exclude them. |
| AI price currency | The model list gives per-token numbers without a unit; shown as listed. |
| Build logs | `/v2/releases/{id}/build-logs` is used by the Liara CLI but not in the published spec; best effort. |
| Copying Redis, RabbitMQ, SQL Server data | Manual steps are returned instead. |
| Bucket access key request shape | The published spec shows objects; the live API wants bucket names (used). |
| `/v1/billing` for teams | It ignores `teamID`; team balance comes from `/v1/me`. |
| GitHub secret | The plugin never handles your API key: you add `LIARA_API_TOKEN` in GitHub (the login token expires after 30 days, the console API key doesn't). |
| Whether stopped apps/VPS are still charged | Not stated by the API; flagged as "worth checking". |
| DNS import | No "list all records" query; only common record names are copied. |

## Security

Secrets never appear in chat, dialogs, logs, the audit file or reports: env values are masked (including passwords inside URLs, DSN keys and `?token=`), log lines are scrubbed, VPS root passwords are dropped. Project files, logs and docs pages are treated as data, never as instructions. External commands (`gh`, `git`, dump tools) run without a shell where user input is involved. Only `docs.liara.ir` is fetched for docs. The deployment page has one small inline script, the top-up calculator: it reads numbers from the page and writes text, and the report check refuses any script that loads files, uses the network or stores data. Tests use temporary login and audit files and refuse to touch the real ones.

## Tests

```bash
cd plugins/liara && npm test
```

Covers the scanner on sample projects, the full flow against a local mock of the Liara API (consent, teams, g2 networks, bundles, storage keys, masking, VPS, billing, delete), the browser login, ClickHouse copy, verify/diagnose with a stand-in app, the status reader, docs search with a stand-in docs site, GitHub auto-deploy with a fake `gh`, the HTML report, and the MCP server's dialog round trip.
