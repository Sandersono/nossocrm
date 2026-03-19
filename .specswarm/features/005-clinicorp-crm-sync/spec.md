---
feature_number: 005
feature_slug: clinicorp-crm-sync
status: Draft
created_at: 2026-03-18T23:10:00-03:00
source: manual-specswarm-fallback
---

# Feature: Modulo de Integracao Clinicorp x NossoCRM

## Overview

### Problema
O NossoCRM ja possui uma base forte para integracoes e automacoes, mas ainda nao possui um modulo dedicado ao Clinicorp. Isso impede:
- sincronizacao estruturada de pacientes, agendamentos, orcamentos e indicadores operacionais
- envio de leads qualificados do CRM para campanhas do Clinicorp
- consolidacao comercial e operacional entre clinica e CRM
- uso do NossoCRM como painel executivo para clientes da area de saude/estetica que operam no Clinicorp

### Solucao
Criar um modulo novo de integracao entre Clinicorp e NossoCRM com foco em:
- conexao segura por organizacao usando as credenciais oficiais da API do Clinicorp
- sincronizacao pull-based de dados operacionais relevantes do Clinicorp para o CRM
- acoes outbound controladas do CRM para o Clinicorp, comecando por envio de leads
- trilha operacional separada para ordens de compra via `POST /products/orders`
- auditoria, reprocessamento e observabilidade do fluxo

### Valor para o negocio
| Beneficio | Impacto esperado |
|-----------|------------------|
| Visao unificada | Time comercial e operacional consulta contexto do Clinicorp sem sair do CRM |
| Menos retrabalho | Leads e dados-chave deixam de ser movidos manualmente entre sistemas |
| Inteligencia operacional | Agenda, orcamentos e financeiro podem alimentar analises do CRM |
| Base para clientes da agencia | O modulo vira um acelerador para clinics e operacoes de estetica |

### Principio de arquitetura
- **Clinicorp = sistema clinico/operacional**
- **NossoCRM = sistema comercial, operacional e de automacao**
- O modulo nao tentara substituir a operacao diaria do Clinicorp
- O MVP usara sincronizacao por jobs e acoes admin, pois a documentacao encontrada nao expoe webhooks oficiais

---

## Goals

1. Permitir que administradores conectem uma conta Clinicorp por organizacao.
2. Sincronizar dados operacionais relevantes do Clinicorp para o CRM.
3. Permitir envio de leads do CRM para o CRM interno do Clinicorp.
4. Preparar uma trilha operacional para ordens de compra via Clinicorp.
5. Garantir auditoria, idempotencia e reprocessamento.

## Non-Goals

1. Replicar a interface clinica do Clinicorp dentro do NossoCRM.
2. Sincronizar todos os endpoints da API no MVP.
3. Tornar o Clinicorp fonte de verdade de deals, boards ou automacoes do CRM.
4. Automatizar ordens de compra sem validacao de regras operacionais no MVP.

---

## User Scenarios

### US1 - Admin conecta o Clinicorp
**Ator**: Administrador do CRM

**Fluxo**:
1. Admin acessa Configuracoes > Integracoes > Clinicorp.
2. Admin informa:
   - username da API
   - token API
   - subscriber_id
   - configuracoes de escopo e sincronizacao
3. Admin executa healthcheck.
4. O CRM valida autenticacao, acesso ao assinante e leitura basica da conta.
5. Admin salva a integracao.

**Resultado esperado**: a organizacao passa a ter uma integracao Clinicorp conectada e pronta para sincronizacao.

### US2 - Admin sincroniza dados operacionais do Clinicorp
**Ator**: Administrador ou operador autorizado

**Fluxo**:
1. Admin inicia uma sincronizacao manual ou agenda uma rotina.
2. O CRM consulta endpoints relevantes do Clinicorp:
   - clinicas/unidades
   - profissionais
   - pacientes
   - agendamentos
   - orcamentos
   - resumo financeiro
3. O CRM persiste snapshots e vinculos externos por organizacao.
4. O CRM atualiza paines, contexto de contatos e trilhas operacionais.

**Resultado esperado**: o CRM passa a refletir o contexto operacional relevante do Clinicorp sem substituir o sistema clinico.

### US3 - Lead do CRM e enviado para o Clinicorp
**Ator**: Time comercial no CRM + sistema

**Fluxo**:
1. Um contato ou lead atinge criterio comercial configurado no CRM.
2. Admin ou automacao executa envio para o Clinicorp.
3. O CRM chama `POST /crm/add_leads` com dados do lead e campanha de destino.
4. O retorno do Clinicorp fica auditado no CRM.

**Resultado esperado**: leads capturados e qualificados no NossoCRM podem entrar no fluxo de campanhas do Clinicorp sem retrabalho manual.

### US4 - Operacao envia ordem de compra para o Clinicorp
**Ator**: Operador administrativo

**Fluxo**:
1. O operador monta uma ordem de compra no contexto operacional do CRM.
2. O CRM valida clinica, codigo da ordem, data e itens.
3. O CRM chama `POST /products/orders`.
4. O resultado fica auditado e reprocessavel.

**Resultado esperado**: o CRM consegue acionar o fluxo de ordem de compra do Clinicorp quando a operacao exigir.

### US5 - Admin acompanha falhas e reprocessa integracoes
**Ator**: Administrador ou suporte interno

**Fluxo**:
1. Admin acessa a area de diagnostico da integracao.
2. Admin visualiza ultimos syncs, acoes outbound e erros.
3. Admin corrige credenciais, mapeamentos ou filtros.
4. Admin reexecuta sincronizacao ou envio outbound.

**Resultado esperado**: falhas nao geram perda silenciosa de informacao nem exigem SQL manual para recuperacao.

