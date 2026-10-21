# AI - Text to Speech

> Generated from [`specs/ai-tts.yaml`](../../specs/ai-tts.yaml) (source: https://developers.liara.ir/spec/ai-tts.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Text to Speech  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 1

## About

Text-to-speech API for generating audio from text using supported AI models.

Parameters:
- `workspaceID`: The ID of the workspace to use for billing and routing.

Authentication: API Key (Bearer token) sent via the `Authorization` header.

The generated audio is returned directly as binary data.

## Authentication

- `apiKey`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Text to Speech | `POST` | `/api/{workspaceID}/v1/audio/speech` | [Generate speech from text](#generate-speech-from-text) |

## Text to Speech

Generate speech audio from text using AI models

### Generate speech from text

`POST /api/{workspaceID}/v1/audio/speech`

Generates speech audio from the provided text using the specified
text-to-speech model.

The request is billed according to the selected model and the amount
of input text.

The generated audio is returned directly in the response body.

Operation ID: `createSpeech`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID used for billing and routing. |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `input` | string | yes | The text that should be converted into speech. The input must contain between 1 and 4096 characters. Min length: 1 Max length: 4096 Example: `"Hello, this is a text to speech test."` |
| `model` | string | yes | The text-to-speech model to use. The model must be one of the TTS models supported by the API. Example: `"fish-audio/s1"` |
| `voice` | string |  | Optional voice identifier supported by the selected TTS model. Example: `"default"` |
| `response_format` | string |  | The format of the generated audio. `pcm` is used by default. One of: `mp3`, `pcm` Default: `"pcm"` Example: `"pcm"` |
| `speed` | number (float) |  | The speed of the generated speech. Values must be between 0.25 and 4.0. Min: 0.25 Max: 4.0 Example: `1.0` |
| `input_references` | object \| object[] |  | Optional references that can be provided to the TTS model. References may contain either audio or text input. |
| `provider` | object |  | Optional provider-specific configuration. |
| `provider.options` | object |  | Provider-specific options passed to the selected TTS provider. |

Example:

```json
{
  "model": "fish-audio/s1",
  "input": "Hello, this is a text to speech test.",
  "voice": "default",
  "response_format": "pcm",
  "speed": 1.0
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successfully generated speech audio. | `audio/mpeg`, `audio/pcm` |
| `400` | Bad request. | `application/json` |
| `401` | Missing or invalid authentication. | `application/json` |
| `402` | Payment required - insufficient balance. | `application/json` |
| `403` | Forbidden - workspace is unavailable or access is denied. | `application/json` |
| `502` | TTS provider request failed. | `application/json` |
| `503` | Service unavailable. | `application/json` |

<details><summary>Response <code>200</code> example</summary>

```
string
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/{workspaceID}/v1/audio/speech" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "fish-audio/s1", "input": "Hello, this is a text to speech test.", "voice": "default", "response_format": "pcm", "speed": 1.0}'
```

---
