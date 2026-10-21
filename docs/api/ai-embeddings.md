# AI - Embeddings

> Generated from [`specs/ai-embeddings.yaml`](../../specs/ai-embeddings.yaml) (source: https://developers.liara.ir/spec/ai-embeddings.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Embeddings  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 1

## About

Generate text embeddings using AI models. Compatible with OpenAI's embeddings API.

Parameters:
- `workspaceID`: The ID of the workspace to use for billing
- `teamID`: To access services in a team (query param or `x-teamid` header)

Authentication: API Key (Bearer token) sent via the `Authorization` header.

## Authentication

- `apiKey`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Embeddings | `POST` | `/api/{workspaceID}/v1/embeddings` | [Create embeddings](#create-embeddings) |

## Embeddings

Generate text embeddings

### Create embeddings

`POST /api/{workspaceID}/v1/embeddings`

Generates embeddings for the given input text. Supports single strings or arrays of strings.
Response includes token usage and cost information.

Operation ID: `createEmbedding`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `input` | string \| string[] | yes | Text or array of texts to embed |
| `model` | string | yes | Embedding model ID. Supported models: - `google/gemini-embedding-2` - `intfloat/multilingual-e5-large` - `google/gemini-embedding-001` - `openai/text-embedding-3-small` - `openai/text-embedding-3-large` - `openai/text-embedding-ada-002` Example: `"openai/text-embedding-3-small"` |
| `dimensions` | number |  | Output dimensions (model-dependent) |
| `encoding_format` | string |  | Encoding format for embeddings |
| `user` | string |  | End-user identifier |

Example:

```json
{
  "input": "string",
  "model": "openai/text-embedding-3-small",
  "dimensions": 0,
  "encoding_format": "string",
  "user": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful response | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `402` | Payment required - insufficient balance |  |
| `503` | Service unavailable (feature disabled) |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `object` | string |  | One of: `list` |
| `data` | object[] |  |  |
| `data[].object` | string |  | One of: `embedding` |
| `data[].embedding` | number[] |  |  |
| `data[].index` | integer |  |  |
| `model` | string |  | Model ID used |
| `usage` | object |  |  |
| `usage.prompt_tokens` | integer |  |  |
| `usage.total_tokens` | integer |  |  |
| `usage.total_cost_toman` | number |  | Total cost in Tomans |
| `usage.total_cost` | number |  | Total cost in USD |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [
        0
      ],
      "index": 0
    }
  ],
  "model": "string",
  "usage": {
    "prompt_tokens": 0,
    "total_tokens": 0,
    "total_cost_toman": 0,
    "total_cost": 0
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/{workspaceID}/v1/embeddings" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": "string", "model": "openai/text-embedding-3-small", "dimensions": 0, "encoding_format": "string", "user": "string"}'
```

---
