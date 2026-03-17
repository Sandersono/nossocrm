# Quickstart: Modulo Multi-Tenant SaaS

## 1. Aplicar infraestrutura

1. Aplicar a nova migration no Supabase.
2. Confirmar que as envs atuais de Supabase e Vercel continuam configuradas.

## 2. Bootstrap da plataforma

1. Em instancia vazia, concluir o fluxo `/setup`.
2. Confirmar que a primeira organizacao e o admin foram criados.

## 3. Onboarding de novo tenant

1. Acessar `/register`.
2. Criar uma segunda organizacao.
3. Confirmar login e acesso ao dashboard.

## 4. Validar isolamento

1. Criar boards, contatos e deals em duas organizacoes distintas.
2. Entrar com usuarios de tenants diferentes.
3. Confirmar que cada usuario enxerga apenas os dados do proprio tenant.

## 5. Validar deploy

1. Executar `npm run build`.
2. Publicar na Vercel com a branch de produto.
3. Repetir os cenarios 2 a 4 em ambiente publicado.
