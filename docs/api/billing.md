# Billing

> Generated from [`specs/billing.yaml`](../../specs/billing.yaml) (source: https://developers.liara.ir/spec/billing.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** Liara Billing API  
**Version:** 1.0.0  
**Base URL:** `https://api.liara.ir`  
**Endpoints:** 1

## About

Retrieve current user billing information.

## Authentication

- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| Billing | `GET` | `/v1/billing` | [Get current user billing information](#get-current-user-billing-information) |

## Billing

### Get current user billing information

`GET /v1/billing`

Returns the current user's balance and billing configuration.

Operation ID: `getBilling`

Auth: `bearerAuth`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Current user billing information | `application/json` |
| `401` | Unauthorized |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `user` | object |  |  |
| `user.balance` | number (double) |  | Current account balance |
| `user.accountType` | string |  | Account type |
| `user.minCreditAmount` | integer |  | Minimum credit amount |
| `user.isManualMinCredit` | boolean |  | Indicates whether minimum credit is manually configured |
| `user.minCreditLastNotifiedAt` | string (date-time) |  | Last minimum credit notification time |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "user": {
    "balance": 0,
    "accountType": "string",
    "minCreditAmount": 0,
    "isManualMinCredit": false,
    "minCreditLastNotifiedAt": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/billing" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
