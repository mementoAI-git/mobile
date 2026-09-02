# Platform Remediation Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate the audited Memento API, web, and mobile security, contract, capsule, Polar billing, reliability, and design gaps without breaking supported clients.

**Architecture:** Use an expand-migrate-observe-contract rollout. The API adds secure canonical behavior and compatibility shims first; web and mobile migrate independently; telemetry gates every removal. Security fixes never roll back to cross-user access or public exposure.

**Tech Stack:** Node.js 24, TypeScript, Express, Mongoose, MongoDB, Redis, BullMQ, Polar, Swagger/OpenAPI, React/Vite, Expo/React Native, Axios, TanStack Query, Zustand, Vitest/Bun tests.

**Spec:** `docs/superpowers/specs/2026-08-27-platform-remediation-design.md`

## Global Constraints

- API, web, and mobile may deploy at different times; preserve all legitimate existing routes and fields during migration.
- Authorization flaws, unsigned webhooks, unrestricted Bull Board, unrestricted Sentry relay, and deleted-user sessions receive no compatibility bypass.
- Polar is the sole billing provider; do not add Paystack or a provider-selection abstraction.
- Files use signed Memento proxy URLs first; direct provider URLs are not required.
- New uploads are signed-only; existing legacy files migrate after client telemetry permits it.
- Existing mobile design rules in `AGENTS.md` apply to every touched mobile file.
- Use field-level Zustand selectors, centralized query/mutation hooks, stable list callbacks, and existing UI components.
- Never combine contract migration with unrelated screen redesign.
- Every database migration is additive, idempotent, resumable, and safe for the previous application release to read.
- Every queue payload carries a schema version during rolling deployment.
- All security and contract work follows red-green TDD.
- Work in isolated worktrees because the current mobile checkout contains unrelated user changes.

## Repository Boundaries

| Repository | Owns | Primary verification |
|---|---|---|
| `memento/api` | Authorization, contracts, files, sessions, deletion, capsules, Polar, usage, migrations, workers | `yarn lint`, `yarn compile`, `yarn test` |
| `memento/web` | Web transport adapter, auth, public memory/capsule routes, media refresh, billing normalization | package lint, typecheck, Vitest, build |
| `memento/mobile` | Session coordinator, transport adapter, native auth, media refresh, push device, capsules/billing, design system | `bun run verify`, targeted native acceptance |

## Dependency Graph

```text
R0 test/config/version telemetry
  -> R1 authorization + signed files + protected operational routes
  -> R2 canonical response/error/session contracts + endpoint aliases
       -> R3 web migration
       -> R4 mobile migration
            -> R5 account purge + capsule delivery + Polar/usage + reliability
                 -> R6 shim retirement
                 -> R6 mobile design/documentation convergence
```

---

### Task 1: Release 0 — API Test and Compatibility Foundation

**Files:**
- Modify: `api/package.json`
- Modify: `api/tsconfig.json`
- Create: `api/vitest.config.ts`
- Create: `api/test/setup.ts`
- Create: `api/test/helpers/app.ts`
- Create: `api/test/helpers/factories.ts`
- Create: `api/src/middleware/request-context.ts`
- Create: `api/src/utils/runtime-config.ts`
- Modify: `api/src/app.ts`
- Modify: `api/src/index.ts`
- Modify: `api/.github/workflows/deploy-dev.yml`
- Modify: `api/.github/workflows/deploy-prod.yml`
- Create: `api/docs/compatibility-registry.md`

**Interfaces:**
- Produces `validateRuntimeConfig(env): RuntimeConfig` and `requestContext(req,res,next)`.
- Produces API integration-test helpers used by every backend plan.

- [ ] Add Vitest, Supertest, isolated MongoDB, deterministic environment setup, and `yarn test`.
- [ ] Add request IDs and non-sensitive client version parsing.
- [ ] Add runtime configuration validation in development-report/production-enforce modes.
- [ ] Add the compatibility registry with owner, legacy shape, canonical shape, telemetry key, and removal gate columns.
- [ ] Make API tests a required deployment build step.
- [ ] Run `yarn test && yarn lint && yarn compile` and commit `test(api): establish remediation safety gates`.

