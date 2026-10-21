# AI - Logs

> Generated from [`specs/ai-logs.yaml`](../../specs/ai-logs.yaml) (source: https://developers.liara.ir/spec/ai-logs.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Logs  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 3

## About

Request logs for AI workspace inference operations. Logs track chat completions,
embeddings, and image operations with usage and cost details.

Parameters:
- `teamID`: To access services in a team (query param or `x-teamid` header)

Authentication: JWT Bearer token (for management) or API Key (for API key auth).

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`
- `apiKey`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Logs | `GET` | `/v1/workspaces/{workspaceID}/logs` | [List logs](#list-logs) |
| Logs | `GET` | `/v1/workspaces/{workspaceID}/logs/{logID}` | [Get log details (API key auth)](#get-log-details-api-key-auth) |
| Logs | `GET` | `/v1/workspaces/{workspaceID}/playground/logs/{logID}` | [Get log details (playground auth)](#get-log-details-playground-auth) |

## Logs

Request logs for inference operations

### List logs

`GET /v1/workspaces/{workspaceID}/logs`

Lists paginated request logs for a workspace. Date range is constrained by the
workspace plan's log retention period.

For image operations, both generations and edits are included when filtering by image routes.

Operation ID: `listLogs`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |
| `from` | query | string (date) |  | Start date (default: 1 day ago, constrained by plan log retention) |
| `to` | query | string (date) |  | End date (default: now) |
| `model` | query | string |  | Filter by model ID |
| `url` | query | string |  | Filter by route One of: `/chat/completions`, `/embeddings`, `/image/generations`, `/image/edits` Default: `"/chat/completions"` |
| `page` | query | integer |  | Page number Default: `1` Min: 1 |
| `count` | query | integer |  | Items per page Default: `15` Min: 1 |
| `key` | query | string |  | Filter by API key name Min length: 3 Max length: 15 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Paginated list of logs | `application/json` |
| `401` | Missing authentication |  |
| `404` | Workspace not found |  |
| `416` | Date range exceeds plan retention |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `logs` | object[] |  |  |
| `logs[]._id` | string |  |  |
| `logs[].type` | string |  | One of: `ERROR_VALIDATION`, `PROVIDER_RESPONSE`, `ERROR_PROVIDER` |
| `logs[].content` | object |  |  |
| `logs[].content.model` | string |  |  |
| `logs[].content.key` | string |  | API key name |
| `logs[].content.details` | object |  |  |
| `logs[].content.details.tokens_prompt` | integer |  |  |
| `logs[].content.details.tokens_completion` | integer |  |  |
| `logs[].content.details.total_cost_toman` | number |  |  |
| `logs[].workspace` | string |  |  |
| `logs[].method` | string |  |  |
| `logs[].url` | string |  |  |
| `logs[].createdAt` | string (date-time) |  |  |
| `count` | integer |  | Total number of matching logs |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "logs": [
    {
      "_id": "string",
      "type": "ERROR_VALIDATION",
      "content": {
        "model": "string",
        "key": "string",
        "details": {
          "tokens_prompt": 0,
          "tokens_completion": 0,
          "total_cost_toman": 0
        }
      },
      "workspace": "string",
      "method": "string",
      "url": "string",
      "createdAt": "string"
    }
  ],
  "count": 0
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceID}/logs" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get log details (API key auth)

`GET /v1/workspaces/{workspaceID}/logs/{logID}`

Gets detailed information about a specific log entry. Authenticated via API key.

Operation ID: `getLogDetailsApiKey`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |
| `logID` | path | string | yes | The log ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Log details | `application/json` |
| `401` | Missing authentication |  |
| `404` | Log or workspace not found |  |

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceID}/logs/{logID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get log details (playground auth)

`GET /v1/workspaces/{workspaceID}/playground/logs/{logID}`

Gets detailed information about a specific playground log entry. Authenticated via JWT.

Operation ID: `getLogDetailsPlayground`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |
| `logID` | path | string | yes | The log ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Log details | `application/json` |
| `401` | Missing authentication |  |
| `404` | Log or workspace not found |  |

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceID}/playground/logs/{logID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
