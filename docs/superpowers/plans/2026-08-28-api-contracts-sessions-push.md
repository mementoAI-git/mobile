# API Contracts, Sessions, and Push Devices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add canonical response, error, user, session, and push-device contracts while preserving every legitimate field and endpoint used by the currently supported web and mobile clients.

**Architecture:** Expand the API in place. A request-context middleware supplies request/client identity, response helpers emit additive canonical metadata, and one session service owns JWT issuance, hashed refresh-token rotation, legacy refresh migration, and revocation. User/profile aliases and push-device registration are additive; no legacy field is removed in this release.

**Tech Stack:** Node.js 20/24, TypeScript, Express, Mongoose, MongoDB, Redis, JSON Web Tokens, Vitest, Supertest, mongodb-memory-server, Swagger/OpenAPI.

**Spec:** `docs/superpowers/specs/2026-08-27-platform-remediation-design.md`

## Global Constraints

- Existing API, web, and mobile deployments may upgrade independently.
- Preserve `status`, `message`, `data`, legacy token fields, `onboarded`, legacy refresh tokens, and supported endpoint aliases.
- Add `success`, `meta.contract_version`, `meta.request_id`, `data.session`, stable error `code`, and canonical session expiry names; do not replace fields in place.
- Security checks have no legacy bypass: deleted, purge-pending, disabled, version-mismatched, or revoked sessions are rejected.
- Store only refresh-token hashes in `AuthSession`; raw `User.refresh_token(s)` remain migration-only.
- Registration uses its own validator and does not issue a session before successful verification.
- Polar remains the only billing provider; this plan does not alter billing lifecycle behavior.
- All changes use red-green TDD and additive Mongoose schemas readable by the previous release.

---

### Task 1: Request Context and Additive Response Contracts

**Files:**
- Create: `src/contracts/response.ts`
- Create: `src/middleware/request-context.ts`
- Modify: `src/utils/interface.ts`
- Modify: `src/utils/helpers.ts`
- Modify: `src/app.ts`
- Test: `test/contracts/response.contract.test.ts`
- Test: `test/middleware/request-context.test.ts`

**Interfaces:**
- Produces `ApiResponse<T>`, `ApiError`, `RequestContext`, `MementoRequest`, the existing `responsHandler()`, and `requestContext()`.
- `MementoRequest.context.requestId` is consumed by error handling, authentication, telemetry, and OpenAPI tests.

- [ ] **Step 1: Write failing response and request-context tests**

```ts
expect(response.body).toMatchObject({
  status: 200,
  success: true,
  data: expect.anything(),
  meta: {contract_version: '2026-08', request_id: expect.any(String)},
});
expect(response.headers['x-request-id']).toBe(response.body.meta.request_id);
expect(capturedContext).toMatchObject({
  client: 'ios',
  version: '2.4.0',
  build: '312',
});
```

Also assert invalid/missing headers normalize to `legacy-unknown`, inbound request IDs are not trusted, and the generated ID contains no client-controlled content.

- [ ] **Step 2: Run red**

Run: `yarn test test/contracts/response.contract.test.ts test/middleware/request-context.test.ts`

Expected: FAIL because canonical response fields and request context do not exist.

- [ ] **Step 3: Add the contract and middleware**

```ts
export const CONTRACT_VERSION = '2026-08' as const;
export type ApiResponse<T> = {
  status: number;
  success: true;
  message: string;
  data: T;
  meta: {
    contract_version: typeof CONTRACT_VERSION;
    request_id: string;
    deprecations?: string[];
  };
};

export type RequestContext = {
  requestId: string;
  client: 'web' | 'ios' | 'android' | 'legacy-unknown';
  version: string | null;
  build: string | null;
};
```

