# DNS

> Generated from [`specs/dns.yaml`](../../specs/dns.yaml) (source: https://developers.liara.ir/spec/dns.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** DNS  
**Version:** 1.0.0  
**Base URL:** `https://dns-service.liara.ir`  
**Endpoints:** 10

## About

Manage dns zones and records

Parameters:
- `teamID`: To access services in a team

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Zone | `GET` | `/api/v1/zones` | [List all zones](#list-all-zones) |
| Zone | `POST` | `/api/v1/zones` | [Create Zone](#create-zone) |
| Zone | `GET` | `/api/v1/zones/{zone}` | [Get Zone](#get-zone) |
| Zone | `DELETE` | `/api/v1/zones/{zone}` | [Delete Zone](#delete-zone) |
| Check Name Servers | `PUT` | `/api/v1/zones/{zone}/check` | [check nameserver](#check-nameserver) |
| Dns Record | `GET` | `/api/v1/zones/{zone}/dns-records` | [Get all dns record](#get-all-dns-record) |
| Dns Record | `POST` | `/api/v1/zones/{zone}/dns-records` | [Create dns record](#create-dns-record) |
| Dns Record | `GET` | `/api/v1/zones/{zone}/dns-records/{id}` | [Get dns record](#get-dns-record) |
| Dns Record | `PUT` | `/api/v1/zones/{zone}/dns-records/{id}` | [edit dns record](#edit-dns-record) |
| Dns Record | `DELETE` | `/api/v1/zones/{zone}/dns-records/{id}` | [delete dns record](#delete-dns-record) |

## Zone

Everything about your Zones

### List all zones

`GET /api/v1/zones`

list all zones that user owns

Operation ID: `getListZones`

Auth: `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | An server | `application/json` |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object[] |  |  |
| `data[].id` | string |  |  |
| `data[].name` | string |  | The name of the zone, “liara.ir”, max length: 253, pattern: ^([a-zA-Z0-9][\-a-zA-Z0-9]*\.)+[\-a-zA-Z0-9]{2,20}$ |
| `data[].status` | string |  | The status of the zone, valid values: [CREATING, PENDING, ACTIVE, DELETING] |
| `data[].currentNameServers` | string[] |  |  |
| `data[].nameServers` | string[] |  |  |
| `data[].lastCheckAt` | string |  | Last time when zones nameservers was checked |
| `data[].createdAt` | string |  | Time when zone was created |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": [
    {
      "id": "string",
      "name": "string",
      "status": "string",
      "currentNameServers": [
        "string"
      ],
      "nameServers": [
        "string"
      ],
      "lastCheckAt": "string",
      "createdAt": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://dns-service.liara.ir/api/v1/zones" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create Zone

`POST /api/v1/zones`

creates a new zone on dns server

Operation ID: `createZone`

Auth: `jwt`

**Request body** — `application/json` (required)

The zone to create

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes |  |

Example:

```json
{
  "name": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation | `application/json` |
| `400` | Bad Request |  |
| `401` | Missing authentication |  |
| `409` | Conflict |  |
| `500` | server does not response |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.id` | string |  |  |
| `data.name` | string |  | The name of the zone, “liara.ir”, max length: 253, pattern: ^([a-zA-Z0-9][\-a-zA-Z0-9]*\.)+[\-a-zA-Z0-9]{2,20}$ |
| `data.status` | string |  | The status of the zone, valid values: [CREATING, PENDING, ACTIVE, DELETING] |
| `data.currentNameServers` | string[] |  |  |
| `data.nameServers` | string[] |  |  |
| `data.lastCheckAt` | string |  | Last time when zones nameservers was checked |
| `data.createdAt` | string |  | Time when zone was created |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "id": "string",
    "name": "string",
    "status": "string",
    "currentNameServers": [
      "string"
    ],
    "nameServers": [
      "string"
    ],
    "lastCheckAt": "string",
    "createdAt": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://dns-service.liara.ir/api/v1/zones" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string"}'
```

---

### Get Zone

`GET /api/v1/zones/{zone}`

Get this zone, all dns records

Operation ID: `getZone`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | zone details | `application/json` |
| `401` | Missing authentication |  |
| `404` | Zone does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.id` | string |  |  |
| `data.name` | string |  | The name of the zone, “liara.ir”, max length: 253, pattern: ^([a-zA-Z0-9][\-a-zA-Z0-9]*\.)+[\-a-zA-Z0-9]{2,20}$ |
| `data.status` | string |  | The status of the zone, valid values: [CREATING, PENDING, ACTIVE, DELETING] |
| `data.currentNameServers` | string[] |  |  |
| `data.nameServers` | string[] |  |  |
| `data.lastCheckAt` | string |  | Last time when zones nameservers was checked |
| `data.createdAt` | string |  | Time when zone was created |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "id": "string",
    "name": "string",
    "status": "string",
    "currentNameServers": [
      "string"
    ],
    "nameServers": [
      "string"
    ],
    "lastCheckAt": "string",
    "createdAt": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://dns-service.liara.ir/api/v1/zones/{zone}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete Zone

`DELETE /api/v1/zones/{zone}`

Deletes this zone, all dns records

Operation ID: `deleteZone`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone to delete |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Your request has been submitted. | `application/json` |
| `204` | Zone deleted. |  |
| `401` | Missing authentication |  |
| `404` | Zone does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  | succes |
| `data` | string |  | Your request has been submitted. |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": "string"
}
```

</details>

**Example request**

```bash
curl -X DELETE "https://dns-service.liara.ir/api/v1/zones/{zone}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Check Name Servers

Check Name Servers endpoints

### check nameserver

`PUT /api/v1/zones/{zone}/check`

check nameserver of zone

Operation ID: `checkNameServer`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone to check status |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation | `application/json` |
| `400` | bad request maybe validation error on zone name |  |
| `401` | Missing authentication |  |
| `404` | Zone does not exists or its status is not pending |  |
| `406` | Please try later. |  |
| `500` | server does not response |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  | succes |
| `data` | string |  | Your request has been submitted. |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string",
  "data": "string"
}
```

</details>

**Example request**

```bash
curl -X PUT "https://dns-service.liara.ir/api/v1/zones/{zone}/check" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Dns Record

Dns Record of your zones

### Get all dns record

`GET /api/v1/zones/{zone}/dns-records`

Get all Dns Records on this zone

Operation ID: `getListDnsRecords`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone to see all dns records |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Zone Not Found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  | success |
| `data` | object[] |  |  |
| `data[].id` | string |  | The id of dns record which need in PUT, DELETE and GET method |
| `data[].name` | string |  | The name of dns record, "@" for zone name(root level), "*" for wild card and any valid value with RFC 1123 |
| `data[].type` | string |  | The type of dns record, valid values: [A, AAAA, TXT, CNAME, ALIAS, MX, SRV, CAA] |
| `data[].ttl` | number |  | The ttl of dns record, is not required, valid values: [120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800, 432000] |
| `data[].contents` | object[] |  | Array of content of dns record, change base on type of dns record |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "ttl": 0,
      "contents": [
        {}
      ]
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://dns-service.liara.ir/api/v1/zones/{zone}/dns-records" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create dns record

`POST /api/v1/zones/{zone}/dns-records`

Creates a new dns record, returns the dns record on creation

Operation ID: `createDnsRecord`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone to create dns record |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string |  | The name of dns record, "@" for zone name(root level), "*" for wild card and any valid value with RFC 1123 |
| `type` | string |  | The type of dns record, valid values: [A, AAAA, TXT, CNAME, ALIAS, MX, SRV, SPF, PTR] |
| `ttl` | number |  | The ttl of dns record, is not required, valid values: [120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800, 432000] |
| `contents` | object[] |  | Array of content of dns record, change base on type of dns record |

Example:

```json
{
  "name": "string",
  "type": "string",
  "ttl": 0,
  "contents": [
    {}
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Zone does not exists. |  |
| `409` | Conflict |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  | success |
| `data` | object |  |  |
| `data.id` | string |  | The id of dns record which need in PUT, DELETE and GET method |
| `data.name` | string |  | The name of dns record, "@" for zone name(root level), "*" for wild card and any valid value with RFC 1123 |
| `data.type` | string |  | The type of dns record, valid values: [A, AAAA, TXT, CNAME, ALIAS, MX, SRV, CAA] |
| `data.ttl` | number |  | The ttl of dns record, is not required, valid values: [120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800, 432000] |
| `data.contents` | object[] |  | Array of content of dns record, change base on type of dns record |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "id": "string",
    "name": "string",
    "type": "string",
    "ttl": 0,
    "contents": [
      {}
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://dns-service.liara.ir/api/v1/zones/{zone}/dns-records" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "type": "string", "ttl": 0, "contents": [{}]}'
```

---

### Get dns record

`GET /api/v1/zones/{zone}/dns-records/{id}`

Get Dns Record data on this zone

Operation ID: `getDnsRecord`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone to see dns record |
| `id` | path | string | yes | The id of dns record to see its data |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Zone or dns record Not Found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  | success |
| `data` | object |  |  |
| `data.id` | string |  | The id of dns record which need in PUT, DELETE and GET method |
| `data.name` | string |  | The name of dns record, "@" for zone name(root level), "*" for wild card and any valid value with RFC 1123 |
| `data.type` | string |  | The type of dns record, valid values: [A, AAAA, TXT, CNAME, ALIAS, MX, SRV, CAA] |
| `data.ttl` | number |  | The ttl of dns record, is not required, valid values: [120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800, 432000] |
| `data.contents` | object[] |  | Array of content of dns record, change base on type of dns record |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "id": "string",
    "name": "string",
    "type": "string",
    "ttl": 0,
    "contents": [
      {}
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://dns-service.liara.ir/api/v1/zones/{zone}/dns-records/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### edit dns record

`PUT /api/v1/zones/{zone}/dns-records/{id}`

you can not edit type of dns record

Operation ID: `editDnsRecord`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone to edit dns record |
| `id` | path | string | yes | The id of dns record to edit its data |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string |  | The name of dns record, "@" for zone name(root level), "*" for wild card and any valid value with RFC 1123 |
| `type` | string |  | The type of dns record, valid values: [A, AAAA, TXT, CNAME, ALIAS, MX, SRV, SPF, PTR] |
| `ttl` | number |  | The ttl of dns record, is not required, valid values: [120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800, 432000] |
| `contents` | object[] |  | Array of content of dns record, change base on type of dns record |

Example:

```json
{
  "name": "string",
  "type": "string",
  "ttl": 0,
  "contents": [
    {}
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Zone does not exists. |  |
| `409` | Conflict |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  | success |
| `data` | object |  |  |
| `data.id` | string |  | The id of dns record which need in PUT, DELETE and GET method |
| `data.name` | string |  | The name of dns record, "@" for zone name(root level), "*" for wild card and any valid value with RFC 1123 |
| `data.type` | string |  | The type of dns record, valid values: [A, AAAA, TXT, CNAME, ALIAS, MX, SRV, CAA] |
| `data.ttl` | number |  | The ttl of dns record, is not required, valid values: [120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800, 432000] |
| `data.contents` | object[] |  | Array of content of dns record, change base on type of dns record |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "id": "string",
    "name": "string",
    "type": "string",
    "ttl": 0,
    "contents": [
      {}
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X PUT "https://dns-service.liara.ir/api/v1/zones/{zone}/dns-records/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "type": "string", "ttl": 0, "contents": [{}]}'
```

---

### delete dns record

`DELETE /api/v1/zones/{zone}/dns-records/{id}`

Delete dns record from this zone

Operation ID: `deleteDnsRecord`

Auth: `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `zone` | path | string | yes | The name of the zone to delete dns record |
| `id` | path | string | yes | The id of dns record to delete its data |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Zone does not exists. |  |

**Example request**

```bash
curl -X DELETE "https://dns-service.liara.ir/api/v1/zones/{zone}/dns-records/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
