# AI - API Keys

> Generated from [`specs/ai-keys.yaml`](../../specs/ai-keys.yaml) (source: https://developers.liara.ir/spec/ai-keys.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - API Keys  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 4

## About

Manage API keys for AI workspace access. API keys are used to authenticate inference
requests (chat completions, embeddings, image generation).

Parameters:
- `teamID`: To access services in a team (query param or `x-teamid` header)

Authentication: JWT Bearer token sent via the `Authorization` header.

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| API Keys | `GET` | `/v1/keys` | [List API keys](#list-api-keys) |
| API Keys | `POST` | `/v1/keys` | [Create an API key](#create-an-api-key) |
| API Keys | `PUT` | `/v1/keys/{keyID}` | [Update an API key](#update-an-api-key) |
| API Keys | `DELETE` | `/v1/keys/{keyID}` | [Delete an API key](#delete-an-api-key) |

## API Keys

Manage API keys for AI inference

### List API keys

`GET /v1/keys`

Lists all API keys owned by the authenticated user, including workspace associations.

Operation ID: `listKeys`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `teamID` | query | string |  | Team ID for team-scoped keys |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | List of API keys | `application/json` |
| `401` | Missing authentication |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `[]._id` | string |  |  |
| `[].name` | string |  |  |
| `[].enabled` | boolean |  |  |
| `[].workspaces` | object[] |  |  |
| `[].workspaces[]._id` | string |  |  |
| `[].workspaces[].name` | string |  |  |
| `[].createdBy` | object |  |  |
| `[].createdBy.fullname` | string |  |  |
| `[].lastUsedAt` | string (date-time) |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
[
  {
    "_id": "string",
    "name": "string",
    "enabled": false,
    "workspaces": [
      {
        "_id": "string",
        "name": "string"
      }
    ],
    "createdBy": {
      "fullname": "string"
    },
    "lastUsedAt": "string"
  }
]
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/keys" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create an API key

`POST /v1/keys`

Creates a new API key associated with one or more workspaces.
The response includes the key token which is only shown once upon creation.

Operation ID: `createKey`

Auth: `jwt`

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Unique name for the API key Min length: 3 Max length: 15 |
| `workspaces` | string[] | yes | Array of workspace names to associate with this key |

Example:

```json
{
  "name": "string",
  "workspaces": [
    "string"
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | API key created | `application/json` |
| `400` | Bad request - at least one workspace must be selected |  |
| `401` | Missing authentication |  |
| `409` | Conflict - key name already exists |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string |  |  |
| `enabled` | boolean |  |  |
| `workspaces` | object[] |  |  |
| `workspaces[]._id` | string |  |  |
| `workspaces[].name` | string |  |  |
| `key` | string |  | The JWT token for this API key (only shown once) |
| `createdBy` | object |  |  |
| `createdBy.fullname` | string |  |  |
| `_id` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "name": "string",
  "enabled": false,
  "workspaces": [
    {
      "_id": "string",
      "name": "string"
    }
  ],
  "key": "string",
  "createdBy": {
    "fullname": "string"
  },
  "_id": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/v1/keys" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "workspaces": ["string"]}'
```

---

### Update an API key

`PUT /v1/keys/{keyID}`

Updates an API key's name, workspaces, or enabled status.

Operation ID: `updateKey`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `keyID` | path | string | yes | The API key ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string |  | New name for the API key Min length: 3 Max length: 15 |
| `workspaces` | string[] |  | New array of workspace names |
| `enabled` | boolean |  | Enable or disable the API key |

Example:

```json
{
  "name": "string",
  "workspaces": [
    "string"
  ],
  "enabled": false
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Key updated | `application/json` |
| `401` | Missing authentication |  |
| `404` | Key not found |  |
| `409` | Conflict - workspace does not exist |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  | Example: `"key updated."` |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "message": "key updated."
}
```

</details>

**Example request**

```bash
curl -X PUT "https://ai.liara.ir/v1/keys/{keyID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "workspaces": ["string"], "enabled": false}'
```

---

### Delete an API key

`DELETE /v1/keys/{keyID}`

Soft-deletes an API key. The key will be marked as deleted but not permanently removed.

Operation ID: `deleteKey`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `keyID` | path | string | yes | The API key ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | Key deleted |  |
| `401` | Missing authentication |  |
| `404` | Key not found |  |

**Example request**

```bash
curl -X DELETE "https://ai.liara.ir/v1/keys/{keyID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
