---
feature_number: 002
feature_slug: chatwoot-crm-sync
status: Draft
created_at: 2026-03-16T18:30:00-03:00
source: manual-specswarm-fallback
---

# Feature: Modulo de Integracao Chatwoot x NossoCRM

## Overview

### Problema
O NossoCRM ja possui webhooks, API publica e automacoes comerciais, mas nao possui uma integracao orientada ao Chatwoot como sistema oficial de contato e conversas. Isso impede:
- uso de labels do Chatwoot como gatilhos comerciais confiaveis
- sincronizacao de historico de conversa para contexto comercial
- resumo automatizado de conversas resolvidas no cadastro do contato/deal
- auditoria centralizada dos eventos entre atendimento e operacao comercial

### Solucao
Criar um modulo novo de integracao entre Chatwoot e NossoCRM com os seguintes objetivos:
- Chatwoot permanece como fonte de verdade de contatos conversacionais e atendimento
- NossoCRM consome eventos do Chatwoot e traduz isso para contexto comercial e operacional
- labels e estados do Chatwoot podem movimentar cards no kanban do CRM por regras configuraveis
- conversas resolvidas geram historico e resumo estruturado no CRM

### Valor para o negocio
| Beneficio | Impacto esperado |
|-----------|------------------|
| Alinhamento atendimento-comercial | Conversas passam a influenciar pipeline em tempo real |
| Contexto para vendas e operacao | Time comercial acessa historico resumido sem abrir o Chatwoot a todo momento |
| Menos operacao manual | Labels substituem movimentacao manual de cards em boa parte do fluxo |
| Base para IA operacional | Resumos e historico estruturado alimentam analises futuras do CRM |

### Principio de arquitetura
- **Chatwoot = gestor de contato e conversas**
- **NossoCRM = gestor comercial e operacional**
- O modulo nao tentara transformar o CRM em uma inbox nativa completa no MVP

---

## Goals

1. Permitir que administradores conectem uma instancia do Chatwoot por organizacao.
2. Permitir mapear labels do Chatwoot para acoes comerciais no CRM.
3. Registrar historico de conversas resolvidas no CRM de forma pesquisavel e auditavel.
4. Gerar resumo estruturado por LLM ao resolver conversas relevantes.
5. Minimizar falhas por meio de idempotencia, auditoria e processamento reexecutavel.

## Non-Goals

1. Operar o envio de mensagens do Chatwoot a partir do CRM no MVP.
2. Replicar toda a UI de atendimento do Chatwoot dentro do CRM.
3. Sincronizar todos os recursos do Chatwoot no MVP.
4. Substituir o Chatwoot como fonte primaria de historico conversacional.

---

## User Scenarios

### US1 - Admin conecta o Chatwoot e define regras
**Ator**: Administrador do CRM

**Fluxo**:
1. Admin acessa Configuracoes > Integracoes > Chatwoot.
2. Admin informa URL base da instancia, account id, token administrativo e inboxes suportados.
3. Admin gera a URL de webhook do CRM para cadastrar no Chatwoot.
4. Admin testa a conexao.
5. Admin cria regras de roteamento:
   - label do Chatwoot
   - board de destino
   - stage de destino
   - comportamento adicional (marcar won, marcar lost, criar activity, exigir deal existente)
6. Admin ativa a integracao.

**Resultado esperado**: a organizacao passa a receber eventos do Chatwoot com regras comerciais definidas.

### US2 - Label do Chatwoot movimenta o deal no CRM
**Ator**: Atendente no Chatwoot + sistema

**Fluxo**:
1. Atendente atualiza labels da conversa no Chatwoot.
2. Chatwoot envia evento ao CRM.
3. CRM identifica a organizacao, a conversa e o contato correspondente.
4. CRM aplica a regra configurada para aquela label.
5. O deal correto e movido de etapa, marcado como ganho/perdido ou recebe atividade complementar.

**Resultado esperado**: o pipeline comercial responde automaticamente ao contexto do atendimento.

### US3 - Conversa resolvida vira historico comercial
**Ator**: Sistema

**Fluxo**:
1. Conversa e marcada como resolvida no Chatwoot.
2. CRM registra o evento e consolida o transcript da conversa.
3. CRM executa pipeline de resumo com LLM.
4. CRM salva:
   - transcript bruto ou snapshot textual
   - resumo executivo
   - tags/assuntos principais
   - proximos passos sugeridos
5. O historico fica visivel no contato e, quando houver vinculo, no deal.

**Resultado esperado**: o time comercial enxerga rapidamente o contexto da conversa sem reler todo o atendimento.

### US4 - Conversa resolvida gera resumo executivo
**Ator**: Sistema + time comercial

**Fluxo**:
1. Conversa resolvida gera snapshot no CRM.
2. O snapshot entra na fila de resumo.
3. A LLM produz resumo executivo, motivos centrais, sentimento e proximos passos.
4. O time comercial abre o contato ou deal e encontra o resumo pronto para consulta.

