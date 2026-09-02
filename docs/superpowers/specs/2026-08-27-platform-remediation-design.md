# Platform Remediation Design

## Purpose

Make the Memento API, web app, and mobile app behave as one cohesive product without breaking already-installed clients. The remediation closes the confirmed authorization and privacy vulnerabilities, repairs contract drift, completes the capsule and billing foundations, and establishes automated compatibility gates so the three repositories can evolve safely.

This design converts the 2026-08-27 cross-repository audit into an implementation architecture. It does not replace feature-specific specifications. In particular, it extends:

- `mobile/docs/superpowers/specs/2026-08-20-auth-session-coordinator-design.md`;
- `mobile/docs/superpowers/specs/2026-07-25-native-passkey-security-design.md`;
- `mobile/docs/superpowers/specs/2026-07-25-privacy-settings-design.md`; and
- the subscription tiers, limits, and testing requirements in `web/docs/PRICING_BACKEND_HANDOFF.md`, while superseding that document's outdated Paystack-first provider direction.

## Repositories in Scope

- API: `/Users/dev/Workspace/memento/api`
- Web: `/Users/dev/Workspace/memento/web`
- Mobile: `/Users/dev/Workspace/memento/mobile`

The API is the source of truth for authorization, durable records, billing state, delivery state, and contract definitions. Web and mobile remain independent consumers that can deploy at different times.

## Confirmed Product Decisions

1. API evolution uses an additive compatibility bridge. Existing legitimate routes and fields remain available while consumers migrate.
2. Security authorization fixes deploy without legacy bypasses. Cross-user access is never treated as a compatibility requirement.
3. Capsule recipients may receive capsules by email without owning a Memento account.
4. A capsule recipient is stored as an immutable beneficiary snapshot with an email address and may optionally link to a Memento user.
5. Account deletion immediately revokes access and durably queues an irreversible asynchronous purge. There is no user-facing recovery window.
6. Private files are served through expiring signed URLs. Durable database state stores object identity, never an expiring URL.
7. Polar is the sole billing provider. Paystack is not part of the billing architecture or implementation scope.

## Non-Goals

- Redesigning existing screens while repairing their data contracts.
- Replacing Express, MongoDB, Redis, BullMQ, TanStack Query, Zustand, React, or Expo.
- Introducing a new API version for the entire platform.
- Removing legacy contract fields in the same releases that introduce canonical fields.
- Building the deferred privacy export or story-sharing products.
- Broad refactors unrelated to the audited security, contract, reliability, billing, capsule, or design-system gaps.

## Delivery Principles

### Expand, migrate, observe, contract

Every breaking-risk change follows four stages:

1. **Expand:** add secure canonical behavior and compatibility fields or aliases.
2. **Migrate:** update web and mobile to prefer the canonical contract while accepting the legacy contract.
3. **Observe:** measure client versions, deprecated route use, compatibility parsing, and failure rates without recording personal content.
4. **Contract:** remove a compatibility shim only in a separately approved release after the supported-client threshold is met.

### Security exceptions to compatibility

The following behaviors are removed immediately because no legitimate client should depend on them:

- reading or mutating another user's memory;
- referencing another user's private attachment;
- accessing queue administration without administrator authorization;
- using the Sentry tunnel for an unapproved host or project;
- accepting unsigned webhooks when a secret is absent;
- continuing to use an access token after the owning account is deleted.

### Compatibility registry

Each compatibility shim has:

- a stable identifier;
- owning repository/team;
- legacy and canonical shapes;
- automated tests for both shapes;
- telemetry that counts use without logging request bodies or personal data;
- an earliest removal date; and
- an explicit removal condition based on supported client versions.

The registry lives in API documentation and is reviewed during every contract-affecting release.

Before compatibility telemetry is used for removal decisions, every client sends non-sensitive version headers on API requests:

```text
X-Memento-Client: web | ios | android
X-Memento-Version: <semantic app version>
X-Memento-Build: <native build number or web commit SHA>
```

Mobile reads release metadata through Expo Constants; web injects the package version and build SHA at build time. The API records these headers with route and compatibility-shim identifiers. Missing headers are classified as `legacy-unknown`, never guessed.

## Target Architecture

```text
Web and mobile clients
  -> per-client compatibility adapter
  -> documented HTTP contract
  -> authentication and request context
  -> authorization policy / ownership query
  -> domain service
  -> MongoDB, Redis queues, private object storage, providers
```