Generate the request ID with `randomUUID()`, parse only bounded printable version/build values, set `X-Request-Id`, and attach context before HTTP logging and routing. Make `responsHandler` read the context from `res.locals` and add canonical fields without removing the existing shape.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/contracts/response.contract.test.ts test/middleware/request-context.test.ts && yarn lint && yarn compile`

```bash
git add src/contracts/response.ts src/middleware/request-context.ts src/utils/interface.ts src/utils/helpers.ts src/app.ts test/contracts/response.contract.test.ts test/middleware/request-context.test.ts
git commit -m "feat(api): add request and response contracts"
```

### Task 2: Stable Error Codes and Compatible Error Envelopes

**Files:**
- Modify: `src/contracts/response.ts`
- Modify: `src/utils/service-error.ts`
- Modify: `src/middleware/error-handler.ts`
- Modify: `src/middleware/rate-limiter.ts`
- Modify: `src/module/api/index.ts`
- Test: `test/contracts/error.contract.test.ts`

**Interfaces:**
- Produces `ServiceError.code`, optional `ServiceError.details`, and `ApiError`.
- Preserves payment-gate top-level fields and legacy validation arrays while adding canonical fields.

- [ ] **Step 1: Write failing error contract tests**

```ts
expect(response.body).toMatchObject({
  status: 422,
  success: false,
  message: expect.any(String),
  code: 'validation_failed',
  details: expect.any(Object),
  request_id: response.headers['x-request-id'],
});
```

Cover validation, authentication, not-found, quota/gate, Multer limit, and unexpected 500 errors. Assert legacy gate fields remain both top-level and in `data`, and stack traces never enter the response.

- [ ] **Step 2: Run red**

Run: `yarn test test/contracts/error.contract.test.ts`

Expected: FAIL because errors have no `success`, `code`, `details`, or request ID.

- [ ] **Step 3: Implement deterministic codes**

```ts
export type ErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'rate_limited'
  | 'payload_too_large'
  | 'internal_error';
```

Extend `ServiceError` without changing existing constructor call behavior. Map subclasses to stable defaults, retain `data` as the legacy representation, and have the error handler build one canonical error response using `res.locals.requestContext.requestId`.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/contracts/error.contract.test.ts && yarn lint && yarn compile`

```bash
git add src/contracts/response.ts src/utils/service-error.ts src/middleware/error-handler.ts test/contracts/error.contract.test.ts
git commit -m "feat(api): add stable error contracts"
```

### Task 3: Public User Projection

**Files:**
- Create: `src/contracts/public-user.ts`
- Modify: `src/module/api/user/service.ts`
- Test: `test/contracts/public-user.contract.test.ts`

**Interfaces:**
- Produces `PublicUser` and `toPublicUser(user): PublicUser`.
- Session, profile, OAuth, passkey, verification, and refresh paths consume the same serializer.

- [ ] **Step 1: Write a failing sensitive-field projection test**

```ts
const dto = toPublicUser(user.toObject({virtuals: true}));
expect(dto).toMatchObject({id: user.id, email: user.email});
for (const key of [
  'password', 'private_key', 'public_key', 'refresh_token', 'refresh_tokens',
  'context',
]) expect(dto).not.toHaveProperty(key);
expect(dto.two_factor).toEqual({enabled: true});
expect(dto.passkeys).toEqual([
  {credential_id: 'credential-id', device_name: 'Phone', created_at: expect.anything()},
]);
expect(dto.passkeys?.[0]).not.toHaveProperty('public_key');
expect(dto.passkeys?.[0]).not.toHaveProperty('counter');
```

Assert `_id`, `id`, `fullname`, `onboarding_status`, `onboarded`, picture metadata, and existing safe profile fields remain available.

- [ ] **Step 2: Run red**

Run: `yarn test test/contracts/public-user.contract.test.ts`

Expected: FAIL because there is no shared safe serializer.

- [ ] **Step 3: Implement one allowlist serializer**

```ts
export type PublicUser = Pick<IUser,
  'email' | 'first_name' | 'last_name' | 'nickname' | 'gender' | 'dob' |
  'country' | 'phone_number' | 'picture' | 'location' | 'age_range' |
  'onboarding_status' | 'primary_conversation_id'
> & {id: string; _id: string; fullname: string | null; onboarded: boolean};
```