**Resultado esperado**: a operacao comercial entende rapidamente o atendimento concluido sem ler o transcript inteiro.

### US5 - Operacao acompanha falhas e reprocessa eventos
**Ator**: Administrador ou operador

**Fluxo**:
1. Admin acessa a area de monitoramento da integracao.
2. Admin ve eventos recebidos, processados, ignorados e com erro.
3. Admin identifica evento com falha de mapeamento ou resumo.
4. Admin corrige a configuracao e solicita reprocessamento.

**Resultado esperado**: falhas operacionais nao causam perda silenciosa de contexto.

---

## Functional Requirements

### FR-1: Configuracao da Integracao
- **FR-1.1**: Administradores podem cadastrar uma integracao Chatwoot por organizacao.
- **FR-1.2**: A integracao deve armazenar URL base, account id, token de acesso, status de ativacao e metadados operacionais.
- **FR-1.3**: O sistema deve gerar uma URL de webhook exclusiva por organizacao/integracao.
- **FR-1.4**: O sistema deve permitir teste de conectividade com a API do Chatwoot.
- **FR-1.5**: Membros nao administradores nao podem editar credenciais da integracao.

### FR-2: Roteamento por Labels
- **FR-2.1**: Administradores podem mapear uma ou mais labels do Chatwoot para um board/stage do CRM.
- **FR-2.2**: O sistema deve suportar regras com condicoes complementares por inbox ou status da conversa.
- **FR-2.3**: O sistema deve permitir definir se a regra apenas move etapa ou tambem marca deal como ganho/perdido.
- **FR-2.4**: O sistema deve registrar em auditoria qual regra foi aplicada a cada evento.
- **FR-2.5**: O sistema nao deve aplicar a mesma regra duas vezes para o mesmo evento idempotente.

### FR-3: Vinculacao de Contatos e Deals
- **FR-3.1**: O sistema deve vincular contatos do Chatwoot a contatos do CRM por identidade externa persistida.
- **FR-3.2**: Quando nao houver identidade persistida, o sistema deve tentar matching por telefone e email normalizados.
- **FR-3.3**: O sistema deve permitir manter mais de uma conversa do Chatwoot para o mesmo contato.
- **FR-3.4**: O sistema deve resolver ambiguidades de deal aberto sem movimentar card automaticamente quando mais de um deal elegivel existir.
- **FR-3.5**: O sistema deve permitir registrar o vinculo conversa -> deal quando esse contexto for conhecido.

### FR-4: Historico de Conversas
- **FR-4.1**: O sistema deve registrar snapshots de conversas resolvidas recebidas do Chatwoot.
- **FR-4.2**: Cada snapshot deve incluir identificadores da conversa, inbox, contato, labels, status, datas e transcript textual.
- **FR-4.3**: O historico deve ficar acessivel no cadastro do contato.
- **FR-4.4**: Quando houver deal vinculado, o historico tambem deve ficar acessivel no contexto do deal.
- **FR-4.5**: O CRM deve diferenciar historico bruto de resumo executivo.

### FR-5: Resumo com LLM
- **FR-5.1**: Conversas resolvidas elegiveis devem entrar em fila para resumo automatizado.
- **FR-5.2**: O resumo deve produzir ao menos: resumo executivo, motivos centrais, pendencias, proximos passos e sentimento geral.
- **FR-5.3**: Se a geracao falhar, o transcript deve continuar salvo e o evento deve permanecer reprocessavel.
- **FR-5.4**: Administradores devem poder desativar resumo automatico por organizacao.

### FR-6: Auditoria e Reprocessamento
- **FR-6.1**: Todo evento inbound deve ser persistido antes de qualquer mutacao comercial.
- **FR-6.2**: O sistema deve registrar status por evento: recebido, processado, ignorado, falhou, reprocessado.
- **FR-6.3**: O sistema deve permitir reprocessar eventos com falha sem duplicar efeitos anteriores.
- **FR-6.4**: O sistema deve expor diagnostico suficiente para diferenciar erro de autenticacao, mapeamento, dados ambiguos e erro de IA.

### FR-7: Limites do MVP
- **FR-7.1**: O modulo nao precisa enviar mensagens pelo Chatwoot a partir do CRM no MVP.
- **FR-7.2**: O modulo nao precisa espelhar em tempo real todas as mensagens abertas no cockpit do CRM no MVP.
- **FR-7.3**: O foco do MVP e sincronizacao operacional confiavel entre atendimento e pipeline.

---

## Success Criteria

