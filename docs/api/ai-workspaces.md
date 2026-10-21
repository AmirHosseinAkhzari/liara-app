# AI - Workspaces

> Generated from [`specs/ai-workspaces.yaml`](../../specs/ai-workspaces.yaml) (source: https://developers.liara.ir/spec/ai-workspaces.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Workspaces  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 11

## About

Manage AI workspaces. Workspaces are the primary organizational unit for AI resources.
Each workspace has a plan (base, standard, pro), a state (ACTIVE, FROZEN), and provider preferences.

Parameters:
- `teamID`: To access services in a team (query param or `x-teamid` header)

Authentication: JWT Bearer token sent via the `Authorization` header.

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Workspaces | `GET` | `/v1/workspaces` | [List workspaces](#list-workspaces) |
| Workspaces | `POST` | `/v1/workspaces` | [Create a workspace](#create-a-workspace) |
| Workspaces | `GET` | `/v1/workspaces/{workspaceName}/check-availability` | [Check workspace name availability](#check-workspace-name-availability) |
| Workspaces | `GET` | `/v1/workspaces/{workspaceID}` | [Get workspace details](#get-workspace-details) |
| Workspaces | `DELETE` | `/v1/workspaces/{workspaceID}` | [Delete a workspace](#delete-a-workspace) |
| Workspace Actions | `PATCH` | `/v1/workspaces/{workspaceID}/change-provider-preferences` | [Change provider preferences](#change-provider-preferences) |
| Workspace Actions | `POST` | `/v1/workspaces/{workspaceID}/resize` | [Resize workspace (change plan)](#resize-workspace-change-plan) |
| Workspace Actions | `POST` | `/v1/workspaces/{workspaceID}/unfreeze` | [Unfreeze workspace](#unfreeze-workspace) |
| Workspace Activity | `GET` | `/v1/workspaces/{workspaceID}/free-tokens` | [Get free token usage](#get-free-token-usage) |
| Workspace Activity | `GET` | `/v1/workspaces/{workspaceID}/activity` | [Get workspace activity](#get-workspace-activity) |
| Model Limits | `GET` | `/v1/workspaces/{workspaceID}/models/{modelID}/limits` | [Get model limits](#get-model-limits) |

## Workspaces

Workspace CRUD operations

### List workspaces

`GET /v1/workspaces`

Lists all workspaces owned by the authenticated user.

Operation ID: `listWorkspaces`

Auth: `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | List of workspaces | `application/json` |
| `401` | Missing authentication |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `workspaces` | object[] |  |  |
| `workspaces[]._id` | string |  |  |
| `workspaces[].name` | string |  |  |
| `workspaces[].state` | string |  | One of: `ACTIVE`, `FROZEN` |
| `workspaces[].plan` | string |  | One of: `base`, `standard`, `pro` |
| `workspaces[].createdAt` | string (date-time) |  |  |
| `workspaces[].updatedAt` | string (date-time) |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "workspaces": [
    {
      "_id": "string",
      "name": "string",
      "state": "ACTIVE",
      "plan": "base",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create a workspace

`POST /v1/workspaces`

Creates a new AI workspace. Only one free (base) workspace is allowed per user.
The workspace name must be unique.

Operation ID: `createWorkspace`

Auth: `jwt`

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Unique workspace name (lowercase, 3-50 chars). Cannot be "liara". Min length: 3 Max length: 50 |
| `plan` | string | yes | Workspace plan tier One of: `base`, `standard`, `pro` |

Example:

```json
{
  "name": "string",
  "plan": "base"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Workspace created | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `402` | Payment required - insufficient balance |  |
| `403` | Forbidden - already have a free workspace |  |
| `409` | Conflict - workspace name already exists |  |
| `410` | Gone - plan not available |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `workspace` | object |  |  |
| `workspace._id` | string |  | Workspace ID |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "workspace": {
    "_id": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/v1/workspaces" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "plan": "base"}'
```

---

### Check workspace name availability

`GET /v1/workspaces/{workspaceName}/check-availability`

Checks if a workspace name is available for use.

Operation ID: `checkWorkspaceAvailability`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceName` | path | string | yes | The workspace name to check Min length: 3 Max length: 50 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Name is available |  |
| `409` | Name already taken |  |

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceName}/check-availability" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get workspace details

`GET /v1/workspaces/{workspaceID}`

Gets detailed information about a specific workspace.

Operation ID: `getWorkspace`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Workspace details | `application/json` |
| `401` | Missing authentication |  |
| `404` | Workspace not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `workspace` | object |  |  |
| `workspace._id` | string |  |  |
| `workspace.name` | string |  |  |
| `workspace.state` | string |  | One of: `ACTIVE`, `FROZEN` |
| `workspace.plan` | string |  | One of: `base`, `standard`, `pro` |
| `workspace.createdAt` | string (date-time) |  |  |
| `workspace.updatedAt` | string (date-time) |  |  |
| `workspace.providerPreferences` | string |  | One of: `price`, `throughput` |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "workspace": {
    "_id": "string",
    "name": "string",
    "state": "ACTIVE",
    "plan": "base",
    "createdAt": "string",
    "updatedAt": "string",
    "providerPreferences": "price"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete a workspace

`DELETE /v1/workspaces/{workspaceID}`

Soft-deletes a workspace. The workspace will be marked as deleted but not permanently removed.

Operation ID: `deleteWorkspace`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Workspace deleted |  |
| `401` | Missing authentication |  |
| `404` | Workspace not found |  |

**Example request**

```bash
curl -X DELETE "https://ai.liara.ir/v1/workspaces/{workspaceID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Workspace Actions

Workspace actions (resize, unfreeze, provider preferences)

### Change provider preferences

`PATCH /v1/workspaces/{workspaceID}/change-provider-preferences`

Changes the provider routing preference for a workspace.
This affects how requests are routed to AI providers.

Operation ID: `changeProviderPreferences`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `preference` | string | yes | Provider routing preference One of: `price`, `throughput`, `latency` |

Example:

```json
{
  "preference": "price"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Preferences updated |  |
| `401` | Missing authentication |  |
| `404` | Workspace not found |  |

**Example request**

```bash
curl -X PATCH "https://ai.liara.ir/v1/workspaces/{workspaceID}/change-provider-preferences" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"preference": "price"}'
```

---

### Resize workspace (change plan)

`POST /v1/workspaces/{workspaceID}/resize`

Changes the plan of a workspace. The user must have sufficient balance
for the new plan's hourly price.

Operation ID: `resizeWorkspace`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `plan` | string | yes | New plan for the workspace One of: `base`, `standard`, `pro` |

Example:

```json
{
  "plan": "base"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Workspace resized |  |
| `401` | Missing authentication |  |
| `402` | Payment required - insufficient balance |  |
| `404` | Workspace not found |  |
| `410` | Gone - plan not available |  |

**Example request**

```bash
curl -X POST "https://ai.liara.ir/v1/workspaces/{workspaceID}/resize" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "base"}'
```

---

### Unfreeze workspace

`POST /v1/workspaces/{workspaceID}/unfreeze`

Unfreezes a frozen workspace. The user must have sufficient balance
to cover the workspace's hourly plan cost.

Operation ID: `unfreezeWorkspace`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Workspace unfrozen |  |
| `401` | Missing authentication |  |
| `402` | Payment required - insufficient balance |  |
| `404` | Workspace not found |  |

**Example request**

```bash
curl -X POST "https://ai.liara.ir/v1/workspaces/{workspaceID}/unfreeze" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Workspace Activity

Usage activity and free token tracking

### Get free token usage

`GET /v1/workspaces/{workspaceID}/free-tokens`

Calculates the free token usage for a workspace.

Operation ID: `getFreeTokens`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Free token usage data | `application/json` |
| `401` | Missing authentication |  |
| `404` | Workspace not found |  |

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceID}/free-tokens" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get workspace activity

`GET /v1/workspaces/{workspaceID}/activity`

Gets aggregated usage activity for a workspace grouped by date and model.
Time filter availability depends on the workspace plan:
- `base`: hour, day, week
- `standard`: hour, day, week, month
- `pro`: all filters available

Operation ID: `getWorkspaceActivity`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |
| `filter` | query | string |  | Time filter for activity aggregation One of: `twoMonth`, `month`, `day`, `hour`, `week` Default: `"day"` |
| `key` | query | string |  | Filter by API key name Min length: 3 Max length: 15 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Activity data | `application/json` |
| `401` | Missing authentication |  |
| `404` | Workspace not found |  |
| `416` | Filter not available on current plan |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `[].date` | string |  | Date of activity |
| `[].data` | object[] |  |  |
| `[].data[].model` | string |  |  |
| `[].data[].total_tokens` | integer |  |  |
| `[].data[].total_cost_tomans` | number |  |  |
| `[].data[].request_count` | integer |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
[
  {
    "date": "string",
    "data": [
      {
        "model": "string",
        "total_tokens": 0,
        "total_cost_tomans": 0,
        "request_count": 0
      }
    ]
  }
]
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceID}/activity" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Model Limits

Model-specific limits within a workspace

### Get model limits

`GET /v1/workspaces/{workspaceID}/models/{modelID}/limits`

Gets the minimum balance and maximum tokens for a specific model within a workspace.
Only applies to chat completion models.

Operation ID: `getModelLimits`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |
| `modelID` | path | string | yes | The model ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Model limits | `application/json` |
| `401` | Missing authentication |  |
| `404` | Workspace or model not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `minimumBalance` | number |  | Minimum balance required (null if not a chat completion model) |
| `maximumToken` | integer |  | Maximum tokens allowed (null if not a chat completion model) |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "minimumBalance": 0,
  "maximumToken": 0
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/workspaces/{workspaceID}/models/{modelID}/limits" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
