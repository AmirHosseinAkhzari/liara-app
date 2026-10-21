---
name: liara-deploy
description: Deploy a project to Liara (Iranian cloud PaaS) end to end. Detects language, framework, port and the services the app uses (database, S3 object storage, email, DNS/domains, AI APIs, other APIs), auto-connects Liara equivalents, asks before moving anything that runs in production elsewhere and then transfers its data, sets env vars, deploys, and fixes failed builds. Use when the user says deploy/ship/publish/host on Liara, "liara deploy", moves an app to Liara, or asks to connect a Liara database, bucket, mail server, DNS zone or AI workspace.
---

# Deploy to Liara

You have the `liara` MCP tools (whoami, scan_project, list_resources, plans, create_app, connect_database, connect_storage, connect_mail, connect_dns, connect_ai, migrate_database, migrate_storage, set_envs, get_envs, deploy, release_status, app_logs, app_action, api).
Secrets stay inside the tools: never print, echo or `cat` env files or tokens, and never pass secret values through `set_envs.vars` — use `fromEnvFile` + `keys`.

Keep the user informed with short updates. Ask questions with AskUserQuestion, batched (several questions in one call), recommended option first.

## 1. Preflight

1. `whoami`. On "No Liara API token" or 401, stop and tell the user:
   create a token in Liara Console → Account → API, then either `export LIARA_API_TOKEN=...` before starting Claude Code, add `LIARA_API_TOKEN=...` to the project `.env` (gitignored), or run `liara login` (Liara CLI). For team resources also set `LIARA_TEAM_ID`.
2. `scan_project` with the project path. If `liara.json` names an app that exists (`list_resources` → apps), pass `app` so its current Liara env vars count as production.
3. `list_resources` once, to reuse existing apps/databases/buckets/zones/workspaces instead of creating duplicates.

## 2. Show what you found

One compact table, then the questions. Example:

| | Found | Production today | Liara plan |
|---|---|---|---|
| Stack | Next.js 15 (TypeScript) | Vercel | platform `nextjs`, port 3000 |
| Database | PostgreSQL via Prisma | Supabase | **ask** → Liara PostgreSQL + copy data |
| Storage | S3 SDK | Cloudflare R2 | **ask** → Liara Object Storage + copy files |
| Email | Resend SDK | Resend | **ask** (needs small code change) |
| AI | OpenAI SDK | OpenAI | **ask** → Liara AI (OpenAI-compatible) |
| Redis | ioredis | localhost only | auto → Liara Redis |
| DNS | shop.example.com | Cloudflare DNS | **ask** → Liara DNS + SSL |
| Other APIs | Stripe, Sentry | — | copy keys as env vars |

Mention `warnings`, `missingEnvKeys` (needed but undefined anywhere) and `codeChangeNeeded`.

## 3. Decide — rules per service `recommendation`

- `auto-connect` (not configured, local/docker-compose only, or dev-only): Liara has it → create it and connect it. Don't ask *whether*; only confirm cost once (step 4).
- `ask-to-migrate` (an external provider in production): ask exactly this, per service:
  *"Production uses <provider> for <service>. Switch to Liara <equivalent> and transfer all data/settings to Liara?"* — options: **Switch & transfer (Recommended)** / **Keep <provider>**.
  - Keep → copy the existing keys to Liara env vars: `set_envs {app, fromEnvFile: <production file>, keys: service.envKeys}`.
  - Switch → step 5.
- `already-on-liara` → just make sure the app has the env vars (`set_envs` from the production file).
- `ask` → database engine unknown (ask which) or SQLite (ask: **Move to Liara PostgreSQL** and port the data, or **Keep SQLite on a Liara disk** — then add `"disks": [{"name": "data", "mountTo": "<db folder>"}]` to liara.json and create the disk with the `api` tool: `POST paas /v1/projects/<app>/disks {"name":"data","size":"1"}`).
- `otherApis` and `appSecrets` (Stripe, Sentry, payment gateways, SMS, `APP_KEY`, `NEXTAUTH_SECRET`, …): no Liara equivalent → copy with `set_envs fromEnvFile keys`. Say which keys you copied (names only).
- `missingEnvKeys`: list them; ask the user for values or confirm they are optional. Values they type in chat may go in `set_envs.vars`.

Which env file is "production": `.env.production` > `.env` > the Liara app's own env. Never copy from `.env.development`/`.env.local`/examples. Never copy `LIARA_API_TOKEN`.

## 4. Plans and the app

