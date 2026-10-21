# liara_analyzer

Reads a project folder with AI (via the AI Box API) and tells you what it needs on Liara:

| Answer | What it means |
|---|---|
| **Language** | The Liara platform to run it on: `node`, `next`, `laravel`, `php`, `python`, `django`, `flask`, `dotnet`, `react`, `angular`, `vue`, `static`, `go` or `docker`. |
| **Database** | Zero or more of `mariadb`, `mysql`, `postgres`, `mssql`, `mongodb`, `redis`, `elasticsearch`, `rabbitmq` or `clickhouse`. |
| **S3 / Email / AI / DNS** | Whether the project needs each one, with a short reason. DNS also returns the custom domain it found. |
| **Deploy** | Port, build and start commands, runtime version, env var names, and warnings (for example SQLite or local uploads). |

Every answer comes with evidence: the file and line that led to it.

## Run it

From the repo root:

```bash
./liara-analyze ~/Projects/my-app
```

```bash
./liara-analyze ~/Projects/my-app --json
```

```bash
./liara-analyze ~/Projects/my-app --dry-run
```

`--dry-run` prints exactly what would be sent to the AI, without sending it. Other options are `--model <id>` (default `openai/gpt-6-luna`), `--brief` and `--no-color`.

## Settings

Put these in the repo's `.env` file (gitignored) or in your environment:

```
BOX_AI_BASE_URL=https://ai.boxapi.ir/ai/v1
BOX_AI_API_KEY=...
```

The current key only allows `openai/*` models.

## What gets sent

- **Sent:** the file list; manifest and config files (package.json, composer.json, requirements.txt, go.mod, prisma schema, settings.py, .env.example, Dockerfile, …); and code lines that mention databases, storage, email, AI, domains or ports.
- **Never read:** `.env`, `.env.*` (except `.example` / `.sample` / `.template` / `.dist`), private keys, certificates and credential files.
- **Hidden before sending:** values of secret-looking variables (`*_SECRET`, `*_PASSWORD`, `*_TOKEN`, `*_API_KEY`, …), passwords inside connection URLs, and known key formats.
- **Skipped:** `node_modules`, `vendor`, build output, lock files and binary files.

## Test

`test/fixtures` holds seven small sample projects with known answers: Next.js, Django, Laravel, a static site, Go, Flask and a React SPA. This command runs all of them against the real API:

```bash
cd tools/liara_analyzer && dart run tool/check_fixtures.dart
```

## Use from the Flutter app

`lib/liara_analyzer.dart` has no dependencies outside the Dart SDK, so the macOS app can import it directly. Use `ProjectScanner().scan(path)`, then `ProjectAnalyzer(...).analyze(snapshot)`, and you get a `ProjectAnalysis`.
