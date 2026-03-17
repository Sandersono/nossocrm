# Implementation Plan: Runtime Docker para VPS

## 1. Technical Context

### Current Stack
- Next.js 16 App Router
- Supabase hospedado externamente
- GitHub como fonte de deploy
- Vercel como runtime atual da aplicacao

### Existing Surfaces to Reuse
- `.env.example`
- scripts `build` e `start` em `package.json`
- workflow de migrations em `.github/workflows/supabase-db-push.yml`
- documentacao atual focada em Vercel

### Constraints
- nao quebrar o fluxo atual de Vercel
- nao mover Supabase para a VPS nesta fase
- manter deploy por branch da 2SDigital
- respeitar a existencia de outros containers na mesma VPS

## 2. Design

### 2.1 Target Architecture

```text
GitHub (2sdigital-main)
  -> CI build image
  -> push para registry
  -> VPS pull da nova tag
  -> docker-compose up -d

Container NossoCRM
  -> Next.js app
  -> envs de producao
  -> proxy reverso existente

External Managed Services
  -> Supabase
  -> APIs de IA
  -> webhooks e integracoes
```

### 2.2 Delivery Boundaries

#### In Scope
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml` para runtime basico
- healthcheck
- documentacao de envs e deploy
- automacao de build/deploy da imagem

#### Out of Scope
- Supabase self-host
- observabilidade completa de plataforma
- proxy reverso novo
- Kubernetes

## 3. Phases

### Phase 1: Specification
- abrir pacote `.specswarm`
- registrar decisao arquitetural

### Phase 2: Container Assets
- criar `Dockerfile`
- criar `.dockerignore`
- criar `docker-compose.yml`

### Phase 3: Deployment Automation
- definir workflow de build e publish de imagem
- definir fluxo de deploy na VPS
- documentar rollback por tag

### Phase 4: Runtime Validation
- subir ambiente de homologacao
- validar login, onboarding multi-tenant e integracoes principais
- validar processo de rollback

## 4. Recommendation

### Recommended first move
- Containerizar a app agora, mas manter a producao principal na Vercel ate a homologacao do runtime em VPS ficar estavel.

### Recommended production cutover trigger
- Fazer o cutover quando o CRM demandar a mesma disciplina operacional dos outros produtos e o fluxo de deploy em Docker estiver validado.
