# Data Model: Modulo Clinicorp x NossoCRM

## 1. clinicorp_integrations

Stores one Clinicorp integration per organization.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations.id, unique |
| name | text | Display name, default `Clinicorp` |
| api_base_url | text | Default `https://api.clinicorp.com/rest/v1` |
| api_username_ciphertext | text | Encrypted API username |
| api_token_ciphertext | text | Encrypted API token |
| subscriber_id | text | Official subscriber id |
| active | boolean | Integration enabled |
| lead_push_enabled | boolean | Toggle for `/crm/add_leads` |
| purchase_orders_enabled | boolean | Toggle for `/products/orders` |
| sync_patients_enabled | boolean | Toggle |
| sync_appointments_enabled | boolean | Toggle |
| sync_estimates_enabled | boolean | Toggle |
| sync_financial_enabled | boolean | Toggle |
| last_healthcheck_at | timestamptz | Last execution |
| last_healthcheck_status | text | `ok`, `error` |
| last_healthcheck_error | text | Human-readable |
| created_at | timestamptz | Audit |
| updated_at | timestamptz | Audit |

## 2. clinicorp_business_links

Caches clinics/business units available to the tenant.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| integration_id | uuid | FK clinicorp_integrations.id |
| clinicorp_business_id | bigint | External id |
| clinicorp_business_uid | text | External uid if available |
| name | text | Business name |
| company_id | text | CNPJ/CPF if returned |
| payload | jsonb | Raw source snapshot |
| created_at | timestamptz | Audit |
| updated_at | timestamptz | Audit |

Unique: `(organization_id, integration_id, clinicorp_business_id)`

## 3. clinicorp_professional_snapshots

Reference cache for professionals.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| integration_id | uuid | FK |
| clinicorp_professional_id | bigint | External id |
| name | text | Professional name |
| cpf | text | Optional |
| payload | jsonb | Raw source snapshot |
| created_at | timestamptz | Audit |
| updated_at | timestamptz | Audit |

Unique: `(organization_id, integration_id, clinicorp_professional_id)`

## 4. clinicorp_patient_links

Explicit link between Clinicorp patient and CRM contact.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| integration_id | uuid | FK |
| contact_id | uuid | FK contacts.id |
| clinicorp_patient_id | bigint | External id |
| email_normalized | text | Matching helper |
| phone_normalized | text | Matching helper |
| document_normalized | text | Matching helper |
| payload | jsonb | Raw lookup snapshot |
| created_at | timestamptz | Audit |
| updated_at | timestamptz | Audit |

Unique: `(organization_id, integration_id, clinicorp_patient_id)`

## 5. clinicorp_sync_runs

Tracks every synchronization job.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| integration_id | uuid | FK |
| sync_type | text | `businesses`, `professionals`, `patients`, `appointments`, `estimates`, `financial_summary` |
| status | text | `pending`, `processing`, `completed`, `failed`, `reprocessed` |
| started_at | timestamptz | Audit |
| finished_at | timestamptz | Audit |
| requested_by | uuid | FK profiles.id |
| request_params | jsonb | Date range and filters |
| records_received | integer | Count |
| records_written | integer | Count |
| error_code | text | Optional classifier |
| error_message | text | Human-readable |
| created_at | timestamptz | Audit |

## 6. clinicorp_data_snapshots

Normalized snapshots for date-ranged business data.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| integration_id | uuid | FK |
| sync_run_id | uuid | FK clinicorp_sync_runs.id |
| snapshot_type | text | `appointment`, `estimate`, `financial_summary` |
| external_id | text | Provider identifier when available |
| contact_id | uuid | FK contacts.id, nullable |
| business_id | uuid | FK clinicorp_business_links.id, nullable |
| snapshot_date | date | Reference date |
| payload | jsonb | Normalized + raw source payload |
| created_at | timestamptz | Audit |
| updated_at | timestamptz | Audit |

## 7. clinicorp_outbound_logs

Tracks outbound requests to Clinicorp.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK |
| integration_id | uuid | FK |
| action_type | text | `push_lead`, `create_purchase_order` |
| status | text | `pending`, `processing`, `completed`, `failed`, `reprocessed` |
| dedupe_key | text | Idempotency helper |
| contact_id | uuid | FK contacts.id, nullable |
| deal_id | uuid | FK deals.id, nullable |
| requested_by | uuid | FK profiles.id |
| request_payload | jsonb | Outbound request body |
| response_status_code | integer | HTTP status |
| response_body | jsonb | Provider response |
| error_code | text | Optional classifier |
| error_message | text | Human-readable |
| created_at | timestamptz | Audit |
| updated_at | timestamptz | Audit |

## Relationships

- clinicorp_integrations 1:many clinicorp_business_links
- clinicorp_integrations 1:many clinicorp_professional_snapshots
- clinicorp_integrations 1:many clinicorp_patient_links
- clinicorp_integrations 1:many clinicorp_sync_runs
- clinicorp_sync_runs 1:many clinicorp_data_snapshots
- clinicorp_integrations 1:many clinicorp_outbound_logs
- clinicorp_patient_links many:1 contacts

## State Notes

- `clinicorp_sync_runs.status` and `clinicorp_outbound_logs.status` follow the same lifecycle:
  `pending -> processing -> completed|failed`
- `reprocessed` marks a subsequent execution after a prior failed or completed run.
