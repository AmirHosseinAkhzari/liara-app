# PaaS (Apps)

> Generated from [`specs/paas.yaml`](../../specs/paas.yaml) (source: https://developers.liara.ir/spec/paas.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** PaaS  
**Version:** 1.0.0  
**Base URL:** `https://api.liara.ir`  
**Endpoints:** 41

## About

Manage your apps using our API

[wss://api.liara.ir?token=<api-token>&cmd=/bin/bash&project_id=<project-id>](
wss://api.liara.ir?token=<api-token>&cmd=/bin/bash&project_id=<project-id>)

Parameters:
- `token`: Your api token in liara
- `cmd`: By default /bin/bash
- `project_id`: The id of your project in liara
- `teamID`: To access services in a team

This `WebSocket` endpoint allows `real-time`
communication with the projects service hosted
at `Liara` You can use `WebSocket protocols`
to send and receive data, enabling efficient and
low-latency interactions with the projects

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`
- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Apps | `GET` | `/v1/projects` | [Get details of all projects](#get-details-of-all-projects) |
| Apps | `POST` | `/v1/projects` | [Create a app](#create-a-app) |
| Apps | `GET` | `/v1/projects/{name}` | [Get details of a project](#get-details-of-a-project) |
| Apps | `DELETE` | `/v1/projects/{name}` | [Delete a app](#delete-a-app) |
| Apps | `POST` | `/v1/projects/{name}/actions/scale` | [Turn on or off a app](#turn-on-or-off-a-app) |
| Apps | `POST` | `/v1/projects/{name}/actions/restart` | [To restart a app](#to-restart-a-app) |
| Apps | `POST` | `/v1/projects/{name}/resize` | [Change plan](#change-plan) |
| Apps | `GET` | `/v1/projects/{name}/logs` | [Get logs of app](#get-logs-of-app) |
| Apps | `GET` | `/v1/projects/{name}/events` | [Get events of the app](#get-events-of-the-app) |
| Apps | `GET` | `/v1/projects/{name}/applets` | [Get applets of app](#get-applets-of-app) |
| Apps | `GET` | `/v1/projects/{name}/releases` | [Get releases of app](#get-releases-of-app) |
| Deploy | `POST` | `/v2/projects/{name}/sources` | [Deploy sources code](#deploy-sources-code) |
| Deploy | `POST` | `/v2/projects/{name}/releases` | [Deploy releases](#deploy-releases) |
| Settings | `POST` | `/v1/projects/{id}/zero-downtime/{status}` | [Zero downtime](#zero-downtime) |
| Settings | `POST` | `/v1/projects/{id}/default-subdomain/{status}` | [Default subdomain](#default-subdomain) |
| Settings | `POST` | `/v1/projects/{id}/fixed-ip/{status}` | [IP static](#ip-static) |
| Settings | `POST` | `/v1/projects/{id}/read-only/{status}` | [Read only](#read-only) |
| Settings | `POST` | `/v1/projects/update-envs` | [Update envs](#update-envs) |
| Disks | `GET` | `/v1/projects/{name}/disks/{dname}/ftp` | [Get ftps](#get-ftps) |
| Disks | `POST` | `/v1/projects/{name}/disks/{dname}/ftp` | [Create ftp](#create-ftp) |
| Disks | `GET` | `/v1/projects/{id}/disks` | [Get disks](#get-disks) |
| Disks | `GET` | `/v1/projects/{id}/disks/{name}/backups` | [Get backups disk](#get-backups-disk) |
| Disks | `POST` | `/v1/projects/{id}/disks/{name}/backups` | [Create backup disk](#create-backup-disk) |
| Disks | `POST` | `/v1/projects/{id}/disks/{dname}/backups/{bname}/download` | [Download backup disk](#download-backup-disk) |
| Disks | `POST` | `/v1/projects/{name}/disks/{dname}/resize` | [Resize disk](#resize-disk) |
| Disks | `POST` | `/v1/projects/{name}/disks` | [Create a disk](#create-a-disk) |
| Disks | `DELETE` | `/v1/projects/{id}/disks/{name}` | [Delete a disk](#delete-a-disk) |
| Disks | `DELETE` | `/v1/ftp/{fname}` | [Delete a ftp](#delete-a-ftp) |
| Domains | `GET` | `/v1/domains/{id}/check` | [Check a domain](#check-a-domain) |
| Domains | `GET` | `/v1/domains` | [Get all domains](#get-all-domains) |
| Domains | `POST` | `/v1/domains` | [Create a domain](#create-a-domain) |
| Domains | `POST` | `/v1/domains/set-project` | [Set a domain for project](#set-a-domain-for-project) |
| Domains | `POST` | `/v1/domains/{id}/set-redirect` | [Redirect a domain](#redirect-a-domain) |
| Domains | `POST` | `/v1/domains/{id}/ssl/disable` | [Disable ssl](#disable-ssl) |
| Domains | `POST` | `/v1/domains/provision-ssl-certs` | [Enable ssl](#enable-ssl) |
| Domains | `DELETE` | `/v1/domains/{id}` | [Delete a domain](#delete-a-domain) |
| Reports | `GET` | `/v1/projects/{name}/metrics/summary` | [Get summary reports of app](#get-summary-reports-of-app) |
| Reports | `GET` | `/v1/projects/{name}/metrics/cpu` | [Get cpu reports of app](#get-cpu-reports-of-app) |
| Reports | `GET` | `/v1/projects/{name}/metrics/memory` | [Get memory reports of app](#get-memory-reports-of-app) |
| Reports | `GET` | `/v1/projects/{name}/metrics/network-receive` | [Get network-receive reports of app](#get-network-receive-reports-of-app) |
| Reports | `GET` | `/v1/projects/{name}/metrics/network-transmit` | [Get network-transmit reports of app](#get-network-transmit-reports-of-app) |

## Apps

Everything about your Apps

### Get details of all projects

`GET /v1/projects`

get all details of all projects that user owns

Operation ID: `getApps`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `projects` | object[] |  |  |
| `projects[]._id` | string |  | The id of project |
| `projects[].project_id` | string |  | The name of project |
| `projects[].type` | string |  | The platform of project |
| `projects[].status` | string |  | The status of project |
| `projects[].scale` | number |  | The being on of project |
| `projects[].planID` | string |  | The plan of project |
| `projects[].created_at` | string |  | The time to create the project |
| `projects[].isDeployed` | boolean |  | The project deployment status |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "projects": [
    {
      "_id": "string",
      "project_id": "string",
      "type": "string",
      "status": "string",
      "scale": 0,
      "planID": "string",
      "created_at": "string",
      "isDeployed": false
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create a app

`POST /v1/projects`

create app that user owns

Operation ID: `createApp`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string |  | The name of app that you want to create |
| `planID` | string |  | The plan of app that you want to create |
| `platform` | string |  | The platform of app that you want to create |
| `readOnlyRootFilesystem` | boolean |  | For filesystem |
| `network` | string |  | For project |

Example:

```json
{
  "name": "string",
  "planID": "string",
  "platform": "string",
  "readOnlyRootFilesystem": false,
  "network": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `409` | Conflict |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "planID": "string", "platform": "string", "readOnlyRootFilesystem": false, "network": "string"}'
```

---

### Get details of a project

`GET /v1/projects/{name}`

get all details of all project that user owns

Operation ID: `getAppByName`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `project` | object |  |  |
| `project._id` | string |  | The id of project |
| `project.project_id` | string |  | The name of project |
| `project.type` | string |  | The platform of project |
| `project.status` | string |  | The status of project |
| `project.defaultSubdomain` | boolean |  | The defaultSubdomain status of project |
| `project.readOnlyRootFilesystem` | boolean |  | The readOnlyRootFilesystem of project |
| `project.zeroDowntime` | boolean |  | The zeroDowntime status of project |
| `project.scale` | number |  | The being on of project |
| `project.envs` | object[] |  | The envs of project |
| `project.envs[].key` | string |  |  |
| `project.envs[].value` | string |  |  |
| `project.envs[].encrypted` | boolean |  |  |
| `project.envs[]._id` | string |  |  |
| `project.planID` | string |  | The plan of project |
| `project.fixedIPStatus` | string |  | The fixedIPStatus of project |
| `project.created_at` | string |  | The time to create of project |
| `project.node` | object |  | The node of project |
| `project.node._id` | string |  |  |
| `project.node.IP` | string |  |  |
| `project.hourlyPrice` | number |  | The hourlyPrice of project |
| `project.isDeployed` | boolean |  | The deployment status of project |
| `project.reservedDiskSpace` | number |  | The count reservedDiskSpace of project |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "project": {
    "_id": "string",
    "project_id": "string",
    "type": "string",
    "status": "string",
    "defaultSubdomain": false,
    "readOnlyRootFilesystem": false,
    "zeroDowntime": false,
    "scale": 0,
    "envs": [
      {
        "key": "string",
        "value": "string",
        "encrypted": false,
        "_id": "string"
      }
    ],
    "planID": "string",
    "fixedIPStatus": "string",
    "created_at": "string",
    "node": {
      "_id": "string",
      "IP": "string"
    },
    "hourlyPrice": 0,
    "isDeployed": false,
    "reservedDiskSpace": 0
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects/{name}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete a app

`DELETE /v1/projects/{name}`

delete app that user owns

Operation ID: `deleteAppByName`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of the app to delete |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Your request has been submitted. |  |
| `204` | App deleted. |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

**Example request**

```bash
curl -X DELETE "https://api.liara.ir/v1/projects/{name}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Turn on or off a app

`POST /v1/projects/{name}/actions/scale`

turn on or off a app that user owns

Operation ID: `turnApp`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of the app to turn on or off |

**Request body** — `application/json` (required)

Return 1 to turn on or 0 to turn off

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
| `200` | Your request has been submitted. |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{name}/actions/scale" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scale": 0}'
```

---

### To restart a app

`POST /v1/projects/{name}/actions/restart`

to restart app that user owns

Operation ID: `restartApp`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of the app to restart |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Your request has been submitted. |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{name}/actions/restart" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Change plan

`POST /v1/projects/{name}/resize`

create app that user owns

Operation ID: `changePlan`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |

**Request body** — `application/json` (required)

The plan of your app

| Field | Type | Required | Description |
|---|---|---|---|
| `planID` | string | yes |  |

Example:

```json
{
  "planID": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{name}/resize" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planID": "string"}'
```

---

### Get logs of app

`GET /v1/projects/{name}/logs`

get logs of app that user owns

Operation ID: `getAppLogs`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `since` | query | string | yes | Show logs since timestamp |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `[].type` | string |  |  |
| `[].datetime` | string |  |  |
| `[].message` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
[
  {
    "type": "string",
    "datetime": "string",
    "message": "string"
  }
]
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects/{name}/logs?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get events of the app

`GET /v1/projects/{name}/events`

get events of the app owned by user

Operation ID: `getAppEvents`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of the app |
| `search` | query | string |  | Show events based on search query |
| `start` | query | number |  | start timestamp |
| `end` | query | number |  | end timestamp |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
curl -X GET "https://api.liara.ir/v1/projects/{name}/events" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get applets of app

`GET /v1/projects/{name}/applets`

get applets of app that user owns

Operation ID: `getAppApplets`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `applets` | object[] |  |  |
| `applets[].id` | string |  | The id of applet |
| `applets[].name` | string |  | The name of applet |
| `applets[].timestamp` | string |  | The timestamp of applet |
| `applets[].state` | string |  | The state of applet |
| `applets[].reason` | string |  | The reason of applet |
| `applets[].release` | object |  | The release of applet |
| `applets[].release.releaseID` | string |  | The releaseID of release |
| `applets[].release.tag` | string |  | The tag of release |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "applets": [
    {
      "id": "string",
      "name": "string",
      "timestamp": "string",
      "state": "string",
      "reason": "string",
      "release": {
        "releaseID": "string",
        "tag": "string"
      }
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects/{name}/applets" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get releases of app

`GET /v1/projects/{name}/releases`

get releases of app that user owns

Operation ID: `getAppReleases`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `page` | query | number | yes | The page of your releases Default: `1.0` |
| `count` | query | number | yes | The count of your releases Default: `10.0` |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `total` | number |  | The total of releases |
| `currentRelease` | string |  | The currentRelease of releases |
| `readyReleasesCount` | number |  | The total of releases |
| `releases` | object[] |  | The total of releases |
| `releases[]._id` | string |  | The id of release |
| `releases[].type` | string |  | The type of release |
| `releases[].imageName` | string |  | The imageName of release |
| `releases[].projectType` | string |  | The projectType of release |
| `releases[].state` | string |  | The state of release |
| `releases[].port` | number |  | The port of release |
| `releases[].gitInfo` | object |  |  |
| `releases[].gitInfo.branch` | string |  |  |
| `releases[].gitInfo.message` | string |  |  |
| `releases[].gitInfo.commit` | string |  |  |
| `releases[].gitInfo.committedAt` | string (date-time) |  |  |
| `releases[].gitInfo.remote` | string |  |  |
| `releases[].gitInfo.author` | object |  |  |
| `releases[].gitInfo.author.email` | string |  |  |
| `releases[].gitInfo.author.name` | string |  |  |
| `releases[].gitInfo.tags` | string[] |  |  |
| `releases[].client` | string |  | The client of release |
| `releases[].finishedAt` | string |  | The finishedAt of release |
| `releases[].createdAt` | string |  | The createdAt of release |
| `releases[].tag` | string |  | The tag of release |
| `releases[].sourceAvailable` | boolean |  | The sourceAvailable of release |
| `platform` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "total": 0,
  "currentRelease": "string",
  "readyReleasesCount": 0,
  "releases": [
    {
      "_id": "string",
      "type": "string",
      "imageName": "string",
      "projectType": "string",
      "state": "string",
      "port": 0,
      "gitInfo": {
        "branch": "string",
        "message": "string",
        "commit": "string",
        "committedAt": "string",
        "remote": "string",
        "author": {
          "email": "string",
          "name": "string"
        },
        "tags": [
          "string"
        ]
      },
      "client": "string",
      "finishedAt": "string",
      "createdAt": "string",
      "tag": "string",
      "sourceAvailable": false
    }
  ],
  "platform": "string"
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects/{name}/releases?page=<page>&count=<count>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Deploy

Deploy endpoints

### Deploy sources code

`POST /v2/projects/{name}/sources`

deploy sources code that user owns

Operation ID: `sourcesDeploy`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app for deploy |

**Request body** — `multipart/form-data` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | string (binary) | yes | The .gz file to deploy |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "sourceID": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v2/projects/{name}/sources" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -F "file=@./file"
```

---

### Deploy releases

`POST /v2/projects/{name}/releases`

deploy releases that user owns

Operation ID: `releasesDeploy`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app for deploy |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `sourceID` | string |  | The id of Deployed sources |
| `port` | number |  | The port of your app |
| `type` | string |  | The platform of your app |

Example:

```json
{
  "sourceID": "string",
  "port": 0,
  "type": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `releaseID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "releaseID": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v2/projects/{name}/releases" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceID": "string", "port": 0, "type": "string"}'
