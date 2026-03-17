---
feature_number: 003
feature_slug: multitenant-saas
status: Draft
created_at: 2026-03-17T11:10:00-03:00
source: manual-specswarm-fallback
---

# Feature: Modulo Multi-Tenant SaaS

## Overview

### Problema
O NossoCRM ja possui `organizations`, `organization_id` em tabelas principais e partes do codigo orientadas a tenant, mas ainda carrega suposicoes de instancia unica:
- setup inicial bloqueia novas organizacoes pela mesma interface
- trigger de novo usuario cai em organization singleton
- funcoes SQL e policies de RLS ainda permitem leitura ampla em tabelas centrais
- nao existe onboarding publico para uma nova empresa criar sua propria conta

### Solucao
Criar um modulo novo de hardening multi-tenant SaaS para que uma mesma instancia do produto possa operar com varias organizacoes no mesmo banco, com isolamento logico por tenant, onboarding seguro e deploy compativel com Vercel.

### Valor para o negocio
| Beneficio | Impacto esperado |
|-----------|------------------|
| Escala SaaS | Uma unica instancia pode atender varias empresas |
| Isolamento de dados | Reduz risco de vazamento entre clientes |
| Onboarding comercial | Novo cliente cria conta e entra no proprio workspace |
| Base para billing e limites | Prepara o produto para monetizacao futura |

### Principio de arquitetura
- **Um produto, varias organizacoes, um banco compartilhado**
- **RLS e `organization_id` sao a camada principal de isolamento**
- **Docker fica fora do escopo deste modulo**

---

## Goals

1. Permitir que varias organizacoes coexistam na mesma instancia do NossoCRM.
2. Permitir onboarding de nova organizacao sem reaproveitar o setup inicial da plataforma.
3. Remover suposicoes de singleton nas funcoes SQL e triggers criticos.
4. Endurecer o isolamento de dados nas tabelas centrais do CRM.
5. Manter o deploy compativel com a arquitetura atual em Vercel + Supabase.

## Non-Goals

1. Migrar para isolamento fisico por banco ou schema por cliente.
2. Dockerizar a stack neste modulo.
3. Implementar billing, cobranca ou limites comerciais.
4. Reescrever todas as areas antigas do sistema em uma unica entrega.

---

## User Scenarios

### US1 - Novo cliente cria sua organizacao
**Ator**: Administrador de uma nova empresa

**Fluxo**:
1. O admin acessa a pagina publica de cadastro.
2. Informa nome da empresa, nome do responsavel, email e senha.
3. O sistema cria organizacao, usuario admin e perfil vinculado.
4. O admin entra automaticamente no CRM.

**Resultado esperado**: uma nova organizacao com workspace proprio e usuario admin ativo.

### US2 - Usuario autenticado so enxerga dados do proprio tenant
**Ator**: Usuario autenticado

**Fluxo**:
1. O usuario acessa boards, deals, contatos, atividades e configuracoes.
2. O sistema usa RLS e filtros do tenant.
3. Nenhum dado de outra organizacao aparece na UI ou nas APIs usuais.

**Resultado esperado**: isolamento consistente entre clientes.

### US3 - Plataforma continua suportando bootstrap inicial
**Ator**: Dono da instancia

**Fluxo**:
1. Em uma instalacao nova, o responsavel ainda consegue iniciar a plataforma.
2. Depois da primeira organizacao criada, o setup inicial deixa de ser o fluxo comercial.
3. Novas empresas passam a usar o onboarding multi-tenant.

**Resultado esperado**: o produto continua instalavel e passa a ser SaaS.

### US4 - Operacao acompanha o caminho correto no deploy
**Ator**: Time tecnico

**Fluxo**:
1. O projeto e publicado na Vercel com Supabase configurado.
2. O primeiro bootstrap acontece uma unica vez.
3. Novos clientes usam `/register`.

**Resultado esperado**: o ambiente de producao suporta crescimento sem branches paralelos de infraestrutura.

---

## Functional Requirements

### FR-1: Onboarding de organizacao
- **FR-1.1**: O sistema deve expor uma rota publica para cadastro de nova organizacao.
- **FR-1.2**: O cadastro deve criar organizacao, usuario admin e perfil com `organization_id`.
- **FR-1.3**: O cadastro deve validar payload, proteger contra cross-site e retornar erro legivel em caso de falha.
- **FR-1.4**: O onboarding multi-tenant nao deve substituir o setup inicial da primeira instancia.

### FR-2: Remocao de suposicoes singleton
- **FR-2.1**: O trigger de criacao de usuario nao deve depender de `get_singleton_organization_id()`.
- **FR-2.2**: Funcoes de dashboard e contagem de contatos devem operar no tenant atual.
- **FR-2.3**: Fluxos futuros de criacao de usuario devem exigir `organization_id` explicito ou falhar com erro claro.

### FR-3: Isolamento de dados
- **FR-3.1**: Tabelas centrais do CRM devem respeitar `organization_id` nas policies.
- **FR-3.2**: Entidades sem `organization_id` proprio devem herdar acesso do registro pai.
- **FR-3.3**: O acesso a arquivos de deal deve respeitar o tenant do deal relacionado.
- **FR-3.4**: O usuario nao deve conseguir ler ou mutar dados de outra organizacao por APIs usuais.

### FR-4: Navegacao publica
- **FR-4.1**: A pagina de login deve orientar novos clientes para o cadastro correto.
- **FR-4.2**: O proxy de autenticacao deve tratar a rota de cadastro como publica.
- **FR-4.3**: Usuarios autenticados nao devem permanecer na rota de cadastro.

### FR-5: Operacao e deploy
- **FR-5.1**: O modulo deve permanecer compativel com Vercel e Supabase hospedados.
- **FR-5.2**: O modulo nao deve introduzir dependencia obrigatoria de Docker.
- **FR-5.3**: O sistema deve continuar funcional apos aplicar migration e configurar envs atuais.

---

## Success Criteria

| Criterio | Meta |
|----------|------|
| Cadastro de tenant | Novo cliente cria organizacao e entra no sistema em menos de 5 minutos |
| Isolamento de dados | 100% das consultas centrais feitas pela UI respeitam tenant no fluxo normal |
| Bootstrap preservado | Setup inicial continua funcionando em instancia vazia |
| Compatibilidade | Build de producao e deploy em Vercel seguem sem dependencia de Docker |

---

## Key Entities

### Organization
- Tenant do SaaS
- Agrega configuracoes, usuarios e dados comerciais

### Organization Admin
- Primeiro usuario da organizacao
- Responsavel por onboarding, invites e configuracoes

### Tenant Access Context
- Resultado da combinacao `auth.uid()` + `profiles.organization_id`
- Base para policies e funcoes SQL multi-tenant

### Tenant-Bound CRM Records
- Boards, stages, contatos, deals, atividades, produtos e artefatos derivados
- Devem ser isolados por `organization_id` direto ou herdado

---

## Assumptions

1. A arquitetura alvo continua sendo Vercel + Supabase compartilhado.
2. O primeiro bootstrap da plataforma pode continuar separado do cadastro comercial de novos tenants.
3. O escopo desta entrega cobre os componentes centrais de isolamento, nao billing ou revenda white-label.
