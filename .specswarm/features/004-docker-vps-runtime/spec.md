---
feature_number: 004
feature_slug: docker-vps-runtime
status: Draft
created_at: 2026-03-17T10:20:00-03:00
source: manual-specswarm-fallback
---

# Feature: Runtime Docker para VPS

## Overview

### Problema
Hoje o NossoCRM esta operacionalmente orientado a `Vercel + Supabase`. Isso funciona para validacao do produto, mas foge do padrao atual da operacao da 2SDigital, onde outros sistemas como GBP Manager, SmartADS e Smart PSI ja rodam em Docker na mesma VPS.

Sem uma trilha propria de containerizacao:
- o CRM fica fora do padrao operacional do restante da stack
- observabilidade, backup e deploy ficam distribuidos entre plataformas
- a migracao futura para infraestrutura propria fica sem roteiro tecnico

### Solucao
Criar uma trilha separada de infraestrutura para empacotar o NossoCRM em Docker, com deploy em VPS e processo claro de evolucao.

### Valor para o negocio
| Beneficio | Impacto esperado |
|-----------|------------------|
| Padrao operacional unico | CRM passa a seguir o mesmo modelo dos outros produtos |
| Deploy portavel | Aplicacao pode rodar fora da Vercel quando desejado |
| Menos dispersao de infraestrutura | Parte da operacao pode ser centralizada na VPS |
| Base para escalabilidade propria | Time passa a controlar runtime, rollout e observabilidade |

### Principio de arquitetura
- **Docker e um modulo de infraestrutura, nao de produto**
- **Primeiro containerizar a aplicacao, depois decidir sobre banco e servicos adjacentes**
- **Self-host do Supabase inteiro nao entra como requisito inicial**

---

## Goals

1. Definir a arquitetura alvo para rodar o NossoCRM em Docker na VPS.
2. Padronizar o empacotamento da aplicacao Next.js para deploy containerizado.
3. Permitir operacao em paralelo com a arquitetura atual durante a transicao.
4. Separar claramente o que e obrigatorio na primeira entrega e o que fica para fases futuras.

## Non-Goals

1. Migrar imediatamente toda a stack de `Vercel + Supabase` para a VPS.
2. Self-hostar Supabase Auth, Storage, Realtime e Studio nesta mesma entrega.
3. Misturar esta trilha com os modulos de produto do CRM.
4. Substituir o hardening multi-tenant ja feito.

---

## User Scenarios

### US1 - Operacao sobe o CRM no mesmo padrao dos outros sistemas
**Ator**: Time tecnico da 2SDigital

**Fluxo**:
1. O time gera a imagem do NossoCRM.
2. Sobe a stack na VPS via Docker Compose.
3. Configura variaveis de ambiente e dominio.
4. O sistema fica acessivel externamente.

**Resultado esperado**: o CRM passa a usar o mesmo modelo operacional dos demais produtos.

### US2 - Time mantem Supabase gerenciado no inicio
**Ator**: Time tecnico da 2SDigital

**Fluxo**:
1. A aplicacao sobe em Docker.
2. Continua apontando para o Supabase atual.
3. Migrations continuam sendo aplicadas com processo controlado.

**Resultado esperado**: runtime proprio sem replatform completo do backend.

### US3 - Time prepara migracao futura sem travar o produto
**Ator**: Dono do produto

**Fluxo**:
1. O roadmap separa a fase de containerizacao da fase de banco/servicos gerenciados.
2. O time decide mais tarde se continua com Supabase gerenciado ou se avalia self-host.

**Resultado esperado**: infraestrutura evolui por etapas, sem forcar uma migracao arriscada agora.

---

## Functional Requirements

### FR-1: Containerizacao da aplicacao
- **FR-1.1**: O projeto deve ter `Dockerfile` para build e runtime de producao.
- **FR-1.2**: O container deve iniciar a aplicacao em modo producao com `npm run build` e `npm start`.
- **FR-1.3**: O processo deve suportar configuracao por variaveis de ambiente.
- **FR-1.4**: O container nao deve depender de artefatos manuais fora do repositorio.

### FR-2: Runtime local e VPS
- **FR-2.1**: O projeto deve ter definicao de `docker-compose` para ambiente operacional basico.
- **FR-2.2**: O compose deve permitir conectar o app a um Supabase externo.
- **FR-2.3**: O runtime deve prever healthcheck e restart policy.

### FR-3: Operacao e deploy
- **FR-3.1**: O modulo deve documentar o fluxo de build, push e deploy na VPS.
- **FR-3.2**: O modulo deve documentar como manter deploy automatico por branch.
- **FR-3.3**: O modulo deve documentar como continuar aplicando migrations do banco fora do container da app.

### FR-4: Transicao segura
- **FR-4.1**: A trilha deve permitir manter `Vercel + Supabase` durante validacao.
- **FR-4.2**: A trilha deve definir criterios claros para quando faz sentido sair da Vercel.
- **FR-4.3**: A trilha deve deixar explicito que self-host de Supabase e uma fase separada.

---

## Success Criteria

| Criterio | Meta |
|----------|------|
| Padronizacao | Time consegue subir o NossoCRM com o mesmo fluxo operacional dos outros produtos |
| Portabilidade | Aplicacao pode ser executada em VPS sem depender da Vercel |
| Transicao segura | Migracao de runtime nao exige mudar banco e auth na mesma janela |
| Operabilidade | Deploy, rollback e restart ficam documentados e previsiveis |

---

## Key Entities

### App Container
- Imagem do Next.js pronta para producao
- Recebe envs e exposta porta HTTP interna

### Runtime Stack
- Compose do app
- Rede, volume opcional e politicas de restart

### External Managed Services
- Supabase atual
- Servicos externos como APIs de IA e integracoes

### Deployment Pipeline
- Processo que constroi imagem, publica e atualiza a VPS

---

## Assumptions

1. A 2SDigital ja possui uma VPS com outros produtos rodando em Docker.
2. O objetivo inicial e uniformizar runtime, nao eliminar imediatamente Vercel ou Supabase gerenciado.
3. O NossoCRM continuara dependendo de servicos externos que nao precisam entrar no compose da primeira fase.
