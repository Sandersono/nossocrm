# Contract: Clinicorp Admin API

## Purpose

Admin surface for configuring, testing, and operating the Clinicorp integration from the CRM.

## Endpoints

### `GET /api/settings/integrations/clinicorp`

Returns the current integration configuration for the authenticated organization.

#### Response `200`

```json
{
  "integration": {
    "id": "uuid",
    "name": "Clinicorp",
    "apiBaseUrl": "https://api.clinicorp.com/rest/v1",
    "subscriberId": "subscriber-id",
    "active": true,
    "leadPushEnabled": true,
    "purchaseOrdersEnabled": false,
    "syncPatientsEnabled": true,
    "syncAppointmentsEnabled": true,
    "syncEstimatesEnabled": true,
    "syncFinancialEnabled": true,
    "hasApiUsername": true,
    "hasApiToken": true,
    "lastHealthcheckAt": "2026-03-18T23:00:00.000Z",
    "lastHealthcheckStatus": "ok",
    "lastHealthcheckError": null
  }
}
```

### `POST /api/settings/integrations/clinicorp`

Creates or updates the integration configuration.

#### Request

```json
{
  "name": "Clinicorp",
  "apiBaseUrl": "https://api.clinicorp.com/rest/v1",
  "apiUsername": "api-user",
  "apiToken": "secret-token",
  "subscriberId": "subscriber-id",
  "active": true,
  "leadPushEnabled": true,
  "purchaseOrdersEnabled": false,
  "syncPatientsEnabled": true,
  "syncAppointmentsEnabled": true,
  "syncEstimatesEnabled": true,
  "syncFinancialEnabled": true
}
```

### `POST /api/settings/integrations/clinicorp/health`

Runs a healthcheck against the official Clinicorp API using saved credentials.

#### Response `200`

```json
{
  "ok": true,
  "checks": [
    {
      "name": "auth",
      "status": "ok"
    },
    {
      "name": "subscriber",
      "status": "ok"
    }
  ]
}
```

### `GET /api/settings/integrations/clinicorp/logs?type=sync|outbound&limit=50`

Returns recent operational logs for diagnostics.

### `POST /api/settings/integrations/clinicorp/logs/reprocess`

Reprocesses a failed or selected execution.

#### Request

```json
{
  "logId": "uuid",
  "logType": "sync"
}
```
