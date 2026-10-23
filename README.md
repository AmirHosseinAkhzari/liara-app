# Liara for Claude

A Claude Code plugin that deploys any project to [Liara](https://liara.ir) from Claude, plus a local reference for every Liara API it uses.

- **[plugins/liara/](plugins/liara/README.md)**: the plugin. Say "deploy this to Liara" in any project.
- **[docs/api/](docs/api/README.md)**: endpoint reference, one file per product (212 endpoints), generated from Liara's OpenAPI specs.
- **[docs/guides.md](docs/guides.md)**: concepts per product: states, record formats, plans, workflows.
- **[specs/](specs/)**: the raw OpenAPI 3 files published at [developers.liara.ir](https://developers.liara.ir) (checked against the live site on 2026-10-22: identical).

## The plugin

In any project, say **"deploy this to Liara"** or run `/liara:deploy`. Claude:

1. **Logs in automatically** with the same browser login as `liara login`, and works in your personal account or a team you choose.
2. **Analyzes the project**: framework, runtime version, port, build/start, workers, health endpoints, tests, and every service it uses (all 9 Liara database engines, Redis, S3 storage, email, DNS, AI, other APIs).
3. **Asks once, in one line**: how many services it adds and what they cost a day.
4. **Connects Liara services and sets env vars**, asks before replacing a working provider, and moves the data when you agree.
5. **Deploys, then verifies** with real HTTP health checks. It builds in Germany, or in Iran when Germany is not available. On failure it **diagnoses from evidence, fixes it itself** and redeploys. A build that runs out of time gets a bigger feature bundle. A **live progress page** opens in your browser so you can watch every step.
6. **Writes a Persian deployment page** (Liara branding, cards and charts): plans bought, cost per service, balance and days left with a top-up button when it runs low, and a map of the connected services.

It also answers from the official docs, compares prices, checks billing, creates and manages VPS, checks Liara's status page, and sets up automatic deploys from GitHub. Details, permissions and API limitations: [plugins/liara/README.md](plugins/liara/README.md).

Install from this folder:

```bash
claude plugin marketplace add ./
```

```bash
claude plugin install liara@liara-tools
```

## Liara APIs

| Product | Base URL | Endpoints | Reference |
|---|---|---|---|
| PaaS (apps, deploy, disks, domains, metrics) | `https://api.liara.ir` | 41 | [paas.md](docs/api/paas.md) |
| DBaaS (managed databases) | `https://api.liara.ir` | 18 | [dbaas.md](docs/api/dbaas.md) |
| Database Inspector | `https://{database-inspector-url}` (per database) | 11 | [database-inspector.md](docs/api/database-inspector.md) |
| Object Storage (S3-compatible) | `https://storage-service.liara.ir` | 26 | [object-storage.md](docs/api/object-storage.md) |
| File Browser (app disks) | `https://{filebrowser-url}` (per disk) | 9 | [file-browser.md](docs/api/file-browser.md) |
| DNS | `https://dns-service.liara.ir` | 10 | [dns.md](docs/api/dns.md) |
| Mail server | `https://mail-service.liara.ir` | 40 | [mail.md](docs/api/mail.md) |
| IaaS (virtual machines) | `https://iaas-api.liara.ir` | 18 | [iaas.md](docs/api/iaas.md) |
| Account (`/v1/me`) | `https://api.liara.ir` | 6 | [account.md](docs/api/account.md) |
| Billing | `https://api.liara.ir` | 1 | [billing.md](docs/api/billing.md) |
| AI — chat, embeddings, images, STT, TTS (inference) | `https://ai.liara.ir/api/{workspaceID}/v1` | 7 | [chat](docs/api/ai-chat-completions.md) · [embeddings](docs/api/ai-embeddings.md) · [images](docs/api/ai-image-generation.md) · [STT](docs/api/ai-stt.md) · [TTS](docs/api/ai-tts.md) |
| AI — workspaces, keys, logs, models, playground (management) | `https://ai.liara.ir` | 25 | [workspaces](docs/api/ai-workspaces.md) · [keys](docs/api/ai-keys.md) · [logs](docs/api/ai-logs.md) · [models](docs/api/ai-models.md) · [playground](docs/api/ai-playground.md) |

The latest specs are always listed under "OpenAPI Specs" in [developers.liara.ir/llms.txt](https://developers.liara.ir/llms.txt).

### Authentication

Every platform API uses the same header:

```
Authorization: Bearer <LIARA_API_TOKEN>
```

- **Platform APIs** (PaaS, DBaaS, Storage, DNS, Mail, IaaS, Account, Billing, AI management): your account API token from the Liara Console (account settings → API), or the token saved by `liara login` in `~/.liara-auth.json`.
- **AI inference** (chat, embeddings, images, STT, TTS): an **AI API key** created with [`POST /v1/keys`](docs/api/ai-keys.md) and scoped to a workspace. The key is shown only once.
- **Public, no auth:** the AI model catalog (`GET https://ai.liara.ir/v1/models`, `/v2/models`).

To act on a team's resources instead of your personal account, add `teamID` to any request:

```
GET https://api.liara.ir/v1/projects?teamID=<team-id>
```

### Deploy by hand

Upload a `.tar.gz`, then create a release from it (this is what the plugin does):

```bash
curl -X POST "https://api.liara.ir/v2/projects/my-app/sources" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -F "file=@./source.tar.gz"
```

```bash
curl -X POST "https://api.liara.ir/v2/projects/my-app/releases" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceID": "<id from the upload>", "port": 3000, "type": "node"}'
```

### Common responses

| Status | Meaning in these APIs |
|---|---|
| `200` / `201` / `204` | Success |
| `400` | Bad request (validation error) |
| `401` | Missing, invalid, or expired token |
| `403` | Token valid but not allowed (e.g. wrong team) |
| `404` | Resource does not exist (or is not yours) |
| `409` | Conflict (name already taken, operation already running) |

### Caveats from the specs

- Some descriptions in Liara's specs are copy-pasted (e.g. "Change plan" says "create app that user owns"). The docs reproduce the specs as published.
- Database Inspector and File Browser have per-resource hostnames assigned by Liara; the spec only shows a placeholder.
- Two paths look like typos in Liara's spec but are kept as published: Object Storage download is `/api/v1/buckets/{bucket}/download/${object}` (stray `$`), and Mail's delete inbound rule uses `/api/v1/mail/…` (singular) while every other Mail path uses `/api/v1/mails/…`.
- Storage access keys (`POST /api/v1/keys`, `PATCH /api/v1/keys/{key}`) take `buckets` as plain bucket names (`["my-bucket"]`), not the objects the spec shows. Responses list `keys[].buckets[]` as objects.
- The release `type` field is the app platform (e.g. `node`, `docker`, `laravel`); the spec gives no list of allowed values.
- Build logs (`/v2/releases/{id}/build-logs`) are used by the Liara CLI but not in the published spec.
