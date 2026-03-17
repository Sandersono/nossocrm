# Implementation Plan: Modulo de Integracao Chatwoot x NossoCRM

## 1. Technical Context

### Current Stack
- Next.js 16 App Router
- Supabase (Postgres, Auth, RLS, Edge Functions opcionais)
- React 19 + TanStack Query
- AI SDK v6 com configuracao por organizacao

### Existing Surfaces to Reuse
- configuracoes de integracao em `features/settings/components`
- autenticacao e contexto de organizacao em `context/AuthContext.tsx`
- API publica de contatos/deals/move stage em `app/api/public/v1`
- regras de cache e realtime do CRM
- infraestrutura de IA e prompts em `lib/ai/*`

### Constraints
- Manter isolamento por `organization_id`
- Nao quebrar regras criticas de cache
- Evitar depender de matching heuristico como mecanismo principal
- Processamento precisa ser idempotente e auditavel
- MVP nao implementa UI de inbox Chatwoot dentro do CRM

### Architectural Drivers
- confiabilidade operacional acima de completude funcional
- reprocessamento seguro
- clareza para admin configurar sem apoio tecnico constante
- baixo acoplamento entre Chatwoot e dominio principal do CRM

## 2. Constitution Check (Fallback)

Como o repositorio nao possui `.specify/memory/constitution.md`, o plano adota como autoridade operacional:
- `AGENTS.md`
- arquitetura atual do projeto
- regras de cache, multi-tenant e integracoes ja documentadas

### Musts derivados do repositorio
- Toda mutacao deve respeitar `organization_id`
- Integracoes e segredos devem ser admin-only
- Mutacoes comerciais devem reutilizar chaves e caminhos existentes sempre que possivel
- Testes devem cobrir os fluxos de maior risco: webhook, idempotencia, roteamento e resumo

## 3. Phase 0 - Research Decisions

As decisoes consolidadas estao em [research.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/002-chatwoot-crm-sync/research.md).

## 4. Phase 1 - Design

### 4.1 Proposed Architecture

```text
Chatwoot Webhook
  -> Next.js route /api/integrations/chatwoot/webhook/[token]
    -> persist chatwoot_event_logs
    -> normalize payload
    -> resolve integration + contact link + candidate deal
    -> apply label mapping action when safe
    -> create conversation snapshot on resolution
    -> enqueue summary job

Summary Processor
  -> reads pending snapshots
  -> calls existing org-scoped AI infrastructure
  -> persists chatwoot_conversation_summaries

Admin UI
  -> configure integration
  -> manage label mappings
  -> inspect event log / replay failures

CRM UI
  -> display conversation history on contact/deal
```

### 4.2 Module Boundaries

#### In Scope
- ingestion
- normalization
- routing
- history persistence
- AI summary
- operational visibility

#### Out of Scope
- real-time mirrored inbox
- outbound message sending
- full Chatwoot object sync

### 4.3 Data Model

Primary entities are documented in [data-model.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/002-chatwoot-crm-sync/data-model.md).

### 4.4 Interface Contracts

- [chatwoot-webhook.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/002-chatwoot-crm-sync/contracts/chatwoot-webhook.md)
- [chatwoot-routing-rules.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/002-chatwoot-crm-sync/contracts/chatwoot-routing-rules.md)

### 4.5 Security Model

- segredos visiveis/editaveis apenas por admin
- webhook protegido por token opaco por integracao
- uso de service role apenas server-side
- logs nao devem expor token bruto na UI

### 4.6 Event Processing Strategy

#### Inbound
1. validar token
2. resolver integracao
3. persistir log
4. deduplicar por fingerprint
5. normalizar payload
6. aplicar side effects seguros
7. responder rapido

#### Summary
1. criar registro `pending`
2. processar assincronamente
3. salvar artefato e status
4. permitir retry sem reexecutar side effects comerciais

### 4.7 Deal Resolution Strategy

Order of precedence:
1. deal explicitamente vinculado ao snapshot/conversa
2. deal unico aberto do contato elegivel no board configurado
3. ambiguidade -> sem movimento automatico

### 4.8 UI Strategy

#### Admin
- nova subsecao Chatwoot em Integracoes
- configuracao da conta
- mappings
- monitoramento e replay

#### CRM Context
- historico de conversa em contato
- historico de conversa em deal/cockpit quando houver vinculo
- badges simples: origem Chatwoot, status do resumo, labels principais

## 5. Implementation Phases

### Phase 1: Foundation
- schema e queries base
- tipos, validacoes e service layer
- rota de webhook e log de eventos

### Phase 2: Configuration
- UI admin de integracao
- healthcheck
- CRUD de label mappings

### Phase 3: Routing & Commercial Actions
- resolucao de contato
- selecao segura de deal
- aplicacao de mappings
- activities/auditoria

### Phase 4: History & AI
- snapshots historicos
- resumo por LLM
- exibicao no CRM

### Phase 5: Operations & Hardening
- painel de eventos
- replay
- testes de regressao e docs

## 6. Testing Strategy

### Automated
- unit tests para normalizacao de payload e fingerprint
- integration tests para webhook route
- rule-engine tests para mappings
- tests de ambiguidade de deals
- tests do pipeline de resumo com mocks

### Manual
- cenarios em [quickstart.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/002-chatwoot-crm-sync/quickstart.md)

## 7. File Impact Forecast

### New Areas
- `supabase/migrations/*chatwoot*`
- `app/api/integrations/chatwoot/*`
- `lib/integrations/chatwoot/*`
- `features/settings/components/Chatwoot*`
- `features/contacts/components/*` ou componente adjacente para history
- `features/deals/cockpit/*` para history rendering

### Existing Areas Likely Touched
- `features/settings/SettingsPage.tsx`
- `lib/ai/prompts/*` ou `lib/ai/tasks/*`
- `lib/query/queryKeys.ts`
- `types/types.ts`

## 8. Post-Design Gate

This plan passes the repository-level quality gate if implementation preserves:
- multi-tenant isolation
- cache integrity
- admin-only secret handling
- explicit failure visibility
