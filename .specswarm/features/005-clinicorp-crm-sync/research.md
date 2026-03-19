# Research: Modulo Clinicorp x NossoCRM

## Sources

- Official Swagger UI: https://sistema.clinicorp.com/api-docs/
- Embedded OpenAPI document loaded from: https://sistema.clinicorp.com/api-docs/swagger-ui-init.js
- User-provided PDF: `C:\Users\sande\Downloads\Print CliniCorp.pdf` (image-based; low extraction value)

## Decision 1: Authentication model

**Decision**: Use HTTP Basic authentication exactly as documented by the Clinicorp Swagger security scheme.

**Rationale**:
- The official Swagger defines the security scheme as HTTP auth with scheme `basic`.
- The documentation explicitly states:
  - username = API user / access ID
  - password = API token
- This fits the existing CRM pattern of storing protected integration credentials per organization.

**Alternatives considered**:
- API key in custom header: rejected because not documented as the official auth scheme.
- OAuth-like flow: rejected because not present in the official docs.

## Decision 2: Integration mode

**Decision**: Start with pull-based synchronization plus explicit outbound actions.

**Rationale**:
- No webhook or subscription contract was found in the official docs consulted.
- Pull-based sync is operationally safer for first release and easier to diagnose.
- The CRM already has patterns for admin-triggered integrations and persisted execution logs.

**Alternatives considered**:
- Real-time sync: rejected for MVP because no webhook contract was found.
- Full bidirectional replication: rejected as too broad for first release.

## Decision 3: MVP data scope

**Decision**: The MVP should cover:
- connection and healthcheck
- sync of clinics/businesses
- sync of professionals
- patient lookup and linking
- appointment snapshots
- estimate snapshots
- financial summary snapshots
- outbound lead push via `/crm/add_leads`

`/products/orders` should be included as an operational lane of the module, but not define the whole MVP by itself.

**Rationale**:
- These endpoints align with the CRM's commercial and operational value.
- They give immediate value to clinics using Clinicorp without attempting to clone Clinicorp.
- The linked endpoint `/products/orders` is valid and important, but narrower than the full opportunity.

**Alternatives considered**:
- Build only `products/orders`: rejected because it would underuse the available API surface.
- Build all 49 endpoints: rejected due to cost, risk, and weak initial validation path.

## Decision 4: Data persistence strategy

**Decision**: Persist normalized integration snapshots and explicit external links in dedicated Clinicorp tables instead of mixing raw provider payload directly into existing CRM entities.

**Rationale**:
- The CRM already follows this pattern for Chatwoot.
- It supports reprocessing, auditability, and safer schema evolution.
- It avoids corrupting core CRM entities with provider-specific fields.

**Alternatives considered**:
- Store only raw JSON blobs: rejected because it weakens queryability and UI consumption.
- Directly overwrite CRM contacts/deals on every sync: rejected because of data ownership conflicts.

## Decision 5: Operational control surface

**Decision**: Expose the Clinicorp module under Settings > Integrations, with:
- connection settings
- healthcheck
- manual sync actions
- execution logs
- outbound actions for leads and purchase orders

**Rationale**:
- This matches the admin mental model already established with Chatwoot.
- Operators need diagnostics and reprocessing, not just credential storage.

**Alternatives considered**:
- Hide all syncs as background-only jobs: rejected because the first release needs explicit operational validation.
