# Tasks: Modulo Multi-Tenant SaaS

## Phase 1 - Setup

- [x] T001 Create feature scaffolding under `.specswarm/features/003-multitenant-saas`
- [x] T002 Write spec, research, data model, contracts, quickstart, plan and tasks

## Phase 2 - Database Hardening

- [x] T003 Create Supabase migration for tenant helper functions and singleton removal
- [x] T004 Tighten RLS for organizations, profiles and organization_settings
- [x] T005 Tighten RLS for boards, stages, contacts, companies, products, deals, deal_items and activities
- [x] T006 Tighten RLS for deal notes, files and `storage.objects` in `deal-files`
- [x] T007 Make tenant-sensitive RPCs operate on the current organization

## Phase 3 - Public Onboarding

- [x] T008 Create public route `POST /api/organizations/register`
- [x] T009 Create public page `/register`
- [x] T010 Update login and proxy wiring for registration flow

## Phase 4 - Validation

- [x] T011 Run `npm run typecheck`
- [x] T012 Run `npm run lint`
- [x] T013 Run `npm run build`
- [ ] T014 Validate the Vercel-ready flow manually after deploy

## Backlog

- [ ] T015 Add central platform management actions for superadmin (edit tenant, suspend access, reset initial admin, and controlled tenant support access)
- [ ] T016 Add basic visual identity customization (platform logo/name and optional tenant branding fields for login, header, favicon, and emails)