| Criterio | Meta |
|----------|------|
| Ativacao da integracao | Admin consegue conectar uma conta Chatwoot em menos de 10 minutos |
| Roteamento por label | 95%+ dos eventos com label mapeada aplicam a mutacao correta no CRM sem intervencao manual |
| Idempotencia | 100% dos retries do mesmo evento nao duplicam movimentos, historicos ou resumos |
| Disponibilidade operacional | 100% dos eventos recebidos ficam auditados, inclusive quando houver falha de processamento |
| Historico comercial | 100% das conversas resolvidas elegiveis geram snapshot no CRM |
| Resumo automatizado | 90%+ dos snapshots elegiveis geram resumo valido na primeira tentativa |
| Ambiguidade controlada | 100% dos casos com mais de um deal elegivel ficam marcados para revisao em vez de movimentar card errado |

---

## Key Entities

### Chatwoot Integration
- Configuracao por organizacao
- Mantem credenciais, status, webhook key, preferencias de resumo e escopo de sincronizacao

### Chatwoot Label Mapping
- Regra configuravel que liga uma label do Chatwoot a uma acao comercial no CRM
- Pode incluir board, stage, flags de fechamento e criacao de atividade

### External Contact Link
- Vinculo persistente entre o contato do Chatwoot e o contato do CRM
- Evita depender de matching heuristico em todos os eventos

### Chatwoot Conversation Snapshot
- Registro historico da conversa consolidada
- Pode existir sem deal vinculado
- Serve como trilha de contexto comercial

### Chatwoot Event Log
- Auditoria de todos os eventos inbound
- Base para idempotencia, diagnostico e reprocessamento

### Conversation Summary
- Artefato derivado de LLM associado ao snapshot da conversa
- Resume o atendimento de forma orientada a negocio

---

## Assumptions

1. Cada organizacao do CRM conecta apenas uma conta principal do Chatwoot no MVP, mas pode usar multiplos inboxes dentro dela.
2. Chatwoot segue como sistema principal de atendimento e retencao operacional de conversas.
3. O CRM precisa armazenar historico suficiente para contexto comercial, nao necessariamente a experiencia completa de inbox.
4. Labels do Chatwoot sao controladas por operacao interna e podem ser tratadas como sinal confiavel de roteamento.
5. Quando houver multiplos deals abertos para o mesmo contato no mesmo board, o sistema deve parar e sinalizar revisao humana.
6. O resumo por LLM usara a infraestrutura de IA ja existente na organizacao.

---

## Scope Boundaries

### Incluido no MVP
- configuracao da integracao Chatwoot por organizacao
- webhook inbound com auditoria e idempotencia
- mapeamento de labels para board/stage/fechamento
- persistencia de historico de conversas resolvidas
- resumo automatizado por LLM
- painel minimo de monitoramento e reprocessamento

### Fora do MVP
- composer de resposta via Chatwoot dentro do CRM
- inbox operacional espelhada em tempo real no CRM
- sincronizacao completa de equipes, macros e automacoes do Chatwoot
- automacoes outbound complexas CRM -> Chatwoot alem de status basico futuro

---

## Dependencies

### Internas
1. API publica e mutacoes de deals/contacts existentes
2. Infra de IA por organizacao existente
3. Multi-tenancy via Supabase com organization_id
4. Areas de Configuracoes > Integracoes e contexto de deals/contatos

### Externas
1. Conta ativa do Chatwoot com acesso administrativo
2. Webhooks configuraveis no Chatwoot
3. API administrativa do Chatwoot para leitura complementar quando necessario

---

## Risks and Mitigations

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Evento repetido ou fora de ordem | Media | Alto | Persistencia previa, dedupe por fingerprint e estado de processamento |
| Movimento incorreto de card por contato ambiguo | Media | Alto | Regras bloqueiam automacao quando houver mais de um deal elegivel |
| Resumo de IA falhar | Media | Medio | Transcript salvo primeiro, fila reprocessavel, observabilidade clara |
| Labels mal configuradas | Media | Medio | Simulacao/teste de regras e auditoria por execucao |
| Token do Chatwoot expirar ou perder permissao | Baixa | Alto | Status de saude visivel e teste de conectividade manual |

---

## Edge Cases & Error Handling

1. **Contato sem match confiavel**: evento e auditado, mas nao move deal automaticamente.
2. **Mais de um deal elegivel**: sistema marca como ambiguo e exige analise humana.
3. **Conversa resolvida sem transcript util**: salva snapshot minimo sem resumo.
4. **Label removida e recolocada**: sistema nao deve reaplicar mutacao anterior se o mesmo evento ja foi consumido.
5. **Mudanca de regras apos erro antigo**: operador pode reprocessar evento historico sem forcar duplicidade.
6. **Resumo desativado**: historico continua sendo salvo normalmente.

---

## Open Questions Resolved by Default

1. O MVP nao envia mensagens pelo Chatwoot a partir do CRM.
2. O historico de conversa sera armazenado no CRM como snapshot consolidado por conversa resolvida, nao como inbox em tempo real.
3. O modulo tratara labels como gatilho principal de automacao comercial.
