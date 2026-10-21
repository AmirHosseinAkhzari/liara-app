# Liara platform notes

Practical notes for preparing code. liara.json option names and mount paths can change between Liara releases — if a build complains about one, check docs.liara.ir for that platform and adjust.

Platform IDs for `create_app` / `deploy`: `node`, `nextjs`, `react`, `vue`, `angular`, `static`, `laravel`, `php`, `django`, `flask`, `python`, `go`, `netcore`, `docker`.
If Liara rejects a platform (e.g. `python` or `go` on an older account), fall back to `docker` with a Dockerfile.

Liara builds from source: it installs dependencies and runs the build itself. `.env` files are not uploaded — config comes from app env vars.

## Port

- `react`, `vue`, `angular`, `static`, `laravel`, `php`, `django`, `flask`, `netcore`: Liara runs the web server → port **80**.
- `node`, `nextjs`, `python`, `go`, `docker`: the port your process listens on. Make the code read `PORT` with a default equal to the deploy port.

## Node.js / Next.js

- Needs `"start"` in package.json (`node dist/index.js`, `next start`, `node .output/server/index.mjs` for Nuxt). Build runs `npm run build` when present.
- Node version: `liara.json` → `"node": { "version": "22" }` (same key for `nextjs`).
- Prisma: run `prisma migrate deploy` at start (`"start": "prisma migrate deploy && next start"`) or once from `liara shell`. `prisma generate` must run in `postinstall` or `build`.
- NestJS/Express behind Liara's proxy: `app.set('trust proxy', 1)` if you use secure cookies or rate limits.
- Next.js `output: 'export'` → deploy the `out/` folder as `static`.

## React / Vue / Angular / Vite SPAs

- Liara builds them and serves the output; SPA routing works out of the box on these platforms. Build-time env vars (`VITE_*`, `REACT_APP_*`) must be set as Liara env vars **before** deploy.
- Svelte/Solid/Preact/Astro static: run the build locally, then `deploy` the output folder with platform `static`.

## Laravel / PHP

- liara.json `"laravel": { "configCache": true, "routeCache": true, "buildAssets": true }`. `APP_KEY` must be set (copy it).
- Migrations: `liara shell --app <app>` → `php artisan migrate --force`, or tell the user.
- Behind the proxy: `TrustProxies` with `$proxies = '*'` (Laravel 11: `->trustProxies(at: '*')` in bootstrap/app.php) so URLs are https.
- `storage/` uploads: use S3 (`FILESYSTEM_DISK=s3`) or a disk mounted at `storage`.

## Django / Flask / Python

- Django: `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` must include `<app>.liara.run` and custom domains (read them from env). Static files: `STATIC_ROOT` set; Liara runs `collectstatic`. liara.json `"django": { "pythonVersion": "3.12" }`.
- Flask: the app object must be importable (Liara expects `app.py`/`wsgi.py` with `app`).
- FastAPI and others on `python`: start with uvicorn/gunicorn binding `0.0.0.0:<port>`; if the platform is unavailable use `docker`.
- `MEDIA_ROOT` uploads → S3 via django-storages, or a disk.

## Go / .NET

- Go: bind `0.0.0.0:$PORT`. .NET: Liara serves on 80; set `ASPNETCORE_URLS` only if you changed it.

## Docker

- `EXPOSE` must match the deploy port. Use multi-stage builds; don't copy `.env` into the image.

## Disks (persistent files)

```json
{ "disks": [{ "name": "uploads", "mountTo": "/usr/src/app/uploads" }] }
```

Create the disk first: `api POST paas /v1/projects/<app>/disks {"name":"uploads","size":"1"}` (size in GB). Mount paths depend on the platform's working dir (`/usr/src/app` for node, `/var/www/html` for laravel/php, `/usr/src/app` for python platforms).

## Liara connection facts

- Private network: apps reach a database at host = database hostname, port = internal port. Use `publicAccess: true` only if the app and database are not on the same network.
- Object storage: S3-compatible, path-style, any region string. Endpoint shown in the bucket page of the console.
- Mail: SMTP host/port from the mail server, credentials from `smtp-credentials`. Mail is delivered only after MX/SPF/DKIM/return-path verify.
- AI: `https://ai.liara.ir/api/<workspaceID>/v1`, OpenAI-compatible; model IDs like `openai/gpt-4o-mini`.
