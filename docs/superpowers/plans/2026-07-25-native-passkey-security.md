# Native Passkey Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the referenced Security experience with native passkey registration/login and a truthful SecureStore biometric fallback.

**Architecture:** Pure security state helpers decide native/fallback behavior. Focused query/mutation hooks own WebAuthn, passkey-management, 2FA, password, and logout writes. The Security route composes global bottom sheets registered through `SheetManager`.

**Tech Stack:** Expo 56, React Native, Expo Router, TanStack Query, Zustand, Gorhom Bottom Sheet, `react-native-passkey`, SecureStore, Bun tests.

## Global Constraints

- Native passkeys require iOS 16+, Android API 28+, verified RP associations, and a native development build.
- Use `com.mementoai.app` consistently.
- User cancellation never triggers biometric fallback.
- Never represent SecureStore biometric login as a passkey.
- Never claim all-device logout succeeded without a supported backend endpoint.
- Specs and implementation remain local and uncommitted.

---

### Task 1: Security state and native dependency

**Files:**
- Create: `src/features/security/security-flow.ts`
- Create: `src/features/security/security-flow.test.ts`
- Modify: `package.json`
- Modify: `app.json`

**Produces:** passkey error classification, login-method selection, display-name helpers, native associated-domain configuration.

- [ ] Write failing pure tests for native/fallback/unenrolled selection and cancellation/unsupported error classification.
- [ ] Run `bun test src/features/security/security-flow.test.ts` and confirm missing-module failure.
- [ ] Install `react-native-passkey` and implement the pure helpers.
- [ ] Add `webcredentials:app.mymemento.io` while preserving the existing applink.
- [ ] Run the focused test and typecheck.

### Task 2: Passkey API hooks and migration

**Files:**
- Create: `src/hooks/queries/use-passkeys.ts`
- Create: `src/hooks/mutations/use-passkey-mutations.ts`
- Create: `src/features/security/passkey-contract.test.ts`
- Modify: `src/constants/query-keys.ts`
- Modify: `src/constants/storage-keys.ts`

**Produces:** list, register, delete, and enrollment-state interfaces backed by existing endpoints.

- [ ] Write failing structural tests for every endpoint and successful-only migration cleanup.
- [ ] Run the tests and confirm expected failures.
- [ ] Implement the hooks using `Passkey.register`, server begin/complete, and query invalidation.
- [ ] Run focused tests and typecheck.

### Task 3: Native login with fallback

**Files:**
- Modify: `src/hooks/use-login-logic.ts`
- Modify: `app/(auth)/login.tsx`
- Create: `src/features/security/passkey-login.test.ts`

**Produces:** native assertion flow and legacy SecureStore fallback selected by real enrollment state.

- [ ] Write a failing structural test for `/login/begin`, `Passkey.authenticate`, `/login/complete`, and the fallback.
- [ ] Run the test and confirm failure against the legacy-only implementation.
- [ ] Implement native login and dynamic labels without changing password/OAuth paths.
- [ ] Run focused tests and typecheck.

### Task 4: Security route

**Files:**
- Replace: `app/settings/account.tsx`
- Create: `src/components/security/SecurityCredentialRow.tsx`
- Create: `src/features/security/security-navigation.test.ts`

**Produces:** reference Security overview connected to password, 2FA, passkey, deletion, fallback, and logout actions.

- [ ] Write failing screen-structure and navigation tests.
- [ ] Run them and confirm failure.
- [ ] Implement the screen using existing tokens/icons and the new hooks.
- [ ] Run focused tests and typecheck.

### Task 5: Password and 2FA sheets

**Files:**
- Create: `src/components/sheets/ChangePasswordSheet.tsx`
- Create: `src/components/sheets/SetupTwoFactorSheet.tsx`
- Modify: `src/hooks/use-two-factor-settings-logic.ts`
- Modify: `src/store/ui.store.ts`
- Modify: `src/components/sheets/SheetManager.tsx`
- Create: `src/features/security/security-sheets.test.ts`

**Produces:** `change-password` and `setup-two-factor` global sheets with existing API mutations.

- [ ] Write failing registration/contract tests.
- [ ] Run them and confirm expected failures.
- [ ] Implement the sheets, QR/manual toggle, validation, and completion refresh.
- [ ] Run focused tests, lint, and typecheck.

### Task 6: Destructive confirmations

**Files:**
- Create: `src/components/sheets/SecurityConfirmationSheet.tsx`
- Modify: `src/store/ui.store.ts`
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `app/settings/index.tsx`
- Create: `src/features/security/security-confirmations.test.ts`

**Produces:** shared styled confirmation for passkey deletion, current-device logout, all-other-devices logout, and 2FA disable.

- [ ] Write failing action/registration tests.
- [ ] Run and confirm failures.
- [ ] Implement callback-driven confirmations with semantic destructive variants.
- [ ] Keep all-other-devices unavailable unless a real endpoint exists.
- [ ] Run focused tests and typecheck.

### Task 7: Verification and deployment handoff

**Files:**
- Review all Task 1–6 changes.

- [ ] Run `bun run verify`.
- [ ] Run `git diff --check`.
- [ ] Confirm nothing was staged or committed and specs remain untracked.
- [ ] Report AASA, Digital Asset Links, backend-origin, native-build, and real-device prerequisites explicitly.
