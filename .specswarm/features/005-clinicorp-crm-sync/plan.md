# Implementation Plan: Modulo Clinicorp x NossoCRM

## Technical Context

- Existing app stack: Next.js App Router, Supabase, RLS, TanStack Query
- Existing integration patterns available:
  - admin settings sections under `features/settings/components/*`
  - secure per-organization integration storage
  - operational logs and replay patterns from Chatwoot
- External dependency:
  - Clinicorp REST API at `https://api.clinicorp.com/rest/v1`
  - HTTP Basic authentication using API username + token

## Constitution Check

- Respect multi-tenant isolation by organization in all storage and service methods.
- Keep one source of truth for integration state per organization.
- Protect credentials server-side only.
- Persist sync and outbound logs before mutating CRM-visible state where relevant.

## Architecture Summary

### Module boundaries

- `lib/integrations/clinicorp/*`
  - client for auth + HTTP calls
  - schemas for config and payload validation
  - service/repository layer for config, sync runs, links, snapshots, outbound logs
- `app/api/settings/integrations/clinicorp/*`
  - config CRUD
  - healthcheck
  - logs and reprocess
- `app/api/integrations/clinicorp/*`
  - sync trigger
  - push lead
  - purchase order
- `features/settings/components/*`
  - Clinicorp admin UI

### Persistence strategy

- Add dedicated Clinicorp tables via Supabase migration.
- Follow the Chatwoot module pattern:
  - configuration table
  - links/snapshots
  - execution logs
- Use RLS for same-tenant access and admin-only management.

### Operational model

- Pull-based sync only for MVP.
- Manual sync first, scheduled jobs later.
- Outbound actions are explicit user or automation triggers.

## Phase 0: Research conclusions

- Authentication is HTTP Basic, documented in official Swagger.
- No webhook contract was found; use polling/manual sync.
- Useful MVP endpoints:
  - `/group/list_subscribers_clinics`
  - `/professional/list_all_professionals`
  - `/patient/get`
  - `/appointment/list`
  - `/estimates/list`
  - `/financial/list_summary`
  - `/crm/add_leads`
  - `/products/orders`

## Phase 1: Design

### Data model outputs

- `clinicorp_integrations`
- `clinicorp_business_links`
- `clinicorp_professional_snapshots`
- `clinicorp_patient_links`
- `clinicorp_sync_runs`
- `clinicorp_data_snapshots`
- `clinicorp_outbound_logs`

### Contracts

- admin config and diagnostics API
- operational sync and outbound API

### UX surface

- Add a new Clinicorp section under `Settings > Integrations`
- Keep the same mental model used in the Chatwoot module:
  - configuration
  - operations
  - logs

## Phase 2: Build sequence

1. Schema + RLS + types
2. Server-side Clinicorp client and validators
3. Config + healthcheck routes
4. Sync routes and snapshot persistence
5. Outbound lead push
6. Purchase order lane
7. Admin UI and diagnostics
8. Tests and docs

## Risks

- Matching patients to CRM contacts can become ambiguous; never auto-link silently.
- Date-range endpoints may produce large payloads; MVP should limit windows and page defensively when possible.
- The provider docs appear to have mixed field casing and legacy naming; validation and normalization must be strict.

## Artifacts

- `spec.md`
- `research.md`
- `data-model.md`
- `contracts/clinicorp-admin-api.md`
- `contracts/clinicorp-operations.md`
- `quickstart.md`
- `tasks.md`
