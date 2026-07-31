# Memento Mobile — Technical TODO

## 🔐 Native WebAuthn Passkeys (v2 Upgrade)

**Current state:** Biometric login uses `expo-secure-store` with `requireAuthentication: true`
to store and retrieve a `refresh_token` behind Face ID / Touch ID. This is secure (no password
stored) but is not a true hardware passkey — it's a convenience wrapper.

**Goal:** Replace with native FIDO2/WebAuthn passkeys that use the device's Secure Enclave
(iOS) or StrongBox/Strongbox Keymaster (Android) to sign cryptographic challenges.
The backend already implements this via `@simplewebauthn/server`.

---

### What's needed before implementing

#### 1. Domain setup (production infrastructure)

Both iOS and Android require the passkey RP domain to be publicly reachable with valid SSL.

**iOS — Apple App Site Association**

Serve this file at `https://mymemento.io/.well-known/apple-app-site-association`:

```json
{
  "webcredentials": {
    "apps": ["<APPLE_TEAM_ID>.io.mymemento.app"]
  }
}
```

The file must be served with `Content-Type: application/json` and **no redirect**.

**Android — Digital Asset Links**

Serve this file at `https://mymemento.io/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
    "target": {
      "namespace": "android_app",
      "package_name": "io.mymemento.app",
      "sha256_cert_fingerprints": ["<SHA256_OF_RELEASE_SIGNING_CERT>"]
    }
  }
]
```

Get the SHA256 fingerprint from the Play Console signing key or via:
```bash
keytool -list -v -keystore release.keystore
```

#### 2. Backend config update

Update `WEBAUTHN_ORIGIN` in the API to support multiple origins (web + native):

```ts
// api/src/utils/config.ts
export const WEBAUTHN_ORIGIN = [
  process.env.WEBAUTHN_ORIGIN_WEB || 'https://app.mymemento.io',
  // iOS native origin (format: https://domain)
  `https://${process.env.WEBAUTHN_RP_ID}`,
  // Android native origin (format: android:apk-key-hash:<base64-hash>)
  process.env.WEBAUTHN_ORIGIN_ANDROID || '',
].filter(Boolean);
```

`@simplewebauthn/server` v10+ accepts `expectedOrigin` as an array.

Android origin format:
```
android:apk-key-hash:<base64url-encoded SHA256 of signing cert>
```

Compute it:
```bash
openssl x509 -in cert.pem -outform DER | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '='
```

#### 3. Mobile library

```bash
bun add react-native-passkey
npx expo prebuild
```

Minimum OS versions:
- iOS 16+
- Android API 28+ (Android 9 Pie)

#### 4. Mobile implementation

**Enrollment (`app/settings/account.tsx`):**
```ts
import { Passkey } from 'react-native-passkey';

// 1. Get challenge from server (user must be logged in)
const beginRes = await client.post(endpoint.passkeyRegisterBegin);
const options = beginRes.data.data;

// 2. Trigger device biometric + sign challenge
const credential = await Passkey.register(options);

// 3. Send signed response to server
await client.post(endpoint.passkeyRegisterComplete, {
  response: credential,
  device_name: `${Platform.OS} Device`,
});

// 4. Store credential_id in SecureStore (no password, no refresh_token)
await SecureStore.setItemAsync(storageKeys.biometricsCredentialId, credential.id);
await SecureStore.setItemAsync(storageKeys.biometricsEnabled, 'true');
```

**Login (`src/hooks/use-login-logic.ts`):**
```ts
// 1. Get authentication challenge (with user's email hint)
const beginRes = await client.post(endpoint.passkeyLoginBegin, { email });
const { challenge_id, ...options } = beginRes.data.data;

// 2. Trigger device biometric — private key never leaves Secure Enclave
const assertion = await Passkey.authenticate(options);

