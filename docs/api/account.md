# Account (User)

> Generated from [`specs/me.yaml`](../../specs/me.yaml) (source: https://developers.liara.ir/spec/me.yaml). Do not edit by hand — run `python3 scripts/generate_docs.py`.

**Spec title:** Liara Account API  
**Version:** 1.0.0  
**Base URL:** `https://api.liara.ir`  
**Endpoints:** 6

## About

Retrieve current authenticated user and console information.

## Authentication

- `bearerAuth`: HTTP bearer (JWT) → `Authorization: Bearer <token>`

## Endpoints

| Group | Method | Path | Summary |
|---|---|---|---|
| User | `GET` | `/v1/me` | [Get current user and console information](#get-current-user-and-console-information) |
| User | `GET` | `/v1/me/subscription` | [Get current subscription plan](#get-current-subscription-plan) |
| User | `GET` | `/v1/me/two-fa` | [Get two-factor authentication status](#get-two-factor-authentication-status) |
| User | `GET` | `/v1/me/free-credit` | [Get remaining free credit](#get-remaining-free-credit) |
| User | `GET` | `/v1/me/git-integrations` | [Get Git integrations](#get-git-integrations) |
| User | `GET` | `/v1/me/utm` | [Get UTM information](#get-utm-information) |

## User

### Get current user and console information

`GET /v1/me`

Returns the authenticated user profile and console configuration. In team mode, the response also includes a `team` object.

Operation ID: `getMe`

Auth: `bearerAuth`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Current user and console information | `application/json` |
| `401` | Unauthorized |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `user` | object |  |  |
| `user._id` | string |  |  |
| `user.fullname` | string |  |  |
| `user.email` | string |  |  |
| `user.phone` | string |  |  |
| `user.joined_at` | string (date-time) |  |  |
| `user.hasPassword` | boolean |  |  |
| `user.emailVerifiedAt` | string |  |  |
| `user.phoneVerifiedAt` | string |  |  |
| `user.isVerified` | boolean |  |  |
| `user.isTeam` | boolean |  |  |
| `user.isTeamCreator` | boolean |  | Present only in team mode. |
| `user.nationalCode` | string |  |  |
| `user.invoiceIssuingEnabled` | boolean |  |  |
| `user.storage` | object |  |  |
| `user.storage.namespace` | string |  |  |
| `user.storage.status` | string |  |  |
| `user.storage.planID` | string |  |  |
| `user.storage.accessKey` | string |  |  |
| `user.storage.secretKey` | string |  |  |
| `user.accountType` | string |  |  |
| `user.contactInfo` | object |  |  |
| `user.contactInfoSavedAt` | string (date-time) |  |  |
| `user.minCreditAmount` | number |  |  |
| `user.isManualMinCredit` | boolean |  |  |
| `user.minCreditLastNotifiedAt` | string (date-time) |  |  |
| `user.hasSucceedPayment` | boolean |  |  |
| `user.legacyNetworkFeature` | boolean |  |  |
| `user.privateNetworkFeature` | boolean |  |  |
| `user.legacyObjectStorageFeature` | boolean |  |  |
| `team` | object |  | Present only in team mode. Contains the team profile, billing information and the member's role and permissions. |
| `team._id` | string |  |  |
| `team.fullname` | string |  |  |
| `team.email` | string |  |  |
| `team.phone` | string |  |  |
| `team.joined_at` | string (date-time) |  |  |
| `team.hasPassword` | boolean |  |  |
| `team.emailVerifiedAt` | string |  |  |
| `team.phoneVerifiedAt` | string |  |  |
| `team.isVerified` | boolean |  |  |
| `team.isTeam` | boolean |  |  |
| `team.isTeamCreator` | boolean |  | Present only in team mode. |
| `team.nationalCode` | string |  |  |
| `team.invoiceIssuingEnabled` | boolean |  |  |
| `team.storage` | object |  |  |
| `team.storage.namespace` | string |  |  |
| `team.storage.status` | string |  |  |
| `team.storage.planID` | string |  |  |
| `team.storage.accessKey` | string |  |  |
| `team.storage.secretKey` | string |  |  |
| `team.accountType` | string |  |  |
| `team.contactInfo` | object |  |  |
| `team.contactInfoSavedAt` | string (date-time) |  |  |
| `team.minCreditAmount` | number |  |  |
| `team.isManualMinCredit` | boolean |  |  |
| `team.minCreditLastNotifiedAt` | string (date-time) |  |  |
| `team.hasSucceedPayment` | boolean |  |  |
| `team.legacyNetworkFeature` | boolean |  |  |
| `team.privateNetworkFeature` | boolean |  |  |
| `team.legacyObjectStorageFeature` | boolean |  |  |
| `team.balance` | number |  |  |
| `team.teamMemberRole` | object |  |  |
| `team.teamMemberRole.name` | string |  |  |
| `team.teamMemberRole.permissions` | string[] |  |  |
| `team.teamMemberPermissions` | string[] |  |  |
| `databaseVersions` | object |  |  |
| `defaultDatabaseVersions` | object |  |  |
| `featureFlags` | object[] |  |  |
| `featureFlags[].key` | string |  |  |
| `featureFlags[].value` | string \| boolean \| object \| any[] |  |  |
| `plans` | object |  | All available plans. |
| `plans.mail` | object |  |  |
| `plans.projects` | object |  |  |
| `plans.databases` | object |  |  |
| `plans.objectStorage` | object |  |  |
| `plans.legacyStorageService` | object |  |  |
| `plans.projectBundlePlans` | object |  |  |
| `plans.databaseBundlePlans` | object |  |  |
| `plans.subscription` | object |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "user": {
    "_id": "string",
    "fullname": "string",
    "email": "string",
    "phone": "string",
    "joined_at": "string",
    "hasPassword": false,
    "emailVerifiedAt": "string",
    "phoneVerifiedAt": "string",
    "isVerified": false,
    "isTeam": false,
    "isTeamCreator": false,
    "nationalCode": "string",
    "invoiceIssuingEnabled": false,
    "storage": {
      "namespace": "string",
      "status": "string",
      "planID": "string",
      "accessKey": "string",
      "secretKey": "string"
    },
    "accountType": "string",
    "contactInfo": {},
    "contactInfoSavedAt": "string",
    "minCreditAmount": 0,
    "isManualMinCredit": false,
    "minCreditLastNotifiedAt": "string",
    "hasSucceedPayment": false,
    "legacyNetworkFeature": false,
    "privateNetworkFeature": false,
    "legacyObjectStorageFeature": false
  },
  "team": {
    "_id": "string",
    "fullname": "string",
    "email": "string",
    "phone": "string",
    "joined_at": "string",
    "hasPassword": false,
    "emailVerifiedAt": "string",
    "phoneVerifiedAt": "string",
    "isVerified": false,
    "isTeam": false,
    "isTeamCreator": false,
    "nationalCode": "string",
    "invoiceIssuingEnabled": false,
    "storage": {
      "namespace": "string",
      "status": "string",
      "planID": "string",
      "accessKey": "string",
      "secretKey": "string"
    },
    "accountType": "string",
    "contactInfo": {},
    "contactInfoSavedAt": "string",
    "minCreditAmount": 0,
    "isManualMinCredit": false,
    "minCreditLastNotifiedAt": "string",
    "hasSucceedPayment": false,
    "legacyNetworkFeature": false,
    "privateNetworkFeature": false,
    "legacyObjectStorageFeature": false,
    "balance": 0,
    "teamMemberRole": {
      "name": "string",
      "permissions": [
        "string"
      ]
    },
    "teamMemberPermissions": [
      "string"
    ]
  },
  "databaseVersions": {},
  "defaultDatabaseVersions": {},
  "featureFlags": [
    {
      "key": "string",
      "value": "string"
    }
  ],
  "plans": {
    "mail": {},
    "projects": {},
    "databases": {},
    "objectStorage": {},
    "legacyStorageService": {},
    "projectBundlePlans": {},
    "databaseBundlePlans": {},
    "subscription": {}
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/me" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get current subscription plan

`GET /v1/me/subscription`

Returns the current subscription plan of the user (or the team in team mode). Returns an empty object when there is no active plan.

Operation ID: `getMeSubscription`

Auth: `bearerAuth`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Current subscription plan | `application/json` |
| `401` | Unauthorized |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `currentSubscriptionPlan` | object |  |  |
| `currentSubscriptionPlan._id` | string |  |  |
| `currentSubscriptionPlan.type` | string |  | Example: `"subscription"` |
| `currentSubscriptionPlan.userID` | string |  |  |
| `currentSubscriptionPlan.subscriptionPlanID` | string |  | Example: `"free"` |
| `currentSubscriptionPlan.subscriptionPlanExpiration` | string (date-time) |  |  |
| `currentSubscriptionPlan.maxTechnicalTicketsPerMonth` | integer \| string |  | Example: `"infinite"` |
| `currentSubscriptionPlan.subscriptionDurationType` | string |  | Example: `"monthly"` |
| `currentSubscriptionPlan.technicalTicketsCount` | integer |  |  |
| `currentSubscriptionPlan.createdAt` | string (date-time) |  |  |
| `currentSubscriptionPlan.updatedAt` | string (date-time) |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "currentSubscriptionPlan": {
    "_id": "string",
    "type": "subscription",
    "userID": "string",
    "subscriptionPlanID": "free",
    "subscriptionPlanExpiration": "string",
    "maxTechnicalTicketsPerMonth": "infinite",
    "subscriptionDurationType": "monthly",
    "technicalTicketsCount": 0,
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/me/subscription" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get two-factor authentication status

`GET /v1/me/two-fa`

Returns the two-factor authentication status of the user. Both fields are omitted for teams.

Operation ID: `getMeTwoFA`

Auth: `bearerAuth`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Two-factor authentication status | `application/json` |
| `401` | Unauthorized |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `twoFA` | boolean |  |  |
| `lastTwoFAVerifiedAt` | string (date-time) |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "twoFA": false,
  "lastTwoFAVerifiedAt": "string"
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/me/two-fa" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get remaining free credit

`GET /v1/me/free-credit`

Returns the remaining free credit of the user. The field is omitted for teams.

Operation ID: `getMeFreeCredit`

Auth: `bearerAuth`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Remaining free credit | `application/json` |
| `401` | Unauthorized |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `remainingFreeCredit` | number |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "remainingFreeCredit": 0
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/me/free-credit" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get Git integrations

`GET /v1/me/git-integrations`

Returns the connected Git providers and their repository integrations.

Operation ID: `getMeGitIntegrations`

Auth: `bearerAuth`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | Git integrations | `application/json` |
| `401` | Unauthorized |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `gitProviderIntegrations` | object[] |  |  |
| `gitRepositoryIntegrations` | object[] |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "gitProviderIntegrations": [
    {}
  ],
  "gitRepositoryIntegrations": [
    {}
  ]
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/me/git-integrations" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---

### Get UTM information

`GET /v1/me/utm`

Returns the UTM campaign the account joined through, or null if none.

Operation ID: `getMeUTM`

Auth: `bearerAuth`

**Responses**

| Status | Description | Content |
|---|---|---|
| `200` | UTM information | `application/json` |
| `401` | Unauthorized |  |

<details><summary>Response <code>200</code> fields</summary>

| Field | Type | Required | Description |
|---|---|---|---|
| `utm` | object |  |  |
| `utm._id` | string |  |  |
| `utm.source` | string |  |  |
| `utm.medium` | string |  |  |
| `utm.campaign` | string |  |  |
| `utm.freeCreditAmount` | number |  |  |
| `utm.allowedServices` | string[] |  |  |
| `utm.joinedAt` | string (date-time) |  |  |
| `utm.expiresAt` | string (date-time) |  |  |
| `utm.isActive` | boolean |  |  |

</details>

<details><summary>Response <code>200</code> example</summary>

```json
{
  "utm": {
    "_id": "string",
    "source": "string",
    "medium": "string",
    "campaign": "string",
    "freeCreditAmount": 0,
    "allowedServices": [
      "string"
    ],
    "joinedAt": "string",
    "expiresAt": "string",
    "isActive": false
  }
}
```

</details>

**Example request**

```bash
curl -X GET "https://api.liara.ir/v1/me/utm" \
  -H "Authorization: Bearer $LIARA_API_TOKEN"
```

---
