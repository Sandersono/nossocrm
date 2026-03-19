# Quickstart: Clinicorp x NossoCRM

## Objective

Validate the Clinicorp integration end to end in a homologation environment.

## Prerequisites

- A valid Clinicorp API user and token
- Subscriber id from the target Clinicorp account
- A CRM admin user in the target organization

## Steps

1. Open `Configuracoes > Integracoes > Clinicorp`.
2. Save:
   - API base URL
   - API username
   - API token
   - subscriber id
3. Run healthcheck and confirm success.
4. Trigger a manual sync for:
   - businesses
   - professionals
   - appointments for a small date range
   - estimates for a small date range
   - financial summary for a small date range
5. Confirm that logs are persisted for each run.
6. Pick one CRM contact and push it to Clinicorp via lead push.
7. Confirm that the outbound log stores response code and provider response.
8. If the client uses purchase orders, create one sample order through the operational flow.
9. Reprocess one selected execution and confirm logs remain intact.

## Expected Results

- The integration configuration is saved without exposing secrets back to the client.
- Healthcheck returns success using real Clinicorp credentials.
- Each sync run creates persistent logs and snapshots.
- Lead push reaches Clinicorp successfully.
- Purchase order flow, when enabled, validates and returns a logged provider response.