Authorization is enforced at the API query boundary. Controllers never fetch a private resource by ID alone and then rely on callers to perform a later ownership check. Domain services accept an authenticated principal and use scoped queries such as `{_id, user: principal.userId}` or an explicit sharing policy.

### Memory access policy

The existing product has three different access modes, so authorization cannot be reduced to owner-only reads:

| Operation | Owner | Accepted beneficiary explicitly referenced by the memory or one of its groups | Other authenticated user | Anonymous user |
|---|---:|---:|---:|---:|
| Read a private memory | yes | no | no | no |
| Read a specifically shared memory | yes | yes | no | no |
| Read a memory with `visibility: "everyone"` | yes | yes | yes | yes through the public-post contract |
| Update/delete/add messages/manage attachments | yes | no | no | no |
| Bookmark | yes | yes | yes when the memory is readable | no |

The public `/post/:id` web route therefore receives a dedicated public-memory API contract that exposes only `visibility: "everyone"` records and a safe projection. It does not reuse an unrestricted private detail query. Signed attachment URLs are emitted only after the containing memory or capsule passes this policy.

## Workstream 1: Emergency API Security

### Resource authorization

Create reusable policy helpers for owned memories, messages, attachments, beneficiaries, groups, capsules, and account records. Helpers distinguish `read`, `write`, `delete`, and `share` actions. They return a resource only when the principal or public request satisfies the explicit policy. A missing resource and an inaccessible resource return the same public 404 response to avoid identifier discovery.

All memory paths—including detail, prompt lookup, bookmarking, message insertion, update, deletion, and attachment mutation—use scoped queries. Attachment IDs are resolved in one query constrained to the current user before memory creation or update continues.

### Private file delivery

The existing File model already stores the durable identity needed by the storage abstraction: `name` is the provider object key, `provider` selects R2/S3, GCS, or Cloudinary, `user` is the owner, and `type` selects the correct media handling. Preserve those fields and add only migration/access metadata:

```ts
type StoredFileAccess = {
  access_mode: "legacy_public" | "signed_only";
  thumbnail_key?: string;
};
```

The first secure implementation signs the existing Memento proxy URL rather than exposing provider URLs. A dedicated production-required `FILE_URL_SIGNING_KEYS` key ring supplies a current key ID and at least one optional previous verification key for safe rotation. The API produces an HMAC capability over the File ID, object key, derivative variant, key ID, and expiry:

```text
https://api.mymemento.io/files/<encoded-name>?exp=<unix>&kid=<key-id>&sig=<hmac>
```

This approach fits the current synchronous Mongoose attachment transform, preserves the API's byte-range streaming and Redis buffering, and works uniformly for R2/S3, legacy GCS, Cloudinary-backed records, web `<img>` elements, and native media components. Provider-direct R2/GCS presigned URLs remain an optional later optimization, not a requirement for the security release.

The attachment serializer continues to produce the existing `url` and `thumbnail` fields as signed proxy URLs so old web and mobile renderers keep working. It also adds canonical access metadata:

```ts
type FileAccess = {
  expires_at: string;
  refresh_endpoint: string;
};
```

Signed URLs initially expire after seven days. New clients retry once by refreshing attachment metadata after a 403 or known expiry. Fresh list/detail responses always receive fresh signatures. Bare unauthenticated legacy file routes remain available only during the measured migration window, are excluded from public caches, and are then disabled. New uploads are private from the first security release.

Because browser `<img>` and native image callbacks do not expose an HTTP status reliably, web and mobile use one shared media-access helper per client. It reads `access.expires_at` when present and, on the first generic media load error or known expiry, refreshes the parent resource or calls the authorized access endpoint, swaps in the new URL, and retries once. A second failure renders the existing media error state; it never creates a retry loop. Audio/video fetch paths may use the actual 403 status when available.

New uploads use high-entropy object keys and `access_mode: "signed_only"`; the proxy rejects a bare request even during the compatibility window. Existing records begin as `legacy_public`, allowing cached old URLs to survive temporarily. After supported clients use signed URLs, a resumable backfill changes existing records to `signed_only`.

Current thumbnail strings contain proxy URLs instead of durable keys and thumbnail requests bypass File lookup. A backfill extracts the derivative key into `thumbnail_key`. New thumbnail generation stores keys only. Thumbnail capabilities include the owning File ID and variant, and the proxy resolves the derivative only through that File record.