Build the DTO from an explicit allowlist, not object spread plus deletion. Refactor `getProfile` to use it while retaining `pending_insights_count` as an additive profile-only field.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/contracts/public-user.contract.test.ts && yarn lint && yarn compile`

```bash
git add src/contracts/public-user.ts src/module/api/user/service.ts test/contracts/public-user.contract.test.ts
git commit -m "feat(api): centralize public user projection"
```

### Task 4: AuthSession Schema and Session Token Primitives

**Files:**
- Create: `src/contracts/session.ts`
- Create: `src/module/database/model/auth-session.ts`
- Create: `src/module/api/auth/session-service.ts`
- Modify: `src/module/database/model/user.ts`
- Modify: `src/utils/helpers.ts`
- Modify: `src/utils/interface.ts`
- Test: `test/auth/session-service.test.ts`

**Interfaces:**
- Produces `SessionPayload`, `SessionClaims`, `createSession()`, `rotateSession()`, `revokeSession()`, `revokeOtherSessions()`, and `hashRefreshToken()`.
- JWT claims become `{id, sid, sv, type?}`; legacy `{id, type?}` remains decodable.

- [ ] **Step 1: Write failing model/token tests**

```ts
const payload = await createSession(user, context, {installationId: 'ios-1'});
const session = await AuthSession.findOne({session_id: decode(payload.access_token).sid});
expect(session?.refresh_token_hash).not.toBe(payload.refresh_token);
expect(payload).toMatchObject({
  access_expires_at: expect.any(String),
  refresh_expires_at: expect.any(String),
  user: expect.objectContaining({id: user.id}),
});
```

Assert unique `session_id`, TTL/indexed `expires_at`, client enum, session-version claims, refresh rotation, revoked-session rejection, and no raw refresh token in the session collection.

- [ ] **Step 2: Run red**

Run: `yarn test test/auth/session-service.test.ts`

Expected: FAIL because `AuthSession` and session primitives do not exist.

- [ ] **Step 3: Add additive schemas and primitives**

```ts
type AuthSessionRecord = {
  session_id: string;
  user_id: string;
  refresh_token_hash: string;
  installation_id?: string;
  client: 'web' | 'ios' | 'android' | 'legacy-unknown';
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  revoked_at?: Date;
};
```

Add `session_version: {type: Number, default: 0}` and `purge_status` to User without removing refresh fields. Hash tokens with SHA-256 because the JWT already has cryptographic entropy; compare fixed-length hashes with `timingSafeEqual`. Preserve helper return alias `expires_at` while adding `access_expires_at`.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/auth/session-service.test.ts && yarn lint && yarn compile`

```bash
git add src/contracts/session.ts src/module/database/model/auth-session.ts src/module/api/auth/session-service.ts src/module/database/model/user.ts src/utils/helpers.ts src/utils/interface.ts test/auth/session-service.test.ts
git commit -m "feat(auth): add hashed server sessions"
```

### Task 5: Guard Security-State and Session Revocation Enforcement

**Files:**
- Create: `src/module/api/auth/security-state.ts`
- Modify: `src/middleware/gaurd.ts`
- Modify: `src/services/redis/index.ts`
- Test: `test/auth/session-revocation.test.ts`

**Interfaces:**
- Produces `assertActiveSecurityState(claims)` and `invalidateSecurityState(userId)`.
- Guard attaches typed claims and rejects deleted, purge-pending, disabled, version-mismatched, expired, or revoked sessions.

- [ ] **Step 1: Write failing guard tests**

```ts
expect((await protectedRequest(activeToken)).status).toBe(200);
expect((await protectedRequest(deletedUserToken)).status).toBe(401);
expect((await protectedRequest(versionMismatchToken)).status).toBe(401);
expect((await protectedRequest(revokedSessionToken)).status).toBe(401);
expect((await protectedRequest(validLegacyToken)).status).toBe(200);
```

