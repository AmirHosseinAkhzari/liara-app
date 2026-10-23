# Architecture

## Layout

```
plugins/liara/
├── .claude-plugin/plugin.json   manifest (name, version, icon, privacy and support links)
├── .mcp.json                    starts server/index.mjs with node
├── server/index.mjs             MCP server over stdio (JSON-RPC 2.0), no dependencies
├── lib/                         all tool logic
├── commands/                    17 slash commands (/liara:deploy, /liara:price, …)
├── skills/                      liara-deploy and liara-assistant
├── scripts/liara-tool.mjs       runs any tool from a shell, for debugging
├── assets/                      icon, logo, Vazirmatn font (Persian pages)
└── test/                        node:test suites, fixtures, a mock Liara API
```

The plugin has **no npm dependencies**: only Node.js built-in modules (`node:http`, `node:crypto`, `node:child_process`, …). Nothing is installed when it is set up.

## How a tool call runs

1. Claude calls a tool. `server/index.mjs` receives `tools/call` and passes it to `callTool` in `lib/tools.mjs`.
2. `tools.mjs` holds the 45 tool definitions (name, description, JSON input schema). `toolRisk()` marks each tool as read-only or not, and the server sends this as MCP annotations (`readOnlyHint`, `destructiveHint`).
3. A tool that changes something builds a consent description for this exact call, with its risk (`change`, `billable` or `destructive`) and live cost. `requireConsent()` in `lib/consent.mjs` asks the user before it runs. See [security.md](security.md).
4. The tool runs and calls Liara through `lib/api.mjs`.
5. `lib/audit.mjs` records the outcome: in memory for the session report, and in `~/.liara-claude/audit.jsonl` for changes.
6. Errors come back as `isError: true` with the message and a short part of the API response. The server keeps running.

When the client closes stdin, the server finishes calls still in progress, then exits.

## Main modules

| Module | Job |
|---|---|
| `detect.mjs`, `analyze.mjs` | Read the project (files only) and find framework, runtime, port, services, workers, health endpoints |
| `providers.mjs`, `envmap.mjs`, `envfiles.mjs` | Recognize current providers (Supabase, Atlas, …) and map Liara connection details to the env var names the code reads |
| `deploy.mjs`, `archive.mjs` | Pack the source (respects `.gitignore` and `.liaraignore`, never real `.env` files), upload, create the release, follow it |
| `services.mjs`, `dockerservices.mjs`, `disks.mjs` | Create databases, buckets, mail, DNS, AI workspaces, Docker-based services and disks |
| `migrate.mjs` | Copy data from the current provider when the user agrees |
| `verify.mjs` | HTTPS health checks, log scan, failure diagnosis, secret scrubbing of log lines |
| `pricing.mjs`, `billing.mjs` | Live plans and prices, balance, days left |
| `consent.mjs`, `audit.mjs` | Approvals and the audit log |
| `login.mjs`, `config.mjs`, `teams.mjs` | Browser login, token sources, personal account or team |
| `live.mjs`, `livepage.mjs` | Local live progress page during a deploy |
| `report.mjs`, `deploypage.mjs`, `htmlkit.mjs` | Static HTML reports |
| `docs.mjs`, `status.mjs`, `github.mjs`, `vps.mjs`, `mirrors.mjs` | Docs search, status page, GitHub auto-deploy, VPS, package mirrors for Iran builds |

## Design choices

- **Ask once per deploy.** `approve_plan` approves a list of exact operations (tool + target + plan + bundle) for 2 hours. A call outside that list asks again.
- **Chat fallback.** If the client cannot show dialogs, the tool returns `confirmationRequired` with a one-time token instead of acting.
- **Facts over guesses.** Prices are fetched live. The runtime version is checked against what Liara supports. A deploy counts as done only after real health checks pass.
- **Honest about gaps.** Where Liara's API lacks something (invoices, payment), the plugin says so instead of guessing. See [support.md](support.md).
