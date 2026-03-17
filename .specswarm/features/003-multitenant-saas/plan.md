# Implementation Plan: Modulo Multi-Tenant SaaS

## 1. Technical Context

### Current Stack
- Next.js 16 App Router
- Supabase Auth + Postgres + RLS
- Vercel no deploy principal

### Existing Surfaces to Reuse
- `app/api/setup-instance/route.ts`
- `context/AuthContext.tsx`
- `lib/supabase/middleware.ts`
- tabelas `organizations`, `profiles` e `organization_settings`

### Constraints
- preservar bootstrap inicial
- nao introduzir Docker neste modulo
- manter compatibilidade com rotas e queries atuais

## 2. Design

### 2.1 Architecture

```text
Public Register Page
  -> POST /api/organizations/register
    -> validate payload
    -> verify platform initialized
    -> create organization
    -> create auth user with organization_id
    -> create/update profile
    -> sign in on client

Supabase Migration
  -> helper functions for current tenant
  -> replace singleton-dependent trigger
  -> tenant-safe RPCs
  -> stricter RLS policies on core tables
```

### 2.2 Module Boundaries

#### In Scope
- self-service org registration
- hardening de trigger e RPCs
- RLS nas tabelas centrais
- login/proxy wiring

#### Out of Scope
- billing
- rate limiting comercial
- Docker
- banco por cliente

## 3. Phases

### Phase 1: Specification
- criar pacote `.specswarm`

### Phase 2: Database Hardening
- helper functions de tenant
- trigger `handle_new_user`
- RLS core
- storage policies

### Phase 3: Public Onboarding
- rota `/api/organizations/register`
- pagina `/register`
- link na pagina de login
- proxy route treatment

### Phase 4: Validation
- typecheck
- lint
- build
- readiness para deploy na Vercel
