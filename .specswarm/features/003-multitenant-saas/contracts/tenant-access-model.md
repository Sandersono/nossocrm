# Contract: Tenant Access Model

## Rule 1
Todo usuario autenticado opera apenas dentro de `profiles.organization_id`.

## Rule 2
Tabelas com `organization_id` fazem match direto com o tenant atual.

## Rule 3
Tabelas sem `organization_id` proprio usam o recurso pai:
- `deal_notes` e `deal_files` herdam de `deals`
- `storage.objects` do bucket `deal-files` herdam de `deal_files -> deals`

## Rule 4
Criacao de usuario sem `organization_id` explicito e considerada invalida no modo multi-tenant.
