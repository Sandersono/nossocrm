# Research: Runtime Docker para VPS

## Decision 1: Containerizar primeiro a aplicacao, nao o Supabase inteiro

**Decision**
- A primeira fase deve colocar apenas o app Next.js em Docker.

**Rationale**
- O CRM depende fortemente de Supabase Auth, RLS, Storage e migrations.
- Reproduzir todo o ecossistema Supabase na mesma VPS aumenta muito a superficie operacional.
- Containerizar a app ja entrega padrao operacional proximo dos outros sistemas sem reescrever a stack.

**Alternatives considered**
- Self-host completo do Supabase na mesma fase: descartado por risco e complexidade.
- Permanecer apenas em Vercel: mantem simplicidade, mas nao atende a padronizacao operacional desejada.

## Decision 2: Manter arquitetura hibrida durante a transicao

**Decision**
- O roadmap deve aceitar dois modos validos por um periodo: `Vercel + Supabase` e `Docker app + Supabase`.

**Rationale**
- Isso permite validar clientes sem acoplar migracao de runtime com evolucao de produto.
- Reduz risco de regressao em onboarding, multi-tenancy e integracoes.

**Alternatives considered**
- Cutover direto da Vercel para VPS: descartado por concentrar muito risco em uma unica janela.

## Decision 3: Usar Docker Compose como alvo operacional inicial

**Decision**
- O primeiro runtime containerizado deve usar `docker-compose`.

**Rationale**
- E o formato mais compativel com a realidade descrita de uma unica VPS com outros produtos.
- Tem menor custo operacional do que Kubernetes ou orquestradores mais pesados.

**Alternatives considered**
- Kubernetes: excesso para o estagio atual.
- Containers manuais sem compose: fraco para reproducao e operacao.

## Decision 4: Migrations do banco continuam fora do container da app

**Decision**
- O processo de banco continua separado da imagem da aplicacao.

**Rationale**
- Ja existe fluxo de GitHub Actions para aplicar migrations no Supabase.
- Misturar schema migration com startup do app aumenta risco de deploy quebrado e rollback ruim.

**Alternatives considered**
- Rodar migration no boot do container: descartado por fragilidade operacional.

## Decision 5: A saida da Vercel deve ser condicionada a gatilhos claros

**Decision**
- A migracao da Vercel para VPS so faz sentido quando houver necessidade operacional, financeira ou de padrao de plataforma.

**Rationale**
- A Vercel continua sendo o caminho mais rapido para deploy e rollback da app.
- A VPS passa a fazer mais sentido quando a operacao de varios produtos sob o mesmo runtime gerar economia ou previsibilidade maiores.

**Alternatives considered**
- Migrar imediatamente por preferencia de stack: descartado por nao atacar um problema tecnico urgente.