### Task 2: Release 1 — API Security Containment and Private Files

**Files:**
- Detailed plan: `docs/superpowers/plans/2026-08-27-api-security-private-files.md`

**Interfaces:**
- Consumes the Release 0 test harness and runtime configuration.
- Produces memory/file policies, signed file capabilities, protected operations, and security regression tests.

- [ ] Execute every task in the detailed security plan in order.
- [ ] Deploy to staging and run two-user authorization, signed media, range streaming, Sentry allowlist, Bull Board, and webhook acceptance tests.
- [ ] Deploy API-only to production with no client migration required for normal API-fetched media.
- [ ] Observe authorization denials and signed URL failures for one release checkpoint.

### Task 3: Release 2 — Canonical Contracts, Sessions, and Push Devices

**Files:**
- Create: `api/src/contracts/response.ts`
- Create: `api/src/contracts/public-user.ts`
- Create: `api/src/contracts/session.ts`
- Create: `api/src/module/database/model/auth-session.ts`
- Create: `api/src/module/database/model/push-device.ts`
- Create: `api/src/module/api/auth/session-service.ts`
- Create: `api/src/module/api/push-device/{routes,controller,service,validator}.ts`
- Modify: `api/src/utils/helpers.ts`
- Modify: `api/src/middleware/gaurd.ts`
- Modify: `api/src/middleware/error-handler.ts`
- Modify: `api/src/module/api/auth/{service,routes,validator}.ts`
- Modify: `api/src/module/api/user/{routes,service,validator}.ts`
- Modify: `api/src/module/api/prompt/routes.ts`
- Modify: `api/src/module/api/ai/routes.ts`
- Create: `api/test/contracts/auth.contract.test.ts`
- Create: `api/test/contracts/aliases.contract.test.ts`
- Create: `api/test/auth/session-revocation.test.ts`

**Interfaces:**
- Produces `ApiResponse<T>`, `ApiError`, `PublicUser`, `SessionPayload`, `AuthSession`, and `PushDevice` exactly as defined by the spec.
- Preserves legacy auth token fields while adding `success`, `data.session`, `user`, stable error codes, and request IDs.

- [ ] Write failing contract tests for password, 2FA, passkey, OAuth, refresh, legacy refresh migration, logout-current, logout-other, and global revocation.
- [ ] Add response/error builders without removing existing fields.
- [ ] Add AuthSession token hashing/rotation and compatibility migration from raw User refresh tokens.
- [ ] Add session/security-state checks to the guard with Redis cache invalidation and MongoDB fallback.
- [ ] Restore `/users/context`, `/prompts/categories`, POST profile compatibility, canonical password naming, correct registration validation, and safe profile responses.
- [ ] Complete Apple OAuth and make every auth path use the common session builder.
- [ ] Add dedicated PushDevice registration plus legacy `push_token` compatibility.
- [ ] Export and checksum the canonical OpenAPI artifact.
- [ ] Run API verification and commit `feat(api): add compatible canonical sessions and contracts`.

### Task 4: Release 3 — Web Contract Migration

**Files:**
- Modify: `web/src/api/{client,fetcher,interface,endpoint}.ts`
- Modify: `web/src/utility/auth-service.ts`
- Create: `web/src/api/contract-adapter.ts`
- Create: `web/src/api/media-access.ts`
- Create: `web/src/api/generated/memento-api.ts`
- Modify: `web/src/pages/auth/**`
- Modify: `web/src/pages/post/index.tsx`
- Create: `web/src/pages/capsule-view/**`
- Modify: `web/src/router.tsx`
- Modify: `web/src/features/pricing/**`
- Modify: `web/src/test/mocks/handlers.ts`
- Create: `web/src/api/contract-adapter.test.ts`
- Create: `web/src/api/media-access.test.ts`

**Interfaces:**
- Consumes canonical and legacy API envelopes.
- Produces normalized feature-domain values; screens no longer inspect transport envelopes.

