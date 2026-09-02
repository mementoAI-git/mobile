# Auth Session Coordinator Design

## Objective

Eliminate navigation oscillation during login, onboarding, token refresh, logout, and deep-link recovery by making authentication transitions atomic and giving route selection one authoritative owner.

## Problem

Authentication currently exists in multiple unsynchronized forms:

- credentials persisted in SecureStore;
- credentials held in `useAuthStore`;
- the current user held separately in `useUserStore`;
- profile data cached by TanStack Query.

Navigation is also performed independently by the root route guard, the API refresh layer, password/OAuth/passkey/biometric/2FA callbacks, and delayed deep-link processing. A failed refresh clears persisted credentials but can leave the in-memory token populated. The API layer then opens Login while the root guard immediately sends the user back to authenticated screens. Concurrent `401` responses amplify the cycle by issuing the same redirect repeatedly.

## Design Principles

1. Session state changes are atomic from the application's perspective.
2. Persisted credentials and in-memory credentials never intentionally diverge.
3. Token refresh performs no navigation.
4. The root route coordinator is the only code that redirects because authentication state changed.
5. Feature navigation remains owned by features after the session reaches a stable authenticated state.
6. Pending destinations survive forced reauthentication and are consumed once.
7. Concurrent authentication failures collapse into one transition.

## Session Model

The auth store will expose an explicit session phase:

- `hydrating`: persisted credentials have not been read.
- `anonymous`: no usable authenticated session exists.
- `authenticating`: an interactive sign-in flow is establishing a session.
- `authenticated`: credentials and a user snapshot have been committed.
- `terminating`: credentials and private state are being cleared.

The auth store will contain the phase, credentials, and authoritative authenticated user snapshot so one Zustand update can publish a complete session. SecureStore is persistence, not a second runtime authority. The existing user store may remain temporarily as a compatibility mirror for feature code, but routing and session decisions will never read from that mirror.

## Session Coordinator

A framework-independent coordinator will own these operations:

### Establish session

1. Accept credentials and the authenticated user from password, OAuth, passkey, biometric, or 2FA completion.
2. Persist credentials.
3. Publish credentials and user in one authoritative auth-store transition, then update the compatibility user-store mirror.
4. Seed the profile query cache.
5. Mark the session authenticated.

The operation returns a normalized post-auth destination. It does not call the router.

### Refresh session

1. Deduplicate refresh requests with the existing shared promise.
2. Read the latest persisted refresh token.
3. Persist refreshed credentials.
4. update the runtime auth store with the refreshed credentials.
5. Retry the original request.

Refresh success does not change the current route.

### Terminate session

1. Use a shared in-flight termination promise so all concurrent failures join one operation.
2. Capture the current eligible internal route as a pending destination when termination was forced by expiry.
3. Move the store to `terminating` immediately so authenticated work stops.
4. Clear SecureStore credentials and push synchronization markers.
5. Clear the runtime token and user.
6. Remove private TanStack Query data.
7. Publish the anonymous phase.

Termination performs no direct navigation. The root route coordinator observes the anonymous phase and replaces the current route with Login once.

## API Interceptor

The Axios interceptor will keep one retry per request and the shared refresh promise. On refresh failure it will call the session coordinator's deduplicated termination operation and reject with a normalized authentication error.

It will not call `redirectToLogin`. `authService` will no longer redirect internally when refresh tokens expire or refresh calls fail. This removes duplicate redirects from the service, interceptor, and each concurrently rejected request.

## Root Route Coordinator

The current navigation effects in `app/_layout.tsx` will become one deterministic route reconciliation effect.

Inputs:

- navigation readiness;
- session phase;
- authenticated user onboarding status;
- current route group;
- pending internal destination.

Rules:

- `hydrating`, `authenticating`, and `terminating`: do not navigate.
- `anonymous`: remain within auth routes; otherwise replace with Login.
- `authenticated` with onboarding status `never`: remain within onboarding; otherwise replace with onboarding entry.
- `authenticated` with completed/skipped onboarding: leave auth/onboarding for the pending destination or Overview.
- stable authenticated application routes: do nothing.

The coordinator records its last reconciliation key so equivalent rerenders cannot issue duplicate replacements.

## Login and Onboarding Flows

Password, OAuth, passkey, biometric, and 2FA flows will call the same session establishment operation. They will stop issuing competing post-auth replacements. The root coordinator will route from the committed session snapshot.

Onboarding completion will update the authoritative user snapshot before leaving onboarding. The root coordinator then reconciles to the pending destination or Overview. A stale or absent user snapshot will not be interpreted as completed onboarding.

## Pending Destinations

Only normalized internal application routes can be stored. A forced expiry captures the current eligible route before clearing the session. Explicit logout clears the pending destination because it represents user intent to leave the session.

After successful authentication and completed onboarding, the root coordinator atomically takes and clears the pending destination before navigating. There is no delayed secondary push.

## Query and Background Work

Private queries are removed during termination. Authenticated notification work remains gated by the stable authenticated phase. Screens cannot remount authenticated queries while the session is `terminating`, preventing another wave of `401` calls during cleanup.

## Error Handling

- A refresh network or authorization failure terminates the session once.
- Failure to delete persisted credentials still clears runtime authentication in a `finally` path.
- Failure to seed or clear query caches does not leave the session authenticated.
- Malformed stored credentials hydrate as anonymous.
- Missing authenticated user data does not send the user into the main application; it triggers profile recovery or a controlled sign-out rather than assuming onboarding completion.

## Testing

Tests will cover observable transitions:

1. Cold hydration with no credentials reaches anonymous once.
2. Cold hydration with a valid session waits for a user snapshot before routing.
3. Password, OAuth, passkey, biometric, and 2FA establish the same session shape.
4. Refresh success updates persisted and runtime credentials without navigating.
5. Many concurrent refresh failures invoke one termination operation.
6. Forced expiry clears credentials, user state, and private queries before Login reconciliation.
7. The root coordinator emits no navigation for equivalent stable snapshots.
8. A never-onboarded user reaches onboarding without visiting Overview.
9. A completed user reaches the intended deep link without an intermediate delayed push.
10. Explicit logout clears pending destinations; forced expiry preserves them.

## Migration Scope

The change is limited to authentication/session state, the API refresh boundary, root route reconciliation, and the existing authentication completion flows. It does not redesign auth screens, change backend contracts, or alter feature-level navigation after the application session is stable.
