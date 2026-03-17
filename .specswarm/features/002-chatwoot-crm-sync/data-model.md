# Data Model: Modulo de Integracao Chatwoot x NossoCRM

## 1. chatwoot_integrations

**Purpose**: Configuracao principal da integracao por organizacao.

| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations.id |
| name | text | Nome amigavel da integracao |
| base_url | text | URL base da instancia Chatwoot |
| account_id | text | Account id externo |
| api_token_encrypted | text | Token protegido |
| webhook_token | text | Token opaco embutido na URL do webhook |
| active | boolean | Status operacional |
| summary_enabled | boolean | Ativa/desativa LLM |
| created_at | timestamptz | Auditoria |
| updated_at | timestamptz | Auditoria |
| last_healthcheck_at | timestamptz | Saude da integracao |
| last_healthcheck_status | text | ok, failed, unauthorized |

**Validation**:
- unique(organization_id, base_url, account_id)
- active depende de configuracao completa

## 2. chatwoot_label_mappings

**Purpose**: Regras declarativas de roteamento entre labels e acoes no CRM.

| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations.id |
| integration_id | uuid | FK chatwoot_integrations.id |
| inbox_id | text nullable | Escopo opcional por inbox |
| label | text | Label do Chatwoot |
| board_id | uuid nullable | Destino no CRM |
| stage_id | uuid nullable | Destino no CRM |
| mark_won | boolean | Fecha como ganho |
| mark_lost | boolean | Fecha como perdido |
| create_activity | boolean | Cria atividade complementar |
| activity_title_template | text nullable | Template opcional |
| require_single_open_deal | boolean | Default true |
| active | boolean | Liga/desliga regra |
| created_at | timestamptz | Auditoria |
| updated_at | timestamptz | Auditoria |

**Validation**:
- ao menos uma acao deve existir
- mark_won e mark_lost nao podem ser true ao mesmo tempo

## 3. chatwoot_contact_links

**Purpose**: Vinculo persistente entre identidades externas e contatos internos.

| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations.id |
| integration_id | uuid | FK chatwoot_integrations.id |
| contact_id | uuid | FK contacts.id |
| chatwoot_contact_id | text | ID externo do contato |
| chatwoot_source_id | text nullable | Identidade de source/contact inbox |
| phone_e164 | text nullable | Auxiliar para matching |
| email_normalized | text nullable | Auxiliar para matching |
| created_at | timestamptz | Auditoria |
| updated_at | timestamptz | Auditoria |

**Validation**:
- unique(organization_id, integration_id, chatwoot_contact_id)

## 4. chatwoot_conversation_snapshots

**Purpose**: Historico comercial consolidado de conversas resolvidas ou elegiveis.

| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations.id |
| integration_id | uuid | FK chatwoot_integrations.id |
| chatwoot_conversation_id | text | ID externo da conversa |
| chatwoot_inbox_id | text nullable | Inbox externo |
| contact_id | uuid nullable | FK contacts.id |
| deal_id | uuid nullable | FK deals.id |
| status | text | Estado da conversa no momento do snapshot |
| labels | text[] | Labels aplicadas |
| assignee_external_id | text nullable | Responsavel no Chatwoot |
| first_message_at | timestamptz nullable | Inicio da conversa |
| resolved_at | timestamptz nullable | Quando consolidada |
| transcript_text | text | Snapshot textual consolidado |
| transcript_message_count | integer | Numero de mensagens consolidadas |
| created_at | timestamptz | Auditoria |
| updated_at | timestamptz | Auditoria |

**Validation**:
- unique(organization_id, integration_id, chatwoot_conversation_id, resolved_at)

## 5. chatwoot_conversation_summaries

**Purpose**: Artefato estruturado de IA derivado do snapshot.

| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations.id |
| snapshot_id | uuid | FK chatwoot_conversation_snapshots.id |
| status | text | pending, processing, completed, failed |
| summary_text | text nullable | Resumo executivo |
| key_topics | jsonb | Assuntos principais |
| customer_intent | text nullable | Intencao percebida |
| next_steps | jsonb | Proximos passos sugeridos |
| sentiment | text nullable | low, mixed, positive, negative |
| failure_reason | text nullable | Para retry |
| created_at | timestamptz | Auditoria |
| updated_at | timestamptz | Auditoria |
| processed_at | timestamptz nullable | Sucesso final |

## 6. chatwoot_event_logs

**Purpose**: Auditoria, dedupe e reprocessamento.

| Field | Type | Notes |
|------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK organizations.id |
| integration_id | uuid | FK chatwoot_integrations.id |
| event_type | text | Tipo funcional do evento |
| event_fingerprint | text | Chave de idempotencia |
| chatwoot_event_id | text nullable | ID se existir no payload |
| chatwoot_conversation_id | text nullable | Auxiliar de correlacao |
| payload | jsonb | Evento bruto |
| processing_status | text | received, processed, ignored, failed, reprocessed |
| processing_error | text nullable | Motivo da falha |
| applied_rule_id | uuid nullable | FK chatwoot_label_mappings.id |
| created_snapshot_id | uuid nullable | FK chatwoot_conversation_snapshots.id |
| created_at | timestamptz | Recebimento |
| processed_at | timestamptz nullable | Fim do processamento |

**Validation**:
- unique(organization_id, integration_id, event_fingerprint)

## Relationships

- chatwoot_integrations 1:N chatwoot_label_mappings
- chatwoot_integrations 1:N chatwoot_contact_links
- chatwoot_integrations 1:N chatwoot_conversation_snapshots
- chatwoot_integrations 1:N chatwoot_event_logs
- chatwoot_conversation_snapshots 1:1 chatwoot_conversation_summaries (logico)
- contacts 1:N chatwoot_conversation_snapshots
- deals 1:N chatwoot_conversation_snapshots

## State Transitions

### Event Log
- received -> processed
- received -> ignored
- received -> failed
- failed -> reprocessed

### Summary
- pending -> processing
- processing -> completed
- processing -> failed
- failed -> pending
