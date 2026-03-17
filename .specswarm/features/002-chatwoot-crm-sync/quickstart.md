# Quickstart: Validacao do Modulo Chatwoot x CRM

## Pre-requisitos

1. Organizacao autenticada com perfil admin
2. Conta do Chatwoot acessivel
3. Pipeline com board e stages existentes no CRM
4. IA configurada na organizacao para testar resumo automatico

## Scenario 1: Ativar integracao

1. Abrir `Configuracoes > Integracoes > Chatwoot`
2. Cadastrar URL base, account id e token
3. Gerar webhook URL
4. Configurar webhook no Chatwoot
5. Executar teste de conectividade

**Expected**:
- integracao salva
- healthcheck = ok
- webhook url copiada e validada

## Scenario 2: Label move deal

1. Criar regra: `qualificado -> board X / stage Y`
2. Garantir contato vinculado com deal unico elegivel
3. Aplicar label `qualificado` na conversa no Chatwoot
4. Verificar evento recebido
5. Verificar deal movido

**Expected**:
- evento auditado como processed
- regra aplicada registrada
- card movido exatamente uma vez

## Scenario 3: Ambiguidade bloqueia automacao

1. Criar dois deals abertos para o mesmo contato no mesmo board
2. Aplicar label mapeada no Chatwoot

**Expected**:
- evento auditado como failed/ignored por ambiguidade
- nenhum card movido
- diagnostico visivel ao admin

## Scenario 4: Conversa resolvida gera snapshot e resumo

1. Resolver conversa no Chatwoot
2. Aguardar processamento
3. Abrir contato e deal vinculado no CRM

**Expected**:
- snapshot historico visivel
- resumo executivo salvo
- sem duplicidade se o mesmo evento for reenviado

## Scenario 5: Reprocessamento

1. Forcar falha de resumo ou remover mapping temporariamente
2. Receber evento
3. Corrigir configuracao
4. Reprocessar pelo painel

**Expected**:
- evento muda para reprocessed/processed
- side effects aplicados uma unica vez