`POST /files/:id/access` requires authentication and calls the same `canReadFile` policy used by parent-resource serialization. Ownership grants access directly; shared access must be proven through an accessible memory, capsule, beneficiary avatar, or other explicit resource reference. Public memories can issue a public-post-scoped file capability. The endpoint never grants access merely because a caller knows a File ID.

### Administrative and relay surfaces

- Bull Board is disabled in production unless protected by an authenticated administrator policy and an additional deployment-controlled enable flag.
- The Sentry tunnel accepts only configured Sentry hosts and project IDs, enforces request-size and rate limits, and rejects malformed envelopes before outbound network work.
- Webhook routes fail closed when their verification secret is missing. Startup validation prevents production boot with missing security-critical configuration.

### Deleted-user enforcement

Add `session_version` to the User model and JWT claims. Authentication middleware verifies the JWT, then checks the user's `{deleted, purge_status, session_version}` security projection and, for new tokens, the referenced AuthSession. A short Redis cache may avoid a MongoDB read on every request, but deletion or session revocation must invalidate it synchronously and middleware falls back to MongoDB when Redis is unavailable. The middleware rejects deleted, disabled, version-mismatched, session-revoked, or purge-pending accounts. Account deletion atomically marks the account purge-pending, increments `session_version`, revokes every AuthSession and legacy refresh token, and makes existing access tokens unusable before returning success.

## Workstream 2: Canonical Contracts and Authentication

### Response envelope

New and migrated endpoints produce:

```ts
type ApiResponse<T> = {
  status: number;
  success: boolean;
  message: string;
  data: T;
  meta?: {
    contract_version: "2026-08";
    request_id: string;
    deprecations?: string[];
  };
};
```

The API adds `success`; it does not remove `status`, `message`, or `data`. Where web or mobile currently consumes a top-level domain field, the API temporarily returns both the top-level field and the canonical field under `data`.

### Error envelope

Errors retain the current HTTP status and human-readable `message` while adding stable machine-readable information:

```ts
type ApiError = {
  status: number;
  success: false;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  request_id: string;
};
```

Client adapters preserve `code`, `details`, `request_id`, legacy validation errors, and legacy top-level gate fields during migration.

### Session response

Password, 2FA, passkey, OAuth, registration completion, and refresh use a common session builder:

```ts
type SessionPayload = {
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
  user: PublicUser;
  onboarding_status: "never" | "in_progress" | "completed" | "skipped";
};
```

Legacy token fields stay where existing consumers expect them. `data.session` is added as the canonical representation. Refresh returns the current public user so a client can recover a complete session after cold start or stale profile state.

Add an `AuthSession` collection rather than continuing to treat `User.refresh_tokens` as the long-term session store:

```ts
type AuthSession = {
  session_id: string;
  user_id: string;
  refresh_token_hash: string;
  installation_id?: string;
  client: "web" | "ios" | "android" | "legacy-unknown";
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  revoked_at?: Date;
};
```

New access and refresh JWTs include `sid` and the user's `session_version`; only a hash of the refresh token is stored. Refresh rotates the token hash within the same session. “Log out this device” revokes its `sid`; “log out other devices” revokes every other session while retaining the current `sid`; account deletion, a password-reset security action, or an administrator compromise response increments `session_version` for global revocation.

Existing refresh tokens without `sid` remain accepted only through the compatibility path. On successful legacy refresh, the API creates an AuthSession, returns a new token pair containing `sid`, and removes the used raw token from the User record. Legacy access tokens remain subject to the user security-state check until they expire. The raw `refresh_token` and `refresh_tokens` fields are removed only after migration telemetry and maximum legacy token lifetime permit it.

The mobile session coordinator from the existing specification remains the sole owner of mobile auth-state navigation. Web and mobile each implement dual-shape parsers at their API boundary rather than normalizing responses ad hoc in screens.

### Endpoint aliases

