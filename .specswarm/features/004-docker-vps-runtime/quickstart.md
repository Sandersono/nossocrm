# Quickstart: Runtime Docker para VPS

## Objetivo da primeira entrega

Subir o NossoCRM em Docker na VPS, mantendo Supabase gerenciado.

## Fluxo alvo

1. Gerar imagem de producao do app.
2. Publicar a imagem em registry acessivel pela VPS.
3. Atualizar stack Docker Compose do CRM.
4. Injetar envs de producao.
5. Validar healthcheck, login e onboarding.

## Validacoes minimas

1. O container sobe sem erro e responde HTTP.
2. Login com Supabase continua funcionando.
3. `/register` continua criando tenant corretamente.
4. Chatwoot e demais integracoes continuam operando por env.
5. A app faz rollback para a imagem anterior sem ajustes manuais no codigo.

## Criterio para fase 2

Prosseguir para automacao completa de deploy na VPS apenas quando:
- a imagem estiver estavel em ambiente homologado
- o fluxo de envs e proxy estiver padronizado
- o time confirmar ganho operacional real em relacao a Vercel
