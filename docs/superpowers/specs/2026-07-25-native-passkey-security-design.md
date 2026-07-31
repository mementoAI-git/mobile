# Native Passkey Security Design

## Scope

Replace the current Security screen with the supplied reference flow and add native passkey registration/authentication while preserving the existing SecureStore biometric flow as an explicit fallback.

All specification and implementation work remains local and uncommitted unless the user later requests otherwise.

## Security Screen

`/settings/account` becomes the Security overview:

- Password summary with a Change action.
- Two-Factor Authentication card with setup/disable state.
- Passkeys list loaded from `GET /users/passkeys`.
- Add a Passkey action.
- Individual passkey deletion.
- Log out of all devices.

The screen uses existing semantic tokens, icons, profile/query state, and haptic patterns. It never displays fake passkeys or setup dates.

## Password Flow

Change opens a global `change-password` sheet. Email is disabled. Old password, new password, and confirmation use the existing `useChangePassword` mutation and validation. Failed saves remain open with inline feedback; successful saves clear the form and close the sheet.

## Two-Factor Flow

Setup Authenticator calls `POST /users/2fa/setup`, then opens `setup-two-factor`.

The sheet supports two representations of the same server response:

- QR view renders `qr_code`.
- Manual view renders `secret` with copy support.

Both collect a six-digit token and call `POST /users/2fa/verify`. Completion refreshes the profile and closes. Removing configured 2FA uses a destructive confirmation and `DELETE /users/2fa/disable`.

## Native Passkey Registration

Use `react-native-passkey`:

1. `POST /auth/passkey/register/begin`.
2. Pass returned WebAuthn creation options to the native credential API.
3. `POST /auth/passkey/register/complete` with the native credential response and device name.
4. Refresh `GET /users/passkeys`.
5. Remove legacy SecureStore biometric credentials only after successful native enrollment.

User cancellation exits quietly. Unsupported-platform and unconfigured-provider errors offer biometric fallback. Other failures show actionable feedback.

## Native Passkey Login and Fallback

The login action chooses state in this order:

1. Native passkey enrollment: `/login/begin` → native assertion → `/login/complete` → persist returned auth tokens/user.
2. Legacy biometric enrollment: retrieve the SecureStore-protected refresh token and exchange it.
3. Neither enrolled: explain how to enroll from Settings.

The UI label reflects the real mechanism: “Sign in with a passkey” for native enrollment and “Sign in with Face ID/Touch ID” for fallback enrollment.

Legacy biometric users migrate only after successful native enrollment. Cancellation never triggers automatic fallback.

## Passkey Management

`GET /users/passkeys` returns server-backed passkeys. Each row shows the backend device/name and creation timestamp. Deletion opens a global destructive confirmation, calls `DELETE /users/passkeys/:credential_id`, and refreshes the list.

Legacy biometric fallback is displayed separately and can be disabled by removing its SecureStore keys.

## Logout Confirmations

Current-device logout uses the existing logout mutation and a styled confirmation sheet.

All-other-devices logout requires an API endpoint that revokes other sessions while retaining the current session. If the backend endpoint is absent, the UI must not claim success; it displays a warm unavailable message. No speculative endpoint is called.

## Native Configuration

- iOS minimum: 16.
- Android minimum: API 28.
- Bundle/package identifier: `com.mementoai.app`.
- Associated domain must include the WebAuthn RP ID using `webcredentials:`.
- The RP domain must serve a valid AASA file with the current Apple Team ID and bundle identifier.
- Android must serve `assetlinks.json` with `delegate_permission/common.get_login_creds` and the release signing certificate fingerprint.
- Backend WebAuthn verification must accept the web, Apple, and Android native origins.
- Expo Go is unsupported; testing requires development/production native builds and real devices.

## Testing

Pure tests cover capability/error classification, credential-state routing, API payloads, migration cleanup, and screen/sheet registration. Full verification covers lint, TypeScript, Bun tests, production readiness, and diff whitespace. Native acceptance requires real iOS and Android devices against a configured staging RP.