- `/users/context` becomes a supported compatibility alias over the canonical persona/context service.
- `/prompts/categories` is restored and backed by one canonical prompt-category query.
- Duplicate AI route registration is removed without changing the route path.
- Registration uses the registration validator, returns the existing verification-required shape, and does not issue a full session until email verification succeeds.
- Profile updates use `PUT`; a temporary `POST /users/profile` alias accepts the same validated payload and emits deprecation telemetry for older onboarding clients. Legacy `fullname` is normalized to first/last name only when canonical fields are absent. Successful updates return the same safe PublicUser DTO used by session responses instead of `data: null`.
- Password change accepts both `current_password` and `old_password` during migration, rejects conflicting values, and documents `current_password` as canonical.
- The legacy profile `push_token` field upserts a PushDevice using a token-derived installation identity and client headers. New clients use the dedicated device-registration endpoint.
- `DELETE /memories/:memoryId/attachments/:fileId` becomes the unambiguous attachment-detach contract. The legacy `/memories/remove-file/:id` remains owner-scoped and preserves its historical single-memory behavior during migration, but no longer claims to delete storage. Physical file deletion remains a separate owned-file operation and refuses deletion while active references exist unless an explicit detach-all operation is requested.

### OAuth and passkeys

Apple OAuth is completed before the visible action is considered production-ready. All auth completion paths use the common session builder. Native associated-domain verification remains a release acceptance test, not merely a file-presence test.

### Push notifications

Push tokens move to a dedicated device-registration model rather than the User profile document:

```ts
type PushDevice = {
  userId: string;
  installationId: string;
  platform: "ios" | "android" | "web";
  pushToken: string;
  enabled: boolean;
  lastSeenAt: Date;
};
```

Registration is idempotent by installation ID. Invalid provider tokens are disabled after delivery feedback. Notification payloads contain resource IDs and safe preview text only; private full content is fetched after authenticated navigation.

## Workstream 3: Account Deletion

### Request lifecycle

1. Re-authenticate or require a recently authenticated session for deletion.
2. In one MongoDB transaction, mark the user `purge_pending`, increment `session_version`, revoke every refresh token, disable push devices, and create an idempotent purge-command/outbox record.
3. Clear web/mobile local auth and private caches after the API acknowledges the durable job.
4. A dispatcher polls the durable outbox and enqueues BullMQ work; a worker purges domain data and storage objects in bounded, retryable stages. Queue publication is never treated as the durable source of truth.
5. The worker records stage completion without retaining deleted content.
6. Completion replaces the user record with only the minimum non-identifying tombstone needed to prevent duplicate processing and preserve financial/audit obligations.

Production deployment must support MongoDB transactions through a replica set or compatible managed cluster. Release 0 adds a transaction-capability readiness check because the codebase already uses `withTransaction`; the purge flow does not introduce an unsupported standalone-only fallback that could acknowledge a partially revoked deletion.

### Purge coverage

The purge manifest explicitly maps every user-bearing model currently in the API: User, AuthCode, ActivePrompt, Activity, AIMetric, Bookmark, DailyAIPromptCache, Feedback, File and thumbnails, Group, Memory, Message, PendingInsight, Persona, Beneficiary in both user/benefactor roles, Subscription, Usage, billing webhook metadata, capsule drafts, capsule sender/benefactor links, recipient delivery records, push devices, refresh tokens, passkeys, cached AI artifacts, and queued jobs containing user data. Feature-flag audit records retain only an anonymized actor where operational audit retention is required. Undelivered capsules are cancelled and purged. An already-delivered recipient copy remains in the recipient's vault like a delivered letter, but the sender link and sender profile data are irreversibly anonymized. The sender's editable source copy is purged.

Provider data—storage, email metadata, AI caches, and billing customer information—is deleted or anonymized through provider-specific adapters. Financial records required for accounting are minimized and detached from the deleted profile.

### User-visible semantics

The account becomes inaccessible immediately. The confirmation copy says the deletion is irreversible and may finish in the background. A retrying purge never restores access. Operational alerts fire when a purge exceeds its service-level objective.

## Workstream 4: Capsules

### Recipient model

A capsule gains a new `recipient_snapshots` field while retaining the existing `recipients` beneficiary-reference array for legacy population and response compatibility:

```ts
type CapsuleRecipient = {
  recipientId: string;
  beneficiaryId?: string;
  linkedUserId?: string;
  email: string;
  displayName?: string;
  deliveryStatus: "pending" | "queued" | "sent" | "delivered" | "failed";
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  providerMessageId?: string;
  failureCode?: string;
};
```

