# Docker VPS Deploy

## Objetivo

Rodar o NossoCRM na VPS da 2SDigital em Docker, mantendo o Supabase na cloud.

## Arquivos principais

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `docker-compose.vps.yml`
- `.env.docker.example`
- `.github/workflows/docker-vps-deploy.yml`

## Segredos necessarios no GitHub

### Obrigatorios para build e publish
- nenhum secret manual adicional; o workflow usa o `GITHUB_TOKEN` nativo do GitHub Actions

### Obrigatorios para deploy automatico na VPS
- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_DEPLOY_PATH`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

`GHCR_TOKEN` deve ter pelo menos permissao de `read:packages` para a VPS conseguir fazer pull da imagem.

## Fluxo automatico

1. Push na `2sdigital-main`
2. GitHub Actions builda a imagem
3. GitHub Actions publica a imagem no GHCR
4. Se os secrets de VPS estiverem configurados, a VPS recebe update automatico

## Preparacao da VPS

1. Instalar Docker e Docker Compose plugin.
2. Criar diretorio de deploy do CRM.
3. Colocar `docker-compose.yml`, `docker-compose.vps.yml` e `.env.docker` nesse diretorio.
4. Ajustar proxy reverso para apontar para a porta publicada do CRM.

## Preparacao do `.env.docker`

1. Copiar `.env.docker.example` para `.env.docker`.
2. Preencher as envs reais do Supabase.
3. Definir `INSTALLER_ENABLED=false`.
4. Definir `INSTALLER_TOKEN`.
5. Definir `INTEGRATIONS_ENCRYPTION_KEY` se Chatwoot estiver ativo.
6. Definir `APP_DOMAIN` com o dominio do CRM na VPS.
7. Opcionalmente ajustar `TRAEFIK_ROUTER_NAME`.

## Primeiro deploy manual

Antes de deixar automatico, vale validar uma vez na mao:

```bash
cp .env.docker.example .env.docker
docker compose -f docker-compose.yml -f docker-compose.vps.yml build nossocrm
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d nossocrm
docker compose -f docker-compose.yml -f docker-compose.vps.yml logs -f nossocrm
```

## Observacoes

- O banco continua fora do container da app.
- As migrations do Supabase continuam sendo aplicadas via workflow separado.
- O cutover final da Vercel para a VPS deve acontecer so depois da homologacao.
- Na VPS com Traefik, use sempre o override `docker-compose.vps.yml`.
