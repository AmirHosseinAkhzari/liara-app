# Database Inspector

> Generated from [`specs/database-inspector.yaml`](../../specs/database-inspector.yaml) (source: https://developers.liara.ir/spec/database-inspector.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** Liara Database Inspector API Documentaion  
**Version:** 1.0.0  
**Base URL:** `https://{database-inspector-url}`  
**Endpoints:** 11

> The base URL contains a variable assigned per resource by Liara (see the console / the related service's info endpoint).

## About

For managing databases in console

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`
- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Database Inspector | `GET` | `/v1/databases/{databaseID}/roles` | [Get All Roles in Database](#get-all-roles-in-database) |
| Database Inspector | `POST` | `/v1/databases/{databaseID}/roles` | [Create Role in database](#create-role-in-database) |
| Database Inspector | `PUT` | `/v1/databases/{databaseID}/roles/{roleName}` | [Update Role](#update-role) |
| Database Inspector | `DELETE` | `/v1/databases/{databaseID}/roles/{roleName}` | [Delete Role](#delete-role) |
| Database Inspector | `GET` | `/v1/databases/{databaseID}/datasets` | [get all datasets in database (for example tables in SQL databases)](#get-all-datasets-in-database-for-example-tables-in-sql-databases) |
| Database Inspector | `GET` | `/v1/databases/{databaseID}/datasets/{datasetName}` | [get dataset in database using its name](#get-dataset-in-database-using-its-name) |
| Database Inspector | `POST` | `/v1/databases/{databaseID}/queries` | [Execute custom query](#execute-custom-query) |
| Database Inspector | `POST` | `/v1/databases/{databaseID}/datasets/{datasetName}/filter` | [Filter dataset data](#filter-dataset-data) |
| Database Inspector | `POST` | `/v1/databases/{databaseID}/datasets/{datasetName}/data` | [Create data in dataset](#create-data-in-dataset) |
| Database Inspector | `PUT` | `/v1/databases/{databaseID}/datasets/{datasetName}/data` | [Update data in dataset](#update-data-in-dataset) |
| Database Inspector | `DELETE` | `/v1/databases/{databaseID}/datasets/{datasetName}/data` | [Delete data in dataset](#delete-data-in-dataset) |

## Database Inspector

### Get All Roles in Database

`GET /v1/databases/{databaseID}/roles`

Operation ID: `getAllRoles`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The ID of the database |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Successfully retrieved all roles | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object[] |  |  |
| `data[].rolename` | string |  | Example: `"root"` |
| `data[].is_superuser` | boolean |  | Example: `true` |
| `data[].can_inherit_roles` | boolean |  | Example: `true` |
| `data[].can_create_roles` | boolean |  | Example: `true` |
| `data[].can_create_databases` | boolean |  | Example: `true` |
| `data[].can_login` | boolean |  | Example: `true` |
| `data[].can_replicate` | boolean |  | Example: `true` |
| `data[].connection_limit` | integer |  | Example: `-1` |
| `data[].valid_until` | string |  | Example: `null` |
| `data[].member_of` | string |  | Example: `"{}"` |
| `data[].inherited_roles` | string |  | Example: `"{}"` |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "data": [
    {
      "rolename": "root",
      "is_superuser": true,
      "can_inherit_roles": true,
      "can_create_roles": true,
      "can_create_databases": true,
      "can_login": true,
      "can_replicate": true,
      "connection_limit": -1,
      "valid_until": null,
      "member_of": "{}",
      "inherited_roles": "{}"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://{database-inspector-url}/v1/databases/{databaseID}/roles" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Create Role in database

`POST /v1/databases/{databaseID}/roles`

Operation ID: `createRole`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `rolename` | string |  | Role name Example: `"new_role"` |
| `password` | string |  | Password for the role (optional) Example: `"securepassword123"` |
| `connectionLimit` | integer |  | Maximum number of connections for the role (optional) Example: `10` |
| `validUntil` | string (date-time) |  | Expiration date for the role (optional) Example: `"2025-12-31T23:59:59Z"` |
| `privileges` | string[] |  | List of privileges for the role One of: `createdb`, `inherit`, `superuser`, `createrole`, `bypassrls`, `replication` |

Example:

```json
{
  "rolename": "new_role",
  "password": "securepassword123",
  "connectionLimit": 10,
  "validUntil": "2025-12-31T23:59:59Z",
  "privileges": [
    "createdb",
    "superuser"
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully Created a database Role. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  | Example: `"Role created."` |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "message": "Role created."
}
```

</details>

**Example request**

```bash
curl -X POST "https://{database-inspector-url}/v1/databases/{databaseID}/roles" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rolename": "new_role", "password": "securepassword123", "connectionLimit": 10, "validUntil": "2025-12-31T23:59:59Z", "privileges": ["createdb", "superuser"]}'
```

---

### Update Role

`PUT /v1/databases/{databaseID}/roles/{roleName}`

Operation ID: `updateRole`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |
| `roleName` | path | string | yes | The name of role |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `password` | string |  | Password for the role (optional) Example: `"securepassword123"` |
| `connectionLimit` | integer |  | Maximum number of connections for the role (optional) Example: `10` |
| `validUntil` | string (date-time) |  | Expiration date for the role (optional) Example: `"2025-12-31T23:59:59Z"` |
| `privileges` | string[] |  | List of privileges for the role One of: `createdb`, `inherit`, `superuser`, `createrole`, `bypassrls`, `replication` |

Example:

```json
{
  "password": "securepassword123",
  "connectionLimit": 10,
  "validUntil": "2025-12-31T23:59:59Z",
  "privileges": [
    "createdb",
    "superuser"
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully Updated a database Role. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  | Example: `"Role updated."` |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "message": "Role updated."
}
```

</details>

**Example request**

```bash
curl -X PUT "https://{database-inspector-url}/v1/databases/{databaseID}/roles/{roleName}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "securepassword123", "connectionLimit": 10, "validUntil": "2025-12-31T23:59:59Z", "privileges": ["createdb", "superuser"]}'
```

---

### Delete Role

`DELETE /v1/databases/{databaseID}/roles/{roleName}`

Operation ID: `deleteRole`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |
| `roleName` | path | string | yes | The name of role |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully Deleted a database Role. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  | Example: `"Role deleted."` |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "message": "Role deleted."
}
```

</details>

**Example request**

```bash
curl -X DELETE "https://{database-inspector-url}/v1/databases/{databaseID}/roles/{roleName}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### get all datasets in database (for example tables in SQL databases)

`GET /v1/databases/{databaseID}/datasets`

Operation ID: `getAllDatasets`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully got datasets. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object[] |  |  |
| `data[].dataset_name` | string |  | Example: `"users"` |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "data": [
    {
      "dataset_name": "users"
    }
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://{database-inspector-url}/v1/databases/{databaseID}/datasets" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### get dataset in database using its name

`GET /v1/databases/{databaseID}/datasets/{datasetName}`

Operation ID: `getDatasetByName`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of databse |
| `datasetName` | path | string | yes | The name of dataset (for example table in sql databases) |
| `page` | query | integer |  | page |
| `count` | query | integer |  | count |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully got dataset by name. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object[] |  |  |
| `schema` | object |  |  |
| `count` | integer |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "data": [
    {}
  ],
  "schema": {},
  "count": 0
}
```

</details>

**Example request**

```bash
curl -X GET "https://{database-inspector-url}/v1/databases/{databaseID}/datasets/{datasetName}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Execute custom query

`POST /v1/databases/{databaseID}/queries`

Operation ID: `queries`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string |  |  |

Example:

```json
{
  "query": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully got dataset by name. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object[] |  |  |
| `schema` | object |  |  |
| `count` | integer |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "data": [
    {}
  ],
  "schema": {},
  "count": 0
}
```

</details>

**Example request**

```bash
curl -X POST "https://{database-inspector-url}/v1/databases/{databaseID}/queries" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "string"}'
```

---

### Filter dataset data

`POST /v1/databases/{databaseID}/datasets/{datasetName}/filter`

Operation ID: `filterDataset`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |
| `datasetName` | path | string | yes | The name of dataset |
| `page` | query | integer |  | page |
| `count` | query | integer |  | count |

**Request body** — `application/json` (required)

| Field | Type | Required | Description |
|---|---|---|---|
| `filter` | object[] |  |  |
| `filter[].column` | string |  | Example: `"id"` |
| `filter[].operator` | string |  | Example: `">="` |
| `filter[].value` | any |  | Example: `2` |

Example:

```json
{
  "filter": [
    {
      "column": "id",
      "operator": ">=",
      "value": 2
    }
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully got dataset by name. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object[] |  |  |
| `schema` | object |  |  |
| `count` | integer |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "data": [
    {}
  ],
  "schema": {},
  "count": 0
}
```

</details>

**Example request**

```bash
curl -X POST "https://{database-inspector-url}/v1/databases/{databaseID}/datasets/{datasetName}/filter" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filter": [{"column": "id", "operator": ">=", "value": 2}]}'
```

---

### Create data in dataset

`POST /v1/databases/{databaseID}/datasets/{datasetName}/data`

Operation ID: `createData`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |
| `datasetName` | path | string | yes | The name of dataset |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully inserted the data. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  | Example: `"Data created."` |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "message": "Data created."
}
```

</details>

**Example request**

```bash
curl -X POST "https://{database-inspector-url}/v1/databases/{databaseID}/datasets/{datasetName}/data" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Update data in dataset

`PUT /v1/databases/{databaseID}/datasets/{datasetName}/data`

Operation ID: `updateData`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |
| `datasetName` | path | string | yes | The name of dataset |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully updated data. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  | Example: `"Data updated."` |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "message": "Data updated."
}
```

</details>

**Example request**

```bash
curl -X PUT "https://{database-inspector-url}/v1/databases/{databaseID}/datasets/{datasetName}/data" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Delete data in dataset

`DELETE /v1/databases/{databaseID}/datasets/{datasetName}/data`

Operation ID: `deleteData`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `databaseID` | path | string | yes | The id of database |
| `datasetName` | path | string | yes | The name of dataset |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | Successfully got dataset by name. | `application/json` |
| `400` | Bad request (invalid database ID) | `application/json` |
| `401` | Unauthorized (missing or invalid authentication) | `application/json` |
| `404` | Not Found (host unreachable or no roles found) | `application/json` |
| `422` | Validation error |  |
| `409` | Database-related error (e.g., database or bridge in an invalid state) |  |
| `500` | Unexpected server error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string |  | Example: `"Data deleted."` |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "message": "Data deleted."
}
```

</details>

**Example request**

```bash
curl -X DELETE "https://{database-inspector-url}/v1/databases/{databaseID}/datasets/{datasetName}/data" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
