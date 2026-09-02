# API Security and Private Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the confirmed cross-user memory/file vulnerabilities and secure operational/webhook surfaces while preserving legitimate public/shared reads and current media rendering.

**Architecture:** Add integration-test infrastructure first, then enforce explicit read/write policies at query boundaries. Keep the existing Memento file proxy and make its URLs time-limited HMAC capabilities, with signed-only new uploads and measured legacy compatibility. Protect Bull Board, constrain the Sentry relay, and make webhook/runtime security configuration fail closed.

**Tech Stack:** Node.js 24, TypeScript, Express, Mongoose, MongoDB, Redis, BullMQ, Cloudflare R2/S3, GCS, Cloudinary, Pino, Zod, Vitest, Supertest.

**Spec:** `docs/superpowers/specs/2026-08-27-platform-remediation-design.md`

## Global Constraints

- Execute from an isolated `memento/api` worktree; do not edit the user's current API/mobile/web checkouts.
- Preserve existing response fields and successful legitimate behavior.
- Never preserve cross-user private access as compatibility behavior.
- Owner write access, beneficiary shared read access, and `visibility: "everyone"` public read access are distinct policies.
- File capabilities use the existing `/files/:name(*)` proxy and must preserve byte ranges.
- New uploads use `signed_only`; existing files remain `legacy_public` until later telemetry-gated backfill.
- Capability signatures and capsule/auth tokens must never appear in application logs.
- Polar remains the sole billing provider; billing behavior is not changed in this plan.
- Every task uses red-green TDD and ends in an independently reviewable commit.

---

### Task 1: Establish the API Test Harness

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `test/setup.ts`
- Create: `test/helpers/database.ts`
- Create: `test/helpers/app.ts`
- Create: `test/helpers/factories.ts`
- Create: `test/smoke/health.test.ts`

**Interfaces:**
- Produces `connectTestDatabase()`, `clearTestDatabase()`, `closeTestDatabase()`, `createTestApp()`, `createUserFixture()`, and `issueLegacyAccessToken()`.
- Later tasks import these helpers; production code never imports test helpers.

- [ ] **Step 1: Add test dependencies and scripts**

Run:

```bash
yarn add --dev vitest supertest @types/supertest mongodb-memory-server
```

Add scripts:

```json
{
  "test": "vitest run --sequence.concurrent=false",
  "test:watch": "vitest",
  "verify": "yarn lint && yarn compile && yarn test"
}
```

- [ ] **Step 2: Configure isolated test execution**

Create `vitest.config.ts`:

```ts
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    restoreMocks: true,
    clearMocks: true,
  },
});
```

Set deterministic test environment before importing the application:

```ts
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters';
process.env.FILE_URL_SIGNING_KEYS = 'test-v1:test-file-signing-secret-at-least-32-characters';
process.env.BACKEND_URL = 'http://localhost:5000';
```

- [ ] **Step 3: Write a failing application smoke test**

```ts
import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {createTestApp} from '../helpers/app';

describe('health', () => {
  it('creates the Express app without binding a port', async () => {
    const response = await request(createTestApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('OK');
  });
});
```

- [ ] **Step 4: Run the test and verify red**

Run: `yarn test test/smoke/health.test.ts`

Expected: FAIL because the test helpers do not exist.

- [ ] **Step 5: Implement the helpers and lifecycle hooks**

Use `MongoMemoryServer` in `test/helpers/database.ts`, connect the existing Mongoose singleton to its URI, clear every collection after each test, and stop it after the suite. `createTestApp()` returns `createServer()` from `src/app.ts` without calling `startServer()`.

- [ ] **Step 6: Verify green and static checks**

Run:

```bash
yarn test test/smoke/health.test.ts
yarn lint
yarn compile
```