At create/update time the API accepts legacy beneficiary IDs, email strings, and the canonical recipient input. It validates that referenced beneficiaries belong to the sender, normalizes and deduplicates emails, writes `recipient_snapshots`, and also writes resolvable beneficiary IDs to legacy `recipients`. Responses retain the populated legacy `recipients` field and add canonical `recipient_snapshots`. Later beneficiary edits do not silently change a scheduled recipient.

Delivery attempts live in a separate `capsule_delivery` collection with a unique `{capsule_id, recipient_id}` key, retry counters, terminal status, provider message ID, and only a hash of any external-view token. This avoids unbounded operational history in the capsule document and gives retries an idempotent database boundary.

### Drafts and schedules

- `status: "draft"` always remains a draft even when a schedule date is present.
- Drafts require only enough information to persist safely; scheduling requires title/body, at least one valid recipient, a valid future reveal date, and allowed attachments.
- A dedicated schedule action transitions a valid draft to scheduled.
- Update payloads use replacement semantics for recipients, attachment IDs, and memory IDs so removals persist.
- Style is stored in the capsule schema using validated theme ID, background token/color, and font-size values compatible with existing web/mobile previews.

### Delivery

The reveal worker creates one idempotent delivery attempt per capsule recipient. External-email recipients receive a secure link to a new web route, `/capsule/view`; the emailed one-time token is exchanged immediately for a short-lived view grant and removed from browser history before content renders. Only token/grant hashes are stored, comparison is constant-time, and expiry/revocation are enforced by the API. The view page sets a no-referrer policy and loads no third-party content before exchange. Linked users also receive in-app/push notification and can open the authenticated capsule detail route. A capsule is `delivered` only when every required recipient reaches a terminal successful state; partial failures remain visible and retryable. Logs contain IDs and failure codes, never capsule body, raw view tokens, or recipient content. The current worker URL `/timecapsule/:id` is retired only after the new route is deployed because the web router does not currently implement it.

## Workstream 5: Billing and Usage

### Source of truth

Verified Polar webhooks are authoritative for subscription lifecycle. Checkout responses are provisional. Polar events are stored with a unique delivery/event ID for idempotency and processed by a queue.

The running API already implements Polar checkout, portal creation, and webhook verification. The remediation completes Polar cancellation, resume, invoice retrieval, product mapping validation, webhook idempotency, and reconciliation. No provider-selection layer or second payment adapter is introduced.

### Usage accounting

Domain mutations update usage in the same logical operation as the underlying resource change:

- successful file persistence updates storage bytes;
- beneficiary creation/deletion updates beneficiary count;
- timed-message and capsule scheduling/cancellation update their counters;
- memory integration changes update integration count.

The current clients use “timed message” for a scheduled capsule; there is no separate timed-message model. Usage semantics are therefore fixed as follows:

- `storage_used_bytes`: sum of active, non-excluded File sizes owned by the user;
- `beneficiary_count`: beneficiary records where `benefactor` is the user and status is not rejected/removed;
- `timed_message_count`: currently active capsules owned by the user with `status: "scheduled"`; this is the free-plan limit counter;
- `time_capsule_count`: total user-created capsules excluding received copies and deleted records; this is an informational lifetime count, not the timed-message gate; and
- `memory_integration_count`: active external memory integrations once that integration model exists; until then it remains zero and is not used for enforcement.

Draft capsules do not consume the timed-message allowance. Scheduling increments it; pause/cancel/delivery/deletion decrements it. Idempotent mutation keys or transition-aware conditional updates prevent retry-driven double increments.

Counters are treated as fast enforcement data, not irreplaceable truth. A scheduled reconciliation job recomputes counts from primary records and corrects drift. Every limit check reads the effective subscription and current reconciled-or-transactional usage.

### Storage quotas

Storage limits are plan configuration, not user-editable values and not trusted from a stale Usage document. The implementation supports values such as 200 MiB for Free and 10 GiB for paid tiers using exact byte constants (`200 * 1024 ** 2` and `10 * 1024 ** 3`). Final production limits remain server-side configuration so pricing changes do not require client releases.

The current code has two competing checks: `storage.checkStorageQuota()` aggregates File sizes against `User.storage_limit`, while billing reads `Usage.storage_limit_bytes` and bypasses the storage case entirely for paid tiers. Replace both admission decisions with one `resolveStorageLimit(effectiveTier, explicitAdminOverride?)` service. Paid tiers remain subject to their larger finite quota; the generic “paid tier allowed” shortcut runs only for binary feature gates, not storage. Existing User/Usage limit fields are backfilled for display compatibility but cease to be authoritative.