1. `plans` → pick the smallest suitable plan per resource. Ask once, in one AskUserQuestion: app name (suggest `suggestedAppName`), app plan, and the plan for each resource you will create. Mention these cost money on the user's Liara balance.
2. `create_app {app, platform, planID[, bundlePlanID]}` — before connecting services, so env vars exist before the first boot.
   If creation fails asking for a network or bundle plan, read the error, get IDs with `plans` / `api`, and retry.

## 5. Connect each service (pass `app`, `platform`, and `envKeys` from scan_project)

Use the same env var names the code already reads (`service.envKeys`); the tools fill them in (URL or host/port/user/password parts). With no existing keys, sensible defaults per framework are used.

- **Database**: `connect_database {create: {type, hostname: "<app>-db", planID, version}}` (engine `postgres|mysql|mariadb|mongodb|redis|mssql|elasticsearch|rabbitmq`). One per engine (e.g. Postgres + Redis).
  - Switch & transfer → after creating: `migrate_database {databaseId, sourceEnvFile, sourceKey?}`. It needs the Liara DB reachable from this computer: if it returns `needsConfirmation`, ask the user and call again with `allowTemporaryPublicNetwork: true` (turned off again automatically). Report table counts. Then run schema migrations only if the copy didn't include them.
  - New/empty DB → make sure migrations run on Liara (see reference below).
- **Object storage**: `connect_storage {bucket: "<app>-files", create: {plan, permission}}`. Switch & transfer → `migrate_storage {app, sourceEnvFile}` (rclone), then tell the user stored file URLs in the database may still point to the old provider (offer a find/replace script).
  Cloudinary / Vercel Blob / UploadThing need a code change to an S3 client — offer to do it.
- **Email**: `connect_mail {domain, plan, mode: "LIVE", account: "noreply"}`. If the domain's DNS is (or will be) on Liara add `addDnsRecords: true`; otherwise show `dnsRecordsNeeded` for the user's DNS panel. If the code uses an HTTP mail SDK (Resend, SendGrid, …), offer to switch the send function to SMTP (nodemailer / Laravel mailer / Django SMTP backend).
- **AI**: `connect_ai {workspace: <app>, plan: "base"}`. Then fix the code: model IDs need provider prefixes (`gpt-4o-mini` → `openai/gpt-4o-mini`; list with `api GET ai /v2/models`), hard-coded `baseURL` must read the base-URL env var, and Anthropic/Gemini native SDK calls must move to the OpenAI SDK if the user wants Liara AI.
- **DNS / domains**: after the first successful deploy, `connect_dns {domain, app, includeWww}`. It copies the common public records, attaches the domain, adds CNAME/ALIAS, requests SSL. Tell the user the exact nameservers to set at their registrar and that SSL activates after that; offer to recheck later (`api PUT dns /api/v1/zones/<zone>/check`, then `connect_dns` again for SSL). Warn that only common record names were copied.

## 6. Prepare the code for Liara (edit only what's needed, explain each change)

See [reference/platforms.md](reference/platforms.md). Typical fixes: listen on the detected port / `process.env.PORT`, add a `start` script, Django `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` for `.liara.run` and the domain, Laravel `TrustProxies`, Prisma `binaryTargets`, static build output, a Dockerfile for unsupported languages, liara.json `disks` for uploads/SQLite. Write `liara.json` (`app`, `platform`, `port`, plus platform options) — the deploy tool saves app/platform/port automatically after success.

## 7. Deploy and fix

1. `deploy {path, app, platform, port}` (waits up to 240 s). Report the URL `https://<app>.liara.run`.
2. If `state` is not finished, `release_status {app, releaseID, wait: 240}`.
3. On failure: read `buildLogTail`, then `app_logs`. Fix the cause in code/config/env, explain it in one line, redeploy. Stop after 3 failed attempts and show the user what you tried.
4. On success: open the URL with a quick request (curl -sI) to confirm it answers; check `app_logs` for runtime errors.

## 8. Final report

Lead with the result (live URL or what blocks it). Then: resources created (with plans), services switched and data transferred (counts), env vars set (names only), code changes, and what the user must still do (nameservers, mail DNS verification, SSL, deleting old providers only after they've verified Liara). Never delete anything at the old provider.

## Re-deploys

If `liara.json` exists and the app is on Liara, a plain "deploy" request means: scan quickly for new env keys the code reads that Liara lacks (`missingEnvKeys` vs `get_envs`), then `deploy`. Don't redo provisioning.
