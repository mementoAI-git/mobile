# Auth Session Coordinator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace split-brain authentication and competing redirects with atomic session transitions and one deterministic root route coordinator.

**Architecture:** `useAuthStore` becomes the runtime authority for session phase, credentials, and user. A session coordinator commits or terminates sessions, Axios refreshes without navigating, and a pure route policy gives `app/_layout.tsx` the only auth-driven redirect decision. Cold restoration holds the splash until the authoritative user is recovered.

**Tech Stack:** Expo Router, React Native, Zustand, TanStack Query, Axios, SecureStore adapter, Bun tests, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-20-auth-session-coordinator-design.md`

## Global Constraints

- Only the root route coordinator redirects because authentication state changed.
- Token refresh performs no navigation.
- SecureStore is persistence; `useAuthStore` is runtime authority.
- Concurrent refresh failures collapse into one termination.
- Forced expiry preserves one normalized internal destination; explicit logout clears it.
- Do not change backend contracts or redesign authentication screens.
- Follow red-green-refactor and preserve unrelated dirty-worktree changes.

## File Map

- Create `src/features/auth/session-types.ts`: phases and session snapshots.
- Create `src/features/auth/session-route-policy.ts`: pure route decision.
- Create `src/features/auth/session-coordinator.ts`: establish, refresh-update, terminate.
- Create `src/components/system/SessionBootstrap.tsx`: restore user after credential hydration.
- Create `src/lib/query-client.ts`: shared QueryClient singleton.
- Modify auth/user/UI stores, API refresh files, root layout, and all authentication completion/lifecycle call sites.

---

### Task 1: Pure Session Route Policy

**Files:**
- Create: `src/features/auth/session-types.ts`
- Create: `src/features/auth/session-route-policy.ts`
- Test: `src/features/auth/session-route-policy.test.ts`

**Interfaces:**
- Produces `SessionPhase`, `SessionRouteSnapshot`, `SessionRouteAction`, `getSessionRouteAction(snapshot)`.

- [ ] **Step 1: Write the failing transition-table test**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { getSessionRouteAction } from './session-route-policy';

test('holds unstable phases and chooses one stable destination', () => {
  expect(getSessionRouteAction({ phase: 'hydrating', group: '(auth)', onboardingStatus: null, pendingHref: null })).toEqual({ type: 'none' });
  expect(getSessionRouteAction({ phase: 'terminating', group: '(tabs)', onboardingStatus: 'completed', pendingHref: null })).toEqual({ type: 'none' });
  expect(getSessionRouteAction({ phase: 'anonymous', group: '(tabs)', onboardingStatus: null, pendingHref: null })).toEqual({ type: 'replace', href: '/(auth)/login', preserveCurrentHref: true });
  expect(getSessionRouteAction({ phase: 'anonymous', group: '(auth)', onboardingStatus: null, pendingHref: null })).toEqual({ type: 'none' });
  expect(getSessionRouteAction({ phase: 'authenticated', group: '(auth)', onboardingStatus: 'never', pendingHref: null })).toEqual({ type: 'replace', href: '/(onboard)', consumePendingHref: false });
  expect(getSessionRouteAction({ phase: 'authenticated', group: '(auth)', onboardingStatus: 'completed', pendingHref: '/chat/thread-1' })).toEqual({ type: 'replace', href: '/chat/thread-1', consumePendingHref: true });
  expect(getSessionRouteAction({ phase: 'authenticated', group: '(tabs)', onboardingStatus: 'completed', pendingHref: null })).toEqual({ type: 'none' });
});
```

- [ ] **Step 2: Verify RED**

Run: `bun test src/features/auth/session-route-policy.test.ts`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement literal types and policy**

```ts
export type SessionPhase = 'hydrating' | 'anonymous' | 'authenticating' | 'authenticated' | 'terminating';
export type SessionRouteAction =
  | { type: 'none' }
  | { type: 'replace'; href: Href; preserveCurrentHref?: boolean; consumePendingHref?: boolean };
```

