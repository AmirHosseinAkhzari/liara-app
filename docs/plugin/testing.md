# Testing

## Run

```bash
cd plugins/liara && npm test
```

Uses the Node.js built-in test runner (`node --test`). There is nothing to install. The suite has 128 tests in 15 files and takes about 10 seconds. None of them call the real Liara API.

## Isolation

`test/setup.mjs` runs before every file:

- It points the login file and `~/.liara-claude` to a new temporary folder.
- It removes `LIARA_API_TOKEN`, `LIARA_TOKEN` and `LIARA_TEAM_ID` from the environment.
- `lib/audit.mjs` refuses to write the real audit log during a test run.

Credentials in fixtures are fake `EXAMPLE` values.

## What is covered

| File | Covers |
|---|---|
| `detect.test.mjs` | Project scanner on sample projects in `test/fixtures/` (Express, Next.js, Django, FastAPI, Laravel, Docker Compose, monorepo, …) |
| `e2e.test.mjs` | Full deploy against `test/mock-liara.mjs`, a local mock of Liara's API |
| `consent.test.mjs` | Plan approval, dialogs, too-fast declines, chat tokens bound to arguments, typed names for deletes |
| `teams.test.mjs` | Personal account or team, view-only roles refused, `team-id` in `liara.json` |
| `services.test.mjs`, `services-docker.test.mjs` | Databases, storage keys, mail, DNS, AI; Docker-based services |
| `products.test.mjs` | g2 networks, feature bundles, plans, billing, VPS |
| `migrate.test.mjs` | Data copy, including ClickHouse |
| `login.test.mjs` | Browser login and token sources |
| `verify.test.mjs` | Health checks against a stand-in app, diagnosis from build logs, log masking, status page |
| `live-build.test.mjs`, `live-health.test.mjs` | Live progress page: build log, health checks, answers on the page |
| `docs-github.test.mjs` | Docs search against a stand-in docs site; GitHub auto-deploy with a fake `gh` |
| `mirrors.test.mjs` | Package mirror choice for Iran builds |
| `report.test.mjs` | HTML reports: no secrets, no unsafe scripts |

## Debugging one tool

Any tool runs from a shell. There are no dialogs there, so changes return `confirmationRequired`:

```bash
node plugins/liara/scripts/liara-tool.mjs scan_project '{"path":"."}'
```
