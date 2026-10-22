# Liara platform notes

Practical notes for preparing code. Check the platform's page with `docs_search` / `docs_read` before relying on a detail; cite the page you used.

Platform IDs (Liara CLI `AVAILABLE_PLATFORMS`): `node`, `next`, `react`, `vue`, `angular`, `static`, `laravel`, `php`, `wordpress`, `django`, `flask`, `python`, `go`, `dotnet`, `docker`. Older names `nextjs` / `netcore` are mapped automatically.

Liara builds from source: it installs dependencies and runs the build itself. `.env` files are not uploaded; config comes from app env vars.

## Port

- Fixed port **80** (Liara runs the server, or the docs require it): `react`, `vue`, `angular`, `static`, `laravel`, `php`, `wordpress`, `django`, `flask`, `python` (FastAPI guide: `uvicorn … --host 0.0.0.0 --port 80`, `liara deploy --port 80 --platform python`).
- `next`: 3000. `node`, `go`, `dotnet`, `docker`: the port the process listens on (CLI defaults: node 3000, go 8080, dotnet 80). Make the code read `PORT` with a default equal to the deploy port.
- Always listen on `0.0.0.0`, never only `localhost` / `127.0.0.1` (scan_project warns via `localOnlyBinding`).

## Runtime versions (liara.json, as `liara init` writes them)

| Platform | Key | Supported (CLI 9.4.7) |
|---|---|---|
| node | `"node": { "version": "22" }` | 14, 16, 18, 20, 22, 24 |
| next | `"next": { "nodeVersion": "22" }` | 20, 22, 24 |
| django / flask | `"django": { "pythonVersion": "3.12" }` | 3.7 – 3.13 |
| python | `"python": { "version": "3.12" }` | 3.7 – 3.13 |
| laravel | `"laravel": { "phpVersion": "8.3" }` | 7.2 – 8.4 |
| php | `"php": { "version": "8.3" }` | 7.2 – 8.4 |
| go | `"go": { "version": "1.24" }` | 1.21 – 1.25 |
| dotnet | `"dotnet": { "version": "8.0" }` | 2.1 – 10.0 |

`deploy` sends the version the project pins (engines, .python-version, composer.json, go.mod, TargetFramework) when Liara supports it and liara.json sets none.

## Health check (liara.json)

```json
{ "healthCheck": { "command": "CMD curl --fail http://localhost:3000/healthz || exit 1", "interval": 30, "timeout": 15, "retries": 2, "startPeriod": 5 } }
```

Use the app's own port in `command`. See https://docs.liara.ir/paas/details/health-check/.

## Node.js / Next.js

- Needs `"start"` in package.json (`node dist/index.js`, `next start`, `node .output/server/index.mjs` for Nuxt). Build runs `npm run build` when present.
- Prisma: run `prisma migrate deploy` at start (`"start": "prisma migrate deploy && next start"`). `prisma generate` must run in `postinstall` or `build`.
- Express/NestJS behind Liara's proxy: `app.set('trust proxy', 1)` for secure cookies or rate limits.
- Next.js `output: 'export'` → deploy the `out/` folder as `static`.
- Cron: run it inside the app (e.g. `node-cron`); see the platform's "Cron Job" page.

## React / Vue / Angular / Vite SPAs

- Liara builds them and serves the output. Build-time env vars (`VITE_*`, `REACT_APP_*`) must be set as Liara env vars **before** deploy.
- Svelte/Solid/Preact/Astro static: build locally, then `deploy` the output folder with platform `static`.

## Laravel / PHP

- liara.json `"laravel": { "configCache": true, "routeCache": true, "buildAssets": true }`. `APP_KEY` must be set (copy it).
- Migrations: `liara shell --app <app>` → `php artisan migrate --force`.
- Behind the proxy: `TrustProxies` (`->trustProxies(at: '*')` in Laravel 11) so URLs are https.
- `storage/` uploads: S3 (`FILESYSTEM_DISK=s3`) or a disk mounted at `storage`.

## Django / Flask / Python

- Django: `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` must include `<app>.liara.run` and custom domains. `STATIC_ROOT` set; Liara runs `collectstatic`.
- Flask: the app object must be importable (`app.py` / `wsgi.py` with `app`).
- FastAPI and others on `python`: bind `0.0.0.0:80`.
- `MEDIA_ROOT` uploads → S3 via django-storages, or a disk.

## Go / .NET / Docker

- Go: bind `0.0.0.0:$PORT`. .NET: Liara serves on 80.
- Docker: `EXPOSE` must match the deploy port. Multi-stage builds; never copy `.env` into the image.

## Background work

Liara runs one process per app. A Procfile `worker:` or a queue worker (Bull/BullMQ, Celery, RQ, Laravel queue) needs its own app (same code, different start command) or must run inside the web process. WebSockets are supported: see the platform's "Websocket" page.

## Disks (persistent files)

```json
{ "disks": [{ "name": "uploads", "mountTo": "/usr/src/app/uploads" }] }
```

Create the disk first: `api POST paas /v1/projects/<app>/disks {"name":"uploads","size":"1"}` (size in GB; asks for confirmation). Mount paths depend on the platform's working dir (`/usr/src/app` for node and python platforms, `/var/www/html` for laravel/php).

## Liara connection facts

- Private network: apps reach a database at host = database hostname, port = internal port. g2 plans need a private network shared by app and databases.
- Object storage: S3-compatible, path-style, any region string. Access keys are created with bucket names.
- Mail: SMTP host/port from the mail server; delivered only after MX/SPF/DKIM/return-path verify.
- AI: `https://ai.liara.ir/api/<workspaceID>/v1`, OpenAI-compatible; model IDs like `openai/gpt-4o-mini` (`plans {product: "ai"}` lists them with prices).
