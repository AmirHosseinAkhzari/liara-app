# AI - Chat Completions

> Generated from [`specs/ai-chat-completions.yaml`](../../specs/ai-chat-completions.yaml) (source: https://developers.liara.ir/spec/ai-chat-completions.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Chat Completions  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 2

## About

OpenAI-compatible chat completion endpoints for AI inference with support for streaming, tool calling, and multi-modal inputs.

Parameters:
- `workspaceID`: The ID of the workspace to use for billing and routing
- `teamID`: To access services in a team (query param or `x-teamid` header)

Authentication: API Key (Bearer token) sent via the `Authorization` header.

## Authentication

- `apiKey`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Chat Completions | `POST` | `/api/{workspaceID}/v1/chat/completions` | [Create a chat completion](#create-a-chat-completion) |
| Models | `GET` | `/api/{workspaceID}/v1/models` | [List available models](#list-available-models) |

## Chat Completions

Generate chat completions with various AI models

### Create a chat completion

`POST /api/{workspaceID}/v1/chat/completions`

Creates a model response for the given conversation. Supports streaming via SSE,
tool calling, and multi-modal input (text, images, files).

Operation ID: `createChatCompletion`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | yes | Model ID Example: `"openai/gpt-5"` |
| `messages` | object[] | yes | Array of conversation messages |
| `messages[].role` | string | yes | One of: `user`, `assistant`, `system`, `developer`, `tool` |
| `messages[].content` | string \| object \| object \| object[] |  |  |
| `messages[].name` | string |  | Name of the participant |
| `messages[].tool_calls` | object[] |  | Tool calls made by the assistant |
| `messages[].tool_call_id` | string |  | ID of the tool call this message responds to |
| `messages[].refusal` | string |  | Refusal message from the assistant |
| `stream` | boolean |  | Enable SSE streaming Default: `false` |
| `stream_options` | object |  |  |
| `stream_options.include_usage` | boolean |  | Include usage stats in streaming response |
| `max_tokens` | integer |  | Maximum tokens to generate |
| `max_completion_tokens` | integer |  | Maximum completion tokens (OpenAI-style) |
| `temperature` | number |  | Sampling temperature (0-2) |
| `top_p` | number |  | Nucleus sampling parameter |
| `top_k` | number |  | Top-K sampling parameter |
| `frequency_penalty` | number |  | Frequency penalty (-2 to 2) |
| `presence_penalty` | number |  | Presence penalty (-2 to 2) |
| `repetition_penalty` | number |  | Repetition penalty |
| `seed` | integer |  | Random seed for deterministic output |
| `n` | integer |  | Number of completions to generate Min: 1 |
| `stop` | string \| string[] |  | Stop sequences |
| `logit_bias` | object |  | Token ID to bias mapping |
| `logprobs` | boolean |  | Return log probabilities |
| `top_logprobs` | integer |  | Number of top log probabilities to return |
| `min_p` | number |  | Minimum probability parameter |
| `top_a` | number |  | Top-A sampling parameter |
| `reasoning` | object |  | Reasoning configuration |
| `reasoning_effort` | string |  | Reasoning effort level |
| `modalities` | string[] |  | Output modalities One of: `image`, `text` |
| `functions` | object[] |  | Legacy function definitions |
| `tools` | object[] |  | Tool definitions for function calling |
| `tool_choice` | string \| object |  |  |
| tool_choice — *option 2* | object |  |  |
| `tool_choice.type` | string |  | One of: `function` |
| `tool_choice.function` | object |  |  |
| `tool_choice.function.name` | string |  |  |
| `parallel_tool_calls` | boolean |  | Allow parallel tool calls Default: `true` |
| `response_format` | object |  | Response format specification |
| `prediction` | object |  | Predicted output for latency optimization |
| `metadata` | any |  | Additional metadata |
| `store` | boolean |  | Store the completion |
| `service_tier` | string |  | Service tier |
| `user` | string |  | End-user identifier |

Example:

```json
{
  "model": "openai/gpt-5",
  "messages": [
    {
      "role": "user",
      "content": "string",
      "name": "string",
      "tool_calls": [
        {}
      ],
      "tool_call_id": "string",
      "refusal": "string"
    }
  ],
  "stream": false,
  "stream_options": {
    "include_usage": false
  },
  "max_tokens": 0,
  "max_completion_tokens": 0,
  "temperature": 0,
  "top_p": 0,
  "top_k": 0,
  "frequency_penalty": 0,
  "presence_penalty": 0,
  "repetition_penalty": 0,
  "seed": 0,
  "n": 0,
  "stop": "string",
  "logit_bias": {},
  "logprobs": false,
  "top_logprobs": 0,
  "min_p": 0,
  "top_a": 0,
  "reasoning": {},
  "reasoning_effort": "string",
  "modalities": [
    "image"
  ],
  "functions": [
    {}
  ],
  "tools": [
    {}
  ],
  "tool_choice": "none",
  "parallel_tool_calls": true,
  "response_format": {},
  "prediction": {},
  "metadata": null,
  "store": false,
  "service_tier": "string",
  "user": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful response (non-streaming) | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `402` | Payment required - insufficient balance |  |
| `403` | Forbidden - workspace frozen or key disabled |  |
| `503` | Service unavailable (feature disabled) |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string |  | Log ID |
| `model` | string |  | Model ID used |
| `object` | string |  | One of: `chat.completion` |
| `created` | integer (unix-timestamp) |  |  |
| `choices` | object[] |  |  |
| `choices[].index` | integer |  |  |
| `choices[].message` | object |  |  |
| `choices[].message.role` | string | yes | One of: `user`, `assistant`, `system`, `developer`, `tool` |
| `choices[].message.content` | string \| object \| object \| object[] |  |  |
| `choices[].message.name` | string |  | Name of the participant |
| `choices[].message.tool_calls` | object[] |  | Tool calls made by the assistant |
| `choices[].message.tool_call_id` | string |  | ID of the tool call this message responds to |
| `choices[].message.refusal` | string |  | Refusal message from the assistant |
| `choices[].finish_reason` | string |  |  |
| `usage` | object |  |  |
| `usage.prompt_tokens` | integer |  |  |
| `usage.completion_tokens` | integer |  |  |
| `usage.total_tokens` | integer |  |  |
| `usage.total_cost_toman` | number |  |  |
| `usage.total_cost` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "id": "string",
  "model": "string",
  "object": "chat.completion",
  "created": 0,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "user",
        "content": "string",
        "name": "string",
        "tool_calls": [
          {}
        ],
        "tool_call_id": "string",
        "refusal": "string"
      },
      "finish_reason": "string"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0,
    "total_cost_toman": 0,
    "total_cost": 0
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/{workspaceID}/v1/chat/completions" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-5", "messages": [{"role": "user", "content": "string", "name": "string", "tool_calls": [{}], "tool_call_id": "string", "refusal": "string"}], "stream": false, "stream_options": {"include_usage": false}, "max_tokens": 0, "max_completion_tokens": 0, "temperature": 0, "top_p": 0, "top_k": 0, "frequency_penalty": 0, "presence_penalty": 0, "repetition_penalty": 0, "seed": 0, "n": 0, "stop": "string", "logit_bias": {}, "logprobs": false, "top_logprobs": 0, "min_p": 0, "top_a": 0, "reasoning": {}, "reasoning_effort": "string", "modalities": ["image"], "functions": [{}], "tools": [{}], "tool_choice": "none", "parallel_tool_calls": true, "response_format": {}, "prediction": {}, "metadata": null, "store": false, "service_tier": "string", "user": "string"}'
```

---

## Models

List available AI models for inference

### List available models

`GET /api/{workspaceID}/v1/models`

Lists all AI models available for inference in an OpenAI-compatible format.

Operation ID: `listInferenceModels`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | List of models | `application/json` |
| `401` | Missing authentication |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `object` | string |  | One of: `list` |
| `data` | object[] |  |  |
| `data[].id` | string |  | Model ID |
| `data[].name` | string |  | Display name |
| `data[].description` | string |  |  |
| `data[].context_length` | integer |  |  |
| `data[].architecture` | object |  |  |
| `data[].architecture.input_modalities` | string[] |  |  |
| `data[].architecture.output_modalities` | string[] |  |  |
| `data[].pricing` | object |  |  |
| `data[].pricing.prompt` | string |  |  |
| `data[].pricing.completion` | string |  |  |
| `data[].top_provider` | object |  |  |
| `data[].top_provider.context_length` | integer |  |  |
| `data[].top_provider.max_completion_tokens` | integer |  |  |
| `data[].supported_parameters` | string[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "object": "list",
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "context_length": 0,
      "architecture": {
        "input_modalities": [
          "string"
        ],
        "output_modalities": [
          "string"
        ]
      },
      "pricing": {
        "prompt": "string",
        "completion": "string"
      },
      "top_provider": {
        "context_length": 0,
        "max_completion_tokens": 0
      },
      "supported_parameters": [
        "string"
      ]
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://ai.liara.ir/api/{workspaceID}/v1/models" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
