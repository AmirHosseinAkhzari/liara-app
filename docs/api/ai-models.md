# AI - Model Catalog

> Generated from [`specs/ai-models.yaml`](../../specs/ai-models.yaml) (source: https://developers.liara.ir/spec/ai-models.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Models  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 3

## About

Public model catalog for browsing available AI models. No authentication required.

Browse, search, and filter models by provider, modality, pricing, context length, and more.

## Authentication

- No auth scheme declared in the spec (public endpoints).

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Model Catalog V1 | `GET` | `/v1/models` | [List all models](#list-all-models) |
| Model Catalog V1 | `GET` | `/v1/models/{modelID}` | [Get a model](#get-a-model) |
| Model Catalog V2 | `GET` | `/v2/models` | [List models with filters](#list-models-with-filters) |

## Model Catalog V1

Basic model listing

### List all models

`GET /v1/models`

Returns all available AI models with full details. No authentication required.

Operation ID: `listModels`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | List of all models | `application/json` |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `models` | object[] |  |  |
| `models[].id` | string |  | Model ID (e.g. openai/gpt-5) |
| `models[].name` | string |  | Display name |
| `models[].description` | string |  |  |
| `models[].cutoff_date` | string (date) |  |  |
| `models[].context_length` | integer |  | Maximum context length in tokens |
| `models[].architecture` | object |  |  |
| `models[].architecture.modality` | string |  |  |
| `models[].architecture.input_modalities` | string[] |  |  |
| `models[].architecture.output_modalities` | string[] |  |  |
| `models[].architecture.tokenizer` | string |  |  |
| `models[].architecture.instruct_type` | string |  |  |
| `models[].pricing` | object |  |  |
| `models[].pricing.cost` | string |  |  |
| `models[].pricing.prompt` | string |  | Input price per token (USD string) |
| `models[].pricing.completion` | string |  | Output price per token (USD string) |
| `models[].pricing.request` | string |  |  |
| `models[].pricing.image` | string |  |  |
| `models[].pricing.web_search` | string |  |  |
| `models[].pricing.internal_reasoning` | string |  |  |
| `models[].pricing.input_cache_read` | string |  |  |
| `models[].pricing.input_cache_read_image` | string |  |  |
| `models[].pricing.image_generation` | string |  |  |
| `models[].pricing.image_type` | string |  |  |
| `models[].pricing.image_details` | object |  |  |
| `models[].top_provider` | object |  |  |
| `models[].top_provider.context_length` | integer |  |  |
| `models[].top_provider.max_completion_tokens` | integer |  |  |
| `models[].top_provider.is_moderated` | boolean |  |  |
| `models[].supported_parameters` | string[] |  |  |
| `models[].features` | object |  |  |
| `models[].features.structured_outputs` | boolean |  |  |
| `models[].features.function_calling` | boolean |  |  |
| `models[].features.tuning` | boolean |  |  |
| `models[].features.streaming` | boolean |  |  |
| `models[].speed` | number |  |  |
| `models[].endpoints` | object[] |  |  |
| `models[].endpoints[].title` | string |  |  |
| `models[].endpoints[].route` | string |  |  |
| `models[].reasoning` | boolean |  | Whether the model supports reasoning |
| `models[].tags` | string[] |  | One of: `featured`, `reasoning`, `flagship`, `cost-optimized`, `realtime`, `tool-specific`, `embeddings`, `moderation`, `images` |
| `models[].created` | integer (unix-timestamp) |  |  |
| `models[].provider` | string |  | Provider name |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "models": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "cutoff_date": "string",
      "context_length": 0,
      "architecture": {
        "modality": "string",
        "input_modalities": [
          "string"
        ],
        "output_modalities": [
          "string"
        ],
        "tokenizer": "string",
        "instruct_type": "string"
      },
      "pricing": {
        "cost": "string",
        "prompt": "string",
        "completion": "string",
        "request": "string",
        "image": "string",
        "web_search": "string",
        "internal_reasoning": "string",
        "input_cache_read": "string",
        "input_cache_read_image": "string",
        "image_generation": "string",
        "image_type": "string",
        "image_details": {}
      },
      "top_provider": {
        "context_length": 0,
        "max_completion_tokens": 0,
        "is_moderated": false
      },
      "supported_parameters": [
        "string"
      ],
      "features": {
        "structured_outputs": false,
        "function_calling": false,
        "tuning": false,
        "streaming": false
      },
      "speed": 0,
      "endpoints": [
        {
          "title": "string",
          "route": "string"
        }
      ],
      "reasoning": false,
      "tags": [
        "featured"
      ],
      "created": 0,
      "provider": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/models"
```

---

### Get a model

`GET /v1/models/{modelID}`

Gets a single model by its ID. No authentication required.

Operation ID: `getModel`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `modelID` | path | string | yes | The model ID (MongoDB ObjectID) |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Model details | `application/json` |
| `404` | Model not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | object |  |  |
| `model.id` | string |  | Model ID (e.g. openai/gpt-5) |
| `model.name` | string |  | Display name |
| `model.description` | string |  |  |
| `model.cutoff_date` | string (date) |  |  |
| `model.context_length` | integer |  | Maximum context length in tokens |
| `model.architecture` | object |  |  |
| `model.architecture.modality` | string |  |  |
| `model.architecture.input_modalities` | string[] |  |  |
| `model.architecture.output_modalities` | string[] |  |  |
| `model.architecture.tokenizer` | string |  |  |
| `model.architecture.instruct_type` | string |  |  |
| `model.pricing` | object |  |  |
| `model.pricing.cost` | string |  |  |
| `model.pricing.prompt` | string |  | Input price per token (USD string) |
| `model.pricing.completion` | string |  | Output price per token (USD string) |
| `model.pricing.request` | string |  |  |
| `model.pricing.image` | string |  |  |
| `model.pricing.web_search` | string |  |  |
| `model.pricing.internal_reasoning` | string |  |  |
| `model.pricing.input_cache_read` | string |  |  |
| `model.pricing.input_cache_read_image` | string |  |  |
| `model.pricing.image_generation` | string |  |  |
| `model.pricing.image_type` | string |  |  |
| `model.pricing.image_details` | object |  |  |
| `model.top_provider` | object |  |  |
| `model.top_provider.context_length` | integer |  |  |
| `model.top_provider.max_completion_tokens` | integer |  |  |
| `model.top_provider.is_moderated` | boolean |  |  |
| `model.supported_parameters` | string[] |  |  |
| `model.features` | object |  |  |
| `model.features.structured_outputs` | boolean |  |  |
| `model.features.function_calling` | boolean |  |  |
| `model.features.tuning` | boolean |  |  |
| `model.features.streaming` | boolean |  |  |
| `model.speed` | number |  |  |
| `model.endpoints` | object[] |  |  |
| `model.endpoints[].title` | string |  |  |
| `model.endpoints[].route` | string |  |  |
| `model.reasoning` | boolean |  | Whether the model supports reasoning |
| `model.tags` | string[] |  | One of: `featured`, `reasoning`, `flagship`, `cost-optimized`, `realtime`, `tool-specific`, `embeddings`, `moderation`, `images` |
| `model.created` | integer (unix-timestamp) |  |  |
| `model.provider` | string |  | Provider name |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "model": {
    "id": "string",
    "name": "string",
    "description": "string",
    "cutoff_date": "string",
    "context_length": 0,
    "architecture": {
      "modality": "string",
      "input_modalities": [
        "string"
      ],
      "output_modalities": [
        "string"
      ],
      "tokenizer": "string",
      "instruct_type": "string"
    },
    "pricing": {
      "cost": "string",
      "prompt": "string",
      "completion": "string",
      "request": "string",
      "image": "string",
      "web_search": "string",
      "internal_reasoning": "string",
      "input_cache_read": "string",
      "input_cache_read_image": "string",
      "image_generation": "string",
      "image_type": "string",
      "image_details": {}
    },
    "top_provider": {
      "context_length": 0,
      "max_completion_tokens": 0,
      "is_moderated": false
    },
    "supported_parameters": [
      "string"
    ],
    "features": {
      "structured_outputs": false,
      "function_calling": false,
      "tuning": false,
      "streaming": false
    },
    "speed": 0,
    "endpoints": [
      {
        "title": "string",
        "route": "string"
      }
    ],
    "reasoning": false,
    "tags": [
      "featured"
    ],
    "created": 0,
    "provider": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v1/models/{modelID}"
```

---

## Model Catalog V2

Filtered, sorted, and paginated model listing

### List models with filters

`GET /v2/models`

Returns paginated model list with filtering, sorting, and search capabilities.
No authentication required. Page size is 20.

Operation ID: `listModelsFiltered`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `search` | query | string |  | Search models by name (regex match) Max length: 100 |
| `sort` | query | string |  | Sort order One of: `newest`, `price_input_low`, `price_input_high`, `context_length` Default: `"newest"` |
| `input_modalities` | query | string \| string[] |  | Filter by input modalities |
| `output_modalities` | query | string \| string[] |  | Filter by output modalities |
| `context_length_min` | query | integer |  | Minimum context length |
| `context_length_max` | query | integer |  | Maximum context length |
| `input_price_min` | query | number |  | Minimum input price (per token, USD) |
| `input_price_max` | query | number |  | Maximum input price (per token, USD) |
| `providers` | query | string \| string[] |  | Filter by provider prefix (e.g. anthropic, openai) |
| `supported_params` | query | string \| string[] |  | Filter by supported parameters |
| `page` | query | integer |  | Page number (1-based) Default: `1` Min: 1 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Filtered and paginated model list | `application/json` |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `models` | object[] |  |  |
| `models[].id` | string |  | Model ID (e.g. openai/gpt-5) |
| `models[].name` | string |  | Display name |
| `models[].description` | string |  |  |
| `models[].cutoff_date` | string (date) |  |  |
| `models[].context_length` | integer |  | Maximum context length in tokens |
| `models[].architecture` | object |  |  |
| `models[].architecture.modality` | string |  |  |
| `models[].architecture.input_modalities` | string[] |  |  |
| `models[].architecture.output_modalities` | string[] |  |  |
| `models[].architecture.tokenizer` | string |  |  |
| `models[].architecture.instruct_type` | string |  |  |
| `models[].pricing` | object |  |  |
| `models[].pricing.cost` | string |  |  |
| `models[].pricing.prompt` | string |  | Input price per token (USD string) |
| `models[].pricing.completion` | string |  | Output price per token (USD string) |
| `models[].pricing.request` | string |  |  |
| `models[].pricing.image` | string |  |  |
| `models[].pricing.web_search` | string |  |  |
| `models[].pricing.internal_reasoning` | string |  |  |
| `models[].pricing.input_cache_read` | string |  |  |
| `models[].pricing.input_cache_read_image` | string |  |  |
| `models[].pricing.image_generation` | string |  |  |
| `models[].pricing.image_type` | string |  |  |
| `models[].pricing.image_details` | object |  |  |
| `models[].top_provider` | object |  |  |
| `models[].top_provider.context_length` | integer |  |  |
| `models[].top_provider.max_completion_tokens` | integer |  |  |
| `models[].top_provider.is_moderated` | boolean |  |  |
| `models[].supported_parameters` | string[] |  |  |
| `models[].features` | object |  |  |
| `models[].features.structured_outputs` | boolean |  |  |
| `models[].features.function_calling` | boolean |  |  |
| `models[].features.tuning` | boolean |  |  |
| `models[].features.streaming` | boolean |  |  |
| `models[].speed` | number |  |  |
| `models[].endpoints` | object[] |  |  |
| `models[].endpoints[].title` | string |  |  |
| `models[].endpoints[].route` | string |  |  |
| `models[].reasoning` | boolean |  | Whether the model supports reasoning |
| `models[].tags` | string[] |  | One of: `featured`, `reasoning`, `flagship`, `cost-optimized`, `realtime`, `tool-specific`, `embeddings`, `moderation`, `images` |
| `models[].created` | integer (unix-timestamp) |  |  |
| `models[].provider` | string |  | Provider name |
| `page` | integer |  | Current page number |
| `limit` | integer |  | Page size (always 20) |
| `total` | integer |  | Total number of matching models |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "models": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "cutoff_date": "string",
      "context_length": 0,
      "architecture": {
        "modality": "string",
        "input_modalities": [
          "string"
        ],
        "output_modalities": [
          "string"
        ],
        "tokenizer": "string",
        "instruct_type": "string"
      },
      "pricing": {
        "cost": "string",
        "prompt": "string",
        "completion": "string",
        "request": "string",
        "image": "string",
        "web_search": "string",
        "internal_reasoning": "string",
        "input_cache_read": "string",
        "input_cache_read_image": "string",
        "image_generation": "string",
        "image_type": "string",
        "image_details": {}
      },
      "top_provider": {
        "context_length": 0,
        "max_completion_tokens": 0,
        "is_moderated": false
      },
      "supported_parameters": [
        "string"
      ],
      "features": {
        "structured_outputs": false,
        "function_calling": false,
        "tuning": false,
        "streaming": false
      },
      "speed": 0,
      "endpoints": [
        {
          "title": "string",
          "route": "string"
        }
      ],
      "reasoning": false,
      "tags": [
        "featured"
      ],
      "created": 0,
      "provider": "string"
    }
  ],
  "page": 0,
  "limit": 0,
  "total": 0
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/v2/models"
```

---
