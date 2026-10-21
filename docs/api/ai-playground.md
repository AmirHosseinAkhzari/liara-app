# AI - Playground

> Generated from [`specs/ai-playground.yaml`](../../specs/ai-playground.yaml) (source: https://developers.liara.ir/spec/ai-playground.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Playground  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 4

## About

Playground endpoints for testing AI inference with JWT authentication and RBAC/DAC authorization.
These endpoints mirror the API key inference endpoints but require user-level permissions.

Required permissions: `ai.operate` or `ai.manage`

Parameters:
- `workspaceID`: The ID of the workspace to use
- `teamID`: To access services in a team (query param or `x-teamid` header)

Authentication: JWT Bearer token sent via the `Authorization` header.

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Playground Chat | `POST` | `/api/v1/{workspaceID}/playground/chat/completions` | [Playground chat completion](#playground-chat-completion) |
| Playground Chat | `GET` | `/api/v1/{workspaceID}/playground/models` | [Playground list models](#playground-list-models) |
| Playground Images | `POST` | `/api/v1/{workspaceID}/playground/images/generations` | [Playground image generation](#playground-image-generation) |
| Playground Images | `POST` | `/api/v1/{workspaceID}/playground/images/edits` | [Playground image edit](#playground-image-edit) |

## Playground Chat

Playground chat completion endpoints

### Playground chat completion

`POST /api/v1/{workspaceID}/playground/chat/completions`

Creates a chat completion in the playground. Requires `ai.operate` or `ai.manage` permission.
Uses the same request/response format as the API key chat completion endpoint.

Operation ID: `playgroundChatCompletion`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | yes | Model ID |
| `messages` | object[] | yes |  |
| `messages[].role` | string | yes | One of: `user`, `assistant`, `system`, `developer`, `tool` |
| `messages[].content` | string \| object[] |  |  |
| `stream` | boolean |  | Default: `false` |
| `temperature` | number |  |  |
| `max_tokens` | integer |  |  |
| `tools` | object[] |  |  |

Example:

```json
{
  "model": "string",
  "messages": [
    {
      "role": "user",
      "content": "string"
    }
  ],
  "stream": false,
  "temperature": 0,
  "max_tokens": 0,
  "tools": [
    {}
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful response (non-streaming) | `application/json` |
| `401` | Missing authentication |  |
| `403` | Forbidden - insufficient permissions or workspace frozen |  |
| `402` | Payment required |  |
| `503` | Service unavailable (feature disabled) |  |

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/v1/{workspaceID}/playground/chat/completions" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "string", "messages": [{"role": "user", "content": "string"}], "stream": false, "temperature": 0, "max_tokens": 0, "tools": [{}]}'
```

---

### Playground list models

`GET /api/v1/{workspaceID}/playground/models`

Lists available models in the playground. Requires `ai.operate` or `ai.manage` permission.
Returns models in OpenAI-compatible format.

Operation ID: `playgroundListModels`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | List of models | `application/json` |
| `401` | Missing authentication |  |
| `403` | Forbidden |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `object` | string |  | One of: `list` |
| `data` | object[] |  |  |
| `data[].id` | string |  |  |
| `data[].name` | string |  |  |
| `data[].context_length` | integer |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "object": "list",
  "data": [
    {
      "id": "string",
      "name": "string",
      "context_length": 0
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/api/v1/{workspaceID}/playground/models" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Playground Images

Playground image generation and editing endpoints

### Playground image generation

`POST /api/v1/{workspaceID}/playground/images/generations`

Generates images in the playground. Requires `ai.operate` or `ai.manage` permission.
Uses the same request/response format as the API key image generation endpoint.

Operation ID: `playgroundImageGeneration`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | yes |  |
| `model` | string | yes |  |
| `n` | number |  |  |
| `size` | string |  |  |
| `quality` | string |  |  |
| `output_format` | string |  | One of: `png`, `jpeg`, `webp` |

Example:

```json
{
  "prompt": "string",
  "model": "string",
  "n": 0,
  "size": "string",
  "quality": "string",
  "output_format": "png"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful response | `application/json` |
| `401` | Missing authentication |  |
| `403` | Forbidden |  |
| `503` | Service unavailable (feature disabled) |  |

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/v1/{workspaceID}/playground/images/generations" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "string", "model": "string", "n": 0, "size": "string", "quality": "string", "output_format": "png"}'
```

---

### Playground image edit

`POST /api/v1/{workspaceID}/playground/images/edits`

Edits images in the playground. Requires `ai.operate` or `ai.manage` permission.
Requires `multipart/form-data` content type.

Operation ID: `playgroundImageEdit`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `multipart/form-data` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | string (binary)[] |  |  |
| `prompt` | string |  |  |
| `model` | string |  |  |
| `mask` | string (binary) |  |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful response | `application/json` |
| `401` | Missing authentication |  |
| `403` | Forbidden |  |
| `503` | Service unavailable (feature disabled) |  |

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/v1/{workspaceID}/playground/images/edits" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -F "image=<image>" \
  -F "prompt=<prompt>" \
  -F "model=<model>" \
  -F "mask=@./file"
```

---
