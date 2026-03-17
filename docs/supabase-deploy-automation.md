# Supabase Deploy Automation

## Objetivo

O deploy da Vercel publica a aplicacao. As migrations do banco sao aplicadas separadamente pelo GitHub Actions.

## Workflow configurado

- arquivo: `.github/workflows/supabase-db-push.yml`
- gatilho:
  - push para `2sdigital-main` quando houver mudanca em `supabase/migrations/**`
  - `workflow_dispatch`

## Secret necessario no GitHub

- `SUPABASE_DB_URL`

Esse secret deve apontar para a connection string do banco que recebe as migrations de producao.

## Resultado esperado

1. push na `2sdigital-main`
2. Vercel faz deploy da aplicacao
3. GitHub Actions roda `supabase db push`
4. novas tabelas/colunas/policies entram automaticamente no Supabase

## Observacao

Nao e recomendado aplicar migrations dentro do build da Vercel. Isso deve acontecer fora do processo de build da app.