`storage_used_bytes` counts the logical size of active File records owned by the user. Provider backups and thumbnails derived from the same upload do not count twice unless product pricing later explicitly includes derivative storage. Deleted/excluded files stop counting only after the logical deletion is durable; reconciliation verifies the result against active File records.

Upload admission uses an atomic reservation rather than a read-then-write check:

```ts
type StorageReservation = {
  reservation_id: string;
  user_id: string;
  requested_bytes: number;
  status: "reserved" | "committed" | "released" | "expired";
  expires_at: Date;
};
```

1. Resolve the user's effective plan and byte limit.
2. Atomically reserve the incoming byte count only when `used + reserved + incoming <= limit`.
3. Reject with stable error code `storage_quota_exceeded` and usage/limit/remaining metadata when the reservation cannot be made.
4. Upload and process the file.
5. Commit the final stored size, accounting for image conversion/compression, and release the difference from the reservation.
6. Release or expire the reservation on failure, cancellation, or worker timeout.

This prevents concurrent uploads from each observing the same available capacity. Existing per-file and request-size limits remain separate defenses.

On downgrade, existing files remain readable and deletable. If current usage exceeds the new plan limit, new uploads are blocked until the user deletes enough media or upgrades; Memento does not silently delete memories. Usage responses expose `used_bytes`, `reserved_bytes`, `limit_bytes`, `remaining_bytes`, `percent_used`, and `over_limit`, allowing web and mobile to show warnings before the hard limit.

A scheduled reconciliation recomputes logical usage from File records, releases expired reservations, records drift, and repairs the counter. Provider-level bucket monitoring remains an operational capacity control separate from per-user quotas.

### Provider operations

- Cancel and resume call Polar first, then converge local state through Polar response/webhook handling.
- Invoice history uses Polar's API and returns one canonical invoice shape.
- Polar webhooks reject invalid signatures, acknowledge accepted events quickly, and process asynchronously.
- Trial, promo, past-due, cancellation, and lifetime access transitions have deterministic scheduled reconciliation.

### Client compatibility

Web and mobile billing adapters accept the current direct data payload and the canonical envelope. Screens consume normalized subscription, usage, invoice, and gate-error types only.

## Workstream 6: Backend Reliability and Data Integrity

### Database changes

Introduce a versioned migration runner used by deployment before new application code depends on schema changes. Migrations are idempotent and record completion. Index migrations create the compound indexes required by actual query shapes, including owned memory lists, messages by memory/time, capsules by sender/status/reveal date, unique bookmarks, push installation identity, provider webhook event identity, and purge jobs.

Duplicate bookmarks are consolidated before the unique index is enabled. Capsule recipient and stored-file backfills are additive and resumable.

### Input and query safety

- Pagination limit defaults remain compatible but are capped server-side.
- Search text is escaped before regular-expression construction or replaced with an indexed text strategy where appropriate.
- Null-resource paths return explicit 404 domain errors.
- Queue calls handle unavailable Redis deterministically and never report a schedule as successful when no durable job exists.

### Configuration and health

A typed startup configuration schema validates JWT secrets, file-signing key ring, database connection, Redis/queue requirements, storage credentials, enabled OAuth providers, Sentry tunnel targets, webhook secrets, mail configuration, and billing provider settings. Development may explicitly disable optional services; production may not silently fall back to insecure behavior.

Liveness reports only process health. Readiness checks MongoDB, required Redis/queues, storage configuration, and worker heartbeat. Deployment health gates use readiness.

## Workstream 7: Contract, Integration, and End-to-End Testing

### API test foundation

Add a test runner, isolated test configuration, MongoDB test database strategy, Redis/queue fakes where appropriate, HTTP request harness, factories, and provider adapters. Tests never call real email, storage, AI, OAuth, or payment providers.

### Mandatory security tests

For two users, assert that one user cannot read, update, delete, bookmark, message, attach, download, or thumbnail the other's private resources. Test deleted-user token rejection, admin queue protection, Sentry host rejection, webhook fail-closed behavior, and signed URL expiry/tampering.

### Contract tests