- [ ] Add version/build headers and the pinned OpenAPI checksum.
- [ ] Write dual-shape adapter tests before changing fetchers.
- [ ] Move auth refresh/error preservation into the adapter and migrate login/2FA/passkey/OAuth.
- [ ] Add one-retry signed-media refresh to shared media components.
- [ ] Move `/post/:id` to the safe public-memory contract.
- [ ] Add external capsule token exchange and tokenless view route.
- [ ] Normalize pagination, context, prompts, capsules, Polar billing, and subscription errors.
- [ ] Run web lint, typecheck, tests, and production build; commit `feat(web): migrate to canonical API contracts`.

### Task 5: Release 4 — Mobile Contract and Session Migration

**Files:**
- Execute existing plan: `docs/superpowers/plans/2026-08-20-auth-session-coordinator.md`
- Modify: `mobile/src/api/{client,auth-service,interface,endpoint}.ts`
- Create: `mobile/src/api/contract-adapter.ts`
- Create: `mobile/src/features/media/signed-media-access.ts`
- Create: `mobile/src/api/generated/memento-api.ts`
- Modify: `mobile/src/hooks/mutations/use-auth-mutations.ts`
- Modify: `mobile/src/hooks/use-nickname-logic.ts`
- Modify: `mobile/src/hooks/queries/use-billing.ts`
- Modify: `mobile/src/components/sheets/CreateCapsuleSheet.tsx`
- Modify: shared mobile image/audio/video components under `mobile/src/components`
- Create: focused tests under `mobile/src/features/auth`, `media`, `capsules`, and `settings`

**Interfaces:**
- Consumes the same canonical/legacy fixtures used by web.
- Produces one complete atomic mobile session and normalized query-layer data.

- [ ] Complete and verify the session coordinator before migrating individual auth flows.
- [ ] Add platform/version/build headers and pinned API types.
- [ ] Preserve structured errors and dual-parse legacy/canonical responses.
- [ ] Repair password, registration verification, nickname, 2FA, passkey, OAuth, and refresh flows.
- [ ] Register PushDevice by installation and preserve legacy push-token cleanup.
- [ ] Add signed-media expiry/error refresh with one retry.
- [ ] Normalize context, prompts, pagination, capsule recipients/styles/drafts, Polar billing usage/invoices, and gate errors.
- [ ] Run `bun run verify`, native auth/media staging acceptance, and commit `feat(mobile): migrate to canonical API contracts`.

### Task 6: Release 5A — Account Deletion and Purge Pipeline

**Files:**
- Create API models: `purge-command.ts`, `purge-stage.ts`
- Create API service: `src/services/account-purge/**`
- Modify: `api/src/module/api/user/service.ts`
- Modify: `api/src/workers/system/index.ts`
- Modify: `api/src/utils/constant.ts`
- Modify account-deletion UI/copy in web and mobile
- Create API integration tests for immediate revocation, idempotency, every model in the purge manifest, storage deletion, delivered-capsule anonymization, and retry recovery

**Interfaces:**
- Produces durable `PurgeCommand` state and schema-versioned BullMQ jobs.

- [ ] Write the full purge-manifest tests before worker implementation.
- [ ] Add transactional purge-pending/session revocation/outbox creation.
- [ ] Add outbox dispatcher and bounded idempotent purge stages.
- [ ] Add provider cleanup and delivered-capsule anonymization.
- [ ] Update client copy and local-session cleanup.
- [ ] Run staging purge drills and commit `feat(account): add irreversible purge pipeline`.

### Task 7: Release 5B — Capsule Recipient and Delivery Completion

**Files:**
- Modify: `api/src/module/database/model/capsule.ts`
- Create: `api/src/module/database/model/capsule-delivery.ts`
- Modify: `api/src/module/api/capsule/**`
- Modify: `api/src/workers/system/reveal-capsules.ts`
- Modify capsule UI/types in web and mobile
- Create migration/backfill and integration tests

**Interfaces:**
- Produces `recipient_snapshots`, legacy populated `recipients`, replacement semantics, and idempotent recipient-level delivery.

