# Data Model: Runtime Docker para VPS

## Entity: App Runtime Config

### Fields
- `image_tag`: versao da imagem publicada
- `port`: porta HTTP interna do container
- `node_env`: ambiente de execucao
- `app_envs`: conjunto de variaveis obrigatorias
- `healthcheck_path`: endpoint de verificacao

### Rules
- deve permitir configuracao sem rebuild para segredos operacionais
- deve falhar cedo quando envs obrigatorias estiverem ausentes

## Entity: Deployment Stack

### Fields
- `service_name`: nome do servico do CRM no compose
- `network_name`: rede compartilhada com proxy ou outros apps
- `restart_policy`: politica de restart
- `volume_mounts`: volumes opcionais
- `labels`: metadados de roteamento se houver proxy reverso

### Rules
- deve ser compativel com uma VPS que ja roda outros containers
- nao deve assumir exclusividade da maquina

## Entity: Managed Backend Dependency

### Fields
- `supabase_url`
- `supabase_publishable_key`
- `supabase_secret_key`
- `database_migration_target`
- `external_integrations`

### Rules
- backend gerenciado continua fora do compose inicial
- migrations precisam continuar apontando para o alvo correto

## Entity: Deployment Pipeline

### Fields
- `branch_source`
- `build_trigger`
- `registry_target`
- `deploy_target`
- `rollback_strategy`

### Rules
- precisa suportar deploy automatizado por branch
- precisa ter rollback simples por imagem/tag anterior