Also assert MongoDB fallback when Redis is unavailable and that cache invalidation makes deletion/revocation effective on the next request.

- [ ] **Step 2: Run red**

Run: `yarn test test/auth/session-revocation.test.ts`

Expected: FAIL because the guard verifies only the JWT signature.

- [ ] **Step 3: Enforce projected database state**

```ts
type SecurityState = {
  deleted: boolean;
  purge_status?: string;
  session_version: number;
};
```

Read only the security projection. Cache it briefly in Redis; fall back to MongoDB on cache errors. For claims with `sid`, require an unrevoked, unexpired AuthSession belonging to the same user. For legacy claims without `sid`, require only active user state until token expiry. Never accept cache failures as authorization success without the MongoDB fallback.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/auth/session-revocation.test.ts && yarn lint && yarn compile`

```bash
git add src/module/api/auth/security-state.ts src/middleware/gaurd.ts src/services/redis/index.ts test/auth/session-revocation.test.ts
git commit -m "fix(auth): enforce active session security state"
```

### Task 6: Common Session Builder Across Authentication Paths

**Files:**
- Create: `src/module/api/auth/providers/apple.ts`
- Modify: `src/module/api/auth/service.ts`
- Modify: `src/module/api/auth/interface.ts`
- Modify: `src/module/api/auth/controller.ts`
- Modify: `src/module/api/auth/validator.ts`
- Modify: `src/utils/config.ts`
- Test: `test/contracts/auth.contract.test.ts`
- Test: `test/auth/apple-oauth.test.ts`

**Interfaces:**
- Every completed authentication path returns legacy token fields plus `data.session: SessionPayload`.
- Apple identity verification returns `{providerId, email, firstName?, lastName?}` only after issuer, audience, expiry, and signature validation.

- [ ] **Step 1: Write failing dual-shape auth tests**

```ts
expect(response.body.data).toMatchObject({
  access_token: expect.any(String),
  refresh_token: expect.any(String),
  onboarding_status: expect.any(String),
  session: {
    access_token: expect.any(String),
    refresh_token: expect.any(String),
    access_expires_at: expect.any(String),
    refresh_expires_at: expect.any(String),
    user: expect.objectContaining({email}),
  },
});
```

Cover password login, 2FA completion, passkey completion, verified-email completion, Google OAuth, and Apple OAuth. Registration must still return only `{requires_verification, email}`. Stub all network, mail, OTP, and WebAuthn providers.

- [ ] **Step 2: Run red**

Run: `yarn test test/contracts/auth.contract.test.ts test/auth/apple-oauth.test.ts`

Expected: FAIL because auth paths construct different shapes and Apple is incomplete.

- [ ] **Step 3: Route all completions through `createSession`**

```ts
function withLegacySession(session: SessionPayload) {
  return {
    ...session,
    expires_at: session.access_expires_at,
    onboarded: session.onboarding_status === 'completed',
    session,
  };
}
```

Pass request client/install metadata from controllers. Verify Apple `id_token` against cached Apple JWKS using Node `createPublicKey`, `jsonwebtoken.verify`, issuer `https://appleid.apple.com`, and configured audience. Accept Apple name only on first authorization and never trust an unsigned decoded token.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/contracts/auth.contract.test.ts test/auth/apple-oauth.test.ts && yarn lint && yarn compile`

```bash
git add src/module/api/auth src/utils/config.ts test/contracts/auth.contract.test.ts test/auth/apple-oauth.test.ts
git commit -m "feat(auth): unify canonical session responses"
```

### Task 7: Refresh Migration and Device-Scoped Logout

**Files:**
- Modify: `src/module/api/auth/session-service.ts`
- Modify: `src/module/api/auth/service.ts`
- Modify: `src/module/api/auth/controller.ts`
- Modify: `src/module/api/auth/validator.ts`
- Test: `test/auth/refresh-migration.test.ts`
- Test: `test/auth/logout.test.ts`

