# Docker VPS Roadmap

## Objetivo

Colocar o NossoCRM no mesmo padrao operacional dos outros produtos da 2SDigital sem forcar uma migracao arriscada de toda a stack.

## Recomendacao

A melhor sequencia para o NossoCRM e:

1. Containerizar a aplicacao Next.js.
2. Manter o Supabase gerenciado na primeira fase.
3. Homologar o runtime em VPS.
4. So depois decidir se a producao sai da Vercel.

## Por que esse caminho faz sentido

- voces ja operam outros sistemas em Docker na mesma VPS
- o ganho operacional vem do runtime padronizado, nao de self-hostar tudo de uma vez
- o Supabase hoje concentra auth, banco, RLS, storage e migrations; mover tudo junto elevaria muito o risco

## O que entra na Fase 1

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- healthcheck
- estrategia de build, publish e deploy da imagem
- documentacao operacional

## O que fica fora da Fase 1

- Supabase self-host
- banco na mesma VPS
- troca obrigatoria da Vercel no mesmo momento
- observabilidade completa da plataforma

## Criterio de corte para sair da Vercel

Faz sentido mover a producao do CRM para a VPS quando:

- o compose estiver estavel em homologacao
- rollback por tag estiver simples
- envs e proxy estiverem padronizados
- a operacao centralizada trouxer ganho real de custo ou controle

## Onde esta o detalhamento

O detalhamento completo desta trilha esta em:

- [spec.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/004-docker-vps-runtime/spec.md)
- [plan.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/004-docker-vps-runtime/plan.md)
- [tasks.md](D:/Nosso%20CRM/nossocrm/.specswarm/features/004-docker-vps-runtime/tasks.md)
