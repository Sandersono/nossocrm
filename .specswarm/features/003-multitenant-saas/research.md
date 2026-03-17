# Research: Modulo Multi-Tenant SaaS

## Decision 1: Manter multi-tenancy logico no mesmo banco

**Decision**: O modulo usara isolamento logico com `organization_id` + RLS no banco compartilhado.

**Rationale**:
- ja existe base pronta no schema
- reduz custo operacional
- encaixa no deploy atual com Vercel + Supabase

**Alternatives considered**:
- Banco por cliente: descartado para esta fase por custo e complexidade.
- Schema por cliente: descartado por complexidade adicional sem necessidade imediata.

## Decision 2: Separar bootstrap da plataforma do onboarding comercial

**Decision**: O setup inicial continua existindo para a primeira configuracao da instancia; novos clientes entram por um fluxo proprio de registro.

**Rationale**:
- evita quebrar o caminho de primeira instalacao
- permite crescimento SaaS sem reusar um wizard pensado para dono da plataforma

## Decision 3: Endurecer primeiro as tabelas centrais do CRM

**Decision**: O hardening inicial cobre organizations, profiles, organization_settings, boards, board_stages, contacts, companies, products, deals, deal_items, activities, notes, files e storage associado.

**Rationale**:
- sao as superficies com maior risco de vazamento comercial
- cobrem o fluxo principal do produto

## Decision 4: Falhar cedo quando organization_id estiver ausente

**Decision**: Criacao de usuario sem `organization_id` explicito deixa de usar fallback singleton e passa a falhar com erro claro.

**Rationale**:
- evita vinculos acidentais ao tenant errado
- reduz ambiguidade operacional

## Decision 5: Docker sai do escopo e entra apenas no roadmap

**Decision**: O modulo nao muda o runtime para Docker.

**Rationale**:
- Docker nao resolve isolamento de tenant
- o objetivo imediato e SaaS funcional em Vercel
