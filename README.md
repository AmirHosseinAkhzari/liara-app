# Liara API docs

Local reference for every API published at [developers.liara.ir](https://developers.liara.ir) (snapshot taken 2026-10-21).

- **[docs/api/](docs/api/README.md)** — full endpoint reference, one file per product (212 endpoints), generated from Liara's OpenAPI specs.
- **[docs/guides.md](docs/guides.md)** — concepts per product: states, record formats, plans, workflows.
- **[specs/](specs/)** — the raw OpenAPI 3 YAML files, as published by Liara. Import these into Postman, Insomnia, or an OpenAPI code generator.

## Products

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

## Authentication

Every platform API uses the same header:

```
Authorization: Bearer <LIARA_API_TOKEN>
```

- **Platform APIs** (PaaS, DBaaS, Storage, DNS, Mail, IaaS, Account, Billing, AI management): use your account API token from the Liara Console (account settings → API). It is a JWT, so it starts with `eyJ…`.
- **AI inference** (chat, embeddings, images, STT, TTS): use an **AI API key** created with [`POST /v1/keys`](docs/api/ai-keys.md) and scoped to a workspace. The key is shown only once when created.
- **Public, no auth:** the AI model catalog (`GET https://ai.liara.ir/v1/models`, `/v2/models`).

### Teams

To act on resources owned by a team instead of your personal account, add the `teamID` query parameter to any request:

```
GET https://api.liara.ir/v1/projects?teamID=<team-id>
```

### Local setup

Put your token in `.env` (gitignored; see [.env.example](.env.example)):

```bash
cp .env.example .env
```

```bash
set -a; source .env; set +a
```

```bash
curl -H "Authorization: Bearer $LIARA_API_TOKEN" https://api.liara.ir/v1/me
```

## Quick start

**List your apps**

```bash
curl -H "Authorization: Bearer $LIARA_API_TOKEN" https://api.liara.ir/v1/projects
```

**Deploy source code** — upload a `.tar.gz`, then create a release from it:

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

**Open a shell in an app** (WebSocket):

```
wss://api.liara.ir?token=<api-token>&cmd=/bin/bash&project_id=<project-id>[&teamID=<team-id>]
```

**AI chat completion** (OpenAI-compatible; works with the OpenAI SDKs by setting the base URL):

```bash
curl -X POST "https://ai.liara.ir/api/$LIARA_AI_WORKSPACE_ID/v1/chat/completions" \
  -H "Authorization: Bearer $LIARA_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-5", "messages": [{"role": "user", "content": "Hello"}]}'
```

## Common responses

| Status | Meaning in these APIs |
|---|---|
| `200` / `201` / `204` | Success |
| `400` | Bad request (validation error) |
| `401` | Missing, invalid, or expired token |
| `403` | Token valid but not allowed (e.g. wrong team) |
| `404` | Resource does not exist (or is not yours) |
| `409` | Conflict (name already taken, operation already running) |

## Updating these docs

```bash
bash scripts/fetch_specs.sh
```

```bash
python3 -m pip install pyyaml
```

```bash
python3 scripts/generate_docs.py
```

`fetch_specs.sh` downloads the latest specs listed in `https://developers.liara.ir/llms.txt` into `specs/`. `generate_docs.py` rebuilds everything in `docs/api/`. Don't edit `docs/api/` by hand; edit the generator or `docs/guides.md` instead.

## Caveats from the specs

- Liara's spec files have some copy-paste descriptions (e.g. "Change plan" says "create app that user owns"). The docs reproduce the specs as published.
- Database Inspector and File Browser have per-resource hostnames assigned by Liara; the spec only shows a placeholder.
- Two paths look like typos in Liara's spec but are kept as published: Object Storage download is `/api/v1/buckets/{bucket}/download/${object}` (stray `$`), and Mail's delete inbound rule uses `/api/v1/mail/…` (singular) while every other Mail path uses `/api/v1/mails/…`. Test before relying on them.
- The release `type` field is the app platform (e.g. `node`, `docker`, `laravel`); the spec gives no list of allowed values.
