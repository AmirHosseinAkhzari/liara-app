# Liara products: concepts and workflows

Summary of the product overview pages at [developers.liara.ir](https://developers.liara.ir), plus the order to call endpoints in. For every field and response, see the [API reference](api/README.md). Auth and team access are in the [main README](../README.md#authentication).

---

## PaaS — apps

Base URL `https://api.liara.ir` · [reference](api/paas.md)

Deploy and run apps (Node.js, Python, Go, PHP, Ruby, .NET, Docker, static, …) without managing servers.

**Areas**

| Area | What it covers |
|---|---|
| Apps | create, list, delete, scale on/off, restart, change plan, logs, events, applets, releases |
| Deploy | upload source archive → create release (zero-downtime optional) |
| Settings | zero-downtime, default subdomain, static IP, read-only filesystem, environment variables |
| Disks | persistent disks, resize, backups (create / list / download), FTP access |
| Domains | add custom domains, attach to app, redirects, SSL on/off, domain check |
| Reports | CPU, memory, network receive/transmit, summary |

**Deploy flow**

1. `POST /v1/projects` — create the app (name, platform, plan).
2. `POST /v2/projects/{name}/sources` — upload the source as a `.tar.gz` (`multipart/form-data`, field `file`). Returns a source ID.
3. `POST /v2/projects/{name}/releases` — `{ "sourceID", "port", "type" }` starts the build and release.
4. `GET /v1/projects/{name}/releases` and `/logs` — follow the result.

**Environment variables:** `POST /v1/projects/update-envs` with `{ "project": "<name>", "variables": [{ "key": "...", "value": "..." }] }`.

**Interactive shell (WebSocket):**
`wss://api.liara.ir?token=<api-token>&cmd=/bin/bash&project_id=<project-id>` (add `&teamID=` for team apps).

---

## DBaaS — managed databases

Base URL `https://api.liara.ir` · [reference](api/dbaas.md)

Engines: MySQL, MariaDB, PostgreSQL, MongoDB, Redis (and others offered in the console).

**Create a database** — `POST /v1/databases` with:

| Field | Meaning |
|---|---|
| `hostname` | unique name for the database |
| `type` | engine, e.g. `mysql`, `postgres`, `mongodb`, `redis` |
| `planID` | resource plan |
| `version` | engine version |
| `publicNetwork` | expose to the internet or keep private |

Then `GET /v1/databases/{id}` for connection details.

**Other operations:** power on/off (`/actions/scale`), resize plan, engine settings, control panel on/off, public network on/off, backups (create, list, download), metrics (CPU, memory, network, summary), events.

Tips from Liara: prefer private networking, take a manual backup before risky changes, keep the version updated.

---

## Database Inspector

Base URL is assigned per database by Liara (`https://{database-inspector-url}`) · [reference](api/database-inspector.md)

Browse and edit data inside a managed database over HTTP:

- **Roles** — list, create, update, delete database users/roles.
- **Datasets** — list tables/collections, get one by name.
- **Data** — filter, insert, update, delete rows/documents in a dataset.
- **Queries** — run a custom query (`POST /v1/databases/{databaseID}/queries`).

---

## Object Storage (S3-compatible)

Base URL `https://storage-service.liara.ir` · [reference](api/object-storage.md)

**Concepts**

- **Bucket** — container for objects; unique name; `private` or `public`; has a storage plan (20 / 40 / 80 / 160 GB options).
- **Object** — a file, identified by its key (path) in the bucket. Folders are key prefixes.
- **Access key** — access key + secret key pair, optionally scoped to specific buckets. Use these with any S3 SDK or CLI.

**Workflows**

- Create a bucket: `POST /api/v1/buckets` with `name`, `plan`, `permission`. Check the name first with `/check-availability`.
- Upload: `GET /api/v1/buckets/{bucket}/upload/{object}` returns a presigned URL; `PUT` the file to it.
- Download: request a presigned download URL (optional expiry), then `GET` it.
- Change access: `PATCH /api/v1/buckets/{bucket}/type/{permission}`. Upgrade plan: `PATCH /api/v1/buckets/{bucket}/upgrade/{plan}`.
- Migrate data from another storage service: `/api/v1/buckets/migration/from`, `POST /api/v1/buckets/migrates`, track with `/api/v1/buckets/migrations`.
- Metrics: summary, historical, and per-stat.

For bulk file work, use the S3 API with an access key instead of the management API.

---

## File Browser — app disks

Base URL is assigned per disk by Liara (`https://{filebrowser-url}`) · [reference](api/file-browser.md)

All paths are `/v1/projects/{projectID}/disks/{diskName}/…`:

| Action | Endpoint |
|---|---|
| list a directory (paginated, sort by name / size / modified) | `GET list` |
| search by name | `GET search` |
| download / serve a file | `GET serve` |
| upload (`multipart/form-data`, optional overwrite) | `POST upload` |
| create file or directory | `POST create` |
| rename | `POST rename` |
| extract a zip | `POST extract` |
| delete | `DELETE delete` |
| temporary share link (`preview` or `download`; expires `1h`, `6h`, `1d`, `3d`, `7d`) | `POST createLink` |

Each item has `path`, `name`, `size`, `extension`, `isDir`, `isSymlink`, `type` (MIME), `mode`, `createAt`, `modifiedAt`.

---

## DNS

Base URL `https://dns-service.liara.ir` · [reference](api/dns.md)

**Zone statuses:** `CREATING` → `PENDING` (waiting for you to set nameservers at your registrar) → `ACTIVE`; `DELETING` when removed.

**Flow**

1. `POST /api/v1/zones` with the domain. Note the assigned Liara nameservers.
2. Set those nameservers at your domain registrar.
3. `PUT /api/v1/zones/{zone}/check` — verify the nameservers.
4. Add records with `POST /api/v1/zones/{zone}/dns-records`.

**Record types:** `A`, `AAAA`, `CNAME`, `ALIAS` (CNAME-like for the root), `MX`, `TXT`, `SRV`, `SPF`, `PTR`, `CAA`.
**Name:** `@` = root, `*` = wildcard, or any subdomain label.
**TTL values:** 120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800, 432000.

`contents` depends on the type:

```json
{ "name": "@",   "type": "A",     "ttl": 3600, "contents": [{ "ip": "192.168.1.1" }] }
{ "name": "@",   "type": "MX",    "ttl": 3600, "contents": [{ "priority": 10, "host": "mail.example.com" }] }
{ "name": "www", "type": "CNAME", "ttl": 3600, "contents": [{ "host": "example.com" }] }
```

---

## Mail server

Base URL `https://mail-service.liara.ir` · [reference](api/mail.md)

**Flow**

1. `GET /api/v1/mails/{domain}/check-availability`, then `POST /api/v1/mails` with `domain`, `mode` (`DEV` for testing or `LIVE`), and `plan`.
2. Add the DNS records Liara gives you: MX, SPF, DKIM, return path (add DMARC too).
3. `GET /api/v1/mails/{mailServerID}/dns-check` until DNS is verified.
4. Create mailbox accounts (`/accounts`), and either:
   - send through the API: `POST /api/v1/mails/{mailServerID}/messages`, or
   - generate SMTP credentials (`POST …/smtp-credentials`) and use any SMTP client.

**Send through the API**

```json
{
  "from": "sender@yourdomain.com",
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "text": "Plain text content",
  "html": "<html>HTML content</html>",
  "attachments": []
}
```

**Also available:** message list / details / rendered HTML / temporary HTML access link / trash / permanent delete, attachments, delivery events per message, tags and tag stats, forwarding addresses per account, inbound rules (block addresses or domains), daily send counts, usage metrics, plan history / change plan / remove reserved plan, unfreeze.

Plans differ by daily and monthly send limits, number of accounts, and storage.

---

## IaaS — virtual machines

Base URL `https://iaas-api.liara.ir` · [reference](api/iaas.md)

**Flow**

1. `GET /plans` and `GET /oss` — available plans and operating systems (Ubuntu 24.04 / 22.04, Debian 12.9, …).
2. `POST /vm` with `name` (lowercase), `OS` (`ubuntu-24.04`, `ubuntu-22.04`, `debian-12.9`), `plan`, and optionally `config.SSHKeys` (array) and `config.sshPort`.
3. `GET /vm/{id}` until it's provisioned, then SSH in.

**Plans:** `standard-base-g2`, `standard-plus-g2`, `pro-g2`, `pro-plus-g2`, `express-g2`, `express-plus-g2` (smallest to largest).

**VM states:** `CREATING`, `CREATED`, `FROZEN` (unpaid / suspended), `DELETING`, `DELETED`.
**Power states:** `POWERED_ON`, `POWERED_OFF`, `SUSPENDED`. Change with `PATCH /vm/power/{id}` and body `{ "action": ... }` (the overview names start / stop / restart; the spec doesn't list exact values).

**Also:** extra disks (create, extend, delete), resize plan, reset password, reset network, unfreeze, traffic graph and traffic volume, operations history.

Liara recommends SSH keys over passwords and a non-default SSH port (fewer restrictions when connecting from another country).

---

## Account and billing

Base URL `https://api.liara.ir` · [account](api/account.md) · [billing](api/billing.md)

- `GET /v1/me` — profile and console config (includes `team` in team mode). Good first call to check a token.
- `GET /v1/me/subscription`, `/two-fa`, `/free-credit`, `/git-integrations`, `/utm`.
- `GET /v1/billing` — balance and billing info.

---

## AI

[chat](api/ai-chat-completions.md) · [embeddings](api/ai-embeddings.md) · [images](api/ai-image-generation.md) · [STT](api/ai-stt.md) · [TTS](api/ai-tts.md) · [workspaces](api/ai-workspaces.md) · [keys](api/ai-keys.md) · [logs](api/ai-logs.md) · [models](api/ai-models.md) · [playground](api/ai-playground.md)

OpenAI-compatible inference across several model providers.

**Two base URLs, two kinds of auth**

| Use | Base URL | Auth |
|---|---|---|
| Inference: chat, embeddings, images, audio transcription, TTS | `https://ai.liara.ir/api/{workspaceID}/v1` | AI API key |
| Management: workspaces, keys, logs, playground | `https://ai.liara.ir` | account token (JWT) |
| Model catalog | `https://ai.liara.ir/v1/models`, `/v2/models` | none (public) |

**Setup**

1. `POST /v1/workspaces` — create a workspace (check the name first with `/v1/workspaces/{name}/check-availability`).
2. `POST /v1/keys` — create an API key for that workspace. **The key is shown only once.**
3. Pick a model from `GET /v2/models` (filter / sort / paginate).
4. Call inference endpoints with `Authorization: Bearer <ai-api-key>`.
5. Watch usage with `/v1/workspaces/{id}/logs` and `/activity`.

**With the OpenAI SDK** — set the base URL to `https://ai.liara.ir/api/<workspaceID>/v1` and the API key to your Liara AI key. Model IDs look like `openai/gpt-5`.

**Workspace plans**

| Plan | Features | Log retention |
|---|---|---|
| Base | free tier, limited models, basic activity filters | 7 days |
| Standard | more models, monthly activity filter | 30 days |
| Pro | all models, all activity filters | 90 days |

**Provider routing** (`PATCH /v1/workspaces/{id}/change-provider-preferences`): `price` (cheapest), `throughput`, or `latency`.

**Notes**

- Chat completions stream over SSE with `"stream": true`; supports tools and multi-modal input (text, images, files).
- Audio transcription accepts `multipart/form-data` (`file`) or JSON with base64 `input_audio: { data, format }`. Formats: WAV, MP3, FLAC, M4A, OGG, WebM, AAC.
- Text to speech takes `model`, `input`, `voice`, `response_format`, `speed`.
- Playground endpoints are the same as inference but authenticated with your account JWT.
