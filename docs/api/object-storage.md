# Object Storage

> Generated from [`specs/object-storage.yaml`](../../specs/object-storage.yaml) (source: https://developers.liara.ir/spec/object-storage.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** Object Storage API Documentaion  
**Version:** 1.0.0  
**Base URL:** `https://storage-service.liara.ir`  
**Endpoints:** 26

## About

A scalable, reliable, and cost effective Object Storage solution to
support your application from liara-cloud

Parameters:
- `teamID`: To access services in a team

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`
- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Bucket | `GET` | `/api/v1/buckets` | [List all Buckets](#list-all-buckets) |
| Bucket | `POST` | `/api/v1/buckets` | [Create Bucket](#create-bucket) |
| Bucket | `GET` | `/api/v1/buckets/migrations` | [list migration operation](#list-migration-operation) |
| Bucket | `PATCH` | `/api/v1/buckets/{bucket}/type/{permission}` | [change Bucket Access Policy](#change-bucket-access-policy) |
| Bucket | `PATCH` | `/api/v1/buckets/{bucket}/upgrade/{plan}` | [Upgrade Bucket](#upgrade-bucket) |
| Bucket | `GET` | `/api/v1/buckets/{bucket}` | [Get Single Buckets](#get-single-buckets) |
| Bucket | `DELETE` | `/api/v1/buckets/{bucket}` | [Destroy Bucket](#destroy-bucket) |
| Bucket | `GET` | `/api/v1/buckets/{bucket}/check-availability` | [Check Bucket availability](#check-bucket-availability) |
| Bucket | `POST` | `/api/v1/buckets/migrates` | [Migrating buckets](#migrating-buckets) |
| Bucket | `GET` | `/api/v1/buckets/migration/from` | [List storage service buckets](#list-storage-service-buckets) |
| Key | `GET` | `/api/v1/keys` | [Get List of Keys](#get-list-of-keys) |
| Key | `POST` | `/api/v1/keys` | [Create Keys](#create-keys) |
| Key | `GET` | `/api/v1/keys/{key}` | [Get Key](#get-key) |
| Key | `PATCH` | `/api/v1/keys/{key}` | [Update key](#update-key) |
| Key | `DELETE` | `/api/v1/keys/{key}` | [Delete Key](#delete-key) |
| Key | `PATCH` | `/api/v1/keys/{key}/revoke` | [Revoke secret key](#revoke-secret-key) |
| Folder | `POST` | `/api/v1/buckets/{bucket}/folders` | [Create Folder](#create-folder) |
| Folder | `DELETE` | `/api/v1/buckets/{bucket}/folders` | [Delete Folder](#delete-folder) |
| Object | `GET` | `/api/v1/buckets/{bucket}/download/${object}` | [Download Object](#download-object) |
| Object | `GET` | `/api/v1/buckets/{bucket}/upload/{object}` | [Upload Object](#upload-object) |
| Object | `GET` | `/api/v1/buckets/{bucket}/objects/{prefix}` | [List Objects](#list-objects) |
| Object | `DELETE` | `/api/v1/buckets/{bucket}/objects/{prefix}` | [Delete Object](#delete-object) |
| Object | `GET` | `/api/v1/buckets/{bucket}/objects/statistics/{object}` | [Get Stat Object](#get-stat-object) |
| Metrics | `GET` | `/api/v1/buckets/{bucket}/metrics/summary` | [metrics summary](#metrics-summary) |
| Metrics | `GET` | `/api/v1/buckets/{bucket}/metrics/historical` | [hisotrical metrics](#hisotrical-metrics) |
| Metrics | `GET` | `/api/v1/buckets/{bucket}/metrics/{stat}` | [get statistic](#get-statistic) |

## Bucket

Operations about bucket

### List all Buckets

`GET /api/v1/buckets`

List all Bucket

Operation ID: `getBuckets`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `401` | Missing authentication |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `buckets` | object[] |  |  |
| `buckets[].id` | string |  |  |
| `buckets[].name` | string |  |  |
| `buckets[].plan` | string |  |  |
| `buckets[].status` | string |  |  |
| `buckets[].permission` | string |  |  |
| `buckets[].createdAt` | string |  |  |
| `buckets[].updatedAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "buckets": [
    {
      "id": "string",
      "name": "string",
      "plan": "string",
      "status": "string",
      "permission": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create Bucket

`POST /api/v1/buckets`

creates a new bucket on an object storage

Operation ID: `createBucket`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

create bucket. Acceptable values for permission: ( private / public ) and for plan: ( 20g, 40g, 80g, 160g )

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string |  |  |
| `plan` | string |  |  |
| `permission` | string |  |  |

Example:

```json
{
  "name": "string",
  "plan": "string",
  "permission": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://storage-service.liara.ir/api/v1/buckets" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "plan": "string", "permission": "string"}'
```

---

### list migration operation

`GET /api/v1/buckets/migrations`

Operation ID: `getMigrations`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `migrations` | object[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "migrations": [
    {}
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/migrations" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### change Bucket Access Policy

`PATCH /api/v1/buckets/{bucket}/type/{permission}`

Change Bucket Access policy on an object storage ( public / private )

Operation ID: `changeBucketAccess`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `permission` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `permission` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "permission": "string"
}
```

</details>

**Example request**

```bash
curl -X PATCH "https://storage-service.liara.ir/api/v1/buckets/{bucket}/type/{permission}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Upgrade Bucket

`PATCH /api/v1/buckets/{bucket}/upgrade/{plan}`

Upgrade Bucket plan ( just make space bigger )

Operation ID: `upgradeBucket`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `plan` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `403` | Forbidden |  |
| `404` | Not Found |  |
| `500` | server does not response |  |
| `502` | bad gateway |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `quota` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "quota": "string"
}
```

</details>

**Example request**

```bash
curl -X PATCH "https://storage-service.liara.ir/api/v1/buckets/{bucket}/upgrade/{plan}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get Single Buckets

`GET /api/v1/buckets/{bucket}`

Operation ID: `getSingleBuckets`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `401` | Missing authentication |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `bucket` | object |  |  |
| `bucket.id` | string |  |  |
| `bucket.name` | string |  |  |
| `bucket.plan` | string |  |  |
| `bucket.status` | string |  |  |
| `bucket.permission` | string |  |  |
| `bucket.createdAt` | string |  |  |
| `bucket.updatedAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "bucket": {
    "id": "string",
    "name": "string",
    "plan": "string",
    "status": "string",
    "permission": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Destroy Bucket

`DELETE /api/v1/buckets/{bucket}`

Delete Bucket on an object storage

Operation ID: `destroyBucket`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | successful operation |  |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

**Example request**

```bash
curl -X DELETE "https://storage-service.liara.ir/api/v1/buckets/{bucket}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Check Bucket availability

`GET /api/v1/buckets/{bucket}/check-availability`

Check if you can create Bucket with specified Name.

Operation ID: `checkBucket`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string"
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/check-availability" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Migrating buckets

`POST /api/v1/buckets/migrates`

Move data from one bucket to another

Operation ID: `migratingBuckets`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

Migrate buckets

| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string |  |  |
| `to` | string |  |  |
| `path` | string |  |  |

Example:

```json
{
  "from": "string",
  "to": "string",
  "path": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation |  |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

**Example request**

```bash
curl -X POST "https://storage-service.liara.ir/api/v1/buckets/migrates" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from": "string", "to": "string", "path": "string"}'
```

---

### List storage service buckets

`GET /api/v1/buckets/migration/from`

List previous buckets of storage service in liara.

Operation ID: `getListPreviousBuckets`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation |  |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/migration/from" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Key

Operations about key

### Get List of Keys

`GET /api/v1/keys`

Operation ID: `getListKeys`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `keys` | object[] |  |  |
| `keys[].id` | string |  |  |
| `keys[].buckets` | object[] |  |  |
| `keys[].buckets[].id` | string |  |  |
| `keys[].buckets[].name` | string |  |  |
| `keys[].buckets[].plan` | string |  |  |
| `keys[].buckets[].status` | string |  |  |
| `keys[].buckets[].permission` | string |  |  |
| `keys[].buckets[].createdAt` | string |  |  |
| `keys[].buckets[].updatedAt` | string |  |  |
| `keys[].status` | string |  |  |
| `keys[].accessKey` | string |  |  |
| `keys[].description` | string |  |  |
| `keys[].createdAt` | string |  |  |
| `keys[].updatedAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "keys": [
    {
      "id": "string",
      "buckets": [
        {
          "id": "string",
          "name": "string",
          "plan": "string",
          "status": "string",
          "permission": "string",
          "createdAt": "string",
          "updatedAt": "string"
        }
      ],
      "status": "string",
      "accessKey": "string",
      "description": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/keys" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create Keys

`POST /api/v1/keys`

Create access and secret key

Operation ID: `createKey`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

Declare Buckets for access key

| Field | Type | Required | Description |
|---|---|---|---|
| `buckets` | object[] |  |  |
| `description` | string |  |  |

Example:

```json
{
  "buckets": [
    {}
  ],
  "description": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.accessKey` | string |  |  |
| `data.secretKey` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "accessKey": "string",
    "secretKey": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://storage-service.liara.ir/api/v1/keys" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"buckets": [{}], "description": "string"}'
```

---

### Get Key

`GET /api/v1/keys/{key}`

Get a key

Operation ID: `getKey`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation |  |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `500` | server does not response |  |

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/keys/{key}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Update key

`PATCH /api/v1/keys/{key}`

Update buckets of key ( redefine )

Operation ID: `updateKey`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Request body** — `application/json` (required)

Declare Buckets for access key

| Field | Type | Required | Description |
|---|---|---|---|
| `buckets` | object[] |  |  |
| `description` | string |  |  |

Example:

```json
{
  "buckets": [
    {}
  ],
  "description": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string"
}
```

</details>

**Example request**

```bash
curl -X PATCH "https://storage-service.liara.ir/api/v1/keys/{key}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"buckets": [{}], "description": "string"}'
```

---

### Delete Key

`DELETE /api/v1/keys/{key}`

Delete access key

Operation ID: `deleteKey`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | successful operation |  |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

**Example request**

```bash
curl -X DELETE "https://storage-service.liara.ir/api/v1/keys/{key}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Revoke secret key

`PATCH /api/v1/keys/{key}/revoke`

Operation ID: `revokeSecretKey`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `accessKey` | string |  |  |
| `secretKey` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "accessKey": "string",
  "secretKey": "string"
}
```

</details>

**Example request**

```bash
curl -X PATCH "https://storage-service.liara.ir/api/v1/keys/{key}/revoke" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Folder

Operations about folder

### Create Folder

`POST /api/v1/buckets/{bucket}/folders`

Create Folder in Bucket

Operation ID: `createFolder`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | string |  |  |

Example:

```json
{
  "path": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.folder` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "folder": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://storage-service.liara.ir/api/v1/buckets/{bucket}/folders" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path": "string"}'
```

---

### Delete Folder

`DELETE /api/v1/buckets/{bucket}/folders`

Delete Folder in Bucket

Operation ID: `deleteFolder`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `path` | query | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | successful operation |  |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

**Example request**

```bash
curl -X DELETE "https://storage-service.liara.ir/api/v1/buckets/{bucket}/folders?path=<path>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Object

Operations about object

### Download Object

`GET /api/v1/buckets/{bucket}/download/${object}`

Return presigned url for download object

Operation ID: `downloadObject`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `object` | path | string | yes | specify object path |
| `expiry` | query | string |  | example: 2 days 7 hours 45 minutes |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.url` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "url": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/download/${object}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Upload Object

`GET /api/v1/buckets/{bucket}/upload/{object}`

Return presigned url for download object

Operation ID: `uploadObject`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `object` | path | string | yes | specify object path |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.url` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "url": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/upload/{object}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### List Objects

`GET /api/v1/buckets/{bucket}/objects/{prefix}`

Return list of objects ( max:50, min:1 )

Operation ID: `getListObjects`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `prefix` | path | string | yes |  |
| `number` | query | string |  | specify number of object ( max: 50, min: 1 ) |
| `page` | query | string |  |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.objects` | object |  |  |
| `data.objects.IsTruncated` | boolean |  |  |
| `data.objects.Contents` | object[] |  |  |
| `data.objects.Contents[].Key` | string |  |  |
| `data.objects.Contents[].LastModified` | string |  |  |
| `data.objects.Contents[].ETag` | string |  |  |
| `data.objects.Contents[].ChecksumAlgorithm` | object[] |  |  |
| `data.objects.Contents[].Size` | number |  |  |
| `data.objects.Contents[].StorageClass` | string |  |  |
| `data.objects.Name` | string |  |  |
| `data.objects.Prefix` | string |  |  |
| `data.objects.Delimiter` | string |  |  |
| `data.objects.MaxKeys` | number |  |  |
| `data.objects.CommonPrefixes` | object[] |  |  |
| `data.objects.CommonPrefixes[].Prefix` | string |  |  |
| `data.objects.KeyCount` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "objects": {
      "IsTruncated": false,
      "Contents": [
        {
          "Key": "string",
          "LastModified": "string",
          "ETag": "string",
          "ChecksumAlgorithm": [],
          "Size": 0,
          "StorageClass": "string"
        }
      ],
      "Name": "string",
      "Prefix": "string",
      "Delimiter": "string",
      "MaxKeys": 0,
      "CommonPrefixes": [
        {
          "Prefix": "string"
        }
      ],
      "KeyCount": 0
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/objects/{prefix}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete Object

`DELETE /api/v1/buckets/{bucket}/objects/{prefix}`

Delete an object from storage

Operation ID: `deleteObject`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `prefix` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | successful operation |  |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

**Example request**

```bash
curl -X DELETE "https://storage-service.liara.ir/api/v1/buckets/{bucket}/objects/{prefix}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get Stat Object

`GET /api/v1/buckets/{bucket}/objects/statistics/{object}`

Operation ID: `getStatObject`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `object` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.object` | object |  |  |
| `data.object.size` | number |  |  |
| `data.object.metaData` | object |  |  |
| `data.object.metaData.content-type` | string |  |  |
| `data.object.lastModified` | string |  |  |
| `data.object.versionId` | string |  |  |
| `data.object.etag` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "object": {
      "size": 0,
      "metaData": {
        "content-type": "string"
      },
      "lastModified": "string",
      "versionId": "string",
      "etag": "string"
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/objects/statistics/{object}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Metrics

### metrics summary

`GET /api/v1/buckets/{bucket}/metrics/summary`

Operation ID: `getMetricsSummary`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.bucket` | string |  |  |
| `data.metrics` | object |  |  |
| `data.metrics.totol_objects` | number \| string[] |  |  |
| `data.metrics.total_bytes` | number \| string[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "bucket": "string",
    "metrics": {
      "totol_objects": [
        0
      ],
      "total_bytes": [
        0
      ]
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/metrics/summary" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### hisotrical metrics

`GET /api/v1/buckets/{bucket}/metrics/historical`

Operation ID: `getHisotricalMetrics`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `since` | query | string | yes | unix time |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.bucket` | string |  |  |
| `data.metrics` | object |  |  |
| `data.metrics.totol_objects` | number \| string[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "bucket": "string",
    "metrics": {
      "totol_objects": [
        0
      ]
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/metrics/historical?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### get statistic

`GET /api/v1/buckets/{bucket}/metrics/{stat}`

Operation ID: `getMetrics`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `bucket` | path | string | yes |  |
| `stat` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `404` | Not Found |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.bucket` | string |  |  |
| `data.metrics` | object |  |  |
| `data.metrics.stat` | number \| string[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "bucket": "string",
    "metrics": {
      "stat": [
        0
      ]
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://storage-service.liara.ir/api/v1/buckets/{bucket}/metrics/{stat}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