---

## Functional Requirements

### FR-1: Configuracao da Integracao
- **FR-1.1**: Administradores podem cadastrar uma integracao Clinicorp por organizacao.
- **FR-1.2**: A integracao deve armazenar username API, token API, subscriber_id, status de ativacao e preferencias de sincronizacao.
- **FR-1.3**: O sistema deve permitir healthcheck da integracao usando os endpoints oficiais do Clinicorp.
- **FR-1.4**: Membros nao administradores nao podem editar credenciais da integracao.
- **FR-1.5**: Credenciais devem ser armazenadas de forma protegida, sem exposicao no frontend.

### FR-2: Sincronizacao de Dados do Clinicorp
- **FR-2.1**: O sistema deve suportar sincronizacao manual inicial por organizacao.
- **FR-2.2**: O sistema deve registrar ao menos os dados de clinicas, profissionais e pacientes vinculados.
- **FR-2.3**: O sistema deve suportar snapshots de agendamentos por intervalo de datas.
- **FR-2.4**: O sistema deve suportar snapshots de orcamentos por intervalo de datas.
- **FR-2.5**: O sistema deve suportar snapshots de resumo financeiro por intervalo de datas.
- **FR-2.6**: O sistema deve registrar o horario da ultima sincronizacao bem-sucedida por tipo de dado.

### FR-3: Vinculos Externos
- **FR-3.1**: O sistema deve persistir vinculos entre paciente do Clinicorp e contato do CRM.
- **FR-3.2**: O sistema deve tentar matching por email, telefone e documento quando o vinculo persistido nao existir.
- **FR-3.3**: O sistema nao deve sobrescrever dados comerciais do CRM sem regra explicita.
- **FR-3.4**: O sistema deve registrar quando houver ambiguidade de matching em vez de vincular automaticamente de forma insegura.

### FR-4: Envio de Leads para o Clinicorp
- **FR-4.1**: O sistema deve permitir envio outbound para `POST /crm/add_leads`.
- **FR-4.2**: O payload deve suportar subscriber_id, nome, email, telefone, campanha e observacoes.
- **FR-4.3**: O sistema deve auditar request, response e status do envio.
- **FR-4.4**: O sistema deve evitar duplicacao acidental da mesma acao outbound quando o usuario repetir a operacao.

### FR-5: Ordens de Compra
- **FR-5.1**: O sistema deve permitir envio outbound para `POST /products/orders`.
- **FR-5.2**: O payload deve suportar clinica, codigo da ordem, data da ordem e lista de produtos conforme contrato oficial.
- **FR-5.3**: O sistema deve validar os campos obrigatorios antes de tentar o envio.
- **FR-5.4**: O sistema deve registrar erros de validacao do Clinicorp de forma legivel no CRM.
- **FR-5.5**: O modulo deve permitir manter esse fluxo desativado por organizacao no MVP, caso o cliente use apenas a parte comercial.

### FR-6: Observabilidade e Reprocessamento
- **FR-6.1**: Toda execucao de sync ou envio outbound deve gerar um log persistido.
- **FR-6.2**: O sistema deve registrar status por execucao: pendente, processando, concluido, falhou, reprocessado.
- **FR-6.3**: O sistema deve diferenciar falha de autenticacao, falha de validacao, timeout e erro interno do provedor.
- **FR-6.4**: O sistema deve permitir reprocessar sincronizacoes e acoes outbound sem perda de auditoria.

### FR-7: Limites do MVP
- **FR-7.1**: O modulo nao precisa sincronizar todos os endpoints do Clinicorp no MVP.
- **FR-7.2**: O modulo nao precisa operar agendas em tempo real no MVP.
- **FR-7.3**: O modulo nao precisa criar automacoes clinicas autonomas dentro do NossoCRM no MVP.

---

## Success Criteria

| Criterio | Meta |
|----------|------|
| Conexao inicial | Admin consegue conectar uma conta Clinicorp em menos de 10 minutos |
| Sync inicial | 95%+ das execucoes de sync manual concluem sem erro de contrato |
| Vinculacao de pacientes | 90%+ dos registros elegiveis encontram contato correspondente sem ajuste manual |
| Envio de lead | 95%+ dos envios validos para `crm/add_leads` retornam sucesso na primeira tentativa |
| Observabilidade | 100% das execucoes ficam auditadas com status e erro legivel |
| Reprocessamento | 100% das reexecucoes preservam historico anterior e nao apagam logs |

---

## Key Entities

### Clinicorp Integration
- Configuracao por organizacao
- Guarda credenciais, subscriber_id, escopos ativos e metadados operacionais

### Clinicorp Business Link
- Cache e vinculo de clinicas/unidades do Clinicorp para contexto da organizacao no CRM

### Clinicorp Professional Snapshot
- Cache de profissionais para filtros, agenda e contexto operacional

### Clinicorp Patient Link
- Vinculo persistente entre paciente do Clinicorp e contato do CRM

### Clinicorp Sync Run
- Registro de execucao de sincronizacao, com tipo, parametros, status e erro

### Clinicorp Data Snapshot
- Snapshot normalizado de agendamentos, orcamentos ou resumo financeiro por periodo

### Clinicorp Outbound Log
- Log de acoes outbound, como envio de lead ou ordem de compra

---

## Assumptions

- A documentacao oficial encontrada usa autenticacao HTTP Basic com `username = ID de acesso` e `password = token API`.
- O endpoint base relevante para a integracao e `https://api.clinicorp.com/rest/v1`.
- Nao foram encontrados webhooks oficiais na documentacao consultada, entao o MVP sera pull-based.
- A integracao com `products/orders` sera tratada como trilha operacional opcional do modulo, nao como unico caso de uso.