**Interfaces:**
- New refresh tokens rotate within their `sid`.
- A valid legacy raw refresh token creates a canonical session, removes only the used raw token, and returns both response shapes.
- Logout-current revokes the current `sid`; logout-other retains only the current `sid`.

- [ ] **Step 1: Write failing rotation/migration tests**

```ts
expect(await refresh(oldCanonicalToken)).toMatchObject({status: 200});
expect((await refresh(oldCanonicalToken)).status).toBe(401);
expect(await AuthSession.countDocuments({session_id: sid})).toBe(1);

const migrated = await refresh(legacyRawToken);
expect(decode(migrated.body.data.refresh_token)).toHaveProperty('sid');
expect((await User.findById(user.id))?.refresh_tokens).not.toContain(legacyRawToken);
```

Assert logout without a body revokes the authenticated `sid`, a legacy client may still submit its refresh token during migration, logout-other rejects a token/session mismatch, and session/version changes invalidate cached security state.

- [ ] **Step 2: Run red**

Run: `yarn test test/auth/refresh-migration.test.ts test/auth/logout.test.ts`

Expected: FAIL because refresh tokens are stored raw on User and logout is user-global/body-driven.

- [ ] **Step 3: Implement atomic session rotation and compatibility migration**

```ts
await AuthSession.findOneAndUpdate(
  {session_id: sid, refresh_token_hash: oldHash, revoked_at: {$exists: false}},
  {$set: {refresh_token_hash: newHash, last_seen_at: now, expires_at}},
  {new: true},
);
```

Treat a null update as replay/invalid token. For a legacy token, verify JWT and exact raw-token membership, create one AuthSession, then `$pull` that exact value from both legacy fields without clearing other clients. Emit non-sensitive compatibility event `compat.auth.legacy_refresh` with client metadata.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/auth/refresh-migration.test.ts test/auth/logout.test.ts && yarn lint && yarn compile`

```bash
git add src/module/api/auth test/auth/refresh-migration.test.ts test/auth/logout.test.ts
git commit -m "feat(auth): rotate and migrate refresh sessions"
```

### Task 8: Endpoint and Profile Compatibility Repairs

**Files:**
- Modify: `src/module/api/user/routes.ts`
- Modify: `src/module/api/user/controller.ts`
- Modify: `src/module/api/user/service.ts`
- Modify: `src/module/api/user/interface.ts`
- Modify: `src/module/api/user/validator.ts`
- Modify: `src/module/api/prompt/routes.ts`
- Modify: `src/module/api/prompt/controller.ts`
- Modify: `src/module/api/prompt/service.ts`
- Modify: `src/module/api/ai/routes.ts`
- Modify: `src/module/api/auth/routes.ts`
- Test: `test/contracts/aliases.contract.test.ts`

**Interfaces:**
- Adds `GET /users/context`, `GET /prompts/categories`, and deprecated `POST /users/profile` without removing canonical routes.
- Password input accepts `current_password` or legacy `old_password`, never conflicting values.
- Profile updates return the safe `PublicUser` and normalize `fullname` only when canonical names are absent.

- [ ] **Step 1: Write failing alias/validation tests**

```ts
expect((await authed.get('/users/context')).status).toBe(200);
expect((await authed.get('/prompts/categories')).status).toBe(200);
expect((await authed.post('/users/profile').send(profile)).body.meta.deprecations)
  .toContain('USERS_PROFILE_POST');
expect((await changePassword({current_password, new_password})).status).toBe(200);
expect((await changePassword({old_password, new_password})).status).toBe(200);
expect((await changePassword({old_password: 'a', current_password: 'b', new_password})).status)
  .toBe(422);
