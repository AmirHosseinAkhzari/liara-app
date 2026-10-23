# Liara plugin: overview

The Liara plugin lets Claude deploy and run projects on [Liara](https://liara.ir), an Iranian cloud platform. It is one MCP server (Node.js 20+, no npm dependencies), 45 tools, 17 slash commands and 2 skills.

> Community plugin by AmirHossein Akhzari. It is not made or endorsed by Liara.

## The problem it solves

Deploying to Liara by hand means reading the project to find the framework, port and services it needs, picking plans, creating databases and buckets, copying env var names, uploading a tarball, watching the build and checking the app works. The plugin does these steps for the user. It asks once before anything costs money and checks the result with real requests.

## Main flow: `/liara:deploy`

1. **Log in**: the same browser login as `liara login`. The token never appears in chat.
2. **Analyze** (read only): language, framework, runtime version, port, build/start commands, workers, health endpoints, and every service the code uses (databases, Redis, S3, email, DNS, AI).
3. **One approval**: `approve_plan` shows one line with how many services it adds and the cost per day, using live prices.
4. **Connect and deploy**: creates the app and services, sets env vars under the names the code already reads, uploads the source without `.env` files, and tracks the release.
5. **Verify**: real HTTPS requests to the app and its health endpoints. If something fails, `diagnose` finds the cause from logs and the plugin fixes it and deploys again.
6. **Report**: a Persian HTML page with plans, costs, balance and a map of the connected services.

## Other features

| Area | Tools / commands |
|---|---|
| Prices and cost estimates | `plans`, `estimate_cost`, `/liara:price` |
| Balance and days left | `billing`, `/liara:billing` |
| VPS | `create_vm`, `vm_action`, `vps_list`, `/liara:vps` |
| Official docs search | `docs_search`, `docs_read`, `/liara:docs` |
| Liara status page | `service_status`, `/liara:platform` |
| GitHub auto-deploy | `github_autodeploy`, `/liara:github` |
| Services without a managed product (Neo4j, n8n, Meilisearch, any image) | `deploy_service`, `/liara:service` |
| Teams | `teams`, `/liara:team` |

The full list of commands and tools is in [plugins/liara/README.md](../../plugins/liara/README.md).

## More in this folder

- [architecture.md](architecture.md): how the code is organized and how a tool call runs
- [security.md](security.md): consent, secrets and the local files the plugin writes
- [testing.md](testing.md): what the tests cover and how to run them
- [support.md](support.md): privacy, support and known limits of Liara's API
