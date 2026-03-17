# Contract: Label Routing Rules

## Purpose

Definir como labels e estados do Chatwoot acionam mutacoes comerciais no NossoCRM.

## Rule Input

Cada regra recebe o contexto normalizado:

```json
{
  "organizationId": "uuid",
  "integrationId": "uuid",
  "eventType": "conversation_labels_changed",
  "chatwootConversationId": "123",
  "chatwootInboxId": "7",
  "contactId": "uuid-or-null",
  "candidateDealIds": ["uuid"],
  "labels": ["qualificado", "proposta-enviada"],
  "status": "resolved"
}
```

## Rule Output

Uma regra ativa pode produzir:

```json
{
  "matched": true,
  "ruleId": "uuid",
  "action": {
    "moveToBoardId": "uuid-or-null",
    "moveToStageId": "uuid-or-null",
    "markWon": false,
    "markLost": false,
    "createActivity": true
  }
}
```

## Mandatory Behaviors

1. Regras sao avaliadas apenas para a organizacao/integracao correspondente.
2. Regras inativas sao ignoradas.
3. Se houver mais de um deal elegivel e `require_single_open_deal = true`, o sistema nao movimenta card automaticamente.
4. A mesma regra nao pode ser reaplicada ao mesmo `event_fingerprint`.
5. Se nenhuma regra casar, o evento pode ser marcado como `ignored` sem erro.

## Ambiguity Policy

### No candidate deal
- Nao movimenta card
- Pode registrar atividade ou historico

### Multiple candidate deals
- Nao movimenta card
- Evento fica auditado como ambiguo

### Conflicting labels
- Se duas regras conflitarem, prevalece a regra mais especifica:
  1. inbox + label
  2. label global
  3. fallback sem movimento
