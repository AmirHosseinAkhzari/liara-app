# AI - Speech to Text

> Generated from [`specs/ai-stt.yaml`](../../specs/ai-stt.yaml) (source: https://developers.liara.ir/spec/ai-stt.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** AI - Audio Transcriptions  
**Version:** 1.0.0  
**Base URL:** `https://ai.liara.ir`  
**Endpoints:** 1

## About

Audio transcription API for converting audio into text using supported
speech-to-text AI models.

The API supports both JSON and multipart/form-data requests.

For JSON requests, the audio must be provided as a Base64-encoded value
in the `input_audio` field.

For multipart/form-data requests, the audio file must be provided in
the `file` field.

Parameters:
- `workspaceID`: The ID of the workspace to use for billing and routing.

Authentication: API Key (Bearer token) sent via the `Authorization` header.

The transcription result is returned as a JSON object.

## Authentication

- `apiKey`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Audio Transcriptions | `POST` | `/api/{workspaceID}/v1/audio/transcriptions` | [Transcribe audio](#transcribe-audio) |

## Audio Transcriptions

Transcribe audio into text using AI models

### Transcribe audio

`POST /api/{workspaceID}/v1/audio/transcriptions`

Transcribes the provided audio using the specified speech-to-text
model.

The API accepts audio in either JSON or multipart/form-data format.

For JSON requests, provide the audio as a Base64-encoded string
through the `input_audio.data` field and specify the audio format
through `input_audio.format`.

For multipart/form-data requests, upload the audio file using the
`file` field.

The request is billed according to the selected speech-to-text model
and the usage associated with the transcription request.

Operation ID: `createTranscription`

Auth: `apiKey`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `workspaceID` | path | string | yes | The workspace ID used for billing and routing. |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | yes | The speech-to-text model to use. The model must be one of the speech-to-text models supported by the API. Example: `"openai/whisper-1"` |
| `input_audio` | object | yes | Audio data provided as a Base64-encoded string. This object is used for JSON requests. Multipart requests should provide the audio through the `file` field instead. |
| `input_audio.data` | string (byte) | yes | Base64-encoded audio data. The encoded audio must use one of the supported formats: WAV, MP3, FLAC, M4A, OGG, WebM, or AAC. Example: `"UklGRiQAAABXQVZFZm10IBAAAAABAAEA..."` |
| `input_audio.format` | string | yes | The format of the Base64-encoded audio data. One of: `wav`, `mp3`, `flac`, `m4a`, `ogg`, `webm`, `aac` Example: `"wav"` |
| `language` | string |  | The language of the input audio. Must be a two-letter ISO-639-1 language code. If omitted, the model may automatically detect the language. Min length: 2 Max length: 2 Example: `"en"` |
| `response_format` | string |  | The format of the transcription response. `json` returns the standard transcription response. `verbose_json` returns additional transcription information, such as language, duration, and timestamp information when supported by the selected model. One of: `json`, `verbose_json` Default: `"json"` Example: `"json"` |
| `temperature` | number (float) |  | Sampling temperature used during transcription. Values must be between 0 and 1. Min: 0 Max: 1 Example: `0` |
| `timestamp_granularities` | string[] |  | Specifies the timestamp granularities to include in the transcription response. Supported values are `word` and `segment`. One of: `word`, `segment` |

Example:

```json
{
  "model": "openai/whisper-1",
  "input_audio": {
    "data": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
    "format": "wav"
  },
  "language": "en",
  "response_format": "json",
  "temperature": 0,
  "timestamp_granularities": [
    "segment"
  ]
}
```

**Request body** — `multipart/form-data` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | string | yes | The speech-to-text model to use. The model must be one of the speech-to-text models supported by the API. Example: `"openai/whisper-1"` |
| `file` | string (binary) | yes | The audio file to transcribe. The file must be provided using the `file` field. Supported audio formats are: WAV, MP3, FLAC, M4A, OGG, WebM, and AAC. |
| `language` | string |  | The language of the input audio. Must be a two-letter ISO-639-1 language code. Min length: 2 Max length: 2 Example: `"en"` |
| `response_format` | string |  | The format of the transcription response. `json` returns the standard transcription response. `verbose_json` returns additional transcription information. One of: `json`, `verbose_json` Default: `"json"` Example: `"json"` |
| `temperature` | number (float) |  | Sampling temperature used during transcription. Values must be between 0 and 1. Min: 0 Max: 1 Example: `0` |
| `timestamp_granularities` | string |  | Specifies the timestamp granularities to include in the transcription response. For multipart/form-data requests, multiple values must be provided as a comma-separated string. Supported values are `word` and `segment`. Example: `word,segment` Example: `"word,segment"` |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successfully transcribed the audio. | `application/json` |
| `400` | Bad request. | `application/json` |
| `401` | Missing or invalid authentication. | `application/json` |
| `402` | Payment required - insufficient balance. | `application/json` |
| `403` | Forbidden - workspace is unavailable or access is denied. | `application/json` |
| `502` | Speech-to-text provider request failed. | `application/json` |
| `503` | Service unavailable. | `application/json` |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string |  | The transcribed text. Example: `"Hello, this is a transcription test."` |
| `task` | string |  | The transcription task. Example: `"transcribe"` |
| `language` | string |  | Detected or requested language. Example: `"english"` |
| `duration` | number (float) |  | Duration of the input audio in seconds. Example: `3.52` |
| `segments` | object[] |  | Transcription segments with timing information. Available when supported by the selected model and when requested through `timestamp_granularities`. |
| `segments[].id` | integer |  | Segment identifier. Example: `0` |
| `segments[].start` | number (float) |  | Start time of the segment in seconds. Example: `0` |
| `segments[].end` | number (float) |  | End time of the segment in seconds. Example: `3.52` |
| `segments[].text` | string |  | Transcribed text for the segment. Example: `"Hello, this is a transcription test."` |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "text": "Hello, this is a transcription test."
}
```

</details>

**Example request**

```bash
curl -X POST "https://ai.liara.ir/api/{workspaceID}/v1/audio/transcriptions" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/whisper-1", "input_audio": {"data": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...", "format": "wav"}, "language": "en", "response_format": "json", "temperature": 0, "timestamp_granularities": ["segment"]}'
```

---