Expected: one passing smoke test, zero lint errors, zero TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add package.json yarn.lock tsconfig.json vitest.config.ts test
git commit -m "test(api): add integration test harness"
```

### Task 2: Model Explicit Memory Read and Write Policies

**Files:**
- Create: `src/module/api/memory/access.ts`
- Modify: `src/module/api/memory/service.ts`
- Modify: `src/module/api/memory/routes.ts`
- Modify: `src/module/api/memory/controller.ts`
- Test: `test/security/memory-access.test.ts`

**Interfaces:**
- Consumes: User, Memory, Beneficiary, Group, and authenticated `userId`.
- Produces:

```ts
export type MemoryPrincipal = {userId?: string};
export type MemoryDocument = HydratedDocument<IMemory>;
export function findReadableMemory(memoryId: string, principal: MemoryPrincipal): Promise<MemoryDocument | null>;
export function findOwnedMemory(memoryId: string, userId: string): Promise<MemoryDocument | null>;
export function assertReadableMemory(memoryId: string, principal: MemoryPrincipal): Promise<MemoryDocument>;
export function assertOwnedMemory(memoryId: string, userId: string): Promise<MemoryDocument>;
```

- [ ] **Step 1: Write failing two-user policy tests**

Cover these exact cases:

```ts
it.each([
  ['private detail', 'GET', '/memories/:id'],
  ['message insertion', 'POST', '/memories/add-message'],
  ['bookmark private memory', 'POST', '/memories/:id/bookmark'],
])('blocks another user from %s', async (_label, method, path) => {
  // Create owner, attacker, and owner's private memory.
  // Issue attacker's token and call the resolved path.
  // Assert 404 and assert no Message/Bookmark was created.
});
```

Also assert:

- owner can read/write;
- accepted beneficiary referenced directly can read but cannot write;
- accepted beneficiary in a referenced group can read but cannot write;
- any user can read `visibility: "everyone"`;
- `getMemoryByPrompt` returns only the authenticated user's response.

- [ ] **Step 2: Run tests and verify current failures**

Run: `yarn test test/security/memory-access.test.ts`

Expected: foreign detail/message/bookmark or prompt tests fail against current ID-only queries.

- [ ] **Step 3: Implement the policy query**

Resolve the principal's accepted beneficiary records and group membership, then query with one explicit read filter:

```ts
const accessBranches: FilterQuery<IMemory>[] = [{visibility: 'everyone'}];
if (principal.userId) {
  accessBranches.push(
    {user: principal.userId},
    {beneficiaries: {$in: beneficiaryIds}},
    {groups: {$in: groupIds}},
  );
}

return Memory.findOne({
  _id: memoryId,
  status: {$nin: ['draft', 'deleted']},
  $or: accessBranches,
});
```

All mutation helpers query `{_id, user: userId}`. Return the same `NotFoundException('Memory not found')` for missing and inaccessible records.

- [ ] **Step 4: Replace unsafe service queries**

- `getMemory`: use `assertReadableMemory`, then populate only after authorization.
- `getMemoryByPrompt`: query `{prompt: promptId, user: userId}`.
- `bookmark`: require readable memory.
- `addMessageToMemory`: if `memory_id` exists, require owned memory; session fallback remains owner-scoped.
- `getMemoryAttachments` and enrichment endpoints: use readable or owned access according to whether they expose private AI data; enrichment remains owner-only.

- [ ] **Step 5: Verify focused and full tests**

Run:

```bash
yarn test test/security/memory-access.test.ts
yarn test
yarn lint
yarn compile
```

- [ ] **Step 6: Commit**

```bash
git add src/module/api/memory test/security/memory-access.test.ts
git commit -m "fix(security): enforce memory access policies"
```

### Task 3: Validate Attachment Ownership and Reference Integrity

**Files:**
- Create: `src/module/api/file/access.ts`
- Modify: `src/module/api/memory/service.ts`
- Modify: `src/module/api/memory/routes.ts`
- Modify: `src/module/api/memory/controller.ts`
- Modify: `src/module/api/memory/validator.ts`
- Test: `test/security/attachment-ownership.test.ts`

**Interfaces:**
- Produces:

```ts
export async function assertOwnedFileIds(userId: string, fileIds: string[]): Promise<string[]>;
export type FileDocument = HydratedDocument<IFile>;
export type FilePrincipal = {userId?: string};
export type FileAccessContext = {memoryId?: string; capsuleId?: string};
export async function assertReadableFile(fileId: string, principal: FilePrincipal, context?: FileAccessContext): Promise<FileDocument>;
```

- [ ] **Step 1: Write failing attachment tests**

Assert another user's File ID is rejected during memory creation, quick capture, memory update, detach, and deletion. Assert a missing ID and foreign ID both return 404. Assert no memory references are modified.

- [ ] **Step 2: Run red**

Run: `yarn test test/security/attachment-ownership.test.ts`

Expected: create/update tests fail because validators check only Mongo ID syntax.

- [ ] **Step 3: Implement one ownership resolver**

```ts
const uniqueIds = [...new Set(fileIds.map(String))];
const owned = await File.find({
  _id: {$in: uniqueIds},
  user: userId,
  deleted: {$ne: true},
  provider: {$ne: EXCLUDED_STORAGE_PROVIDER},
}).select('_id');

