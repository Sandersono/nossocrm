# Tasks: Modulo de Integracao Chatwoot x NossoCRM

## Phase 1 - Setup

- [x] T001 Create feature scaffolding references in .specswarm/features/002-chatwoot-crm-sync for implementation traceability
- [x] T002 Create Supabase migration for `chatwoot_integrations`, `chatwoot_label_mappings`, `chatwoot_contact_links`, `chatwoot_conversation_snapshots`, `chatwoot_conversation_summaries`, and `chatwoot_event_logs` in supabase/migrations
- [x] T003 [P] Add TypeScript entity/types for Chatwoot integration domain in types/chatwoot.ts
- [x] T004 [P] Add server-side validation schemas for Chatwoot config, webhook payload normalization, and mapping rules in lib/integrations/chatwoot/schemas.ts

## Phase 2 - Foundational Services

- [x] T005 Create Chatwoot server service client for healthcheck and optional API fetches in lib/integrations/chatwoot/client.ts
- [x] T006 Create Chatwoot event fingerprinting, normalization, and idempotency helpers in lib/integrations/chatwoot/events.ts
- [x] T007 Create Chatwoot repository/service layer for config, mappings, links, snapshots, summaries, and event logs in lib/integrations/chatwoot/service.ts
- [x] T008 [P] Add query keys and shared fetch helpers for Chatwoot integration UI data in lib/query/queryKeys.ts and lib/fetch/safeFetch.ts
- [x] T009 [P] Add Vitest coverage for payload normalization and fingerprint behavior in lib/integrations/chatwoot/events.test.ts

## Phase 3 - User Story 1: Admin conecta o Chatwoot e define regras

**Goal**: Permitir que admin configure a conta Chatwoot, teste conectividade e mantenha mappings de labels.

**Independent Test**: Um admin consegue salvar a integracao, rodar healthcheck, criar um mapping ativo e ver tudo persistido sem acessar o banco manualmente.

- [x] T010 [US1] Create admin API route for Chatwoot integration CRUD in app/api/settings/integrations/chatwoot/route.ts
- [x] T011 [US1] Create admin API route for Chatwoot healthcheck in app/api/settings/integrations/chatwoot/health/route.ts
- [x] T012 [US1] Create admin API route for label mapping CRUD in app/api/settings/integrations/chatwoot/mappings/route.ts
- [x] T013 [P] [US1] Create Chatwoot integration settings section UI in features/settings/components/ChatwootIntegrationSection.tsx
- [x] T014 [P] [US1] Create Chatwoot mapping manager UI in features/settings/components/ChatwootLabelMappingsSection.tsx
- [x] T015 [US1] Wire the new Chatwoot settings section into features/settings/SettingsPage.tsx
- [ ] T016 [P] [US1] Add UI tests for admin configuration and mapping flows in features/settings/components/ChatwootIntegrationSection.test.tsx

## Phase 4 - User Story 2: Label do Chatwoot movimenta o deal no CRM

**Goal**: Receber eventos do Chatwoot e aplicar regras comerciais seguras no pipeline.

**Independent Test**: Um evento com label mapeada move o deal correto uma unica vez; um evento ambiguo nao move nenhum card e fica auditado.

- [x] T017 [US2] Create inbound webhook route with token validation in app/api/integrations/chatwoot/webhook/[token]/route.ts
- [x] T018 [US2] Implement event log persistence and duplicate short-circuit in lib/integrations/chatwoot/service.ts
- [x] T019 [US2] Implement contact resolution and external contact link upsert in lib/integrations/chatwoot/service.ts
- [x] T020 [US2] Implement candidate deal resolution and ambiguity handling using existing move-stage conventions in lib/integrations/chatwoot/routing.ts
- [x] T021 [US2] Implement label mapping engine and commercial side effects in lib/integrations/chatwoot/routing.ts
- [ ] T022 [P] [US2] Add integration tests for webhook ingestion, idempotency, and ambiguous deal scenarios in app/api/integrations/chatwoot/webhook/webhook.test.ts

## Phase 5 - User Story 3: Conversa resolvida vira historico comercial

**Goal**: Persistir snapshots historicos de conversa resolvida com contexto comercial em contato e deal.