A machine-readable OpenAPI specification in the API repository describes canonical success and error shapes. CI validates API handlers and representative fixtures against the specification. Each API release publishes `openapi.json` and a checksum as a build artifact. Web and mobile pin the checksum in their repositories, generate checked-in TypeScript types with a deterministic script, and fail CI when generated output differs. This avoids requiring a new private package registry while keeping consumer upgrades explicit.

Consumer fixtures cover both legacy and canonical shapes while shims exist. Web and mobile tests use the same checked-in contract fixtures for auth, pagination, files, capsules, billing, context, prompts, and errors.

### End-to-end acceptance

Staging tests cover:

- password, 2FA, passkey, Apple OAuth, refresh, explicit logout, and forced expiry;
- upload, signed media rendering, expiry refresh, and unauthorized media access;
- draft creation, scheduling, external-email delivery, linked-user delivery, retries, and partial failure;
- checkout, signed webhook processing, usage enforcement, cancellation, resume, and invoices;
- account deletion, immediate access loss, purge completion, and provider cleanup.

Mobile native passkey and associated-domain acceptance runs on real supported iOS and Android devices.

## Workstream 8: Client and Design Convergence

### Client boundaries

Web and mobile each expose one typed transport adapter. Feature hooks receive normalized domain types and do not inspect legacy response envelopes. Pagination normalization lives in the adapter/query layer, not screens. Beneficiary and group screens consume all required pages through pagination/infinite queries rather than silently displaying only the first 25 records. Structured API errors remain intact through UI handling.

### Mobile design system

After security and contract stabilization:

- set the full-screen background token to `#fefbf8`;
- load and map Inter, EB Garamond, and Azeret Mono as documented;
- replace semantic hardcoded colors with Memento tokens;
- centralize repeated screen-level buttons and inputs;
- inventory `Modal` uses and document narrow full-screen media/camera/editor exceptions before replacing the remaining sheet-like modals;
- enforce required texture, haptics, stable list callbacks, and minimum tap targets in touched screens.

Design cleanup is behavior-preserving and ships separately from contract migrations to keep regressions attributable.

### Documentation and hygiene

Update repository READMEs, endpoint documentation, billing status, TODO lists, environment setup, worker/runbook documentation, and deployment gates. The web pricing handoff is corrected to identify Polar as the sole provider and removes Paystack implementation guidance. Remove tracked local log artifacts and add appropriate ignore rules without deleting user-generated diagnostics outside version control.

## Observability

Every API response receives a request ID. Logs use structured event names and IDs, not memory bodies, capsule content, file URLs, tokens, email bodies, or webhook payloads.

HTTP logging redacts `sig`, `token`, `code`, and equivalent capability parameters before serialization. Reverse-proxy/CDN access-log configuration applies the same rule for signed file URLs and capsule view exchanges. Error monitoring and analytics never receive full capability URLs.

Dashboards and alerts cover:

- 401/403/404 rates by route and client version;
- refresh success and session-termination reasons;
- deprecated contract and endpoint use;
- signed URL issuance, expiry refresh, and access denial;
- queue depth, worker heartbeat, retries, and dead-letter jobs;
- capsule delivery by terminal status;
- webhook verification failures and duplicate events;
- usage reconciliation drift;
- purge age and failed purge stages.

## Codebase Feasibility Anchors

The design deliberately builds on extension points that already exist:

- `api/src/app.ts` exports `createServer()`, so HTTP integration tests can instantiate the application without opening a production port.
- `api/src/utils/attachment-response.ts` and the File model's JSON transform centralize attachment output; signed proxy URLs can be introduced without editing every current media component first.
- R2/S3 and GCS storage adapters already implement presigned reads, while the existing `/files/:name` proxy already supports Cloudinary, range requests, and provider fallback. The HMAC proxy design works before any provider-specific optimization.
- `api/src/utils/helpers.ts` already provides MongoDB transaction support; production replica-set readiness must be verified rather than inventing a second consistency model.
- BullMQ system queues and a separate worker process already exist, so purge, delivery, reconciliation, and outbox-dispatch jobs extend the current operational shape.
- Swagger/OpenAPI generation already exists under `api/src/docs`; the contract artifact work formalizes and validates it rather than introducing an unrelated documentation stack.
- Mobile already has a session coordinator, central Axios client, TanStack Query cache, persisted auth storage, and media helpers. Contract dual parsing and signed-media refresh belong at those boundaries.
- Web already has central fetchers/auth refresh, MSW fixtures, endpoint constants, and tests. It can migrate behind adapters without rewriting individual screens in one release.