Implement the spec rules directly. Treat `authenticating` like other unstable phases. Missing user/onboarding status never means onboarding is complete.

- [ ] **Step 4: Verify GREEN**

Run: `bun test src/features/auth/session-route-policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/session-types.ts src/features/auth/session-route-policy.ts src/features/auth/session-route-policy.test.ts
git commit -m "feat(auth): add deterministic session route policy"
```

---

### Task 2: Authoritative Session Store

**Files:**
- Modify: `src/store/auth.store.ts`
- Modify: `src/store/user.store.ts`
- Test: `src/features/auth/session-store.test.ts`

**Interfaces:**
- Produces `beginAuthentication()`, `commitSession(credentials,user)`, `updateCredentials(credentials)`, `beginTermination()`, `finishAnonymous()`, `hydrateCredentials()`.

- [ ] **Step 1: Write failing real-store tests**

Export `createAuthState(storage)` so tests use a vanilla Zustand store:

```ts
test('publishes credentials and user in one transition', () => {
  const store = createStore(createAuthState(fakeStorage));
  store.getState().commitSession(auth, user);
  expect(store.getState()).toMatchObject({ phase: 'authenticated', token: auth, user });
});

test('removes runtime identity as termination begins', () => {
  const store = createStore(createAuthState(fakeStorage));
  store.getState().commitSession(auth, user);
  store.getState().beginTermination();
  expect(store.getState()).toMatchObject({ phase: 'terminating', token: null, user: null });
});
```

- [ ] **Step 2: Verify RED**

Run: `bun test src/features/auth/session-store.test.ts`

Expected: FAIL because the state creator and transitions are absent.

- [ ] **Step 3: Implement store transitions**

Valid persisted credentials hydrate to `authenticating` with user null; missing/malformed credentials hydrate to `anonymous`. `beginTermination` clears token and user synchronously. Keep `hydrated` temporarily as `phase !== 'hydrating'`. Document `useUserStore` as compatibility-only; routing must not read it.

- [ ] **Step 4: Verify**

Run: `bun test src/features/auth/session-store.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/auth.store.ts src/store/user.store.ts src/features/auth/session-store.test.ts
git commit -m "refactor(auth): make session state authoritative"
```

---

### Task 3: Atomic Coordinator and Shared Query Client

**Files:**
- Create: `src/lib/query-client.ts`
- Create: `src/features/auth/session-coordinator.ts`
- Test: `src/features/auth/session-coordinator.test.ts`
- Modify: `src/store/ui.store.ts`
- Modify: `app/_layout.tsx` only to import the shared QueryClient.

**Interfaces:**
- Produces `establishSession({credentials,user,queryClient?})`, `commitRefreshedCredentials(credentials)`, `terminateSession({reason,queryClient?})`, and `takePendingDeepLink()`.

- [ ] **Step 1: Write failing coordinator tests**

```ts
test('establishes a complete session and seeds profile', async () => {
  await coordinator.establishSession({ credentials: auth, user, queryClient });
  expect(authStore.getState()).toMatchObject({ phase: 'authenticated', token: auth, user });
  expect(queryClient.getQueryData(queryKeys.profile)).toEqual(user);
});

test('joins concurrent termination', async () => {
  const first = coordinator.terminateSession({ reason: 'expired', queryClient });
  const second = coordinator.terminateSession({ reason: 'expired', queryClient });
  expect(first).toBe(second);
  expect(authStore.getState()).toMatchObject({ phase: 'terminating', token: null, user: null });
  await first;
  expect(storageDeleteCount).toBe(1);
  expect(authStore.getState().phase).toBe('anonymous');
});
```

- [ ] **Step 2: Verify RED**

Run: `bun test src/features/auth/session-coordinator.test.ts`

Expected: FAIL because coordinator is absent.

- [ ] **Step 3: Extract QueryClient singleton**

