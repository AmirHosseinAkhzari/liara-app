# IaaS (Virtual Machines)

> Generated from [`specs/Iaas.yaml`](../../specs/Iaas.yaml) (source: https://developers.liara.ir/spec/Iaas.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** Liara Iaas API Documentaion  
**Version:** 1.0.0  
**Base URL:** `https://iaas-api.liara.ir`  
**Endpoints:** 18

## About

Manage your vms and its resources

Parameters:
- `teamID`: To access services in a team

## Authentication

- `jwt`: HTTP bearer (JWT) → `Authorization: Bearer <token>`
- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| VMs | `GET` | `/vm` | [Get all vms](#get-all-vms) |
| VMs | `POST` | `/vm` | [Create a vm](#create-a-vm) |
| VMs | `GET` | `/vm/{id}` | [Get vm details](#get-vm-details) |
| VMs | `DELETE` | `/vm/{id}` | [Delete a vm](#delete-a-vm) |
| VMs | `POST` | `/vm/unfreeze/{id}` | [Unfreeze a vm](#unfreeze-a-vm) |
| VMs | `GET` | `/vm/traffic-graph/{id}` | [Get traffic graph of a vm](#get-traffic-graph-of-a-vm) |
| VMs | `GET` | `/vm/traffic-volume/{id}` | [Get traffic volume of a vm](#get-traffic-volume-of-a-vm) |
| VMs | `PATCH` | `/vm/power/{id}` | [Set vm power](#set-vm-power) |
| VMs | `GET` | `/vm/disk/{id}` | [Get disk details](#get-disk-details) |
| VMs | `POST` | `/vm/disk/{id}` | [Create a new disk for a VM](#create-a-new-disk-for-a-vm) |
| VMs | `POST` | `/vm/disk/{vmID}/{diskID}` | [Extend a vm Disk](#extend-a-vm-disk) |
| VMs | `DELETE` | `/vm/disk/{vmID}/{diskID}` | [Delete a disk](#delete-a-disk) |
| VMs | `POST` | `/vm/reset-network/{id}` | [Reset a vm network](#reset-a-vm-network) |
| VMs | `GET` | `/vm/operation/{id}` | [Get vm operations](#get-vm-operations) |
| VMs | `POST` | `/vm/reset-password/{id}` | [Reset a vm password](#reset-a-vm-password) |
| VMs | `PATCH` | `/vm/resize/{id}` | [Resize a vm](#resize-a-vm) |
| VMs | `GET` | `/plans` | [Get all plans](#get-all-plans) |
| VMs | `GET` | `/oss` | [Get all available operating systems](#get-all-available-operating-systems) |

## VMs

Manage your VMs

### Get all vms

`GET /vm`

get all vms that user owns

Operation ID: `getVMs`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `401` | Missing authentication |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `vms` | object[] |  |  |
| `vms[]._id` | string |  |  |
| `vms[].plan` | string |  |  |
| `vms[].OS` | string |  |  |
| `vms[].state` | string |  | One of: `CREATED`, `CREATING`, `FROZEN`, `DELETED`, `DELETING` |
| `vms[].name` | string |  | vm name |
| `vms[].createdAt` | string |  |  |
| `vms[].power` | string |  | One of: `POWERED_ON`, `POWERED_OFF`, `SUSPENDED` |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "vms": [
    {
      "_id": "string",
      "plan": "string",
      "OS": "string",
      "state": "CREATED",
      "name": "string",
      "createdAt": "string",
      "power": "POWERED_ON"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/vm" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create a vm

`POST /vm`

create a vm that user owns

Operation ID: `createVM`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string |  | Lowercase vm name |
| `OS` | string |  | The os name One of: `ubuntu-24.04`, `ubuntu-22.04`, `debian-12.9` |
| `plan` | string |  | The plan of app that you want to create One of: `standard-base-g2`, `standard-plus-g2`, `pro-g2`, `pro-plus-g2`, `express-g2`, `express-plus-g2` |
| `config` | object |  | The config of vm that you want to create |
| `config.sshPort` | string |  |  |
| `config.SSHKeys` | string[] |  |  |

Example:

```json
{
  "name": "string",
  "OS": "ubuntu-24.04",
  "plan": "standard-base-g2",
  "config": {
    "sshPort": "string",
    "SSHKeys": [
      "string"
    ]
  }
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `412` | Precondition failed |  |
| `429` | Too many request |  |
| `402` | Payment required |  |
| `409` | Conflict |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `taskID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "taskID": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://iaas-api.liara.ir/vm" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string", "OS": "ubuntu-24.04", "plan": "standard-base-g2", "config": {"sshPort": "string", "SSHKeys": ["string"]}}'
```

---

### Get vm details

`GET /vm/{id}`

get a vm that user owns

Operation ID: `getVMDetails`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `401` | Missing authentication |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | string |  |  |
| `plan` | string |  |  |
| `OS` | string |  |  |
| `state` | string |  | One of: `CREATED`, `RUNNING`, `STOPPED`, `DELETED` |
| `config` | object |  |  |
| `config.sshPort` | string |  |  |
| `config.SSHKeys` | string[] |  |  |
| `config.rootPassword` | string |  |  |
| `config.hostname` | string |  |  |
| `name` | string |  |  |
| `createdAt` | string |  |  |
| `guestState` | string |  |  |
| `power` | string |  | One of: `POWERED_ON`, `POWERED_OFF` |
| `IPs` | object[] |  |  |
| `IPs[].address` | string |  |  |
| `IPs[].version` | string |  |  |
| `planDetails` | object |  |  |
| `planDetails.available` | boolean |  |  |
| `planDetails.region` | string |  |  |
| `planDetails.monthlyPrice` | number |  |  |
| `planDetails.hourlyPrice` | number |  |  |
| `planDetails.volume` | number |  |  |
| `planDetails.RAM` | object |  |  |
| `planDetails.RAM.amount` | number |  |  |
| `planDetails.CPU` | object |  |  |
| `planDetails.CPU.amount` | number |  |  |
| `planDetails.IPv4MonthlyPrice` | number[] |  |  |
| `planDetails.IPv4HourlyPrice` | number[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "_id": "string",
  "plan": "string",
  "OS": "string",
  "state": "CREATED",
  "config": {
    "sshPort": "string",
    "SSHKeys": [
      "string"
    ],
    "rootPassword": "string",
    "hostname": "string"
  },
  "name": "string",
  "createdAt": "string",
  "guestState": "string",
  "power": "POWERED_ON",
  "IPs": [
    {
      "address": "string",
      "version": "string"
    }
  ],
  "planDetails": {
    "available": false,
    "region": "string",
    "monthlyPrice": 0,
    "hourlyPrice": 0,
    "volume": 0,
    "RAM": {
      "amount": 0
    },
    "CPU": {
      "amount": 0
    },
    "IPv4MonthlyPrice": [
      0
    ],
    "IPv4HourlyPrice": [
      0
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/vm/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete a vm

`DELETE /vm/{id}`

delete a vm that user owns

Operation ID: `deleteVM`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `401` | Missing authentication |  |
| `404` | VM not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `taskID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "taskID": "string"
}
```

</details>

**Example request**

```bash
curl -X DELETE "https://iaas-api.liara.ir/vm/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Unfreeze a vm

`POST /vm/unfreeze/{id}`

unfreeze a vm that user owns

Operation ID: `unfreezeVM`

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
| `404` | VM not found |  |
| `402` | Not enough balance |  |

**Example request**

```bash
curl -X POST "https://iaas-api.liara.ir/vm/unfreeze/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get traffic graph of a vm

`GET /vm/traffic-graph/{id}`

get traffic graph of a vm that user owns

Operation ID: `getVMTrafficGraph`

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
| `404` | VM not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `[].minute` | integer |  |  |
| `[].dstip` | string |  |  |
| `[].sumbytes` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
[
  {
    "minute": 0,
    "dstip": "string",
    "sumbytes": "string"
  }
]
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/vm/traffic-graph/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get traffic volume of a vm

`GET /vm/traffic-volume/{id}`

get traffic volume of a vm that user owns

Operation ID: `getVMTrafficVolume`

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
| `404` | VM not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `[].dstip` | string |  |  |
| `[].sumbytes` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
[
  {
    "dstip": "string",
    "sumbytes": "string"
  }
]
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/vm/traffic-volume/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Set vm power

`PATCH /vm/power/{id}`

set power of a vm that user owns

Operation ID: `setVMPower`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | string |  |  |

Example:

```json
{
  "action": "string"
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
curl -X PATCH "https://iaas-api.liara.ir/vm/power/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "string"}'
```

---

### Get disk details

`GET /vm/disk/{id}`

get disk details of a vm that user owns

Operation ID: `getVMDiskDetails`

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
| `404` | VM not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `availableSize` | number |  |  |
| `disks` | object[] |  |  |
| `disks[]._id` | string |  |  |
| `disks[].name` | string |  |  |
| `disks[].size` | number |  |  |
| `disks[].createdAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "availableSize": 0,
  "disks": [
    {
      "_id": "string",
      "name": "string",
      "size": 0,
      "createdAt": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/vm/disk/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create a new disk for a VM

`POST /vm/disk/{id}`

create a disk for a vm that user owns

Operation ID: `createVMDisk`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `size` | number |  |  |

Example:

```json
{
  "size": 0
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Disk successfully created |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | VM not found |  |
| `428` | There is not enough space |  |

**Example request**

```bash
curl -X POST "https://iaas-api.liara.ir/vm/disk/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"size": 0}'
```

---

### Extend a vm Disk

`POST /vm/disk/{vmID}/{diskID}`

extend a vm that user owns

Operation ID: `extendVMDisk`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `vmID` | path | string | yes |  |
| `diskID` | path | string | yes |  |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `newSize` | number |  |  |

Example:

```json
{
  "newSize": 0
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `428` | There is not enough space |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `taskID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "taskID": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://iaas-api.liara.ir/vm/disk/{vmID}/{diskID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newSize": 0}'
```

---

### Delete a disk

`DELETE /vm/disk/{vmID}/{diskID}`

Delete a disk of a vm that user owns

Operation ID: `DeleteVMDisk`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `vmID` | path | string | yes |  |
| `diskID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation |  |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | VM not found |  |

**Example request**

```bash
curl -X DELETE "https://iaas-api.liara.ir/vm/disk/{vmID}/{diskID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Reset a vm network

`POST /vm/reset-network/{id}`

reset network a vm that user owns

Operation ID: `resetVMNetwork`

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
| `409` | VM is not powered off |  |

**Example request**

```bash
curl -X POST "https://iaas-api.liara.ir/vm/reset-network/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get vm operations

`GET /vm/operation/{id}`

get operations of a vm that user owns

Operation ID: `getVMOperations`

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
| `404` | VM not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `operations` | object[] |  |  |
| `operations[].name` | string |  |  |
| `operations[].state` | string |  |  |
| `operations[].createdAt` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "operations": [
    {
      "name": "string",
      "state": "string",
      "createdAt": "string"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/vm/operation/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Reset a vm password

`POST /vm/reset-password/{id}`

reset password of a vm that user owns

Operation ID: `resetVMPassword`

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
| `409` | VM is not powered off |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `password` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "password": "string"
}
```

</details>

**Example request**

```bash
curl -X POST "https://iaas-api.liara.ir/vm/reset-password/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Resize a vm

`PATCH /vm/resize/{id}`

resize a vm that user owns

Operation ID: `resizeVM`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | string | yes |  |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `plan` | string |  | One of: `standard-base-g2`, `standard-plus-g2`, `pro-g2`, `pro-plus-g2`, `express-g2`, `express-plus-g2` |

Example:

```json
{
  "plan": "standard-base-g2"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |
| `400` | Bad request |  |
| `401` | Missing authentication |  |
| `404` | VM not found |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `taskID` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "taskID": "string"
}
```

</details>

**Example request**

```bash
curl -X PATCH "https://iaas-api.liara.ir/vm/resize/{id}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "standard-base-g2"}'
```

---

### Get all plans

`GET /plans`

get all Iaas plans

Operation ID: `getPlans`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `plans` | object |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "plans": {}
}
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/plans" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get all available operating systems

`GET /oss`

Operation ID: `getOperatingSystems`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successful operation | `application/json` |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `ubuntu` | string[] |  |  |
| `debian` | string[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "ubuntu": [
    "string"
  ],
  "debian": [
    "string"
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://iaas-api.liara.ir/oss" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