**Independent Test**: Quando uma conversa elegivel e resolvida, o CRM registra snapshot com transcript, labels e vinculos corretos.

- [x] T023 [US3] Implement snapshot creation for resolved conversations in lib/integrations/chatwoot/service.ts
- [x] T024 [US3] Create read API for contact/deal conversation history in app/api/integrations/chatwoot/history/route.ts
- [x] T025 [P] [US3] Create reusable conversation history list component in components/integrations/ChatwootHistoryList.tsx
- [x] T026 [US3] Surface conversation history in the contact context UI in features/contacts/components/ContactConversationHistoryPanel.tsx
- [x] T027 [US3] Surface conversation history in the deal cockpit context in features/deals/cockpit/DealCockpitClient.tsx
- [ ] T028 [P] [US3] Add UI/integration tests for history retrieval and rendering in components/integrations/ChatwootHistoryList.test.tsx

## Phase 6 - User Story 4: Conversa resolvida gera resumo por LLM

**Goal**: Gerar e persistir resumo executivo reprocessavel sem bloquear o webhook.

**Independent Test**: Um snapshot pendente gera resumo com sucesso; uma falha de IA nao perde transcript e permite retry.

- [x] T029 [US4] Implement summary job state transitions and repository methods in lib/integrations/chatwoot/service.ts
- [x] T030 [US4] Create summary processor route or server task entrypoint in app/api/integrations/chatwoot/process-summaries/route.ts
- [x] T031 [US4] Create Chatwoot conversation summarization prompt/task using existing AI infra in lib/ai/prompts/catalog.ts and lib/ai/tasks/server.ts
- [x] T032 [US4] Persist summary artifacts and next steps into `chatwoot_conversation_summaries` in lib/integrations/chatwoot/service.ts
- [ ] T033 [P] [US4] Add automated tests for summary pipeline success/failure behavior in app/api/integrations/chatwoot/process-summaries/process-summaries.test.ts

## Phase 7 - User Story 5: Operacao acompanha falhas e reprocessa eventos

**Goal**: Dar visibilidade operacional e replay seguro para eventos com erro.

**Independent Test**: Um admin consegue localizar um evento com falha, entender o motivo e reprocessa-lo sem duplicar efeitos.

- [x] T034 [US5] Create admin API route for event log listing and replay in app/api/settings/integrations/chatwoot/events/route.ts
- [x] T035 [P] [US5] Create Chatwoot event log dashboard UI in features/settings/components/ChatwootEventsSection.tsx
- [x] T036 [US5] Add replay action wiring and status badges in features/settings/components/ChatwootEventsSection.tsx
- [ ] T037 [P] [US5] Add integration/UI tests for event replay and diagnostics in features/settings/components/ChatwootEventsSection.test.tsx

## Final Phase - Polish & Cross-Cutting Concerns

- [x] T038 [P] Document admin setup and operational troubleshooting in docs/chatwoot-integration.md
- [x] T039 Validate lint, typecheck, targeted tests, and cache safety using package.json, eslint.config.mjs, tsconfig.json, and lib/query/queryKeys.ts
- [ ] T040 Run end-to-end manual scenarios from .specswarm/features/002-chatwoot-crm-sync/quickstart.md and capture follow-up fixes
- [ ] T041 Validate Chatwoot settings empty-state UX without configured integration and remove residual error toasts if they still appear

## Dependencies

- Setup must complete before Foundational Services.
- Foundational Services must complete before any user story phase.
- US1 should land before US2 because webhook processing depends on saved integration config and mapping rules.
- US2 should land before US3 because snapshot creation depends on validated inbound events and contact/deal resolution.
- US3 should land before US4 because summaries depend on created snapshots.
- US5 can begin after US2, but is strongest after US4.

## Parallel Work Examples

- T003 and T004 can run in parallel after T002.
- T013 and T014 can run in parallel after T010-T012 are stubbed.
- T025 can run in parallel with T024 once response shape is settled.
- T035 can run in parallel with T034 after event log contract is defined.

## MVP Recommendation

Deliver first:
1. US1
2. US2
3. Minimum slice of US3

This already provides the core business value: Chatwoot labels moving pipeline with auditable event ingestion.
