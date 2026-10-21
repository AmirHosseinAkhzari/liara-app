# AI - Image Generation

> Generated from [`specs/ai-image-generation.yaml`](../../specs/ai-image-generation.yaml) (source: https://developers.liara.ir/spec/ai-image-generation.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Image Generation  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 2

## About

Generate and edit images using AI models. Supports OpenAI and Google Gemini providers.

Parameters:
- `workspaceID`: The ID of the workspace to use for billing
- `teamID`: To access services in a team (query param or `x-teamid` header)

Authentication: API Key (Bearer token) sent via the `Authorization` header.

## Authentication

- `apiKey`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Image Generations | `POST` | `/api/{workspaceID}/v1/images/generations` | [Generate images](#generate-images) |
| Image Edits | `POST` | `/api/{workspaceID}/v1/images/edits` | [Edit images](#edit-images) |

## Image Generations

Generate images from text prompts

### Generate images

`POST /api/{workspaceID}/v1/images/generations`

Generates images from a text prompt. Supports models from OpenAI (gpt-image-1, gpt-image-2)
and Google Gemini (Gemini image models).

OpenAI models accept size values like `1024x1024`, `1536x1024`, `1024x1536`, or `auto`.
Gemini models accept aspect ratio values like `1:1`, `2:3`, `16:9`, etc.

Operation ID: `generateImage`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | yes | Text description of the desired image |
| `model` | string | yes | Image generation model ID. Supported models: - `google/gemini-2.5-flash-image` - `google/gemini-3-pro-image-preview` - `openai/gpt-image-2` - `openai/gpt-image-1.5` - `openai/gpt-image-1` - `openai/gpt-image-1-mini` Default: `"openai/gpt-image-1"` |
| `n` | number |  | Number of images to generate (1-10) |
| `size` | string |  | Image size. OpenAI: `auto`, `1024x1024`, `1536x1024`, `1024x1536`. Gemini: aspect ratios like `1:1`, `2:3`, `16:9`. |
| `quality` | string |  | Image quality. OpenAI: `auto`, `low`, `medium`, `high`. Gemini: `1K`, `2K`, `4K`. |
| `background` | string |  | Background setting |
| `moderation` | string |  | Content moderation level |
| `output_format` | string |  | Output image format One of: `png`, `jpeg`, `webp` |
| `output_compression` | number |  | Compression level for jpeg/webp |
| `partial_images` | number |  | Number of partial images for progressive loading |
| `response_format` | string |  | Response format (url or b64_json) |
| `stream` | boolean |  | Enable streaming |
| `style` | string |  | Image style |
| `user` | string |  | End-user identifier |

Example:

```json
{
  "prompt": "string",
  "model": "openai/gpt-image-1",
  "n": 0,
  "size": "string",
  "quality": "string",
  "background": "string",
  "moderation": "string",
  "output_format": "png",
  "output_compression": 0,
  "partial_images": 0,
  "response_format": "string",
  "stream": false,
  "style": "string",
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
| `id` | string |  | Log ID |
| `created` | integer (unix-timestamp) |  |  |
| `data` | object[] |  |  |
| `data[].url` | string (uri) |  | Image URL (when response_format is url) |
| `data[].b64_json` | string |  | Base64-encoded image data (when response_format is b64_json) |
| `data[].revised_prompt` | string |  | Revised prompt used by the model |
| `usage` | object |  |  |
| `usage.total_cost` | number |  | Total cost in USD |
| `usage.total_cost_toman` | number |  | Total cost in Tomans |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "id": "string",
  "created": 0,
  "data": [
    {
      "url": "string",
      "b64_json": "string",
      "revised_prompt": "string"
    }
  ],
  "usage": {
    "total_cost": 0,
    "total_cost_toman": 0
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/{workspaceID}/v1/images/generations" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "string", "model": "openai/gpt-image-1", "n": 0, "size": "string", "quality": "string", "background": "string", "moderation": "string", "output_format": "png", "output_compression": 0, "partial_images": 0, "response_format": "string", "stream": false, "style": "string", "user": "string"}'
```

---

## Image Edits

Edit existing images with prompts

### Edit images

`POST /api/{workspaceID}/v1/images/edits`

Edits an existing image based on a text prompt. Requires `multipart/form-data` content type.

Supports up to 16 input images. A mask image can be provided for inpainting operations.

Operation ID: `editImage`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID |

**Request body** — `multipart/form-data` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | string (binary)[] |  | Input image file(s) - up to 16 files |
| `prompt` | string |  | Text description of the desired edit |
| `model` | string |  | Image model ID (same as generations) |
| `mask` | string (binary) |  | Mask image for inpainting |
| `input_fidelity` | string |  | Input fidelity setting |
| `n` | number |  | Number of images to generate Default: `1` |
| `size` | string |  | Image size (same as generations) |
| `quality` | string |  | Image quality (same as generations) |
| `background` | string |  | Background setting |
| `output_format` | string |  | Output image format One of: `png`, `jpeg`, `webp` |
| `output_compression` | number |  | Compression level |
| `partial_images` | number |  | Number of partial images |
| `response_format` | string |  | Response format |
| `stream` | boolean |  | Enable streaming |
| `user` | string |  | End-user identifier |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful response | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `402` | Payment required |  |
| `503` | Service unavailable (feature disabled) |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string |  | Log ID |
| `created` | integer (unix-timestamp) |  |  |
| `data` | object[] |  |  |
| `data[].url` | string (uri) |  | Image URL (when response_format is url) |
| `data[].b64_json` | string |  | Base64-encoded image data (when response_format is b64_json) |
| `data[].revised_prompt` | string |  | Revised prompt used by the model |
| `usage` | object |  |  |
| `usage.total_cost` | number |  | Total cost in USD |
| `usage.total_cost_toman` | number |  | Total cost in Tomans |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "id": "string",
  "created": 0,
  "data": [
    {
      "url": "string",
      "b64_json": "string",
      "revised_prompt": "string"
    }
  ],
  "usage": {
    "total_cost": 0,
    "total_cost_toman": 0
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/{workspaceID}/v1/images/edits" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -F "image=<image>" \
  -F "prompt=<prompt>" \
  -F "model=<model>" \
  -F "mask=@./file" \
  -F "input_fidelity=<input_fidelity>" \
  -F "n=<n>" \
  -F "size=<size>" \
  -F "quality=<quality>" \
  -F "background=<background>" \
  -F "output_format=<output_format>" \
  -F "output_compression=<output_compression>" \
  -F "partial_images=<partial_images>" \
  -F "response_format=<response_format>" \
  -F "stream=<stream>" \
  -F "user=<user>"
```

---