```

---

## Settings

Settings of your app

### Zero downtime

`POST /v1/projects/{id}/zero-downtime/{status}`

zero downtime that user owns

Operation ID: `zeroDowntime`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |
| `status` | path | string | yes | disable or enable |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `409` | Conflict |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{id}/zero-downtime/{status}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Default subdomain

`POST /v1/projects/{id}/default-subdomain/{status}`

default subdomain that user owns

Operation ID: `defaultSubdomain`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |
| `status` | path | string | yes | disable or enable |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `409` | Conflict |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{id}/default-subdomain/{status}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### IP static

`POST /v1/projects/{id}/fixed-ip/{status}`

ip static that user owns

Operation ID: `ipStatic`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |
| `status` | path | string | yes | disable or enable |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `409` | Conflict |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `IP` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "IP": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{id}/fixed-ip/{status}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Read only

`POST /v1/projects/{id}/read-only/{status}`

read only that user owns

Operation ID: `readOnly`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |
| `status` | path | string | yes | disable or enable |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `409` | Conflict |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{id}/read-only/{status}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Update envs

`POST /v1/projects/update-envs`

update envs that user owns

Operation ID: `updateEnvs`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `project` | string |  | The name of your app for update envs |
| `variables` | object[] |  | The envs for update |
| `variables[].key` | string |  | The name of your env |
| `variables[].value` | string |  | The value of your env |

Example:

```json
{
  "project": "string",
  "variables": [
    {
      "key": "string",
      "value": "string"
    }
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "message": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/update-envs" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project": "string", "variables": [{"key": "string", "value": "string"}]}'
```

---

## Disks

Disks of your app

### Get ftps

`GET /v1/projects/{name}/disks/{dname}/ftp`

get ftps that user owns

Operation ID: `getFtps`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `dname` | path | string | yes | The name of your disk |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `accesses` | object[] |  |  |
| `accesses[]._id` | string |  |  |
| `accesses[].disk` | string |  |  |
| `accesses[].username` | string |  |  |
| `accesses[].password` | string |  |  |
| `accesses[].readOnly` | boolean |  |  |
| `accesses[].createdAt` | string (date-time) |  |  |
| `accesses[].__v` | integer |  |  |
| `host` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "accesses": [
    {
      "_id": "string",
      "disk": "string",
      "username": "string",
      "password": "string",
      "readOnly": false,
      "createdAt": "string",
      "__v": 0
    }
  ],
  "host": "string"
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects/{name}/disks/{dname}/ftp" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create ftp

`POST /v1/projects/{name}/disks/{dname}/ftp`

create ftp that user owns

Operation ID: `createFtp`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `dname` | path | string | yes | The name of your disk |

**Request body** — `application/json` (required)

The plan of your app

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | string | yes |  |
| `readOnly` | boolean | yes |  |

Example:

```json
{
  "username": "string",
  "readOnly": false
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | string |  |  |
| `password` | string |  |  |
| `host` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "username": "string",
  "password": "string",
  "host": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{name}/disks/{dname}/ftp" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "string", "readOnly": false}'
```

---

### Get disks

`GET /v1/projects/{id}/disks`

get disks that user owns

Operation ID: `getDisks`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your app |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `disks` | object[] |  |  |
| `disks[]._id` | string |  |  |
| `disks[].name` | string |  |  |
| `disks[].size` | integer |  |  |
| `disks[].updatedAt` | string |  |  |
| `disks[].createdAt` | string |  |  |
| `mounts` | object[] |  |  |
| `mounts[].name` | string |  |  |
| `mounts[].mountedTo` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "disks": [
    {
      "_id": "string",
      "name": "string",
      "size": 0,
      "updatedAt": "string",
      "createdAt": "string"
    }
  ],
  "mounts": [
    {
      "name": "string",
      "mountedTo": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects/{id}/disks" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get backups disk

`GET /v1/projects/{id}/disks/{name}/backups`

get backups disk that user owns

Operation ID: `getBackups`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your app |
| `name` | path | string | yes | The name of your disk |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
curl -X GET "https://api.liara.ir/v1/projects/{id}/disks/{name}/backups" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create backup disk

`POST /v1/projects/{id}/disks/{name}/backups`

create backup disk that user owns

Operation ID: `createBackup`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your app |
| `name` | path | string | yes | The name of your disk |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{id}/disks/{name}/backups" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Download backup disk

`POST /v1/projects/{id}/disks/{dname}/backups/{bname}/download`

download backup disk that user owns

Operation ID: `downloadBackup`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your app |
| `dname` | path | string | yes | The name of your disk |
| `bname` | path | string | yes | The name of your backup |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
curl -X POST "https://api.liara.ir/v1/projects/{id}/disks/{dname}/backups/{bname}/download" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Resize disk

`POST /v1/projects/{name}/disks/{dname}/resize`

resize disk that user owns

Operation ID: `resizeDisk`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `dname` | path | string | yes | The name of your disk |

**Request body** — `application/json` (required)

The size of your disk

| Field | Type | Required | Description |
|---|---|---|---|
| `size` | string | yes |  |

Example:

```json
{
  "size": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{name}/disks/{dname}/resize" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"size": "string"}'
```

---

### Create a disk

`POST /v1/projects/{name}/disks`

create a disk that user owns

Operation ID: `createDisk`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |

**Request body** — `application/json` (required)

The disk of your app

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes |  |
| `size` | string | yes |  |

Example:

```json
{
  "name": "string",
  "size": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/projects/{name}/disks" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "size": "string"}'
```

---

### Delete a disk

`DELETE /v1/projects/{id}/disks/{name}`

delete a disk that user owns

Operation ID: `deleteDisk`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your app |
| `name` | path | string | yes | The name of your disk of app |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `409` | Conflict |  |

**Example request**

```bash
curl -X DELETE "https://api.liara.ir/v1/projects/{id}/disks/{name}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete a ftp

`DELETE /v1/ftp/{fname}`

delete a ftp that user owns

Operation ID: `deleteFtp`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `fname` | path | string | yes | The name of your ftp |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `409` | Conflict |  |

**Example request**

```bash
curl -X DELETE "https://api.liara.ir/v1/ftp/{fname}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Domains

Domains of your app

### Check a domain

`GET /v1/domains/{id}/check`

check a domain that user owns

Operation ID: `checkDomain`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your domain |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Domain does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | object |  |  |
| `domain._id` | string |  |  |
| `domain.user` | string |  |  |
| `domain.name` | string |  |  |
| `domain.type` | string |  |  |
| `domain.project` | object |  |  |
| `domain.project._id` | string |  |  |
| `domain.project.project_id` | string |  |  |
| `domain.status` | string |  |  |
| `domain.certificatesStatus` | string |  |  |
| `domain.redirectTo` | string |  |  |
| `domain.redirectStatus` | number |  |  |
| `domain.updated_at` | string |  |  |
| `domain.punycodeName` | string |  |  |
| `domain.verificationCode` | string |  |  |
| `domain.created_at` | string |  |  |
| `domain.__v` | number |  |  |
| `domain.CNameRecord` | string |  |  |
| `domain.issuedAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "domain": {
    "_id": "string",
    "user": "string",
    "name": "string",
    "type": "string",
    "project": {
      "_id": "string",
      "project_id": "string"
    },
    "status": "string",
    "certificatesStatus": "string",
    "redirectTo": "string",
    "redirectStatus": 0,
    "updated_at": "string",
    "punycodeName": "string",
    "verificationCode": "string",
    "created_at": "string",
    "__v": 0,
    "CNameRecord": "string",
    "issuedAt": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/domains/{id}/check" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get all domains

`GET /v1/domains`

get all domains that user owns

Operation ID: `getAppDomains`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `project` | query | string | yes | The name of your app |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `domains` | object[] |  |  |
| `domains[]._id` | string |  | The id of domain |
| `domains[].name` | string |  | The name of domain |
| `domains[].type` | string |  | The type of domain |
| `domains[].project` | object |  | The type of domain |
| `domains[].project._id` | string |  | The id of project |
| `domains[].project.project_id` | string |  | The name of project |
| `domains[].status` | string |  | The status of domain |
| `domains[].certificatesStatus` | string |  | The certificatesStatus of domain |
| `domains[].redirectTo` | string |  | The redirectTo of domain |
| `domains[].redirectStatus` | number |  | The redirectStatus of domain |
| `domains[].created_at` | string |  | The created_at of domain |
| `domains[].CNameRecord` | string |  | The CNameRecord of domain |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "domains": [
    {
      "_id": "string",
      "name": "string",
      "type": "string",
      "project": {
        "_id": "string",
        "project_id": "string"
      },
      "status": "string",
      "certificatesStatus": "string",
      "redirectTo": "string",
      "redirectStatus": 0,
      "created_at": "string",
      "CNameRecord": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/domains?project=<project>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create a domain

`POST /v1/domains`

create a domain that user owns

Operation ID: `createAppDomain`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

The domain of your app

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes |  |
| `project` | string | yes |  |
| `type` | string | yes | Default: `"PROJECT"` |

Example:

```json
{
  "name": "string",
  "project": "string",
  "type": "PROJECT"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |
| `409` | Conflict |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | object |  |  |
| `domain._id` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "domain": {
    "_id": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/domains" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "project": "string", "type": "PROJECT"}'
```

---

### Set a domain for project

`POST /v1/domains/set-project`

set a domain for project that user owns

Operation ID: `setAppDomain`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

The domain of your app

| Field | Type | Required | Description |
|---|---|---|---|
| `domainID` | string | yes |  |
| `projectID` | string | yes |  |

Example:

```json
{
  "domainID": "string",
  "projectID": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App or domain does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/domains/set-project" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domainID": "string", "projectID": "string"}'
```

---

### Redirect a domain

`POST /v1/domains/{id}/set-redirect`

redirect a domain that user owns

Operation ID: `redirectDomain`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your domain |

**Request body** — `application/json` (required)

The domain of your app

| Field | Type | Required | Description |
|---|---|---|---|
| `redirectStatus` | number | yes | 302 or 301 |
| `redirectTo` | string | yes |  |

Example:

```json
{
  "redirectStatus": 0,
  "redirectTo": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Domain does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/domains/{id}/set-redirect" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"redirectStatus": 0, "redirectTo": "string"}'
```

---

### Disable ssl

`POST /v1/domains/{id}/ssl/disable`

disable ssl that user owns

Operation ID: `disableSsl`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your domain |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Domain does not exists. |  |

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/domains/{id}/ssl/disable" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Enable ssl

`POST /v1/domains/provision-ssl-certs`

enable ssl that user owns

Operation ID: `enableSsl`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

The domain of your app

| Field | Type | Required | Description |
|---|---|---|---|
| `domain` | string | yes |  |

Example:

```json
{
  "domain": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Domain does not exists. |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "code": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://api.liara.ir/v1/domains/provision-ssl-certs" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "string"}'
```

---

### Delete a domain

`DELETE /v1/domains/{id}`

delete a domain that user owns

Operation ID: `deleteDomain`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes | The id of your domain |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | Domain does not exists. |  |

**Example request**

```bash
curl -X DELETE "https://api.liara.ir/v1/domains/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## Reports

Reports of your app

### Get summary reports of app

`GET /v1/projects/{name}/metrics/summary`

get summary reports of app that user owns

Operation ID: `getAppSummaryReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
| `disksUsage[].name` | string |  |  |

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
      "reportedAt": "string",
      "name": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/projects/{name}/metrics/summary" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get cpu reports of app

`GET /v1/projects/{name}/metrics/cpu`

get cpu reports of app that user owns

Operation ID: `getAppCpuReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `since` | query | number | yes | The since of your cpu reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
curl -X GET "https://api.liara.ir/v1/projects/{name}/metrics/cpu?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get memory reports of app

`GET /v1/projects/{name}/metrics/memory`

get memory reports of app that user owns

Operation ID: `getAppMemoryReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `since` | query | number | yes | The since of your memory reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
curl -X GET "https://api.liara.ir/v1/projects/{name}/metrics/memory?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get network-receive reports of app

`GET /v1/projects/{name}/metrics/network-receive`

get network-receive reports of app that user owns

Operation ID: `getAppNetworkReceiveReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `since` | query | number | yes | The since of your network-receive reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
curl -X GET "https://api.liara.ir/v1/projects/{name}/metrics/network-receive?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get network-transmit reports of app

`GET /v1/projects/{name}/metrics/network-transmit`

get network-transmit reports of app that user owns

Operation ID: `getNetworkTransmitReports`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `name` | path | string | yes | The name of your app |
| `since` | query | number | yes | The since of your network-transmit reports |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | App does not exists. |  |

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
curl -X GET "https://api.liara.ir/v1/projects/{name}/metrics/network-transmit?since=<since>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
