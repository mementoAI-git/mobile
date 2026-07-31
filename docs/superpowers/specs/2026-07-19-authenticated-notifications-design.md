# Authenticated Notifications Design

## Goal

Remove notification registration and token synchronization from unauthenticated startup, and avoid sending an unchanged push token to the backend on every authenticated launch.

## Scope

This change covers notification-manager mounting, push-token synchronization, and clearing the synchronization marker with authentication state. It preserves notification routing, permission behavior, Android channel configuration, and Expo Go safeguards.

## Architecture

The root layout will stop calling `useNotifications` unconditionally. After authentication hydration, it will render an `AuthenticatedNotificationManager` only when a valid auth token exists. Conditional mounting occurs at the component boundary, so the notification hook retains its stable one-mount listener lifecycle and does not add auth or router dependencies.

The manager calls `useNotifications`, then uses a dedicated push-token synchronization mutation. Before sending the profile update, the mutation compares the current Expo push token with the last successfully synchronized token stored in secure storage. Equal tokens are skipped. A successful PUT persists the new marker; failed PUTs do not.

`clearAuth()` will delete both the auth record and the synchronized-token marker. This ensures a subsequent account always synchronizes, even when the device's Expo token is unchanged. Logout, account deletion, refresh failure, and other existing paths that call `clearAuth()` inherit the cleanup.

## Notification Routing

Existing foreground and response listeners remain unchanged. If the application is opened from a notification while unauthenticated, the notification manager mounts after authentication and reads the last notification response. Existing pending-deep-link logic then completes navigation. No raw notification URL bypasses normalization.

## Error and Lifecycle Behavior

- Expo Go still avoids loading the native notifications module.
- Simulator/non-device behavior remains unchanged.
- The manager renders no UI.
- Listener cleanup remains tied to the manager's single mount/unmount lifecycle.
- A failed token synchronization is logged and retried on a later token/manager lifecycle because no success marker is stored.
- Authentication cleanup removes the marker even if backend logout fails.

## Testing

Pure tests will cover initialization eligibility and token synchronization decisions. Store cleanup and root integration will be protected by strict TypeScript, lint, existing auth tests, and production checks.

After implementation, run focused tests, the full verification suite, and a scoped diff review. Because this changes native notification startup and response timing, automated checks are necessary but not sufficient. The final checkpoint will include a development-build physical-device checklist covering login permission flow, foreground receipt, notification tap navigation, relaunch deduplication, logout/login resynchronization, and Expo Go startup.

## Success Criteria

- Notification native setup does not run while unauthenticated.
- The notification hook retains its stable listener effect.
- An unchanged successfully synchronized token causes no profile PUT.
- Token changes still synchronize.
- Clearing auth removes the synchronization marker.
- Existing notification navigation remains intact.
- All automated verification passes.