```

Assert register uses `valid.register` (not login validation), duplicate `/ai/conversation/new` registration is removed, and route ordering prevents `/prompts/categories` from being interpreted as `/:id`.

- [ ] **Step 2: Run red**

Run: `yarn test test/contracts/aliases.contract.test.ts`

Expected: FAIL on missing aliases, canonical password naming, and profile response.

- [ ] **Step 3: Add aliases over single services**

```ts
const supplied = [body.current_password, body.old_password].filter(Boolean);
if (supplied.length === 2 && body.current_password !== body.old_password) {
  throw new UnprocessableContent('Password fields conflict');
}
body.current_password ??= body.old_password;
```

Make both profile methods call one validated controller/service. Add the deprecation identifier through response metadata and structured telemetry, not a different payload. Restore prompt categories by calling the existing canonical category query once. Move passkey routes before `export default` for clarity while preserving paths.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/contracts/aliases.contract.test.ts && yarn lint && yarn compile`

```bash
git add src/module/api/user src/module/api/prompt src/module/api/ai/routes.ts src/module/api/auth/routes.ts test/contracts/aliases.contract.test.ts
git commit -m "fix(api): restore compatible account aliases"
```

### Task 9: Dedicated Push Device Registration

**Files:**
- Create: `src/module/database/model/push-device.ts`
- Create: `src/module/api/push-device/interface.ts`
- Create: `src/module/api/push-device/validator.ts`
- Create: `src/module/api/push-device/service.ts`
- Create: `src/module/api/push-device/controller.ts`
- Create: `src/module/api/push-device/routes.ts`
- Modify: `src/module/api/index.ts`
- Modify: `src/module/api/user/service.ts`
- Modify: `src/module/api/user/controller.ts`
- Modify: `src/module/api/user/validator.ts`
- Test: `test/push-device/registration.test.ts`

**Interfaces:**
- Produces idempotent `PUT /push-devices/:installationId` and `DELETE /push-devices/:installationId`.
- Legacy profile `push_token` upserts a token-derived installation identity and emits `compat.push.legacy_profile_token`.

- [ ] **Step 1: Write failing device tests**

```ts
await putDevice('install-1', {platform: 'ios', push_token: 'ExponentPushToken[a]'});
await putDevice('install-1', {platform: 'ios', push_token: 'ExponentPushToken[b]'});
expect(await PushDevice.countDocuments({user_id: user.id, installation_id: 'install-1'}))
  .toBe(1);
expect((await PushDevice.findOne({installation_id: 'install-1'}))?.push_token)
  .toBe('ExponentPushToken[b]');
```

Cover ownership isolation, platform validation, disable/delete idempotency, reassignment protection, and legacy profile-token upsert without returning the token in profile output.

- [ ] **Step 2: Run red**

Run: `yarn test test/push-device/registration.test.ts`

Expected: FAIL because device registration is not a domain resource.

- [ ] **Step 3: Implement an installation-unique model and route**

```ts
const pushDeviceSchema = new Schema({
  user_id: {type: Schema.Types.ObjectId, required: true, index: true},
  installation_id: {type: String, required: true},
  platform: {type: String, enum: ['ios', 'android', 'web'], required: true},
  push_token: {type: String, required: true},
  enabled: {type: Boolean, default: true},
  last_seen_at: {type: Date, default: Date.now},
});
pushDeviceSchema.index({user_id: 1, installation_id: 1}, {unique: true});
```

Upsert only on `{user_id, installation_id}`. Derive a legacy installation ID as `legacy-${sha256(pushToken).slice(0, 24)}` and infer platform from client headers; reject missing platform when it cannot be inferred.

- [ ] **Step 4: Verify and commit**

Run: `yarn test test/push-device/registration.test.ts && yarn lint && yarn compile`

```bash
git add src/module/database/model/push-device.ts src/module/api/push-device src/module/api/index.ts src/module/api/user test/push-device/registration.test.ts
git commit -m "feat(api): add push device registration"
```

### Task 10: OpenAPI Artifact, Compatibility Registry, and Release Gate