The following foundations are genuinely new and receive separate schema migrations and tests: AuthSession, PushDevice, StorageReservation, purge outbox/state, capsule recipient snapshots, capsule delivery attempts/view grants, compatibility telemetry, migration runner, shared contract artifacts, and API automated tests.

The current execution environment permits writes only to the mobile repository. API and web implementation requires writable worktrees or explicit filesystem authorization before those plan tasks begin; this is an execution constraint, not an architectural blocker.

## Release Sequence

### Release 0: Test and telemetry foundations

Add API tests, request IDs, configuration validation in report-only mode outside production, compatibility registry, contract fixtures, and security regression tests that demonstrate the current failures.

### Release 1: Security containment

Deploy ownership-scoped queries, attachment ownership checks, protected Bull Board, restricted Sentry tunnel, fail-closed webhooks, deleted-user rejection, private new uploads, and signed URL serialization. Retain measured legacy file-route access only for the migration window.

### Release 2: Additive contract expansion

Deploy the canonical envelope/session/error types, aliases, push-device registration, capsule input normalization, and dual-shape billing responses. No legacy fields are removed.

### Release 3: Web migration

Migrate web transport adapters, auth/session handling, signed-media refresh, context/prompts, capsules, pagination, billing, and structured errors. Ship web contract and end-to-end tests.

### Release 4: Mobile migration

Complete the existing session-coordinator plan, migrate mobile transport adapters and auth flows, add signed-media refresh and device registration, repair capsule/billing/query contracts, and release through staged distribution.

### Release 5: Domain completion

Deploy capsule recipient snapshots and delivery tracking, provider-authoritative billing, transactional usage, account purge workers, reconciliation jobs, migrations, indexes, and dependency-aware readiness.

### Release 6: Contract contraction and design convergence

After telemetry confirms the supported web and mobile versions no longer require a shim, disable bare file routes and remove approved legacy aliases/fields in isolated releases. Apply the mobile design-system cleanup and documentation/hygiene work independently.

## Rollback Strategy

- Database changes expand before code depends on them and remain readable by the prior release.
- New serializers can be disabled independently while preserving ownership checks.
- Provider operations use idempotency keys so retry or rollback does not duplicate external changes.
- Queue jobs carry a schema version and workers accept the previous and current version during rolling deployment.
- Client migrations retain legacy parsing for at least one supported release after switching to canonical output.
- A rollback never re-enables cross-user access, unsigned webhooks, unrestricted queue administration, or deleted-user sessions.

## Acceptance Criteria

The remediation is complete only when all of the following are true:

1. Cross-user authorization tests pass for every private resource operation.
2. New private files are never exposed through permanent public URLs, and supported clients refresh expired signed URLs.
3. Password, 2FA, passkey, Apple OAuth, refresh, and onboarding establish the same complete session shape on web and mobile.
4. Deleted users lose access immediately, and staged deletion tests prove complete purge coverage.
5. External-email and linked-user capsule recipients receive independently tracked delivery attempts.
6. Draft, schedule, style, recipient, attachment, and memory edits persist with documented replacement semantics.
7. Billing provider state, usage counters, invoices, gates, cancellation, and resume pass provider-adapter and reconciliation tests.
8. API CI runs compilation, lint, unit, integration, security, and contract tests.
9. Web and mobile CI validate against shared contract fixtures.
10. Production readiness checks dependency health and worker heartbeat.
11. Compatibility telemetry shows no supported client depends on a shim before that shim is removed.
12. Mobile design tokens and loaded fonts match the approved Memento design language, with documented exceptions only.

## Plan Decomposition

Implementation is split into independently reviewable plans:

1. API security containment and private file delivery.
2. Canonical contracts, auth/session compatibility, and push devices.
3. Account deletion and purge pipeline.
4. Capsule recipient migration and reliable delivery.
5. Polar billing lifecycle and usage accounting.
6. API reliability, migrations, indexing, health, and observability.
7. Web contract migration.
8. Mobile contract migration and session completion.
9. Mobile design-system convergence and repository documentation.
10. Compatibility-shim retirement after telemetry gates are met.

Each plan follows test-driven implementation, names exact files and interfaces, supplies focused verification commands, and ends at an independently deployable gate.
