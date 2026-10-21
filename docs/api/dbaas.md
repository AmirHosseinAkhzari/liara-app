# DBaaS (Databases)

> Generated from [`specs/dbaas.yaml`](../../specs/dbaas.yaml) (source: https://developers.liara.ir/spec/dbaas.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** DBaaS  
**Version:** 1.0.0  
**Base URL:** `https://api.liara.ir`  
**Endpoints:** 18

## About

Manage your databases using our API

Parameters:
- `teamID`: To access services in a team

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`
- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Databases | `GET` | `/v1/databases/{id}` | [Get a database](#get-a-database) |
| Databases | `DELETE` | `/v1/databases/{id}` | [Delete a database](#delete-a-database) |
| Databases | `GET` | `/v1/databases` | [Get all databases](#get-all-databases) |
| Databases | `POST` | `/v1/databases` | [Create a database](#create-a-database) |
| Databases | `POST` | `/v1/databases/{id}/actions/scale` | [Power on or power off a database](#power-on-or-power-off-a-database) |
| Databases | `POST` | `/v1/databases/{id}/resize` | [Resize a database](#resize-a-database) |
| Databases | `PATCH` | `/v1/databases/{id}/settings` | [Settings a database](#settings-a-database) |
| Databases | `POST` | `/v1/databases/{id}/control-panel/{status}` | [Change control-panel status](#change-control-panel-status) |
| Databases | `PATCH` | `/v1/databases/{id}/public-network/{status}` | [Change public network status](#change-public-network-status) |
| Backups | `GET` | `/v1/databases/{id}/backups` | [Get all backups](#get-all-backups) |
| Backups | `POST` | `/v1/databases/{id}/backups` | [Backup a database](#backup-a-database) |
| Backups | `POST` | `/v1/databases/{id}/backups/{name}/download` | [Download a backup](#download-a-backup) |
| Reports | `GET` | `/v1/databases/{id}/metrics/cpu` | [Get cpu reports of database](#get-cpu-reports-of-database) |
| Reports | `GET` | `/v1/databases/{id}/metrics/memory` | [Get memory reports of database](#get-memory-reports-of-database) |
| Reports | `GET` | `/v1/databases/{id}/metrics/network-receive` | [Get network-receive reports of database](#get-network-receive-reports-of-database) |
| Reports | `GET` | `/v1/databases/{id}/metrics/network-transmit` | [Get network-transmit reports of database](#get-network-transmit-reports-of-database) |
| Reports | `GET` | `/v1/databases/{id}/metrics/summary` | [Get summary reports of database](#get-summary-reports-of-database) |
| General | `GET` | `/v1/databases/{name}/events` | [Get events of the database](#get-events-of-the-database) |

## Databases

Everything about your Databases

### Get a database

`GET /v1/databases/{id}`

get a database that user owns

Operation ID: `getDatabase`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `database` | object |  |  |
| `database.DBId` | string |  | The ID of the database |
| `database.type` | string |  | The type of the database |
| `database.planID` | string |  | The plan ID |
| `database.status` | string |  | The status of the database |
| `database.scale` | integer |  | The scale of the database |
| `database.hostname` | string |  | The hostname of the database |
| `database.publicNetwork` | boolean |  | Indicates if the database is on a public network |
| `database.version` | string |  | The database version |
| `database.volumeSize` | integer |  | The size of the database volume |
| `database.created_at` | string |  | The creation timestamp of the database |
| `database.dbName` | string |  | The name of db |
| `database.node` | object |  |  |
| `database.node._id` | string |  | The ID of the database node |
| `database.node.host` | string |  | The host of the database node |
| `database.port` | integer |  | The port number for the database connection |
| `database.root_password` | string |  | The root password for the database |
| `database.internalPort` | integer |  | The internal port of the database |
| `database.id` | string |  | The unique ID of the database |
| `database.hourlyPrice` | number |  | The hourly price of the database |
| `database.metaData` | object |  |  |
| `database.metaData.standaloneReplicaSet` | boolean |  | Indicates if the database uses a standalone replica set |
| `database.metaData.privateNetwork` | boolean |  | Indicates if the database is on a private network |
| `database.username` | string |  | The username associated with the database |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "database": {
    "DBId": "string",
    "type": "string",
    "planID": "string",
    "status": "string",
    "scale": 0,
    "hostname": "string",
    "publicNetwork": false,
    "version": "string",
    "volumeSize": 0,
    "created_at": "string",
    "dbName": "string",
    "node": {
      "_id": "string",
      "host": "string"
    },
    "port": 0,
    "root_password": "string",
    "internalPort": 0,
    "id": "string",
    "hourlyPrice": 0,
    "metaData": {
      "standaloneReplicaSet": false,
      "privateNetwork": false
    },
    "username": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete a database

`DELETE /v1/databases/{id}`

delete a database that user owns

Operation ID: `deleteDatabase`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

**Example request**

```bash
curl -X DELETE "https://api.liara.ir/v1/databases/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get all databases

`GET /v1/databases`

get all databases that user owns

Operation ID: `getListDatabases`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `databases` | object[] |  |  |
| `databases[].DBId` | string |  | The ID of the database |
| `databases[].type` | string |  | The type of the database |
| `databases[].planID` | string |  | The plan ID |
| `databases[].status` | string |  | The status of the database |
| `databases[].scale` | integer |  | The scale of the database |
| `databases[].hostname` | string |  | The hostname of the database |
| `databases[].publicNetwork` | boolean |  | Indicates if the database is on a public network |
| `databases[].created_at` | string |  | The creation timestamp of the database |
| `databases[].internalPort` | integer |  | The internal port of the database |
| `databases[].id` | string |  | The unique ID of the database |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "databases": [
    {
      "DBId": "string",
      "type": "string",
      "planID": "string",
      "status": "string",
      "scale": 0,
      "hostname": "string",
      "publicNetwork": false,
      "created_at": "string",
      "internalPort": 0,
      "id": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create a database

`POST /v1/databases`

create a database that user owns

Operation ID: `createDatabase`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `hostname` | string |  | The hostname of databases that you want to create |
| `options` | object |  |  |
| `options.standaloneReplicaSet` | boolean |  |  |
| `publicNetwork` | boolean |  | The publicNetwork of databases that you want to create |
| `type` | string |  | The type of databases that you want to create |
| `planID` | string |  | The planID of databases that you want to create |
| `version` | string |  | The version of databases that you want to create |

Example:

```json
{
  "hostname": "string",
  "options": {
    "standaloneReplicaSet": false
  },
  "publicNetwork": false,
  "type": "string",
  "planID": "string",
  "version": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `409` | Conflict |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `databaseID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "databaseID": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/databases" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hostname": "string", "options": {"standaloneReplicaSet": false}, "publicNetwork": false, "type": "string", "planID": "string", "version": "string"}'
```

---

### Power on or power off a database

`POST /v1/databases/{id}/actions/scale`

power on or power off a database that user owns

Operation ID: `TurnDatabase`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Request body** — `application/json` (required)

1 for power on or 0 for power off

| Field | Type | Required | Description |
|---|---|---|---|
| `scale` | number | yes |  |

Example:

```json
{
  "scale": 0
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/databases/{id}/actions/scale" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scale": 0}'
```

---

### Resize a database

`POST /v1/databases/{id}/resize`

resize a database that user owns

Operation ID: `resizeDatabase`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `disk` | boolean |  |  |
| `planID` | string | yes |  |

Example:

```json
{
  "disk": false,
  "planID": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/databases/{id}/resize" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"disk": false, "planID": "string"}'
```

---

### Settings a database

`PATCH /v1/databases/{id}/settings`

settings a database that user owns

Operation ID: `databasesSettings`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string |  |  |
| `options` | object |  |  |
| `options.maxConnections` | number |  |  |
| `options.netBufferLength` | number |  |  |
| `options.selectLimit` | number |  |  |
| `options.maxAllowedPacket` | number |  |  |
| `options.connectTimeout` | number |  |  |
| `options.maxJoinSize` | number |  |  |
| `options.clientEncoding` | string |  |  |
| `options.sharedBuffers` | number |  |  |

Example:

```json
{
  "type": "string",
  "options": {
    "maxConnections": 0,
    "netBufferLength": 0,
    "selectLimit": 0,
    "maxAllowedPacket": 0,
    "connectTimeout": 0,
    "maxJoinSize": 0,
    "clientEncoding": "string",
    "sharedBuffers": 0
  }
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

**Example request**

```bash
curl -X PATCH "https://api.liara.ir/v1/databases/{id}/settings" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "string", "options": {"maxConnections": 0, "netBufferLength": 0, "selectLimit": 0, "maxAllowedPacket": 0, "connectTimeout": 0, "maxJoinSize": 0, "clientEncoding": "string", "sharedBuffers": 0}}'
```

---

### Change control-panel status

`POST /v1/databases/{id}/control-panel/{status}`

change control-panel status that user owns

Operation ID: `changeControlPanel`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |
| `status` | path | string | yes | One of: `enable`, `disable` |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |
| `409` | Conflict |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `controlPanelID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "controlPanelID": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/databases/{id}/control-panel/{status}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Change public network status

`PATCH /v1/databases/{id}/public-network/{status}`

change public network status that user owns

Operation ID: `changePublicNetwork`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |
| `status` | path | string | yes | One of: `enable`, `disable` |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |
| `409` | Conflict |  |

**Example request**

```bash
curl -X PATCH "https://api.liara.ir/v1/databases/{id}/public-network/{status}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Backups

Backups endpoints

### Get all backups

`GET /v1/databases/{id}/backups`

get all backups that user owns

Operation ID: `getListBackups`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `backups` | object[] |  |  |
| `backups[].name` | string |  |  |
| `backups[].lastModified` | string |  |  |
| `backups[].etag` | string |  |  |
| `backups[].size` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "backups": [
    {
      "name": "string",
      "lastModified": "string",
      "etag": "string",
      "size": 0
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{id}/backups" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Backup a database

`POST /v1/databases/{id}/backups`

backup a database that user owns

Operation ID: `createBackup`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/databases/{id}/backups" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Download a backup

`POST /v1/databases/{id}/backups/{name}/download`

download a backup that user owns

Operation ID: `downloadBackup`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your database |
| `name` | path | string | yes | The name of your backup |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `link` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "link": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/databases/{id}/backups/{name}/download" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Reports

Reports of your app

### Get cpu reports of database

`GET /v1/databases/{id}/metrics/cpu`

get cpu reports of database that user owns

Operation ID: `getDatabaseCpuReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The name of your database |
| `since` | query | number | yes | The since of your cpu reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `end` | number |  |  |
| `result` | object[] |  |  |
| `result[].values` | number \| string[][] |  |  |
| `result[].applet` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "end": 0,
  "result": [
    {
      "values": [
        []
      ],
      "applet": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{id}/metrics/cpu?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get memory reports of database

`GET /v1/databases/{id}/metrics/memory`

get memory reports of database that user owns

Operation ID: `getDatabaseMemoryReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The name of your database |
| `since` | query | number | yes | The since of your memory reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `end` | number |  |  |
| `result` | object[] |  |  |
| `result[].values` | number \| string[][] |  |  |
| `result[].applet` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "end": 0,
  "result": [
    {
      "values": [
        []
      ],
      "applet": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{id}/metrics/memory?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get network-receive reports of database

`GET /v1/databases/{id}/metrics/network-receive`

get network-receive reports of database that user owns

Operation ID: `getDatabaseNetworkReceiveReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The name of your database |
| `since` | query | number | yes | The since of your network-receive reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `end` | number |  |  |
| `result` | object[] |  |  |
| `result[].values` | number \| string[][] |  |  |
| `result[].applet` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "end": 0,
  "result": [
    {
      "values": [
        []
      ],
      "applet": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{id}/metrics/network-receive?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get network-transmit reports of database

`GET /v1/databases/{id}/metrics/network-transmit`

get network-transmit reports of database that user owns

Operation ID: `getDatabaseNetworkTransmitReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The name of your database |
| `since` | query | number | yes | The since of your network-transmit reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `end` | number |  |  |
| `result` | object[] |  |  |
| `result[].values` | number \| string[][] |  |  |
| `result[].applet` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "end": 0,
  "result": [
    {
      "values": [
        []
      ],
      "applet": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{id}/metrics/network-transmit?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get summary reports of database

`GET /v1/databases/{id}/metrics/summary`

get summary reports of database that user owns

Operation ID: `getDatabaseSummaryReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The name of your database |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `cpuUsage` | object[] |  |  |
| `cpuUsage[].value` | number \| string[] |  |  |
| `cpuUsage[].applet` | string |  |  |
| `memoryUsage` | object[] |  |  |
| `memoryUsage[].value` | number \| string[] |  |  |
| `memoryUsage[].applet` | string |  |  |
| `disksUsage` | object[] |  |  |
| `disksUsage[].size` | string |  |  |
| `disksUsage[].usage` | string |  |  |
| `disksUsage[].reportedAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "cpuUsage": [
    {
      "value": [
        0
      ],
      "applet": "string"
    }
  ],
  "memoryUsage": [
    {
      "value": [
        0
      ],
      "applet": "string"
    }
  ],
  "disksUsage": [
    {
      "size": "string",
      "usage": "string",
      "reportedAt": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{id}/metrics/summary" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## General

### Get events of the database

`GET /v1/databases/{name}/events`

get events of the database owned by user

Operation ID: `getDatabaseEvents`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of database |
| `search` | query | string |  | Show events based on search query |
| `start` | query | number |  | start timestamp |
| `end` | query | number |  | end timestamp |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Database does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object[] | yes |  |
| `data[].metaData` | object |  |  |
| `data[].values` | string[][] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "data": [
    {
      "metaData": {},
      "values": [
        [
          "string"
        ]
      ]
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/databases/{name}/events" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
