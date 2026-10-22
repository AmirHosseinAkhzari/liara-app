# Liara plugin for Claude Code

Say **"deploy this to Liara"** (or run `/liara:deploy`) in any project. Claude will:

1. **Detect the project** — language, framework, Liara platform, port, build setup, current host (Vercel, Netlify, Heroku-style, …).
2. **Find the services it uses** — from dependencies, env files, docker-compose and the code itself:
   - database: every engine Liara offers (PostgreSQL with PostGIS/pgvector, MySQL, MariaDB, MongoDB, Redis, SQL Server, Elasticsearch, RabbitMQ, ClickHouse), plus SQLite
   - S3 / object storage (AWS S3, Cloudflare R2, ArvanCloud, MinIO, Cloudinary, …)
   - email (SMTP, Resend, SendGrid, Mailgun, SES, …)
   - DNS / custom domains (and who runs the DNS today)
   - AI (OpenAI, Anthropic, Gemini, OpenRouter, Iranian proxies, Ollama, …)
   - other APIs and secrets (Stripe, Sentry, SMS, payment gateways, `APP_KEY`, …)
3. **Connect Liara automatically** where Liara has an equivalent and nothing is in production yet (local/docker-compose/not configured): creates the database, bucket, mail server or AI workspace and writes the credentials into the app's env vars **using the variable names your code already reads**.
4. **Ask before switching production** — if production uses another provider: *"Production uses Supabase for PostgreSQL. Switch to Liara PostgreSQL and transfer all data?"* On yes it copies the data (pg_dump / mysqldump / mongodump, ClickHouse over HTTP with curl, elasticdump for Elasticsearch, rclone for buckets, DNS records), then reconnects. Redis, RabbitMQ and SQL Server data is not copied automatically; Claude gives the manual steps. On no it copies the existing settings into Liara env vars.
5. **Deploy** — packs the source (respects `.gitignore` and `.liaraignore`, never uploads `.env` files), uploads, releases, waits, reads build logs and fixes failures. Saves `liara.json`.

Secrets never appear in the chat: the tools read `.env` files and Liara credentials themselves and only return masked values.

## Install

From this repo (local path or GitHub):

```bash
claude plugin marketplace add ./
```

```bash
claude plugin install liara@liara-tools
```

Or inside Claude Code: `/plugin marketplace add <path-or-github-repo>` then `/plugin install liara@liara-tools`.

For development, load it directly: `claude --plugin-dir ./plugins/liara`.

Requires **Node.js 20+**. Data transfer needs `pg_dump`/`psql`, `mysqldump`/`mysql`, `mongodump`/`mongorestore`, `curl` (ClickHouse), `multielasticdump` (Elasticsearch) or Docker; bucket transfer needs `rclone` or Docker.

## Log in

Run `/liara:login` (or just start a deploy). Your browser opens the Liara login page; sign in and come back to Claude — that's it. It's the same browser login as `liara login`, saved in `~/.liara-auth.json`, so the plugin and the Liara CLI share one login. The token never appears in the chat.

The login listens on the first port from 3001 that is free on both `127.0.0.1` and `::1`, so a dev server already running on 3001 can't receive the token. The file is kept readable only by you (`chmod 600`).

Other ways, checked in this order (a rejected token is skipped automatically):

1. `LIARA_API_TOKEN` environment variable
2. `LIARA_API_TOKEN` in the project's `.env.liara`, `.env.local` or `.env` (keep it gitignored)
3. the browser login (`/liara:login` or `liara login`)

`LIARA_S3_ENDPOINT` overrides the object storage endpoint (default `https://storage.c2.liara.space`).

## Teams

If your account is in Liara teams, a deploy asks first: **your personal account, or one of your teams?** It lists each team with your role, and only offers teams where your role may deploy. You can also say "deploy to team 2" or run `/liara:team`.

Everything after that goes to the chosen account: the app, databases, buckets, DNS, mail, AI workspace, env vars and the deploy itself. Costs go to that account's balance. The deploy saves the team in the project's `liara.json` as `"team-id"`, the same key `liara init` and `liara deploy` use, so later deploys from the plugin or the CLI go to the same team.

Where calls go, in order: a `team` argument on a single call, the choice made with `/liara:team` (or the `teams` tool) in this session, `"team-id"` in `liara.json`, the `LIARA_TEAM_ID` environment variable, and otherwise the personal account.

## Commands

| Command | What it does |
|---|---|
| `/liara:login [account]` | Browser login (or switch saved account) |
| `/liara:deploy [app] [path] [team]` | Full flow: choose account → scan → connect services → deploy |
| `/liara:team [name\|personal]` | List your teams and choose where to work |
| `/liara:scan [path]` | Report only, changes nothing |
| `/liara:connect <database\|storage\|mail\|dns\|ai> [app]` | Connect one service to an existing app |
| `/liara:status [app]` | Latest release, logs, env var names |
| `/liara:logs [app] [minutes]` | Recent runtime logs |

## MCP tools

`login`, `accounts`, `logout`, `whoami`, `teams`, `scan_project`, `list_resources`, `plans`, `create_app`, `deploy`, `release_status`, `app_logs`, `app_action`, `get_envs`, `set_envs`, `connect_database`, `connect_storage`, `connect_mail`, `connect_dns`, `connect_ai`, `migrate_database`, `migrate_storage`, `api` (any endpoint from [developers.liara.ir](https://developers.liara.ir); local copy in [docs/api](../../docs/api/README.md)).

Run any tool from a shell:

```bash
node plugins/liara/bin/liara-tool.mjs scan_project '{"path":"."}'
```

## Tests

```bash
cd plugins/liara && npm test
```

Runs the scanner on sample projects, the full flow (create app → database → storage → AI → mail → secrets → DNS → deploy) against a local mock of the Liara API, the browser login against a fake console, and the ClickHouse copy script against fake ClickHouse servers. Tests use a temporary login file and never touch `~/.liara-auth.json`.

## Known gaps

These parts of the Liara API are not fully described in the published specs, so the plugin makes a best guess and reports the API's error if it's wrong:

- Bucket-scoped storage access keys (the `buckets` item shape) — tries the likely shapes in turn.
- Release fields beyond `sourceID`/`port`/`type` (build, disks, cron, platform config from `liara.json`) — sent as the Liara CLI does.
- Build logs (`/v2/releases/{id}/build-logs`) — not in the spec; skipped if unavailable.
- DNS `contents` for TXT records (`{ "text": ... }`).
- DNS import copies common record names only (`@`, `www`, `mail`, `api`, …) because DNS has no "list everything" query; review the zone before switching nameservers.
