# Contract: Chatwoot Webhook Inbound

## Endpoint

`POST /api/integrations/chatwoot/webhook/{webhookToken}`

## Purpose

Receber eventos do Chatwoot para sincronizacao comercial e historica dentro do NossoCRM.

## Authentication

- O contrato do MVP usa `webhookToken` opaco na URL.
- Requisicoes sem token valido retornam `401`.
- Integracoes inativas retornam `404` ou `410`, conforme politica final.

## Request Requirements

- `Content-Type: application/json`
- O corpo deve conter payload valido do Chatwoot para eventos de conversa, label, mensagem ou resolucao.
- O sistema deve aceitar payloads com campos extras sem falhar.

## Normalized Event Types Expected

- `conversation_created`
- `conversation_updated`
- `conversation_status_changed`
- `conversation_resolved`
- `conversation_labels_changed`
- `message_created`

> Observacao: o modulo pode receber nomes diferentes do Chatwoot e normaliza-los internamente.

## Processing Contract

1. Persistir evento bruto no log.
2. Calcular `event_fingerprint`.
3. Se duplicado, responder sucesso idempotente.
4. Se nao duplicado, processar regras:
   - vinculo de contato
   - resolucao de deal elegivel
   - aplicacao de mapeamento de label
   - criacao de snapshot historico
   - enfileiramento de resumo

## Success Responses

### 202 Accepted

```json
{
  "ok": true,
  "status": "accepted",
  "eventLogId": "uuid",
  "eventType": "conversation_labels_changed"
}
```

### 200 Duplicate

```json
{
  "ok": true,
  "status": "duplicate",
  "eventLogId": "uuid"
}
```

## Failure Responses

### 401 Unauthorized

```json
{
  "ok": false,
  "error": "Invalid webhook token"
}
```

### 422 Invalid Payload

```json
{
  "ok": false,
  "error": "Unsupported or invalid Chatwoot payload"
}
```

## Side Effects

- Pode mover deal, criar activity, criar snapshot historico e enfileirar resumo.
- Nenhum side effect pode ocorrer antes da persistencia do evento.
