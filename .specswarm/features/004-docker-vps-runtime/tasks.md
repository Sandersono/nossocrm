# Tasks: Runtime Docker para VPS

## Phase 1 - Setup

- [x] T001 Create feature scaffolding under `.specswarm/features/004-docker-vps-runtime`
- [x] T002 Write spec, research, data model, contracts, quickstart, plan and tasks

## Phase 2 - Container Assets

- [x] T003 Create production `Dockerfile` at `Dockerfile`
- [x] T004 Create `.dockerignore` at `.dockerignore`
- [x] T005 Create base runtime stack at `docker-compose.yml`
- [x] T006 Add healthcheck and runtime configuration guidance in `docker-compose.yml`

## Phase 3 - Deployment Automation

- [x] T007 Create image build and publish workflow under `.github/workflows/`
- [x] T008 Document VPS deploy and rollback flow in `docs/docker-vps-roadmap.md`
- [x] T009 Define branch-to-deploy strategy for `2sdigital-main`

## Phase 4 - Validation

- [x] T010 Run `npm run typecheck`
- [x] T011 Run `npm run lint`
- [ ] T012 Build container image locally
- [ ] T013 Validate app startup with production envs in Docker
- [ ] T014 Validate login, onboarding and Chatwoot integration in homologation

## Phase 5 - Cutover Decision

- [ ] T015 Compare Vercel versus VPS operation after homologation
- [ ] T016 Decide whether to keep hybrid mode or move production runtime to VPS