// 3. Send signed assertion to server → get full token pair back
const loginRes = await client.post(endpoint.passkeyLoginComplete, {
  challenge_id,
  response: assertion,
});
const tokens = loginRes.data.data;
await useAuthStore.getState().setAuth(tokens);
```

**Revocation:**
- On disable: DELETE `/users/passkeys/:credential_id` + remove from SecureStore

#### 5. New storage key needed

```ts
// src/constants/storage-keys.ts
biometricsCredentialId: 'memento.biometrics_credential_id',
```

---

### Migration strategy

1. When a user with the old refresh_token-based biometrics upgrades:
   - On next biometric toggle → silently migrate to passkey
   - Delete `biometricsRefreshToken` key after successful passkey enrollment

2. Keep the interim `refresh_token` path as a fallback for devices running iOS <16 or Android <9

---

### Backend endpoints (already implemented)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/passkey/register/begin` | Generate registration options (requires auth) |
| POST | `/auth/passkey/register/complete` | Verify and store public key |
| POST | `/auth/passkey/login/begin` | Generate authentication options (public) |
| POST | `/auth/passkey/login/complete` | Verify assertion and return token pair |
| GET | `/users/passkeys` | List enrolled passkeys |
| DELETE | `/users/passkeys/:credential_id` | Revoke a passkey |

---

## 🎵 Audio File Thumbnail (Album Art) — Backend Implementation

**Current state:** The `File` model has no `thumbnail` field and the upload service never extracts embedded album art. The frontend `MasonryMemoryCard` is already wired to use `audioMedia.thumbnail` — it just won't fire until the backend populates it.

**Goal:** When an uploaded audio file (MP3, WAV, AIFF, FLAC) has embedded ID3/iTunes album art, extract it at upload time, store it alongside the file, and return the URL as `thumbnail`.

### 1. Add `thumbnail` to File model (`api/src/module/database/model/file.ts`)

```ts
// Add to IFile interface:
thumbnail?: string; // album art URL for audio files; video frame URL (future)

// Add to Schema:
thumbnail: {type: String},
```

### 2. Extract album art at upload time (`api/src/services/storage/index.ts`)

Add after the image compression block in `uploadFile()`:

```ts
let thumbnail: string | undefined;

if (mimetype.startsWith('audio/') && !mimetype.includes('m4a')) {
  // Only for uploaded audio files (not voice recordings which are audio/m4a)
  try {
    const mm = await import('music-metadata');
    const metadata = await mm.parseBuffer(buffer, { mimeType: mimetype });
    const cover = mm.selectCover(metadata.common.picture);
    if (cover) {
      const thumbKey = reconstructFileName(`thumb_${originalName}.jpg`);
      await uploadToS3(thumbKey, Buffer.from(cover.data), 'image/jpeg');
      thumbnail = `${BACKEND_URL}/files/${thumbKey}`;
    }
  } catch (err) {
    // No album art or parse failure — skip silently
    console.warn('Album art extraction failed:', err);
  }
}
```

Then include `thumbnail` in the return object:
```ts
return {
  name: result.key,
  user,
  size: buffer.length,
  type: mimetype,
  duration,
  thumbnail,           // ← add this
  provider: DEFAULT_STORAGE_PROVIDER,
  backup_url: result.location,
};
```

### 3. Install dependency

```bash
yarn add music-metadata
# or
bun add music-metadata
```

`music-metadata` is a pure-JS library that parses ID3, Vorbis, FLAC, and iTunes metadata. No native deps.

### 4. Frontend behavior (already implemented)

`MasonryMemoryCard` already checks `audioMedia.thumbnail` — case 1 (album art card) will automatically activate once the backend ships this change. No frontend changes required.

### Notes
- Voice recordings (`audio/m4a`, named `voice_*.m4a`) are excluded from album art extraction — they never have embedded art
- The thumbnail image itself is served through the same file proxy endpoint, respecting the same auth/caching
- `thumbnail` in the `File` model should be indexed if you add a query that filters by it in future

---

## 🗑️ Cleanup items

- Remove old hardcoded `'memento.biometrics_password'` and `'memento.biometrics_email'`
  keys from any remaining files after full passkey rollout
- Remove `Alert.alert` from `use-login-logic.ts` (already done — uses `toast()` now)

---

*Updated: 2026-06-18 — interim biometric implementation uses refresh_token. See `src/hooks/use-login-logic.ts` and `app/settings/account.tsx`.*
