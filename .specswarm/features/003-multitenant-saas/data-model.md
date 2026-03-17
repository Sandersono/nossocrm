# Data Model: Modulo Multi-Tenant SaaS

## Core Access Model

### Organization
- `id`
- `name`
- `deleted_at`
- `created_at`
- `updated_at`

### Profile
- `id`
- `email`
- `role`
- `organization_id`
- `created_at`
- `updated_at`

### Organization Settings
- `organization_id`
- configuracoes globais de IA e organizacao

## Tenant-Bound CRM Entities

### Board
- `organization_id`
- pipeline do tenant

### Board Stage
- `organization_id`
- `board_id`
- herda contexto do board

### CRM Company
- `organization_id`

### Contact
- `organization_id`

### Product
- `organization_id`

### Deal
- `organization_id`
- `board_id`
- `stage_id`
- `contact_id`

### Deal Item
- `organization_id`
- `deal_id`

### Activity
- `organization_id`
- `deal_id`
- `contact_id`

### Deal Note / Deal File
- herdados do `deal_id`

## Derived Access Helpers

### current_profile_organization_id()
- resolve o tenant atual a partir de `auth.uid()`

### current_profile_is_admin()
- informa se o usuario autenticado e admin no tenant atual
