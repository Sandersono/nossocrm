# Integracao Chatwoot

## Objetivo

O modulo conecta o Chatwoot ao NossoCRM sem transformar o CRM em inbox. O Chatwoot continua sendo a fonte de verdade para contato e conversa; o CRM consome eventos, movimenta pipeline, salva historico e gera resumo executivo por IA.

## O que precisa estar pronto

- Variavel de ambiente `INTEGRATIONS_ENCRYPTION_KEY` definida no servidor.
- Conta Chatwoot com acesso administrativo.
- Um usuario `admin` no CRM para configurar a integracao.
- Pelo menos um board no CRM, caso labels precisem mover deals.

## Setup no CRM

1. Acesse `Configuracoes > Integracoes > Chatwoot`.
2. Salve `Base URL`, `Account ID`, token administrativo e opcionalmente o board padrao.
3. Copie a URL de webhook gerada pelo CRM.
4. Rode `Testar conexao` para validar credenciais.
5. Crie regras em `Regras de Labels`.

## Setup no Chatwoot

1. Cadastre a URL de webhook do CRM.
2. Configure labels operacionais que representem estados comerciais confiaveis.
3. Garanta que os atendentes usem as labels de forma consistente.

## Fluxos principais

- Labels mapeadas movimentam deals, marcam ganho/perda e podem criar activity.
- Conversas resolvidas geram `snapshots` no CRM.
- Resumos por IA rodam de forma assincrona via `Processar resumos pendentes`.
- Eventos com falha ou ignorados podem ser reprocessados no painel `Operacao e Replay`.

## Regras operacionais

- Quando houver mais de um deal aberto elegivel e a regra exigir unicidade, o evento falha sem mover card.
- Eventos duplicados sao deduplicados por fingerprint.
- Replay automatico so e permitido para eventos `failed` ou `ignored`.
- Historico e resumo ficam visiveis no modal do contato e no cockpit do deal.

## Troubleshooting

- `Invalid webhook token`: a integracao foi recriada ou o webhook do Chatwoot esta apontando para um token antigo.
- `Inbox X not allowed`: ajuste a lista de inboxes permitidos na configuracao.
- `No eligible open deal found`: a label chegou sem deal aberto elegivel para aquele contato/board.
- `Ambiguous open deal match`: existem multiplos deals abertos para o mesmo contato e board.
- Falha no resumo por IA: confira chave/modelo de IA da organizacao e rode novamente `Processar resumos pendentes`.
