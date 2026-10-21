# File Browser (Disks)

> Generated from [`specs/file-browser.yaml`](../../specs/file-browser.yaml) (source: https://developers.liara.ir/spec/file-browser.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** Liara File Browser API Documentaion  
**Version:** 1.0.0  
**Base URL:** `https://{filebrowser-url}`  
**Endpoints:** 9

> The base URL contains a variable assigned per resource by Liara (see the console / the related service's info endpoint).

## About

For managing files in your disks

Parameters:
- `teamID`: To access services in a team

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`
- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Disks | `GET` | `/v1/projects/{projectID}/disks/{diskName}/list` | [Get list from FileBrowser](#get-list-from-filebrowser) |
| Disks | `GET` | `/v1/projects/{projectID}/disks/{diskName}/search` | [Search file or dir in FileBrowser](#search-file-or-dir-in-filebrowser) |
| Disks | `GET` | `/v1/projects/{projectID}/disks/{diskName}/serve` | [Serve file from FileBrowser](#serve-file-from-filebrowser) |
| Disks | `POST` | `/v1/projects/{projectID}/disks/{diskName}/createLink` | [Create link for file in FileBrowser](#create-link-for-file-in-filebrowser) |
| Disks | `POST` | `/v1/projects/{projectID}/disks/{diskName}/rename` | [Rename file or dir in FileBrowser](#rename-file-or-dir-in-filebrowser) |
| Disks | `POST` | `/v1/projects/{projectID}/disks/{diskName}/create` | [Create file or dir in FileBrowser](#create-file-or-dir-in-filebrowser) |
| Disks | `POST` | `/v1/projects/{projectID}/disks/{diskName}/extract` | [Extract file in FileBrowser](#extract-file-in-filebrowser) |
| Disks | `POST` | `/v1/projects/{projectID}/disks/{diskName}/upload` | [Upload file in FileBrowser](#upload-file-in-filebrowser) |
| Disks | `DELETE` | `/v1/projects/{projectID}/disks/{diskName}/delete` | [Delete file or dir in FileBrowser](#delete-file-or-dir-in-filebrowser) |

## Disks

Everything about your File Browser in Disks

### Get list from FileBrowser

`GET /v1/projects/{projectID}/disks/{diskName}/list`

Operation ID: `getList`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |
| `sortType` | query | string |  | The sortType for pagination. valid values:["name", "size", "modTime"] |
| `sortDirection` | query | string |  | The sortDirection for pagination. valid values:["asc", "desc"] |
| `page` | query | number |  | The page for pagination. min 1 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `items` | object[] |  |  |
| `items[].path` | string |  |  |
| `items[].name` | string |  |  |
| `items[].size` | number |  |  |
| `items[].extension` | string |  |  |
| `items[].isDir` | boolean |  |  |
| `items[].isSymlink` | boolean |  |  |
| `items[].targetSymlink` | string |  |  |
| `items[].type` | string |  |  |
| `items[].mode` | number |  |  |
| `items[].createAt` | string |  |  |
| `items[].modifiedAt` | string |  |  |
| `diskName` | string |  |  |
| `sorting` | object |  |  |
| `sorting.sortType` | string |  |  |
| `sorting.sortDirection` | string |  |  |
| `sorting.page` | number |  |  |
| `path` | string |  |  |
| `name` | string |  |  |
| `numDirs` | number |  |  |
| `numFiles` | number |  |  |
| `size` | number |  |  |
| `extension` | string |  |  |
| `isDir` | boolean |  |  |
| `isSymlink` | boolean |  |  |
| `targetSymlink` | string |  |  |
| `type` | string |  |  |
| `mode` | number |  |  |
| `createAt` | string |  |  |
| `modifiedAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "items": [
    {
      "path": "string",
      "name": "string",
      "size": 0,
      "extension": "string",
      "isDir": false,
      "isSymlink": false,
      "targetSymlink": "string",
      "type": "string",
      "mode": 0,
      "createAt": "string",
      "modifiedAt": "string"
    }
  ],
  "diskName": "string",
  "sorting": {
    "sortType": "string",
    "sortDirection": "string",
    "page": 0
  },
  "path": "string",
  "name": "string",
  "numDirs": 0,
  "numFiles": 0,
  "size": 0,
  "extension": "string",
  "isDir": false,
  "isSymlink": false,
  "targetSymlink": "string",
  "type": "string",
  "mode": 0,
  "createAt": "string",
  "modifiedAt": "string"
}
```

</details>

**Example request**

```bash
curl -X GET "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/list?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Search file or dir in FileBrowser

`GET /v1/projects/{projectID}/disks/{diskName}/search`

Operation ID: `search`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |
| `sortType` | query | string |  | The sortType for pagination. valid values:["name", "size", "modTime"] |
| `sortDirection` | query | string |  | The sortDirection for pagination. valid values:["asc", "desc"] |
| `page` | query | number |  | The page for pagination. min 1 |
| `targetPath` | query | string |  | The targetPath of your disk |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `items` | object[] |  |  |
| `items[].path` | string |  |  |
| `items[].name` | string |  |  |
| `items[].size` | number |  |  |
| `items[].extension` | string |  |  |
| `items[].isDir` | boolean |  |  |
| `items[].isSymlink` | boolean |  |  |
| `items[].targetSymlink` | string |  |  |
| `items[].type` | string |  |  |
| `items[].mode` | number |  |  |
| `items[].createAt` | string |  |  |
| `items[].modifiedAt` | string |  |  |
| `diskName` | string |  |  |
| `sorting` | object |  |  |
| `sorting.sortType` | string |  |  |
| `sorting.sortDirection` | string |  |  |
| `sorting.page` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "items": [
    {
      "path": "string",
      "name": "string",
      "size": 0,
      "extension": "string",
      "isDir": false,
      "isSymlink": false,
      "targetSymlink": "string",
      "type": "string",
      "mode": 0,
      "createAt": "string",
      "modifiedAt": "string"
    }
  ],
  "diskName": "string",
  "sorting": {
    "sortType": "string",
    "sortDirection": "string",
    "page": 0
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/search?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Serve file from FileBrowser

`GET /v1/projects/{projectID}/disks/{diskName}/serve`

Operation ID: `serve`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of createLink query route |
| `type` | query | string | yes | The path of createLink query route |
| `token` | query | string | yes | The path of createLink query route |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X GET "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/serve?path=<path>&type=<type>&token=<token>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create link for file in FileBrowser

`POST /v1/projects/{projectID}/disks/{diskName}/createLink`

Operation ID: `createLink`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |
| `type` | query | string |  | The type of your request. valid values:["preview", "download"] |
| `expire` | query | string |  | The expire of your link. valid values:["1h", "6h", "1d", "3d", "7d"] |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `queries` | object |  |  |
| `queries.path` | string |  |  |
| `queries.type` | string |  |  |
| `queries.token` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "queries": {
    "path": "string",
    "type": "string",
    "token": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/createLink?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Rename file or dir in FileBrowser

`POST /v1/projects/{projectID}/disks/{diskName}/rename`

Operation ID: `rename`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |
| `newName` | query | string |  | The newName of your path |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X POST "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/rename?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create file or dir in FileBrowser

`POST /v1/projects/{projectID}/disks/{diskName}/create`

Operation ID: `create`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |
| `type` | query | string |  | The type of your request. valid values:["file", "dir"] |
| `name` | query | string |  | The name of your file or dir |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X POST "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/create?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Extract file in FileBrowser

`POST /v1/projects/{projectID}/disks/{diskName}/extract`

Operation ID: `extract`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |
| `output` | query | string | yes | The output path of your request |
| `overwrite` | query | string |  | The overwrite of your request Default: `false` |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X POST "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/extract?path=<path>&output=<output>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Upload file in FileBrowser

`POST /v1/projects/{projectID}/disks/{diskName}/upload`

Operation ID: `upload`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |
| `overwrite` | query | string |  | The overwrite of your request Default: `false` |

**Request body** — `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | string (binary) | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X POST "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/upload?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -F "file=@./file"
```

---

### Delete file or dir in FileBrowser

`DELETE /v1/projects/{projectID}/disks/{diskName}/delete`

Operation ID: `delete`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `projectID` | path | string | yes | The id of your project |
| `diskName` | path | string | yes | The name of your disk |
| `path` | query | string | yes | The path of your disk |

**Responses**

| Status | Description | Content |
|---|---|---|
| `202` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://{filebrowser-url}/v1/projects/{projectID}/disks/{diskName}/delete?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