**Files:**
- Create: `src/contracts/openapi.ts`
- Create: `src/scripts/export-openapi.ts`
- Modify: `src/docs/index.ts`
- Modify: `package.json`
- Modify: `.github/workflows/deploy-dev.yml`
- Modify: `.github/workflows/deploy-prod.yml`
- Modify: `docs/compatibility-registry.md`
- Create: `docs/runbooks/sessions.md`
- Test: `test/contracts/openapi.contract.test.ts`

**Interfaces:**
- Produces deterministic `openapi.json` plus SHA-256 checksum artifact.
- Registers `AUTH_LEGACY_RESPONSE`, `AUTH_LEGACY_REFRESH`, `USERS_PROFILE_POST`, and `PUSH_LEGACY_PROFILE_TOKEN` shims with telemetry/removal gates.

- [ ] **Step 1: Write failing artifact tests**

```ts
const spec = buildOpenApiDocument();
expect(spec.components.schemas).toMatchObject({
  ApiResponse: expect.any(Object),
  ApiError: expect.any(Object),
  PublicUser: expect.any(Object),
  SessionPayload: expect.any(Object),
  PushDevice: expect.any(Object),
});
expect(stableChecksum(spec)).toMatch(/^[a-f0-9]{64}$/);
```

Validate representative success/error/session fixtures against the schemas and assert export is byte-for-byte deterministic.

- [ ] **Step 2: Run red**

Run: `yarn test test/contracts/openapi.contract.test.ts`

Expected: FAIL because there is no canonical artifact builder/exporter.

- [ ] **Step 3: Add deterministic export and CI artifact**

```json
{
  "scripts": {
    "contracts:export": "ts-node src/scripts/export-openapi.ts",
    "contracts:check": "ts-node src/scripts/export-openapi.ts --check"
  }
}
```

Sort object keys before serialization, write `openapi.json` and `openapi.sha256`, run `contracts:check` after tests and before build, and upload both files with the deployment build artifact. Document session key rotation, global revocation, legacy telemetry, and rollback constraints.

- [ ] **Step 4: Run the complete local release gate**

Run separately:

```bash
yarn test
yarn lint
yarn compile
yarn build
yarn contracts:check
git diff --check
```

Expected: zero test failures, lint errors, compile/build errors, contract drift, and whitespace errors. Existing warnings may remain but no new warning is accepted.

- [ ] **Step 5: Run staging authentication acceptance**

Using synthetic accounts and supported web/mobile builds, exercise password, registration verification, 2FA, passkey, Google OAuth, Apple OAuth, canonical refresh rotation, legacy refresh migration, logout-current, logout-other, forced expiry, deleted-user rejection, profile aliases, context/categories aliases, and push-device update/disable. Record release SHA, client/build headers, sanitized status/code/request IDs, and no raw tokens.

- [ ] **Step 6: Commit**

```bash
git add src/contracts/openapi.ts src/scripts/export-openapi.ts src/docs/index.ts package.json .github/workflows docs test/contracts/openapi.contract.test.ts
git commit -m "ci(api): publish canonical contract artifact"
```

## Release Gate

- [ ] Existing web/mobile login, refresh, onboarding, profile, context, prompt-category, and push-token requests still parse successfully.
- [ ] Every completed auth path returns the same canonical `data.session` plus legacy fields.
- [ ] AuthSession stores hashes only; refresh rotation rejects replay.
- [ ] Legacy refresh migration removes only the used raw token.
- [ ] Deleted/purge-pending/version-mismatched/revoked sessions fail on the next authenticated request even when Redis is unavailable.
- [ ] PublicUser never exposes credentials, account keys, two-factor secrets, passkey key material/counters, refresh tokens, or private context; it retains safe 2FA/passkey status metadata used by supported clients.
- [ ] OpenAPI output and checksum are deterministic and CI-gated.
- [ ] No compatibility shim is removed; each new shim has non-sensitive telemetry and an explicit removal gate.