Move the existing `new QueryClient({...})` unchanged from `app/_layout.tsx` to `src/lib/query-client.ts`. Import the same instance in provider and coordinator.

- [ ] **Step 4: Implement coordinator**

Use module-level `terminationPromise`. Begin termination before awaiting SecureStore; clear runtime identity even when deletion fails; remove private queries; finish anonymous in `finally`. Explicit logout/account deletion clears pending destination, while expiry preserves it. Implement `takePendingDeepLink` as one Zustand get/set operation.

- [ ] **Step 5: Verify**

Run: `bun test src/features/auth/session-coordinator.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/query-client.ts src/features/auth/session-coordinator.ts src/features/auth/session-coordinator.test.ts src/store/ui.store.ts app/_layout.tsx
git commit -m "feat(auth): coordinate atomic session transitions"
```

---

### Task 4: Navigation-Free Refresh Boundary

**Files:**
- Modify: `src/api/auth-service.ts`
- Modify: `src/api/client.ts`
- Test: `src/features/auth/session-refresh.test.ts`
- Modify: `src/features/notifications/work-policy.test.ts`

**Interfaces:**
- Consumes coordinator refresh-update and termination operations.
- Produces shared refresh with no navigation and one termination on failure.

- [ ] **Step 1: Write failing refresh tests**

```ts
test('refresh success updates runtime credentials without navigation', async () => {
  const result = await handleUnauthorizedRequest(request, deps);
  expect(result.kind).toBe('retry');
  expect(authStore.getState().token).toEqual(refreshedAuth);
  expect(navigationCalls).toBe(0);
});

test('concurrent refresh failures terminate once', async () => {
  await Promise.allSettled([handleUnauthorizedRequest(a, deps), handleUnauthorizedRequest(b, deps)]);
  expect(terminationCalls).toBe(1);
  expect(navigationCalls).toBe(0);
});
```

- [ ] **Step 2: Verify RED**

Run: `bun test src/features/auth/session-refresh.test.ts`

Expected: FAIL because boundary is not isolated and runtime credentials remain stale.

- [ ] **Step 3: Remove auth-service navigation**

Delete `setRedirectFn`, `redirectToLogin`, and all internal redirects. Refresh only returns or throws. After persistence, call `commitRefreshedCredentials(newAuth)`.

- [ ] **Step 4: Update interceptor**

On refresh failure use only:

```ts
await terminateSession({ reason: 'expired' });
return Promise.reject(normalizeApiError(error));
```

Keep `_retry`; do not directly clear storage or navigate.

- [ ] **Step 5: Verify**

Run: `bun test src/features/auth/session-refresh.test.ts src/features/notifications/work-policy.test.ts && bun run typecheck`

Expected: PASS. Update the stale notification contract test to recognize coordinator-owned marker deletion.

- [ ] **Step 6: Commit**

```bash
git add src/api/auth-service.ts src/api/client.ts src/features/auth/session-refresh.test.ts src/features/notifications/work-policy.test.ts
git commit -m "fix(auth): collapse refresh failure into one termination"
```

---

### Task 5: Bootstrap and Single Root Reconciliation

**Files:**
- Create: `src/components/system/SessionBootstrap.tsx`
- Create: `src/features/auth/session-bootstrap.ts`
- Test: `src/features/auth/session-bootstrap.test.ts`
- Modify: `app/_layout.tsx`
- Modify: `src/features/notifications/work-policy.ts`

**Interfaces:**
- Consumes session store, coordinator, route policy, and pending-link actions.
- Produces restored user and exactly one auth-driven route effect.

- [ ] **Step 1: Write failing bootstrap tests**

```ts
expect(getSessionBootstrapAction({ phase: 'authenticating', hasToken: true, hasUser: false })).toBe('load-profile');
expect(getSessionBootstrapAction({ phase: 'authenticated', hasToken: true, hasUser: true })).toBe('none');
expect(getSessionBootstrapAction({ phase: 'anonymous', hasToken: false, hasUser: false })).toBe('none');
```