if (owned.length !== uniqueIds.length) {
  throw new NotFoundException('File not found');
}
return uniqueIds;
```

- [ ] **Step 4: Apply resolver before every attachment write**

Apply it to create, quick capture, update/add, capsule attachment input where reached by shared helper, and explicit file deletion. Add canonical `DELETE /memories/:memoryId/attachments/:fileId`; keep the legacy route owner-scoped and correct its response copy so it no longer claims physical deletion.

Physical file deletion must query active Memory/Capsule references and return `409 file_still_referenced` unless an explicit later detach-all operation is used.

- [ ] **Step 5: Verify and commit**

Run: `yarn test test/security/attachment-ownership.test.ts && yarn verify`

```bash
git add src/module/api/file src/module/api/memory test/security/attachment-ownership.test.ts
git commit -m "fix(security): validate attachment ownership"
```

### Task 4: Add the Safe Public Memory Contract

**Files:**
- Create: `src/module/api/memory/public-dto.ts`
- Modify: `src/module/api/memory/routes.ts`
- Modify: `src/module/api/memory/controller.ts`
- Modify: `src/module/api/memory/service.ts`
- Modify: `src/docs/memories.docs.ts`
- Test: `test/security/public-memory.test.ts`

**Interfaces:**
- Produces `toPublicMemory(memory): PublicMemory` and `GET /memories/public/:id`.
- `PublicMemory` contains `_id`, `title`, stored rich-text `body`, `tags`, `created_at`, and authorized attachment presentation only. Web clients must sanitize `body` before HTML rendering; native clients render it as non-executable content.

- [ ] **Step 1: Write failing public projection tests**

Assert anonymous access succeeds only for `visibility: "everyone"`. Assert private/shared-only records return 404. Assert response excludes `user`, `summary`, `topics`, `session_id`, `groups`, `beneficiaries`, enrichment fields, and internal references.

- [ ] **Step 2: Run red**

Run: `yarn test test/security/public-memory.test.ts`

- [ ] **Step 3: Implement route before `/:id`**

```ts
router.get('/public/:id', valid.publicMemory, ctrl.getPublicMemory);
router.get('/:id', gaurd, ctrl.getMemory);
```

Query with `{_id, visibility: 'everyone', status: {$nin: ['draft','deleted']}}`; never call the unrestricted authenticated detail service.

- [ ] **Step 4: Verify projection and route ordering**

Run: `yarn test test/security/public-memory.test.ts && yarn verify`

- [ ] **Step 5: Commit**

```bash
git add src/module/api/memory src/docs/memories.docs.ts test/security/public-memory.test.ts
git commit -m "feat(api): add safe public memory contract"
```

### Task 5: Implement File Capability Signing

**Files:**
- Create: `src/services/storage/file-capability.ts`
- Modify: `src/utils/config.ts`
- Modify: `src/utils/attachment-response.ts`
- Modify: `src/module/database/model/file.ts`
- Modify: `src/services/storage/index.ts`
- Modify: `src/services/storage/public-url.ts`
- Modify: `src/services/storage/video-processing.ts`
- Modify: `src/workers/system/process-attachment-thumbnail.ts`
- Test: `test/storage/file-capability.test.ts`
- Test: `test/contracts/attachment-response.test.ts`

**Interfaces:**
- Produces:

```ts
export type FileVariant = 'original' | 'thumbnail';
export type FileCapability = {fid: string; exp: number; kid: string; sig: string; variant: FileVariant};
export function signFileUrl(input: {fileId: string; objectKey: string; variant: FileVariant; ttlSeconds?: number}): {url: string; expiresAt: string};
export function verifyFileCapability(input: {fileId: string; objectKey: string; variant: FileVariant; exp: number; kid: string; signature: string; now?: number}): boolean;
```

- [ ] **Step 1: Write cryptographic unit tests**

Test valid signature, changed filename, changed File ID, changed variant, unknown key ID, expired timestamp, malformed/base64 signature, and current/previous key rotation. Test comparisons do not throw on unequal buffer lengths.

- [ ] **Step 2: Run red**

Run: `yarn test test/storage/file-capability.test.ts`

- [ ] **Step 3: Implement deterministic HMAC capabilities**

Use SHA-256 and a canonical payload:

```ts
const payload = [fileId, objectKey, variant, expiresAt, keyId].join('\n');
const signature = createHmac('sha256', secret).update(payload).digest('base64url');
```

Parse `FILE_URL_SIGNING_KEYS` as comma-separated `kid:secret` entries. The first key signs; all keys verify. Production requires at least one 32-character secret.

- [ ] **Step 4: Extend the File contract additively**

Add:

```ts
access_mode: {type: String, enum: ['legacy_public', 'signed_only'], default: 'legacy_public'},
thumbnail_key: {type: String, default: null},
```

New `storage.uploadFile()` results explicitly set `access_mode: 'signed_only'`. Store new derivative keys in `thumbnail_key`; retain legacy `thumbnail` strings for old records. Update image/audio derivative generation, video processing, and `process-attachment-thumbnail.ts` so every new derivative persists a key rather than a permanent URL.

Extend `AttachmentResponse` with optional:

```ts
access?: {expires_at: string; refresh_endpoint: string};
```

Keep `url` and `thumbnail` fields, but populate them with signed proxy URLs whenever File ID and object key exist.

- [ ] **Step 5: Verify contract compatibility**

Assert old fields are unchanged in name/type, `backup_url` is not exposed, and signed output includes `fid`, `exp`, `kid`, `variant`, and `sig`.

Run: `yarn test test/storage/file-capability.test.ts test/contracts/attachment-response.test.ts && yarn verify`

- [ ] **Step 6: Commit**

```bash
git add src/services/storage src/utils/config.ts src/utils/attachment-response.ts src/module/database/model/file.ts test/storage test/contracts/attachment-response.test.ts
git commit -m "feat(files): issue signed media capabilities"
```

### Task 6: Enforce Signed File and Thumbnail Requests

**Files:**
- Modify: `src/module/api/file/routes.ts`
- Modify: `src/module/api/file/controller.ts`
- Modify: `src/module/api/file/service.ts`
- Modify: `src/module/api/file/access.ts`
- Create: `src/module/api/file/request-access.ts`
- Create: `src/module/api/file/validator.ts`
- Modify: `src/middleware/http-logger.ts`
- Test: `test/security/file-delivery.test.ts`
- Test: `test/security/log-redaction.test.ts`

**Interfaces:**
- Produces `resolveFileRequest(name, query): ResolvedFileRequest` containing authorized File, provider key, variant, expiry, and cache TTL.

- [ ] **Step 1: Write failing delivery tests**

Cover:

- valid original signature returns 200;
- valid Range request returns 206 and correct `Content-Range`;
- tampered/expired/unknown-key signatures return 403;
- bare request for `signed_only` returns 403;
- bare request for `legacy_public` remains temporarily successful;
- thumbnail request must resolve through the owning File and matching `thumbnail_key`;
- arbitrary `thumb_` or `thumbnails/` names no longer bypass File lookup;
- another user cannot refresh a capability merely by knowing a File ID;
- an owner can refresh directly and an explicitly shared reader can refresh with an accessible memory context;
- response cache control is private and bounded by capability expiry.

- [ ] **Step 2: Run red**

Run: `yarn test test/security/file-delivery.test.ts`

- [ ] **Step 3: Resolve and verify before metadata/storage access**

Do not call `storage.getFile*` until `resolveFileRequest` returns. For `signed_only`, require a valid capability. For `legacy_public`, accept either valid capability or a temporary bare request and increment compatibility telemetry.

Use the resolved provider/key/type for metadata and streaming so thumbnail paths cannot choose storage independently.

Add an authenticated refresh route before the wildcard route:

```ts
router.post('/:id/access', gaurd, valid.refreshAccess, ctrl.refreshFileAccess);
router.get('/:name(*)', ctrl.getFile);
```

`refreshAccess` accepts optional `{memory_id, capsule_id}` Mongo IDs. The service calls `assertReadableFile`; ownership succeeds directly, while non-owner access requires a readable parent resource that references the file. Return the standard serialized attachment with a fresh capability. Capsule context is rejected until the capsule-access policy is added by the capsule plan; it is not accepted speculatively.

- [ ] **Step 4: Make cache and CORS headers capability-safe**

Set:

```ts
Cache-Control: private, max-age=<min(exp-now, 3600)>
Access-Control-Allow-Origin: <configured Memento origin or request origin from allowlist>
Vary: Origin
Cross-Origin-Resource-Policy: cross-origin
```

When an allowed browser `Origin` is present, echo that origin and emit `Vary: Origin`. When `Origin` is absent (normal for native clients and direct media requests), omit `Access-Control-Allow-Origin`; the signed capability remains sufficient. Reject or omit CORS permission for origins outside the configured allowlist—never reflect an arbitrary origin.

Preserve `Accept-Ranges`, ETag, Last-Modified, and media streaming.

- [ ] **Step 5: Redact capability parameters**

Create a URL sanitizer used by Pino serialization:

```ts
for (const key of ['sig', 'token', 'code']) {
  if (url.searchParams.has(key)) url.searchParams.set(key, '[REDACTED]');
}
```

Sanitize both `req.url` and logged query data. Add a deployment-runbook note that reverse-proxy access logs must apply equivalent redaction.

- [ ] **Step 6: Verify and commit**

Run: `yarn test test/security/file-delivery.test.ts test/security/log-redaction.test.ts && yarn verify`

```bash
git add src/module/api/file src/middleware/http-logger.ts test/security/file-delivery.test.ts test/security/log-redaction.test.ts
git commit -m "fix(files): enforce signed private delivery"
```

### Task 7: Add File Access Audit and Thumbnail-Key Backfill

**Files:**
- Create: `src/scripts/file-access-audit.ts`
- Create: `src/scripts/backfill-thumbnail-keys.ts`
- Modify: `package.json`
- Test: `test/scripts/backfill-thumbnail-keys.test.ts`

**Interfaces:**
- Produces `extractThumbnailKey(value, backendUrl): string | null` and dry-run/commit scripts.
- Does not change legacy `access_mode` to signed-only in this release.

- [ ] **Step 1: Write extraction/backfill tests**

Test encoded backend proxy URLs, `thumb_` keys, `thumbnails/` keys, Cloudinary provider URLs that must not be guessed, null values, and idempotent reruns.

- [ ] **Step 2: Run red**

Run: `yarn test test/scripts/backfill-thumbnail-keys.test.ts`

- [ ] **Step 3: Implement dry-run-first scripts**

`file-access-audit` reports counts by provider, access mode, thumbnail representation, missing storage identity, and active references. `backfill-thumbnail-keys` defaults to dry-run and writes only with `--commit`.

Add scripts:

```json
{
  "files:audit-access": "ts-node src/scripts/file-access-audit.ts",
  "files:backfill-thumbnails": "ts-node src/scripts/backfill-thumbnail-keys.ts"
}
```

- [ ] **Step 4: Verify dry run against staging data**

Run:

```bash
yarn files:audit-access
yarn files:backfill-thumbnails
```

Expected: zero writes and a machine-readable summary. Run `--commit` only after reviewing unmatched rows.

- [ ] **Step 5: Commit**

```bash
git add src/scripts package.json test/scripts/backfill-thumbnail-keys.test.ts
git commit -m "chore(files): add access migration tooling"
```

### Task 8: Protect Bull Board with Explicit Administration

**Files:**
- Create: `src/middleware/admin.ts`
- Modify: `src/services/queues/index.ts`
- Modify: `src/utils/config.ts`
- Test: `test/security/admin-middleware.test.ts`
- Test: `test/security/bull-board.test.ts`

**Interfaces:**
- Produces `requireAdmin(req,res,next)` and `BULL_BOARD_ENABLED` configuration.
- Uses `FEATURE_FLAGS_ADMIN_EMAILS` as the existing administrator allowlist until a dedicated role model is approved.

- [ ] **Step 1: Write failing middleware tests**

Assert missing token is 401, ordinary user is 403, allowlisted active user succeeds, deleted user is rejected, and production with `BULL_BOARD_ENABLED=false` does not mount `/queues`.

- [ ] **Step 2: Run red**

Run: `yarn test test/security/admin-middleware.test.ts test/security/bull-board.test.ts`

- [ ] **Step 3: Implement guarded mounting**

```ts
if (!BULL_BOARD_ENABLED) return;
app.use(path, gaurd, requireAdmin, serverAdapter.getRouter());
```

Never mount an unguarded router, even in development. Development users must configure an allowlisted email.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/security/admin-middleware.test.ts test/security/bull-board.test.ts && yarn verify`

