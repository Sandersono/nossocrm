# Contract: Clinicorp Operations API

## Purpose

Operational endpoints for synchronization and outbound actions once the integration is configured.

## Endpoints

### `POST /api/integrations/clinicorp/sync`

Triggers a synchronization run.

#### Request

```json
{
  "syncType": "appointments",
  "from": "2026-03-01",
  "to": "2026-03-31",
  "businessId": 123
}
```

#### Response `202`

```json
{
  "ok": true,
  "run": {
    "id": "uuid",
    "syncType": "appointments",
    "status": "pending"
  }
}
```

### `POST /api/integrations/clinicorp/push-lead`

Pushes a CRM lead/contact to Clinicorp CRM using `/crm/add_leads`.

#### Request

```json
{
  "contactId": "uuid",
  "subscriberId": "subscriber-id",
  "boardName": "Campanha Invisalign",
  "notes": "Lead qualificado pelo CRM"
}
```

#### Response `200`

```json
{
  "ok": true,
  "outboundLogId": "uuid"
}
```

### `POST /api/integrations/clinicorp/purchase-orders`

Creates a purchase order in Clinicorp using `/products/orders`.

#### Request

```json
{
  "clinic": "12345678901234",
  "orderCode": "ORDER-2026-0001",
  "orderDate": "2026-03-18",
  "products": [
    {
      "code": "PROD001",
      "name": "Seringa 10ml",
      "quantity": 100,
      "unitPrice": 3.5,
      "unitOfMeasurement": "UN"
    }
  ]
}
```

#### Response `201`

```json
{
  "ok": true,
  "outboundLogId": "uuid"
}
```