Also test that equal route snapshots yield the same reconciliation key.

- [ ] **Step 2: Verify RED**

Run: `bun test src/features/auth/session-bootstrap.test.ts src/features/auth/session-route-policy.test.ts`

Expected: FAIL because bootstrap policy/key is absent.

- [ ] **Step 3: Implement bootstrap**

For `authenticating` + token + no user, fetch `endpoint.profile` once. Success calls `establishSession` with current credentials/user; failure calls `terminateSession({reason:'restore-failed'})`. Guard async state with `isMountedRef`. Mount inside QueryClientProvider before authenticated managers.

- [ ] **Step 4: Replace root auth effects**

Remove auth-service redirect wiring and delayed deep-link push. Subscribe to phase and authoritative user. Apply one policy action, guarded by a `lastReconciliationKeyRef`. Save normalized current route before forced Login; atomically consume pending destination before authenticated replacement. Hide splash/set `appReady` only when fonts/navigation are ready and phase is `anonymous` or `authenticated`. Gate notification work on `phase === 'authenticated'`.

- [ ] **Step 5: Verify**

Run: `bun test src/features/auth/session-bootstrap.test.ts src/features/auth/session-route-policy.test.ts src/features/notifications/work-policy.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/system/SessionBootstrap.tsx src/features/auth/session-bootstrap.ts src/features/auth/session-bootstrap.test.ts app/_layout.tsx src/features/notifications/work-policy.ts src/features/notifications/work-policy.test.ts
git commit -m "refactor(auth): centralize root session routing"
```

---

### Task 6: Unify Authentication Completion

**Files:**
- Create: `src/features/auth/auth-completion.ts`
- Test: `src/features/auth/auth-completion.test.ts`
- Modify: `src/hooks/mutations/use-auth-mutations.ts`
- Modify: `src/hooks/use-login-logic.ts`
- Modify: `src/hooks/use-two-factor-logic.ts`
- Modify: `src/hooks/use-register-logic.ts`
- Modify: `app/(auth)/oauth-callback.tsx`
- Modify: `src/features/security/passkey-login.test.ts`

**Interfaces:**
- Consumes `establishSession`.
- Produces identical session commits for password, OAuth, passkey, biometric, register, and 2FA.

- [ ] **Step 1: Write failing completion tests**

Table-drive complete literal payloads through `normalizeAuthResponse(data)`. Each returns `{kind:'session',credentials,user}` or `{kind:'two-factor-required',token}`. Add an app-owned contract test that successful handlers use `establishSession` and no longer perform post-auth `router.replace`; 2FA challenge navigation remains permitted.

- [ ] **Step 2: Verify RED**

Run: `bun test src/features/auth/auth-completion.test.ts src/features/security/passkey-login.test.ts`

Expected: FAIL because completion is duplicated.

- [ ] **Step 3: Implement normalized completion**

Move successful persistence/cache seeding to `establishSession`. Remove successful post-auth replacements from password, OAuth, passkey, biometric, register, and 2FA. Keep navigation to the 2FA challenge before session establishment.

- [ ] **Step 4: Verify**

Run: `bun test src/features/auth/auth-completion.test.ts src/features/security && bun run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/auth-completion.ts src/features/auth/auth-completion.test.ts src/hooks/mutations/use-auth-mutations.ts src/hooks/use-login-logic.ts src/hooks/use-two-factor-logic.ts src/hooks/use-register-logic.ts 'app/(auth)/oauth-callback.tsx' src/features/security/passkey-login.test.ts
git commit -m "refactor(auth): unify authentication completion"
```

---

### Task 7: Align Session Lifecycle Updates

**Files:**
- Modify: `src/hooks/mutations/use-auth-mutations.ts`
- Modify: `src/hooks/use-preferences-logic.ts`
- Modify: `src/hooks/queries/use-profile.ts`
- Test: `src/features/auth/session-lifecycle.test.ts`

