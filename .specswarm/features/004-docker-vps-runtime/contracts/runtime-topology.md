# Contract: Topologia de Runtime Docker

## Objetivo

Definir o contrato operacional minimo para rodar o NossoCRM em Docker sem trazer o backend inteiro para dentro da VPS.

## Runtime Contract

### Container principal
- nome logico: `nossocrm-app`
- responsabilidade: servir a aplicacao Next.js em producao
- comando alvo: build de producao seguido de start HTTP

### Dependencias externas obrigatorias
- Supabase hospedado externamente
- provedores de IA externos
- quaisquer integracoes ja configuradas por env

### Responsabilidades fora do container
- aplicacao de migrations de banco
- gestao de DNS e TLS
- proxy reverso da VPS
- observabilidade central da plataforma

## Deployment Contract

### Entrada
- branch principal da 2SDigital
- imagem buildada a partir do codigo validado
- arquivo de env de producao ou secret manager equivalente

### Saida
- container atualizado na VPS
- app acessivel pelo dominio configurado
- possibilidade de rollback para tag anterior

## Guardrails

- nao acoplar schema migration ao boot do container
- nao assumir Supabase self-host na primeira fase
- nao misturar esta trilha com regras de negocio do CRM
