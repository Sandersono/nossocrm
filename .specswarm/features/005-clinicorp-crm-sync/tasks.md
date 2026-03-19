# Tasks: Modulo Clinicorp x NossoCRM

## Phase 1 - Setup

- [ ] T001 Create feature scaffolding under `.specswarm/features/005-clinicorp-crm-sync`
- [ ] T002 Review official Clinicorp Swagger and lock MVP endpoint scope in docs

## Phase 2 - Foundation

- [ ] T003 Create Supabase migration for `clinicorp_integrations`, `clinicorp_business_links`, `clinicorp_professional_snapshots`, `clinicorp_patient_links`, `clinicorp_sync_runs`, `clinicorp_data_snapshots`, and `clinicorp_outbound_logs` in `supabase/migrations`
- [ ] T004 Add RLS policies for tenant-safe read/write and admin-only management of Clinicorp configuration and logs in `supabase/migrations`
- [ ] T005 [P] Add TypeScript entities for Clinicorp integration domain in `types/clinicorp.ts`
- [ ] T006 [P] Add validation schemas for Clinicorp config, sync requests, lead push, and purchase orders in `lib/integrations/clinicorp/schemas.ts`
- [ ] T007 Create shared auth helpers for Clinicorp settings and operations in `lib/integrations/clinicorp/auth.ts`

## Phase 3 - Admin Connection [US1]

- [ ] T008 [US1] Create Clinicorp API client with HTTP Basic auth and healthcheck helpers in `lib/integrations/clinicorp/client.ts`
- [ ] T009 [US1] Create Clinicorp repository/service layer for integration config in `lib/integrations/clinicorp/service.ts`
- [ ] T010 [US1] Create admin API route for Clinicorp config CRUD in `app/api/settings/integrations/clinicorp/route.ts`
- [ ] T011 [US1] Create admin API route for Clinicorp healthcheck in `app/api/settings/integrations/clinicorp/health/route.ts`
- [ ] T012 [P] [US1] Create Clinicorp integration settings UI in `features/settings/components/ClinicorpIntegrationSection.tsx`
- [ ] T013 [US1] Register Clinicorp section in `features/settings/SettingsPage.tsx`

## Phase 4 - Operational Sync [US2]

- [ ] T014 [US2] Implement sync run creation, status transitions, and persistence in `lib/integrations/clinicorp/service.ts`
- [ ] T015 [US2] Implement businesses and professionals sync in `lib/integrations/clinicorp/service.ts`
- [ ] T016 [US2] Implement patient lookup/link strategy in `lib/integrations/clinicorp/matching.ts`
- [ ] T017 [US2] Implement appointment snapshot sync in `lib/integrations/clinicorp/service.ts`
- [ ] T018 [US2] Implement estimate snapshot sync in `lib/integrations/clinicorp/service.ts`
- [ ] T019 [US2] Implement financial summary snapshot sync in `lib/integrations/clinicorp/service.ts`
- [ ] T020 [US2] Create sync trigger API route in `app/api/integrations/clinicorp/sync/route.ts`
- [ ] T021 [P] [US2] Create diagnostics/log list API route in `app/api/settings/integrations/clinicorp/logs/route.ts`
- [ ] T022 [P] [US2] Create operational sync panel UI in `features/settings/components/ClinicorpSyncOperationsSection.tsx`

## Phase 5 - Lead Push [US3]

- [ ] T023 [US3] Implement outbound log persistence and dedupe keys in `lib/integrations/clinicorp/service.ts`
- [ ] T024 [US3] Implement `crm/add_leads` mapper from CRM contact/deal context in `lib/integrations/clinicorp/outbound.ts`
- [ ] T025 [US3] Create outbound lead push route in `app/api/integrations/clinicorp/push-lead/route.ts`
- [ ] T026 [P] [US3] Add UI action for lead push and result display in `features/settings/components/ClinicorpSyncOperationsSection.tsx`

## Phase 6 - Purchase Orders [US4]

- [ ] T027 [US4] Implement purchase order payload validation and normalization in `lib/integrations/clinicorp/outbound.ts`
- [ ] T028 [US4] Create purchase order route in `app/api/integrations/clinicorp/purchase-orders/route.ts`
- [ ] T029 [P] [US4] Create admin/operational purchase order form UI in `features/settings/components/ClinicorpPurchaseOrdersSection.tsx`

## Phase 7 - Diagnostics and Replay [US5]

- [ ] T030 [US5] Implement sync/outbound replay helpers in `lib/integrations/clinicorp/service.ts`
- [ ] T031 [US5] Create replay API route in `app/api/settings/integrations/clinicorp/logs/reprocess/route.ts`
- [ ] T032 [P] [US5] Create execution logs UI with filters and replay action in `features/settings/components/ClinicorpEventsSection.tsx`

## Phase 8 - Validation

- [ ] T033 Run `npm run typecheck`
- [ ] T034 Run `npm run lint`
- [ ] T035 Run `npm run build`
- [ ] T036 Validate Clinicorp connection and at least one real endpoint manually in homologation

## Notes

- Prefer the same storage and UI patterns already used in `lib/integrations/chatwoot/*` and `features/settings/components/Chatwoot*`.
- Keep `products/orders` as an optional lane inside the Clinicorp module, not as the sole integration goal.
