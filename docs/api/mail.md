# Mail Server

> Generated from [`specs/mail.yaml`](../../specs/mail.yaml) (source: https://developers.liara.ir/spec/mail.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** Liara Mail API Documentaion  
**Version:** 1.0.0  
**Base URL:** `https://mail-service.liara.ir`  
**Endpoints:** 40

## About

A fully featured mail delivery platform for incoming & outgoing e-mail

Parameters:
- `teamID`: To access services in a team

## Authentication

- `jwt`: API key in header `Authorization` → `Authorization: Bearer <token>`
- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| mails | `GET` | `/api/v1/mails` | [get all mail servers](#get-all-mail-servers) |
| mails | `POST` | `/api/v1/mails` | [create mail server](#create-mail-server) |
| mails | `GET` | `/api/v1/mails/{mailServerID}` | [get single mail server](#get-single-mail-server) |
| mails | `PATCH` | `/api/v1/mails/{mailServerID}` | [edit mail server](#edit-mail-server) |
| mails | `DELETE` | `/api/v1/mails/{mailServerID}` | [delete mail server](#delete-mail-server) |
| mails | `GET` | `/api/v1/mails/{mailServerID}/counts` | [count number of sent mails every day](#count-number-of-sent-mails-every-day) |
| mails | `GET` | `/api/v1/mails/{mailServerID}/dns-check` | [mail server check dns status](#mail-server-check-dns-status) |
| mails | `GET` | `/api/v1/mails/{domain}/check-availability` | [check if domain name is available](#check-if-domain-name-is-available) |
| mails | `PATCH` | `/api/v1/mails/{mailServerID}/unfreeze` | [unfreeze mail server - If you had reserved a plan, it will be your new plan.](#unfreeze-mail-server-if-you-had-reserved-a-plan-it-will-be-your-new-plan) |
| mails | `GET` | `/api/v1/mails/{mailServerID}/metrics` | [gain more info on recent usage](#gain-more-info-on-recent-usage) |
| inboundrules | `GET` | `/api/v1/mails/{mailServerID}/inboundrules` | [get all inbound rules.](#get-all-inbound-rules) |
| inboundrules | `POST` | `/api/v1/mails/{mailServerID}/inboundrules` | [add inbound rule.](#add-inbound-rule) |
| inboundrules | `DELETE` | `/api/v1/mail/{mailServerID}/inboundrules/{inboundruleID}` | [delete inbound rule.](#delete-inbound-rule) |
| smtp | `GET` | `/api/v1/mails/{mailServerID}/smtp-credentials` | [get credential to connect to mail server with SMTP](#get-credential-to-connect-to-mail-server-with-smtp) |
| smtp | `POST` | `/api/v1/mails/{mailServerID}/smtp-credentials` | [generate credentials to connet mail server with SMTP](#generate-credentials-to-connet-mail-server-with-smtp) |
| smtp | `PATCH` | `/api/v1/mails/{mailServerID}/smtp-credentials` | [revoke credentials to connect mail server with SMTP](#revoke-credentials-to-connect-mail-server-with-smtp) |
| smtp | `DELETE` | `/api/v1/mails/{mailServerID}/smtp-credentials/{username}` | [delete smtp credential](#delete-smtp-credential) |
| accounts | `GET` | `/api/v1/mails/{mailServerID}/accounts` | [get all mail accounts](#get-all-mail-accounts) |
| accounts | `POST` | `/api/v1/mails/{mailServerID}/accounts` | [add mail account](#add-mail-account) |
| accounts | `GET` | `/api/v1/mails/{mailServerID}/accounts/{accountName}/check-availability` | [check if mail account is available](#check-if-mail-account-is-available) |
| accounts | `DELETE` | `/api/v1/mails/{mailServerID}/accounts/{accountID}` | [delete mail account](#delete-mail-account) |
| messages | `GET` | `/api/v1/mails/{mailServerID}/messages` | [get all mails](#get-all-mails) |
| messages | `POST` | `/api/v1/mails/{mailServerID}/messages` | [send a mail](#send-a-mail) |
| messages | `GET` | `/api/v1/mails/{mailServerID}/messages/{messageID}` | [get single mail](#get-single-mail) |
| messages | `GET` | `/api/v1/mails/{mailServerID}/messages/{messageID}/render` | [get single mail html](#get-single-mail-html) |
| messages | `POST` | `/api/v1/mails/{mailServerID}/messages/{messageID}/temporary-access` | [generate temporary access to email html](#generate-temporary-access-to-email-html) |
| messages | `PATCH` | `/api/v1/mails/{mailServerID}/messages/{messageID}/` | [trash and untrash a message](#trash-and-untrash-a-message) |
| messages | `DELETE` | `/api/v1/mails/{mailServerID}/messages/{messageID}/` | [delete a message permenantly](#delete-a-message-permenantly) |
| forward | `GET` | `/api/v1/mails/{mailServerID}/accounts/{accountID}/forwards` | [get all extra address to forwarding mails](#get-all-extra-address-to-forwarding-mails) |
| forward | `POST` | `/api/v1/mails/{mailServerID}/accounts/{accountID}/forwards` | [add address endpoint to forwarding mails](#add-address-endpoint-to-forwarding-mails) |
| forward | `DELETE` | `/api/v1/mails/{mailServerID}/accounts/{accountID}/forwards/{addressID}` | [delete extra endpoint address](#delete-extra-endpoint-address) |
| attachments | `GET` | `/api/v1/mails/{mailServerID}/messages/{messageID}/attachments` | [get all attachments for message](#get-all-attachments-for-message) |
| attachments | `GET` | `/api/v1/mails/{mailServerID}/messages/{messageID}/attachments/{attachmentID}` | [download attachment](#download-attachment) |
| event | `GET` | `/api/v1/mails/{mailServerID}/messages/{messageID}/events` | [get all events for message](#get-all-events-for-message) |
| tags | `GET` | `/api/v1/mails/{mailServerID}/tags` | [get all tags](#get-all-tags) |
| tags | `POST` | `/api/v1/mails/{mailServerID}/tags` | [create a new tag](#create-a-new-tag) |
| tags | `GET` | `/api/v1/mails/{mailServerID}/tags/stats` | [get tags stats](#get-tags-stats) |
| plan | `GET` | `/api/v1/mails/{mailServerID}/plan` | [get cuurent mail server plan history](#get-cuurent-mail-server-plan-history) |
| plan | `POST` | `/api/v1/mails/{mailServerID}/plan` | [change mail server plan](#change-mail-server-plan) |
| plan | `DELETE` | `/api/v1/mails/{mailServerID}/plan` | [remove a reserved plan](#remove-a-reserved-plan) |

## mails

Everything about your mails

### get all mail servers

`GET /api/v1/mails`

Operation ID: `getMails`

Auth: `bearerAuth` or `jwt`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Ok | `application/json` |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.mailServers` | object[] |  |  |
| `data.mailServers[].dns_setup` | object |  |  |
| `data.mailServers[].dns_setup.dkim` | object |  |  |
| `data.mailServers[].dns_setup.dkim.dkim_error` | string |  |  |
| `data.mailServers[].dns_setup.dkim.dkim_record` | string |  |  |
| `data.mailServers[].dns_setup.dkim.dkim_record_name` | string |  |  |
| `data.mailServers[].dns_setup.dkim.dkim_status` | string |  |  |
| `data.mailServers[].dns_setup.mx_record` | object |  |  |
| `data.mailServers[].dns_setup.mx_record.mx_error` | string |  |  |
| `data.mailServers[].dns_setup.mx_record.mx_status` | string |  |  |
| `data.mailServers[].dns_setup.mx_record.mx_record_value` | string |  |  |
| `data.mailServers[].dns_setup.return_path` | object |  |  |
| `data.mailServers[].dns_setup.return_path.return_path_domain` | string |  |  |
| `data.mailServers[].dns_setup.return_path.return_path_error` | string |  |  |
| `data.mailServers[].dns_setup.return_path.return_path_status` | string |  |  |
| `data.mailServers[].dns_setup.return_path.return_path_value` | string |  |  |
| `data.mailServers[].dns_setup.spf` | object |  |  |
| `data.mailServers[].dns_setup.spf.spf_error` | string |  |  |
| `data.mailServers[].dns_setup.spf.spf_record` | string |  |  |
| `data.mailServers[].dns_setup.spf.spf_status` | string |  |  |
| `data.mailServers[].domain` | string |  |  |
| `data.mailServers[].recordsStatus` | string |  |  |
| `data.mailServers[].status` | string |  |  |
| `data.mailServers[].rateLimitTier` | object |  |  |
| `data.mailServers[].rateLimitTier.hourly` | number |  |  |
| `data.mailServers[].rateLimitTier.daily` | number |  |  |
| `data.mailServers[].rateLimitTier.monthly` | number |  |  |
| `data.mailServers[].createdAt` | string |  |  |
| `data.mailServers[].id` | string |  |  |
| `data.mailServers[].smtp_server` | string |  |  |
| `data.mailServers[].smtp_port` | number |  |  |
| `data.mailServers[].rootPartOfDomain` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "mailServers": [
      {
        "dns_setup": {
          "dkim": {
            "dkim_error": null,
            "dkim_record": null,
            "dkim_record_name": null,
            "dkim_status": null
          },
          "mx_record": {
            "mx_error": null,
            "mx_status": null,
            "mx_record_value": null
          },
          "return_path": {
            "return_path_domain": null,
            "return_path_error": null,
            "return_path_status": null,
            "return_path_value": null
          },
          "spf": {
            "spf_error": null,
            "spf_record": null,
            "spf_status": null
          }
        },
        "domain": "string",
        "recordsStatus": "string",
        "status": "string",
        "rateLimitTier": {
          "hourly": 0,
          "daily": 0,
          "monthly": 0
        },
        "createdAt": "string",
        "id": "string",
        "smtp_server": "string",
        "smtp_port": 0,
        "rootPartOfDomain": "string"
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### create mail server

`POST /api/v1/mails`

Operation ID: `postMails`

Auth: `bearerAuth` or `jwt`

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `plan` | string | yes | Max length: 64 |
| `domain` | string | yes |  |
| `mode` | string | yes | One of: `DEV`, `LIVE` |

Example:

```json
{
  "plan": "string",
  "domain": "string",
  "mode": "DEV"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK | `application/json` |
| `400` | Invalid request for plan |  |
| `402` | Not enough balance |  |
| `403` | Allowed to create only one Mail Server on the free plan |  |
| `500` | Unexpected error |  |

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
curl -X POST "https://mail-service.liara.ir/api/v1/mails" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "string", "domain": "string", "mode": "DEV"}'
```

---

### get single mail server

`GET /api/v1/mails/{mailServerID}`

Operation ID: `getSingleMailServer`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.mailServer` | object |  |  |
| `data.mailServer.dns_setup` | object |  |  |
| `data.mailServer.dns_setup.dkim` | object |  |  |
| `data.mailServer.dns_setup.dkim.dkim_error` | string |  |  |
| `data.mailServer.dns_setup.dkim.dkim_record` | string |  |  |
| `data.mailServer.dns_setup.dkim.dkim_record_name` | string |  |  |
| `data.mailServer.dns_setup.dkim.dkim_status` | string |  |  |
| `data.mailServer.dns_setup.mx_record` | object |  |  |
| `data.mailServer.dns_setup.mx_record.mx_error` | string |  |  |
| `data.mailServer.dns_setup.mx_record.mx_status` | string |  |  |
| `data.mailServer.dns_setup.mx_record.mx_record_value` | string |  |  |
| `data.mailServer.dns_setup.return_path` | object |  |  |
| `data.mailServer.dns_setup.return_path.return_path_domain` | string |  |  |
| `data.mailServer.dns_setup.return_path.return_path_error` | string |  |  |
| `data.mailServer.dns_setup.return_path.return_path_status` | string |  |  |
| `data.mailServer.dns_setup.return_path.return_path_value` | string |  |  |
| `data.mailServer.dns_setup.spf` | object |  |  |
| `data.mailServer.dns_setup.spf.spf_error` | string |  |  |
| `data.mailServer.dns_setup.spf.spf_record` | string |  |  |
| `data.mailServer.dns_setup.spf.spf_status` | string |  |  |
| `data.mailServer.domain` | string |  |  |
| `data.mailServer.recordsStatus` | string |  |  |
| `data.mailServer.status` | string |  |  |
| `data.mailServer.rateLimitTier` | object |  |  |
| `data.mailServer.rateLimitTier.hourly` | number |  |  |
| `data.mailServer.rateLimitTier.daily` | number |  |  |
| `data.mailServer.rateLimitTier.monthly` | number |  |  |
| `data.mailServer.createdAt` | string |  |  |
| `data.mailServer.id` | string |  |  |
| `data.mailServer.smtp_server` | string |  |  |
| `data.mailServer.smtp_port` | number |  |  |
| `data.mailServer.rootPartOfDomain` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "mailServer": {
      "dns_setup": {
        "dkim": {
          "dkim_error": "string",
          "dkim_record": "string",
          "dkim_record_name": "string",
          "dkim_status": "string"
        },
        "mx_record": {
          "mx_error": "string",
          "mx_status": "string",
          "mx_record_value": "string"
        },
        "return_path": {
          "return_path_domain": "string",
          "return_path_error": "string",
          "return_path_status": "string",
          "return_path_value": "string"
        },
        "spf": {
          "spf_error": "string",
          "spf_record": "string",
          "spf_status": "string"
        }
      },
      "domain": "string",
      "recordsStatus": "string",
      "status": "string",
      "rateLimitTier": {
        "hourly": 0,
        "daily": 0,
        "monthly": 0
      },
      "createdAt": "string",
      "id": "string",
      "smtp_server": "string",
      "smtp_port": 0,
      "rootPartOfDomain": "string"
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### edit mail server

`PATCH /api/v1/mails/{mailServerID}`

Operation ID: `editMailServer`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `mode` | string | yes | One of: `DEV`, `LIVE` |
| `inboundSpamThreshold` | number | yes |  |

Example:

```json
{
  "mode": "DEV",
  "inboundSpamThreshold": 0
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

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
curl -X PATCH "https://mail-service.liara.ir/api/v1/mails/{mailServerID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "DEV", "inboundSpamThreshold": 0}'
```

---

### delete mail server

`DELETE /api/v1/mails/{mailServerID}`

Operation ID: `deleteMailServer`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://mail-service.liara.ir/api/v1/mails/{mailServerID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### count number of sent mails every day

`GET /api/v1/mails/{mailServerID}/counts`

Operation ID: `getCountMails`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `lastNDays` | query | number |  | Default: `30` Min: 1 Max: 180 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.emailPerDay` | object[] |  |  |
| `data.emailPerDay[].count` | number |  |  |
| `data.emailPerDay[].date` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "emailPerDay": [
      {
        "count": 0,
        "date": 0
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/counts" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### mail server check dns status

`GET /api/v1/mails/{mailServerID}/dns-check`

Operation ID: `checkMailServerDnsStatus`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.mailServer` | object |  |  |
| `data.mailServer.dns_setup` | object |  |  |
| `data.mailServer.dns_setup.dkim` | object |  |  |
| `data.mailServer.dns_setup.dkim.dkim_error` | string |  |  |
| `data.mailServer.dns_setup.dkim.dkim_record` | string |  |  |
| `data.mailServer.dns_setup.dkim.dkim_record_name` | string |  |  |
| `data.mailServer.dns_setup.dkim.dkim_status` | string |  |  |
| `data.mailServer.dns_setup.mx_record` | object |  |  |
| `data.mailServer.dns_setup.mx_record.mx_error` | string |  |  |
| `data.mailServer.dns_setup.mx_record.mx_status` | string |  |  |
| `data.mailServer.dns_setup.mx_record.mx_record_value` | string |  |  |
| `data.mailServer.dns_setup.return_path` | object |  |  |
| `data.mailServer.dns_setup.return_path.return_path_domain` | string |  |  |
| `data.mailServer.dns_setup.return_path.return_path_error` | string |  |  |
| `data.mailServer.dns_setup.return_path.return_path_status` | string |  |  |
| `data.mailServer.dns_setup.return_path.return_path_value` | string |  |  |
| `data.mailServer.dns_setup.spf` | object |  |  |
| `data.mailServer.dns_setup.spf.spf_error` | string |  |  |
| `data.mailServer.dns_setup.spf.spf_record` | string |  |  |
| `data.mailServer.dns_setup.spf.spf_status` | string |  |  |
| `data.mailServer.user` | string |  |  |
| `data.mailServer.domain` | string |  |  |
| `data.mailServer.recordsStatus` | string |  |  |
| `data.mailServer.mode` | string |  |  |
| `data.mailServer.status` | string |  |  |
| `data.mailServer.checkDNSRecord` | boolean |  |  |
| `data.mailServer.createdAt` | string |  |  |
| `data.mailServer.updatedAt` | string |  |  |
| `data.mailServer.id` | string |  |  |
| `data.mailServer.smtp_server` | string |  |  |
| `data.mailServer.smtp_port` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "mailServer": {
      "dns_setup": {
        "dkim": {
          "dkim_error": "string",
          "dkim_record": "string",
          "dkim_record_name": "string",
          "dkim_status": "string"
        },
        "mx_record": {
          "mx_error": "string",
          "mx_status": "string",
          "mx_record_value": "string"
        },
        "return_path": {
          "return_path_domain": "string",
          "return_path_error": "string",
          "return_path_status": "string",
          "return_path_value": "string"
        },
        "spf": {
          "spf_error": "string",
          "spf_record": "string",
          "spf_status": "string"
        }
      },
      "user": "string",
      "domain": "string",
      "recordsStatus": "string",
      "mode": "string",
      "status": "string",
      "checkDNSRecord": false,
      "createdAt": "string",
      "updatedAt": "string",
      "id": "string",
      "smtp_server": "string",
      "smtp_port": 0
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/dns-check" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### check if domain name is available

`GET /api/v1/mails/{domain}/check-availability`

Operation ID: `checkDomainAvailable`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `domain` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `500` | Unexpected error |  |

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
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{domain}/check-availability" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### unfreeze mail server - If you had reserved a plan, it will be your new plan.

`PATCH /api/v1/mails/{mailServerID}/unfreeze`

Operation ID: `unfreeze`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X PATCH "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/unfreeze" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### gain more info on recent usage

`GET /api/v1/mails/{mailServerID}/metrics`

Operation ID: `getMetrics`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.metrics` | object |  |  |
| `data.metrics.messagesCountToday` | number |  |  |
| `data.metrics.messagesCountThisMonth` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "metrics": {
      "messagesCountToday": 0,
      "messagesCountThisMonth": 0
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/metrics" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## inboundrules

Email address (or domain) that you would like to block from sending.

### get all inbound rules.

`GET /api/v1/mails/{mailServerID}/inboundrules`

Operation ID: `getAllInboundRules`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `409` | Rule already exists. |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.mailInboundrules` | object[] |  |  |
| `data.mailInboundrules[].createdAt` | string |  |  |
| `data.mailInboundrules[].rule` | string |  |  |
| `data.mailInboundrules[].mailServer` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "mailInboundrules": [
      {
        "createdAt": "string",
        "rule": "string",
        "mailServer": "string"
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/inboundrules" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### add inbound rule.

`POST /api/v1/mails/{mailServerID}/inboundrules`

Operation ID: `addInboundRule`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `rule` | string | yes |  |

Example:

```json
{
  "rule": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

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
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/inboundrules" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rule": "string"}'
```

---

### delete inbound rule.

`DELETE /api/v1/mail/{mailServerID}/inboundrules/{inboundruleID}`

Operation ID: `deleteInboundRule`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `inboundruleID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server or Inbound rule not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://mail-service.liara.ir/api/v1/mail/{mailServerID}/inboundrules/{inboundruleID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## smtp

SMTP endpoints.

### get credential to connect to mail server with SMTP

`GET /api/v1/mails/{mailServerID}/smtp-credentials`

Operation ID: `getCredential`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.credentials` | object[] |  |  |
| `data.credentials[].description` | string |  |  |
| `data.credentials[].createdAt` | string |  |  |
| `data.credentials[].username` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "credentials": [
      {
        "description": "string",
        "createdAt": "string",
        "username": "string"
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/smtp-credentials" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### generate credentials to connet mail server with SMTP

`POST /api/v1/mails/{mailServerID}/smtp-credentials`

Operation ID: `generateCredentials`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string |  | Max length: 1000 |

Example:

```json
{
  "description": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK | `application/json` |
| `400` | Bad Request |  |
| `403` | Allowed to create only 10 smtp credentials |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.username` | string |  |  |
| `data.passowrd` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "username": "string",
    "passowrd": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/smtp-credentials" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "string"}'
```

---

### revoke credentials to connect mail server with SMTP

`PATCH /api/v1/mails/{mailServerID}/smtp-credentials`

Operation ID: `revokeCredentials`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | string | yes |  |

Example:

```json
{
  "username": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server or Username not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.username` | string |  |  |
| `data.passowrd` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "username": "string",
    "passowrd": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X PATCH "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/smtp-credentials" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "string"}'
```

---

### delete smtp credential

`DELETE /api/v1/mails/{mailServerID}/smtp-credentials/{username}`

Operation ID: `deleteSmtpCredential`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `username` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server or SMTP Credential not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/smtp-credentials/{username}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## accounts

Accounts of your mails.

### get all mail accounts

`GET /api/v1/mails/{mailServerID}/accounts`

Operation ID: `getAllMailAccounts`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.domain` | string |  |  |
| `data.accounts` | object[] |  |  |
| `data.accounts[].name` | string |  |  |
| `data.accounts[].createdAt` | string |  |  |
| `data.accounts[].id` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "domain": "string",
    "accounts": [
      {
        "name": "string",
        "createdAt": "string",
        "id": "string"
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/accounts" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### add mail account

`POST /api/v1/mails/{mailServerID}/accounts`

Operation ID: `createMailACcount`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Max length: 64 |

Example:

```json
{
  "name": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `403` | Max number of accounts reached |  |
| `500` | Unexpected error |  |

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
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/accounts" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "string"}'
```

---

### check if mail account is available

`GET /api/v1/mails/{mailServerID}/accounts/{accountName}/check-availability`

Operation ID: `checkMailAvailable`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `accountName` | path | string | yes | Max length: 64 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `409` | Account already taken. |  |
| `500` | Unexpected error |  |

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
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/accounts/{accountName}/check-availability" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### delete mail account

`DELETE /api/v1/mails/{mailServerID}/accounts/{accountID}`

Operation ID: `deleteMailAccount`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `accountID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Account not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/accounts/{accountID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## messages

Messages endpoints.

### get all mails

`GET /api/v1/mails/{mailServerID}/messages`

Operation ID: `getAllMails`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `page` | query | number |  | Default: `1` |
| `count` | query | number |  | Default: `15` Max: 100 |
| `direction` | query | string | yes | One of: `incoming`, `outgoing` |
| `state` | query | string |  |  |
| `subject` | query | string |  |  |
| `from` | query | string |  |  |
| `to` | query | string |  |  |
| `isTrash` | query | boolean |  | Default: `false` |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.total` | number |  |  |
| `data.messages` | object[] |  |  |
| `data.messages[].createdAt` | string |  |  |
| `data.messages[].direction` | string |  |  |
| `data.messages[].from` | string |  |  |
| `data.messages[].hasHtml` | boolean |  |  |
| `data.messages[].isDev` | boolean |  |  |
| `data.messages[].isFree` | boolean |  |  |
| `data.messages[].spamScore` | boolean |  |  |
| `data.messages[].subject` | string |  |  |
| `data.messages[].to` | string |  |  |
| `data.messages[].text` | string |  |  |
| `data.messages[].status` | object |  |  |
| `data.messages[].status.event` | string |  |  |
| `data.messages[].status.state` | string |  |  |
| `data.messages[].status.details` | string |  |  |
| `data.messages[].id` | string |  |  |
| `data.messages[].spamReson` | object |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "total": 0,
    "messages": [
      {
        "createdAt": "string",
        "direction": "string",
        "from": "string",
        "hasHtml": false,
        "isDev": false,
        "isFree": false,
        "spamScore": false,
        "subject": "string",
        "to": "string",
        "text": "string",
        "status": {
          "event": "string",
          "state": "string",
          "details": "string"
        },
        "id": "string",
        "spamReson": {}
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages?direction=<direction>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### send a mail

`POST /api/v1/mails/{mailServerID}/messages`

Operation ID: `sendMail`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `html` | string |  |  |
| `text` | string |  |  |
| `subject` | string | yes |  |
| `to` | string | yes |  |
| `from` | string | yes |  |
| `replyTo` | string |  |  |
| `attachments` | object[] |  |  |
| `attachments[].name` | string | yes |  |
| `attachments[].content_type` | string | yes |  |
| `attachments[].data` | string | yes |  |

Example:

```json
{
  "html": "string",
  "text": "string",
  "subject": "string",
  "to": "string",
  "from": "string",
  "replyTo": "string",
  "attachments": [
    {
      "name": "string",
      "content_type": "string",
      "data": "string"
    }
  ]
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK | `application/json` |
| `400` | Bad Request |  |
| `403` | No valid dns records exists for this mail server |  |
| `404` | Mail Server not found |  |
| `406` | The source and destination addresses must not be the same |  |
| `429` | Too mnay requests |  |
| `500` | Unexpected error |  |

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
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"html": "string", "text": "string", "subject": "string", "to": "string", "from": "string", "replyTo": "string", "attachments": [{"name": "string", "content_type": "string", "data": "string"}]}'
```

---

### get single mail

`GET /api/v1/mails/{mailServerID}/messages/{messageID}`

Operation ID: `getSingleMail`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Message not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.message` | object |  |  |
| `data.message.createdAt` | string |  |  |
| `data.message.direction` | string |  |  |
| `data.message.from` | string |  |  |
| `data.message.hasHtml` | boolean |  |  |
| `data.message.isDev` | boolean |  |  |
| `data.message.isFree` | boolean |  |  |
| `data.message.spamScore` | boolean |  |  |
| `data.message.subject` | string |  |  |
| `data.message.to` | string |  |  |
| `data.message.text` | string |  |  |
| `data.message.status` | object |  |  |
| `data.message.status.event` | string |  |  |
| `data.message.status.state` | string |  |  |
| `data.message.status.details` | string |  |  |
| `data.message.id` | string |  |  |
| `data.message.spamReson` | object |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "message": {
      "createdAt": "string",
      "direction": "string",
      "from": "string",
      "hasHtml": false,
      "isDev": false,
      "isFree": false,
      "spamScore": false,
      "subject": "string",
      "to": "string",
      "text": "string",
      "status": {
        "event": "string",
        "state": "string",
        "details": "string"
      },
      "id": "string",
      "spamReson": {}
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### get single mail html

`GET /api/v1/mails/{mailServerID}/messages/{messageID}/render`

Operation ID: `getSingleMailHtml`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |
| `token` | query | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | success and returns some html text | `text/html` |
| `400` | Bad Request |  |
| `403` | Forbidden |  |
| `404` | Mail Server or Mail Message not found |  |
| `409` | Account already taken. |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}/render?token=<token>" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### generate temporary access to email html

`POST /api/v1/mails/{mailServerID}/messages/{messageID}/temporary-access`

Operation ID: `generateTemporary`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |
| `expiration` | query | number |  | Specifying hourly expiration schedule options Default: `1` Min: 1 Max: 168 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK | `application/json` |
| `400` | Bad Request |  |
| `403` | Generate token limitation |  |
| `404` | Mail Server or Mail Message not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>201</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.token` | string |  |  |

</details>

<details><summary>Response <code>201</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "token": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}/temporary-access" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### trash and untrash a message

`PATCH /api/v1/mails/{mailServerID}/messages/{messageID}/`

Operation ID: `trashMessage`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |

**Request body** — `application/json` (required)

Pass "false" to untrash

| Field | Type | Required | Description |
|---|---|---|---|
| `isTrash` | boolean | yes |  |

Example:

```json
{
  "isTrash": false
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Message not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X PATCH "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}/" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isTrash": false}'
```

---

### delete a message permenantly

`DELETE /api/v1/mails/{mailServerID}/messages/{messageID}/`

Operation ID: `deleteMessage`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK |  |
| `404` | Mail Server or Mail Message not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}/" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## forward

Forward endpoints.

### get all extra address to forwarding mails

`GET /api/v1/mails/{mailServerID}/accounts/{accountID}/forwards`

Operation ID: `getListAddressForwarding`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `accountID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Account not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.forwarders` | object[] |  |  |
| `data.forwarders[].account` | string |  |  |
| `data.forwarders[].address` | string |  |  |
| `data.forwarders[].createdAt` | string |  |  |
| `data.forwarders[].id` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "forwarders": [
      {
        "account": "string",
        "address": "string",
        "createdAt": "string",
        "id": "string"
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/accounts/{accountID}/forwards" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### add address endpoint to forwarding mails

`POST /api/v1/mails/{mailServerID}/accounts/{accountID}/forwards`

Operation ID: `createAddressForwarding`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `accountID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `address` | string | yes |  |

Example:

```json
{
  "address": "string"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK | `application/json` |
| `400` | Bad Request |  |
| `403` | Reached maximum mail forwarder per account. |  |
| `404` | Mail Server or Mail Account not found |  |
| `409` | Address endpoint already exists |  |
| `500` | Unexpected error |  |

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
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/accounts/{accountID}/forwards" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address": "string"}'
```

---

### delete extra endpoint address

`DELETE /api/v1/mails/{mailServerID}/accounts/{accountID}/forwards/{addressID}`

Operation ID: `deleteExtraEndpoint`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `accountID` | path | string | yes |  |
| `addressID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `204` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Account or Mail Forward not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/accounts/{accountID}/forwards/{addressID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## attachments

Attachments endpoints.

### get all attachments for message

`GET /api/v1/mails/{mailServerID}/messages/{messageID}/attachments`

Operation ID: `getAllAttachments`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Message not found |  |
| `409` | Account already taken. |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.attachments` | object[] |  |  |
| `data.attachments[].name` | string |  |  |
| `data.attachments[].size` | number |  |  |
| `data.attachments[].content_type` | string |  |  |
| `data.attachments[].createdAt` | string |  |  |
| `data.attachments[].id` | string |  |  |
| `data.attachments[].data` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "attachments": [
      {
        "name": "string",
        "size": 0,
        "content_type": "string",
        "createdAt": "string",
        "id": "string",
        "data": "string"
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}/attachments" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### download attachment

`GET /api/v1/mails/{mailServerID}/messages/{messageID}/attachments/{attachmentID}`

Operation ID: `downloadAttachments`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |
| `attachmentID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Message not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.attachment` | object |  |  |
| `data.attachment.name` | string |  |  |
| `data.attachment.size` | number |  |  |
| `data.attachment.content_type` | string |  |  |
| `data.attachment.createdAt` | string |  |  |
| `data.attachment.id` | string |  |  |
| `data.attachment.data` | string |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "attachment": {
      "name": "string",
      "size": 0,
      "content_type": "string",
      "createdAt": "string",
      "id": "string",
      "data": "string"
    }
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}/attachments/{attachmentID}" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## event

Event endpoints.

### get all events for message

`GET /api/v1/mails/{mailServerID}/messages/{messageID}/events`

Operation ID: `getAllEvents`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `messageID` | path | string | yes |  |
| `page` | query | number |  | Default: `1` |
| `count` | query | number |  | Default: `15` Max: 100 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server or Mail Message not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string |  |  |
| `data` | object |  |  |
| `data.total` | number |  |  |
| `data.events` | object[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "status": "string",
  "data": {
    "total": 0,
    "events": [
      {}
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/messages/{messageID}/events" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## tags

Tags endpoints.

### get all tags

`GET /api/v1/mails/{mailServerID}/tags`

Operation ID: `getTags`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `tag` | string |  |  |
| `createdAt` | string (date-time) |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "tag": "string",
  "createdAt": "string"
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/tags" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### create a new tag

`POST /api/v1/mails/{mailServerID}/tags`

Operation ID: `createTag`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `tag` | string |  |  |
| `data` | object |  |  |
| `data.tag` | string |  |  |

Example:

```json
{
  "tag": "string",
  "data": {
    "tag": "string"
  }
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `201` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/tags" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tag": "string", "data": {"tag": "string"}}'
```

---

### get tags stats

`GET /api/v1/mails/{mailServerID}/tags/stats`

Operation ID: `getTagsStats`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |
| `lastNDays` | query | integer |  | Default: `30` Min: 1 Max: 180 |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object |  |  |
| `data.result` | object[] |  | One item per day, from today back to lastNDays days ago |
| `data.result[].date` | integer | yes | Unix timestamp of the day |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "data": {
    "result": [
      {
        "date": 0
      }
    ]
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/tags/stats" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

## plan

Plan endpoints.

### get cuurent mail server plan history

`GET /api/v1/mails/{mailServerID}/plan`

Operation ID: `getCurrentPlanHistory`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK | `application/json` |
| `400` | Bad Request |  |
| `404` | Mail Server not found |  |
| `500` | Unexpected error |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | object |  |  |
| `data.currentPlanHistory` | object |  | details on current plan |
| `data.nextPlanStartDate` | string (date-time) |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "data": {
    "currentPlanHistory": {},
    "nextPlanStartDate": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/plan" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### change mail server plan

`POST /api/v1/mails/{mailServerID}/plan`

Upgrades take effect immediately, while downgrades are scheduled and applied after the current plan ends. Click on the request body schema to see all available plans.

Operation ID: `changePlan`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `planName` | string |  | One of: `m1`, `m2`, `m3`, `m4`, `m5`, `m6`, `m7`, `m8` Default: `"m3"` |

Example:

```json
{
  "planName": "m1"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK |  |
| `400` | Bad Request - Invalid request for plan |  |
| `402` | Not enough balance. |  |
| `403` | You are allowed to create only one Mail Server on the free plan. |  |
| `404` | Mail Server not found |  |
| `428` | You are already on the same plan |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X POST "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/plan" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planName": "m1"}'
```

---

### remove a reserved plan

`DELETE /api/v1/mails/{mailServerID}/plan`

Click on the request body schema to see all available plans.

Operation ID: `deleteReservation`

Auth: `bearerAuth` or `jwt`

**Parameters**

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `mailServerID` | path | string | yes |  |

**Request body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `reservedPlan` | string |  | One of: `m1`, `m2`, `m3`, `m4`, `m5`, `m6`, `m7`, `m8` |

Example:

```json
{
  "reservedPlan": "m1"
}
```

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | OK |  |
| `400` | Bad Request |  |
| `404` | Mail server not found - Plan not found. |  |
| `428` | You are already on the same plan |  |
| `500` | Unexpected error |  |

**Example request**

```bash
curl -X DELETE "https://mail-service.liara.ir/api/v1/mails/{mailServerID}/plan" \
  -H "Authorization: Bearer $LIARA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reservedPlan": "m1"}'
```

---