```bash
git add src/middleware/admin.ts src/services/queues/index.ts src/utils/config.ts test/security/admin-middleware.test.ts test/security/bull-board.test.ts
git commit -m "fix(ops): protect queue administration"
```

### Task 9: Constrain the Sentry Tunnel

**Files:**
- Create: `src/module/api/sentry_tunnel/policy.ts`
- Modify: `src/module/api/sentry_tunnel/controller.ts`
- Modify: `src/module/api/sentry_tunnel/routes.ts`
- Modify: `src/utils/config.ts`
- Test: `test/security/sentry-tunnel.test.ts`

**Interfaces:**
- Produces:

```ts
export function resolveSentryIngestUrl(envelope: Buffer, policy: SentryTunnelPolicy): URL;
type SentryTunnelPolicy = {allowedHosts: Set<string>; allowedProjectIds: Set<string>};
```

- [ ] **Step 1: Write failing SSRF policy tests**

Accept configured HTTPS host/project. Reject HTTP, unlisted host, internal/loopback names, username/password, non-443 ports, unlisted project, malformed JSON, missing DSN, oversized envelope, and newline/header confusion.

- [ ] **Step 2: Run red**

Run: `yarn test test/security/sentry-tunnel.test.ts`

- [ ] **Step 3: Implement pure validation and bounded relay**