- [ ] Add recipient snapshot/delivery schemas and additive backfill.
- [ ] Accept beneficiary IDs, emails, and canonical recipient inputs.
- [ ] Separate draft persistence from scheduling validation.
- [ ] Persist style and replacement semantics for recipients/attachments/memories.
- [ ] Add external view grants and linked-user notifications.
- [ ] Add retry/partial-failure behavior and remove content logging.
- [ ] Run external/linked/partial delivery staging tests and commit `feat(capsules): add reliable recipient delivery`.

### Task 8: Release 5C — Polar Billing, Usage, and Storage Quotas

**Files:**
- Create: `api/src/module/database/model/storage-reservation.ts`
- Create: `api/src/module/api/billing/storage-quota.ts`
- Modify: `api/src/module/api/billing/{service,access}.ts`
- Modify: `api/src/module/api/billing/providers/polar.ts`
- Modify: file, beneficiary, and capsule mutations
- Add reconciliation workers and API tests
- Normalize billing settings in web/mobile

**Interfaces:**
- Produces `resolveStorageLimit`, atomic reservations, authoritative usage summaries, and complete Polar lifecycle operations.

- [ ] Define server-side byte limits and run a production usage dry-run before enforcement.
- [ ] Consolidate User/File/Usage storage checks into the reservation service.
- [ ] Add transition-aware beneficiary/capsule usage counters and reconciliation.
- [ ] Complete Polar cancel, resume, invoices, idempotent webhook processing, and scheduled reconciliation.
- [ ] Add over-limit no-deletion behavior and client warnings.
- [ ] Run concurrent-upload and Polar replay tests; commit `feat(billing): enforce Polar plans and storage quotas`.

### Task 9: Release 5D — Reliability, Migrations, Health, and Observability

**Files:**
- Create: `api/src/migrations/**`
- Create: `api/src/module/database/model/migration.ts`
- Add compound indexes to domain models
- Modify: `api/src/module/api/index.ts`
- Create: `api/src/services/health/**`
- Modify: `api/src/services/queues/**`
- Modify: deployment workflows and PM2 worker heartbeat

**Interfaces:**
- Produces `migrate up/status`, `/health` liveness, `/ready` dependency readiness, capped pagination, escaped search, queue durability, and operational metrics.

- [ ] Add idempotent migration runner and index/backfill migrations.
- [ ] Deduplicate bookmarks before the unique compound index.
- [ ] Cap pagination and escape search patterns.
- [ ] Guard every nullable queue and reject non-durable schedules.
- [ ] Add Mongo/Redis/storage/worker readiness and deploy against `/ready`.
- [ ] Add alerts for purge age, delivery failures, queue depth, usage drift, and compatibility use.
- [ ] Run migration rollback-compatibility and dependency-failure tests; commit `feat(api): add production reliability gates`.

### Task 10: Release 6 — Shim Retirement, Mobile Design, and Documentation

**Files:**
- Modify compatibility registry and API aliases/legacy fields
- Modify mobile token/font configuration and touched screens/components
- Modify READMEs, billing handoff, TODOs, runbooks, `.gitignore`, and CI documentation in all repositories

**Interfaces:**
- Consumes telemetry proving supported clients no longer use each shim.
- Produces a smaller canonical contract and design-system-compliant mobile presentation.

- [ ] Generate a shim-removal report by supported client version and approve each removal separately.
- [ ] Disable legacy public files before deleting compatibility code.
- [ ] Remove raw refresh-token storage and approved response/endpoint shims.
- [ ] Correct mobile background and load Inter, EB Garamond, and Azeret Mono.
- [ ] Tokenize semantic colors and reconcile/document full-screen Modal exceptions.
- [ ] Update Polar-only billing documentation, architecture/runbooks, TODOs, and tracked-log hygiene.
- [ ] Run API/web/mobile full verification and visual/native QA; commit each concern separately.

## Program Completion Gate

- [ ] All twelve acceptance criteria in the specification are evidenced by CI or staging reports.
- [ ] No supported client relies on a removed shim.
- [ ] No rollback path reintroduces a security vulnerability.
- [ ] API, web, and mobile release notes document behavior changes and recovery steps.