**Interfaces:**
- Consumes `terminateSession` and authoritative user update action.
- Produces correct logout/account deletion, onboarding, and profile behavior.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
test('logout clears pending destination while expiry preserves it', async () => {
  uiStore.getState().setPendingDeepLink('/chat/thread-1');
  await terminateSession({ reason: 'logout', queryClient });
  expect(uiStore.getState().pendingDeepLink).toBeNull();
  uiStore.getState().setPendingDeepLink('/chat/thread-1');
  await terminateSession({ reason: 'expired', queryClient });
  expect(uiStore.getState().pendingDeepLink).toBe('/chat/thread-1');
});

test('onboarding completion updates authoritative user', () => {
  updateSessionUser({ ...user, onboarding_status: 'completed' });
  expect(authStore.getState().user?.onboarding_status).toBe('completed');
});
```

- [ ] **Step 2: Verify RED**

Run: `bun test src/features/auth/session-lifecycle.test.ts`

Expected: FAIL because lifecycle paths still mutate separate stores.

- [ ] **Step 3: Implement lifecycle alignment**

Logout/account deletion call coordinator reasons and do not navigate. Preferences completion and profile success update authoritative user first, then compatibility mirror/cache. Prevent an older profile response from downgrading locally completed onboarding without an explicit server transition.

- [ ] **Step 4: Verify**

Run: `bun test src/features/auth/session-lifecycle.test.ts src/features/notifications/work-policy.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/mutations/use-auth-mutations.ts src/hooks/use-preferences-logic.ts src/hooks/queries/use-profile.ts src/features/auth/session-lifecycle.test.ts
git commit -m "fix(auth): align session lifecycle state"
```

---

### Task 8: Full Regression and Transition Audit

**Files:** Modify only files required by failures uncovered here.

- [ ] **Step 1: Audit navigation ownership**

Run:

```bash
rg -n "redirectToLogin|setRedirectFn|router\.replace\(getPostAuthRedirectHref|pendingDeepLink.*setTimeout" app src
```

Expected: no service redirects, successful auth callback replacements, or delayed pending-link navigation.

- [ ] **Step 2: Run focused suites**

Run: `bun test src/features/auth src/features/security src/features/notifications src/features/navigation`

Expected: 0 failures.

- [ ] **Step 3: Run complete suite**

Run: `bun test`

Expected: 0 failures.

- [ ] **Step 4: Run static verification**

```bash
bun run typecheck
bun x eslint app/_layout.tsx 'app/(auth)/oauth-callback.tsx' src/api/client.ts src/api/auth-service.ts src/store/auth.store.ts src/store/ui.store.ts src/features/auth src/components/system/SessionBootstrap.tsx src/hooks/use-login-logic.ts src/hooks/use-two-factor-logic.ts src/hooks/use-register-logic.ts src/hooks/use-preferences-logic.ts src/hooks/queries/use-profile.ts src/hooks/mutations/use-auth-mutations.ts --quiet
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Exercise transition matrix in a development build**

Verify without intermediate screen changes: completed login → Overview; new login → Onboarding; protected deep link → intended route; expired protected session → Login once then preserved route; ten concurrent `401`s → one termination; explicit logout → Login with no preserved destination; OAuth/passkey/biometric/2FA use identical rules.

- [ ] **Step 6: Commit regression fixes if any**

```bash
git add app/_layout.tsx 'app/(auth)/oauth-callback.tsx' src/api/client.ts src/api/auth-service.ts src/store/auth.store.ts src/store/user.store.ts src/store/ui.store.ts src/features/auth src/components/system/SessionBootstrap.tsx src/hooks/use-login-logic.ts src/hooks/use-two-factor-logic.ts src/hooks/use-register-logic.ts src/hooks/use-preferences-logic.ts src/hooks/queries/use-profile.ts src/hooks/mutations/use-auth-mutations.ts
git commit -m "test(auth): verify stable session transitions"
```
