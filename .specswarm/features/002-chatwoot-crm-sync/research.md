# Research: Modulo de Integracao Chatwoot x NossoCRM

## Decision 1: Chatwoot permanece como source of truth conversacional

**Decision**: O modulo nao replicara o comportamento completo de inbox dentro do CRM no MVP. O CRM armazenara snapshots historicos e artefatos comerciais derivados das conversas.

**Rationale**:
- reduz escopo e risco operacional
- evita duplicar UI e regras de atendimento ja resolvidas pelo Chatwoot
- encaixa melhor no estado atual do produto, que ja tem CRM, pipeline e IA, mas nao uma inbox nativa conversacional

**Alternatives considered**:
- Espelhar toda a inbox em tempo real no CRM: descartado por aumentar muito o escopo e a superficie de falha.
- Registrar apenas resumos sem transcript: descartado por reduzir auditabilidade.

## Decision 2: Idempotencia deve se basear em log de eventos, nao apenas em estado final

**Decision**: Todo evento inbound sera persistido com fingerprint, status e metadados antes de alterar deals, contatos ou historicos.

**Rationale**:
- permite retry seguro
- reduz risco de duplicidade em reentregas do webhook
- cria base para reprocessamento e troubleshooting

**Alternatives considered**:
- Processar inline sem log persistido: descartado por pouca confiabilidade.
- Deduplicar apenas por conversa/label: descartado por nao capturar todos os tipos de evento.

## Decision 3: Vinculo externo persistido entre contatos

**Decision**: A integracao mantera uma tabela de vinculacao entre contact_id do CRM e contact_id/source_id do Chatwoot.

**Rationale**:
- matching por telefone/email e insuficiente como estrategia principal
- evita ambiguidades futuras quando o contato mudar atributos
- melhora desempenho e previsibilidade da automacao

**Alternatives considered**:
- Matching sempre por telefone/email: descartado por fragilidade.
- Armazenar ids externos em custom_fields soltos: descartado por pior governanca e consulta.

## Decision 4: Labels sao o gatilho principal de automacao comercial

**Decision**: As regras iniciais do modulo serao dirigidas por labels do Chatwoot, com filtros adicionais por inbox/status quando necessario.

**Rationale**:
- coincide com o modelo operacional desejado pelo usuario
- desacopla o CRM da semantica textual da conversa
- e facil de explicar para operacao e de auditar

**Alternatives considered**:
- Usar apenas status da conversa: descartado por granularidade insuficiente.
- Usar NLP sobre toda mensagem para mover cards: descartado para o MVP por risco de erro alto.

## Decision 5: Historico comercial sera snapshot por conversa resolvida

**Decision**: O CRM salvara o transcript consolidado e o resumo quando a conversa for resolvida ou entrar em estado elegivel de consolidacao.

**Rationale**:
- reduz volume operacional de sync
- entrega valor direto ao comercial
- preserva o estado mais relevante da conversa

**Alternatives considered**:
- Espelhar cada mensagem em tempo real no CRM: descartado no MVP.
- Salvar apenas metadados sem transcript: descartado por limitar contexto.

## Decision 6: Pipeline de resumo sera assincro e reprocessavel

**Decision**: A geracao de resumo por LLM sera desacoplada do recebimento do webhook e tera status proprio.

**Rationale**:
- evita timeout no recebimento de eventos
- isola falhas de IA do fluxo principal
- permite reprocessar resumos sem reaplicar automacoes comerciais

**Alternatives considered**:
- Gerar resumo inline no webhook: descartado por risco de latencia e falha.
- Nao usar fila e tentar resumir apenas sob demanda: descartado porque perde automacao e previsibilidade.