Parse only the first envelope line. Require exact hostname membership, `https:`, no credentials, empty/443 port, and exact project membership. Use a request timeout and return upstream status without returning upstream body.

Apply a dedicated per-IP limiter and reduce raw-body limit to the configured Sentry maximum needed by the client.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/security/sentry-tunnel.test.ts && yarn verify`

```bash
git add src/module/api/sentry_tunnel src/utils/config.ts test/security/sentry-tunnel.test.ts
git commit -m "fix(security): constrain Sentry tunnel destinations"
```

### Task 10: Fail Closed on Webhooks and Security Configuration

**Files:**
- Create: `src/utils/runtime-config.ts`
- Modify: `src/utils/config.ts`
- Modify: `src/index.ts`
- Modify: `src/module/api/webhook/service.ts`
- Modify: `src/module/api/webhook/controller.ts`
- Modify: `src/module/api/webhook/routes.ts`
- Test: `test/config/runtime-config.test.ts`
- Test: `test/security/tally-webhook.test.ts`

**Interfaces:**
- Produces `validateRuntimeConfig(env): RuntimeConfig`.
- Tally verification consumes the exact raw request bytes and `Tally-Signature`.

- [ ] **Step 1: Write failing configuration tests**

Production must reject missing/short JWT secret, missing file-signing key, enabled Tally without secret, enabled Sentry tunnel without host/project allowlists, and enabled Bull Board without administrators. Development may explicitly disable each optional route.

- [ ] **Step 2: Write failing Tally tests**

Assert missing secret never accepts a request; missing/tampered signature is 401; exact raw-body HMAC succeeds; JSON reserialization differences do not change verification because raw bytes are used; limiter rejects abuse.

- [ ] **Step 3: Run red**

Run: `yarn test test/config/runtime-config.test.ts test/security/tally-webhook.test.ts`

- [ ] **Step 4: Validate before external connections**

Call `validateRuntimeConfig(process.env)` at the top of `bootstrap()` before MongoDB, Redis, scheduler, or SMTP initialization. Do not use `String(undefined)` for secrets.

- [ ] **Step 5: Make Tally fail closed**

If Tally is disabled, do not mount the route. If enabled and secret is missing, startup fails. Verify `req.rawBody` with `createHmac('sha256', secret)` and `timingSafeEqual`; never verify `JSON.stringify(req.body)`.

- [ ] **Step 6: Verify and commit**

Run: `yarn test test/config/runtime-config.test.ts test/security/tally-webhook.test.ts && yarn verify`

```bash
git add src/utils/runtime-config.ts src/utils/config.ts src/index.ts src/module/api/webhook test/config/runtime-config.test.ts test/security/tally-webhook.test.ts
git commit -m "fix(security): fail closed on runtime configuration"
```

### Task 11: Gate Deployment and Run Staging Acceptance

**Files:**
- Modify: `.github/workflows/deploy-dev.yml`
- Modify: `.github/workflows/deploy-prod.yml`
- Create: `docs/compatibility-registry.md`
- Create: `docs/runbooks/private-files.md`
- Create: `docs/runbooks/security-containment.md`

**Interfaces:**
- Consumes all security tasks.
- Produces an API release that existing clients can consume without response-shape changes.

- [ ] **Step 1: Require tests before build/deploy**

Add `yarn test` after lint and before build in both workflows. Preserve atomic deployment and rollback behavior.

- [ ] **Step 2: Record the only active compatibility shim**

Register `FILES_LEGACY_BARE_URL` with:

- legacy: bare `/files/:name` for existing `legacy_public` records;
- canonical: HMAC file capability;
- telemetry event: `compat.files.legacy_bare_url`;
- removal gate: supported web/mobile versions emit signed URLs and legacy bare access is below the approved threshold;
- rollback restriction: new `signed_only` files never become bare-public.

- [ ] **Step 3: Run complete local verification**

Run:

```bash
yarn test
yarn lint
yarn compile
yarn build
git diff --check
```

Expected: zero test failures, zero lint errors, zero TypeScript/build errors, zero whitespace errors.

- [ ] **Step 4: Run staging security acceptance**

With two real staging accounts, verify private read/write denial, explicit beneficiary/public reads, signed image/audio/video/document delivery, range seeking, expired/tampered rejection, no signatures in logs, Bull Board admin access, Sentry forwarding only to configured project, and Tally signature rejection/acceptance.

- [ ] **Step 5: Commit documentation and CI gate**

```bash
git add .github/workflows docs
git commit -m "ci(api): gate deployment on security verification"
```

## Release Gate

- [ ] Every security test passes against the release commit.
- [ ] Existing web/mobile responses still contain the same attachment field names.
- [ ] New uploads are `signed_only` and cannot be fetched bare.
- [ ] Legacy bare access is measured, private-cacheable, and limited to legacy records.
- [ ] No capability signatures appear in application or proxy logs.
- [ ] The rollback artifact preserves authorization and signed-only enforcement.
