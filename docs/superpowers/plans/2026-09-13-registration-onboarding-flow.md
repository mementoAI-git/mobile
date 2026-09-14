# Registration and First-Run Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing mobile registration, email verification, and first-run onboarding screens with the supplied high-fidelity ten-state flow while preserving secure session routing and deployed-API compatibility.

**Architecture:** Pure feature modules define validation, draft restoration, selection rules, summary presentation, and API payload contracts. Focused route screens consume a shared onboarding shell and shared choice components; mutation hooks own network writes, while the root session coordinator remains the only authority that transitions between anonymous, onboarding, and authenticated route groups.

**Tech Stack:** Expo Router, React Native 0.86, TypeScript, NativeWind, React Hook Form, Zod, TanStack Query, Zustand, Expo SecureStore, Reanimated, Expo Haptics, Bun test.

**Spec:** `docs/superpowers/specs/2026-09-13-registration-onboarding-flow-design.md`

## Global Constraints

- Work only in `/Users/dev/Workspace/memento/mobile` on branch `dev`.
- Preserve the existing `completeAuthResponse` → `establishSession` → root session-route-policy ownership chain.
- Use `COLORS`, `FONTS`, and `TYPE`; do not add screen-local visible typography values or arbitrary colors.
- Keep every touch target at least 44 points and provide haptics, accessibility labels, and selected/disabled state.
- Use `SafeAreaView` from `react-native-safe-area-context`; fixed footers must include the bottom safe-area inset without double padding.
- Use shared `Button` and `TextInput` primitives or focused reusable components; do not add React Native `Modal`.
- Do not add final artwork. Temporary emoji and existing brand assets must be isolated behind one asset/config map.
- Never mark onboarding complete locally before server acknowledgement.
- Every production behavior begins with a failing test and a witnessed RED state.
- End each task with its targeted tests and `bun run typecheck` green.

---

## File Structure

### Create

- `src/features/auth/registration-policy.ts` — password rules and display-ready validation messages.
- `src/features/auth/email-verification.ts` — OTP normalization and resend cooldown policy.
- `src/features/onboarding/first-run-onboarding.ts` — canonical draft types, validation, selections, labels, summary, and payload mapping.
- `src/features/onboarding/onboarding-draft-storage.ts` — versioned SecureStore serialization and restoration.
- `src/features/onboarding/onboarding-completion.ts` — ordered server transaction and store-safe result contract.
- `src/hooks/mutations/use-email-verification-mutations.ts` — verify and resend mutations.
- `src/hooks/mutations/use-first-run-onboarding-mutation.ts` — skip and completion mutations.
- `src/hooks/use-first-run-onboarding.ts` — screen state, draft persistence, step navigation, and mutation orchestration.
- `src/components/onboarding/OnboardingShell.tsx` — safe-area layout, progress, Skip, animated body, and footer.
- `src/components/onboarding/OnboardingChoice.tsx` — accessible motivation row and life-area pill variants.
- `src/components/auth/OtpCodeInput.tsx` — hidden native input with six visual cells.
- `app/(onboard)/summary.tsx` — final personalized summary route.
- `src/features/auth/registration-policy.test.ts`
- `src/features/auth/email-verification.test.ts`
- `src/features/onboarding/first-run-onboarding.test.ts`
- `src/features/onboarding/onboarding-draft-storage.test.ts`
- `src/features/onboarding/onboarding-completion.test.ts`
- `src/features/onboarding/onboarding-flow-wiring.test.ts`
- `docs/backend/registration-onboarding-gap-map.md`

### Modify

- `app/(auth)/register.tsx`
- `app/(auth)/verify-email.tsx`
- `app/(onboard)/_layout.tsx`
- `app/(onboard)/index.tsx`
- `app/(onboard)/nickname.tsx`
- `app/(onboard)/preferences.tsx`
- `src/api/endpoint.ts`
- `src/constants/storage-keys.ts`
- `src/hooks/use-register-logic.ts`
- `src/hooks/use-verify-email-logic.ts`
- `src/features/startup/auth-onboarding-typography.test.ts`
- `src/features/startup/primary-surface-typography.test.ts`

---

### Task 1: Define registration and OTP policies

**Files:**
- Create: `src/features/auth/registration-policy.test.ts`
- Create: `src/features/auth/registration-policy.ts`
- Create: `src/features/auth/email-verification.test.ts`
- Create: `src/features/auth/email-verification.ts`

**Interfaces:**
- Produces: `validateRegistrationPassword(value: string): PasswordValidation`
- Produces: `normalizeOtpInput(value: string): string`
- Produces: `isCompleteOtp(value: string): boolean`
- Produces: `getResendSecondsRemaining(sentAtMs: number | null, nowMs: number, cooldownMs?: number): number`

- [ ] **Step 1: Write failing password-policy tests**

```ts
import { describe, expect, test } from 'bun:test';
import { validateRegistrationPassword } from './registration-policy';

describe('registration password policy', () => {
  test.each(['Short1!', 'lowercase1!', 'NoNumber!', 'NoSymbol1'])('rejects %s', (value) => {
    expect(validateRegistrationPassword(value).valid).toBe(false);
  });

  test('accepts all required character classes', () => {
    expect(validateRegistrationPassword('Memory1!')).toEqual({ valid: true, message: null });
  });
});
```

- [ ] **Step 2: Run `bun test src/features/auth/registration-policy.test.ts` and verify it fails because the module is absent**

- [ ] **Step 3: Implement the password policy with the exact message `At least 8 characters containing a number, capitalized letter and a symbol.`**

- [ ] **Step 4: Write failing OTP tests for digit stripping, Unicode/noise rejection, six-character truncation, completeness, and a 30-second resend cooldown**

```ts
expect(normalizeOtpInput('23a 21-44')).toBe('232144');
expect(normalizeOtpInput('1234567')).toBe('123456');
expect(isCompleteOtp('123456')).toBe(true);
expect(getResendSecondsRemaining(1_000, 16_000, 30_000)).toBe(15);
```

- [ ] **Step 5: Run `bun test src/features/auth/email-verification.test.ts` and verify the expected missing-module failure**

- [ ] **Step 6: Implement the minimal pure OTP and cooldown functions**

- [ ] **Step 7: Run both tests and `bun run typecheck`**

- [ ] **Step 8: Commit with `git commit -m "feat(auth): define registration and otp policies"`**

### Task 2: Define the canonical onboarding domain

**Files:**
- Create: `src/features/onboarding/first-run-onboarding.test.ts`
- Create: `src/features/onboarding/first-run-onboarding.ts`
- Modify: `src/constants/onboarding.ts`

**Interfaces:**
- Produces: `OnboardingMotivation`, `FirstRunOnboardingDraft`, `OnboardingStep`
- Produces: `FIRST_RUN_MOTIVATIONS`, `FIRST_RUN_LIFE_AREAS`, `EMPTY_ONBOARDING_DRAFT`
- Produces: `setLifeAreaSelection(current, next): SelectionResult`
- Produces: `validateOnboardingStep(draft, step): StepValidation`
- Produces: `buildOnboardingPayload(draft): OnboardingCompatibilityPayload`
- Produces: `buildOnboardingSummary(draft): OnboardingSummary`

- [ ] **Step 1: Write failing tests for the six motivation keys and the exact ten life-area labels/order from the references**

- [ ] **Step 2: Run `bun test src/features/onboarding/first-run-onboarding.test.ts` and confirm the missing exports fail**

- [ ] **Step 3: Implement immutable option arrays using canonical `EnrichmentCategory` values and temporary emoji fields**

- [ ] **Step 4: Add failing tests proving life-area selection accepts two or three values, toggles an existing value off, and rejects a fourth without modifying the array**

- [ ] **Step 5: Implement `setLifeAreaSelection` returning `{ values, accepted }` so UI can emit warning haptics when `accepted` is false**

- [ ] **Step 6: Add failing tests for trimmed preferred name, required motivation, non-empty about text capped at 500 characters, and final 2–3 area validation**

- [ ] **Step 7: Implement per-step validation and a deterministic summary with `whyYouAreHere`, `aboutYou`, and selected `startingAreas`**

- [ ] **Step 8: Add failing payload tests expecting canonical fields**

```ts
expect(buildOnboardingPayload(draft)).toEqual({
  nickname: 'Jane',
  self_description: 'I care about family and growth.',
  join_reasons: ['self_reflection'],
  motivationType: 'self_reflection',
  priorityDimensions: ['identity_self', 'passions_interests'],
  stepReached: 4,
  isComplete: true,
});
```

- [ ] **Step 9: Implement the compatibility payload mapper and run the complete test file plus typecheck**

- [ ] **Step 10: Commit with `git commit -m "feat(onboarding): define first run domain"`**

### Task 3: Add versioned onboarding draft persistence

**Files:**
- Create: `src/features/onboarding/onboarding-draft-storage.test.ts`
- Create: `src/features/onboarding/onboarding-draft-storage.ts`
- Modify: `src/constants/storage-keys.ts`

**Interfaces:**
- Consumes: `FirstRunOnboardingDraft`, `EMPTY_ONBOARDING_DRAFT`
- Produces: `readOnboardingDraft(storage): Promise<FirstRunOnboardingDraft>`
- Produces: `writeOnboardingDraft(storage, draft): Promise<void>`
- Produces: `clearOnboardingDraft(storage): Promise<void>`
- Storage dependency: `{ getItem; setItem; deleteItem }`, compatible with `secureStorage`

- [ ] **Step 1: Write failing tests using an in-memory storage object for missing, valid v1, malformed JSON, unknown version, invalid step, and invalid category cases**

- [ ] **Step 2: Run the targeted test and verify the missing-module failure**

- [ ] **Step 3: Implement versioned serialization under `storageKeys.onboardingState` and field-by-field sanitization**

- [ ] **Step 4: Add a failing test that clearing removes the stored draft**

- [ ] **Step 5: Implement clear and run targeted tests plus typecheck**

- [ ] **Step 6: Commit with `git commit -m "feat(onboarding): persist first run draft"`**

### Task 4: Implement verified mutation boundaries and completion transaction

**Files:**
- Create: `src/features/onboarding/onboarding-completion.test.ts`
- Create: `src/features/onboarding/onboarding-completion.ts`
- Create: `src/hooks/mutations/use-email-verification-mutations.ts`
- Create: `src/hooks/mutations/use-first-run-onboarding-mutation.ts`
- Modify: `src/api/endpoint.ts`

**Interfaces:**
- Consumes: `OnboardingCompatibilityPayload`
- Produces: `completeFirstRunOnboarding(draft, dependencies): Promise<IUser>`
- Produces hooks: `useVerifyRegistrationEmail`, `useResendRegistrationCode`, `useCompleteFirstRunOnboarding`, `useSkipFirstRunOnboarding`
- Declares `endpoint.resendVerification` only after confirming the backend route from existing API evidence; if no route exists, the hook returns a typed `unsupported` result and the UI shows a non-success state.

- [ ] **Step 1: Write a failing transaction test with injected dependencies asserting call order: profile nickname → persona description/reasons → onboarding answers → completion**

- [ ] **Step 2: Add a failing test proving a write failure prevents completion, does not update stores, and does not clear the draft**

- [ ] **Step 3: Add a failing success test proving server-returned user data is required before local stores update and the draft clears**

- [ ] **Step 4: Run `bun test src/features/onboarding/onboarding-completion.test.ts` and confirm RED**

- [ ] **Step 5: Implement the transaction with injected API/storage/store dependencies and structured failure stages**

- [ ] **Step 6: Implement mutation hooks as thin TanStack Query wrappers; keep network calls outside route files**

- [ ] **Step 7: Inspect API docs/generated client/repository evidence for resend and onboarding schemas; encode only proven paths and record unresolved items for Task 10**

- [ ] **Step 8: Run targeted tests, auth/session tests, and typecheck**

- [ ] **Step 9: Commit with `git commit -m "feat(onboarding): add completion transaction"`**

### Task 5: Build shared onboarding and OTP presentation components

**Files:**
- Create: `src/components/onboarding/OnboardingShell.tsx`
- Create: `src/components/onboarding/OnboardingChoice.tsx`
- Create: `src/components/auth/OtpCodeInput.tsx`
- Create: `src/features/onboarding/onboarding-flow-wiring.test.ts`

**Interfaces:**
- `OnboardingShell({ step, totalSteps, onSkip, onBack, primaryAction, children, scrollable })`
- `MotivationChoice({ label, icon, selected, onPress })`
- `LifeAreaChoice({ label, icon, selected, onPress })`
- `OtpCodeInput({ value, onChange, error, disabled, autoFocus })`

- [ ] **Step 1: Write failing static contract tests requiring safe-area ownership, shared `Button`, semantic `TYPE` roles, tokenized colors, accessibility selection states, Reanimated enter transitions, and no React Native `Modal`**

- [ ] **Step 2: Run the wiring test and verify RED because the components do not exist**

- [ ] **Step 3: Implement `OnboardingShell` with top progress/Skip chrome, optional Back action, animated content slot, keyboard-safe body, and bottom-inset-aware fixed actions**

- [ ] **Step 4: Implement both choice variants with press-scale animation, selection/warning haptic hooks, minimum tap targets, and temporary artwork isolated in option data**

- [ ] **Step 5: Implement `OtpCodeInput` with one transparent numeric `TextInput`, `textContentType="oneTimeCode"`, six visual cells, paste support through normalized `onChangeText`, and an error border state**

- [ ] **Step 6: Run wiring tests, typography checks, and typecheck**

- [ ] **Step 7: Commit with `git commit -m "feat(onboarding): add shared flow components"`**

### Task 6: Rebuild registration and email verification screens

**Files:**
- Modify: `app/(auth)/register.tsx`
- Modify: `app/(auth)/verify-email.tsx`
- Modify: `src/hooks/use-register-logic.ts`
- Modify: `src/hooks/use-verify-email-logic.ts`
- Modify: `src/features/startup/auth-onboarding-typography.test.ts`
- Modify: `src/features/startup/primary-surface-typography.test.ts`

**Interfaces:**
- Consumes registration/OTP policies and email verification mutations from Tasks 1 and 4.
- Maintains current OAuth callback/session APIs.

- [ ] **Step 1: Extend failing wiring tests to require the supplied registration copy, Google/Apple controls, close fallback to login, strong password schema, legal links, and absence of the passkey acquisition control**

- [ ] **Step 2: Run the targeted wiring and typography tests and confirm RED against the current screen**

- [ ] **Step 3: Rebuild registration with the supplied hierarchy, rectangular rounded inputs/buttons, responsive name row, correct legal/login ordering, and reference invalid-password state**

- [ ] **Step 4: Keep Google and Apple launch/cancel behavior, pending-state idempotence, and provider error feedback**

- [ ] **Step 5: Extend failing verification wiring tests to require six OTP cells, displayed registration email, resend, cooldown label, direct session completion, and no success screen**

- [ ] **Step 6: Run targeted tests and confirm RED against current verification**

- [ ] **Step 7: Rebuild verification using `OtpCodeInput`, safe-area footer, resend mutation, structured error messages, and session-coordinator-compatible success**

- [ ] **Step 8: Run auth feature tests, typography tests, typecheck, and lint**

- [ ] **Step 9: Commit with `git commit -m "feat(auth): match registration verification flow"`**

### Task 7: Build welcome and preferred-name screens

**Files:**
- Modify: `app/(onboard)/index.tsx`
- Modify: `app/(onboard)/nickname.tsx`
- Modify: `app/(onboard)/_layout.tsx`
- Create: `src/hooks/use-first-run-onboarding.ts`
- Remove usage from flow: `src/hooks/use-nickname-logic.ts`

**Interfaces:**
- Consumes draft storage and onboarding domain.
- Produces a hook with `{ draft, hydrated, updateDraft, goNext, goBack, skip, pending, error }`.

- [ ] **Step 1: Add failing wiring assertions for the welcome capability copy, privacy panel, Continue, explicit server-backed Skip, and preferred-name reference copy/progress state**

- [ ] **Step 2: Run the wiring test and confirm RED**

- [ ] **Step 3: Implement `useFirstRunOnboarding` hydration and debounced/ordered draft writes with an `isMountedRef` guard**

- [ ] **Step 4: Rebuild Welcome with the reference content, temporary icon map, divider, privacy panel, and safe fixed actions**

- [ ] **Step 5: Rebuild preferred-name step using `OnboardingShell`; validate trimmed input before advancing and focus invalid input after failure**

- [ ] **Step 6: Ensure Skip waits for server acknowledgement, clears draft on success, updates both user stores, and lets root routing enter Overview**

- [ ] **Step 7: Run onboarding domain/storage/wiring tests, typography checks, typecheck, and lint**

- [ ] **Step 8: Commit with `git commit -m "feat(onboarding): add welcome and name steps"`**

### Task 8: Build motivation, about, and life-area steps

**Files:**
- Replace: `app/(onboard)/preferences.tsx`
- Modify: `src/hooks/use-first-run-onboarding.ts`
- Modify: `src/features/onboarding/onboarding-flow-wiring.test.ts`

**Interfaces:**
- Consumes `FIRST_RUN_MOTIVATIONS`, `FIRST_RUN_LIFE_AREAS`, selection and validation functions.

- [ ] **Step 1: Add failing assertions for all three step headings, four-dot states, exact options, 500-character counter, inspiration chips, Back/Continue actions, and 2–3 selection rule**

- [ ] **Step 2: Run the wiring test and confirm RED against the seven-step screen**

- [ ] **Step 3: Implement motivation as a single-select list with selected accessibility state and preferred-name interpolation**

- [ ] **Step 4: Implement About with a 500-character multiline shared input, live counter, and chips that insert a starter only when no equivalent text exists**

- [ ] **Step 5: Implement life areas in exact reference order; accept two or three, toggle selections, and warn without mutation on a fourth**

- [ ] **Step 6: Add directional step transitions, scroll-to-top, keyboard avoidance, draft writes after each accepted change, and safe Back behavior**

- [ ] **Step 7: Run all onboarding tests, typography checks, typecheck, and lint**

- [ ] **Step 8: Commit with `git commit -m "feat(onboarding): add guided preference steps"`**

### Task 9: Build summary and complete the route lifecycle

**Files:**
- Create: `app/(onboard)/summary.tsx`
- Modify: `app/(onboard)/_layout.tsx`
- Modify: `src/hooks/use-first-run-onboarding.ts`
- Modify: `src/features/onboarding/onboarding-flow-wiring.test.ts`
- Modify: `src/features/auth/session-route-policy.test.ts`

**Interfaces:**
- Consumes deterministic summary and completion mutation.

- [ ] **Step 1: Write failing wiring tests for four active progress dots, three summary panels, selected-area pills, no Skip, retryable failure, and `Start using Memento AI`**

- [ ] **Step 2: Add a failing lifecycle test proving root routing stays in onboarding until server-confirmed user state changes to completed**

- [ ] **Step 3: Run tests and confirm RED**

- [ ] **Step 4: Implement the summary route and match reference spacing, colors, typography, safe-area footer, and selected-area wrapping**

- [ ] **Step 5: Wire completion so success updates server-returned user state, clears the draft, and relies on root reconciliation to replace with Overview**

- [ ] **Step 6: Keep failure on Summary with a stage-specific warm retry message and no local completion**

- [ ] **Step 7: Remove the beneficiary route from all first-run navigation calls while leaving the standalone route/file intact**

- [ ] **Step 8: Run onboarding/auth tests, typecheck, lint, and typography checks**

- [ ] **Step 9: Commit with `git commit -m "feat(onboarding): complete personalized first run flow"`**

### Task 10: Verify APIs and produce the backend gap map

**Files:**
- Create: `docs/backend/registration-onboarding-gap-map.md`
- Modify if verified: `src/api/endpoint.ts`
- Modify if verified: relevant onboarding mutation/adapter tests

**Interfaces:**
- Produces a complete table with: action, mobile call site, endpoint/method, request, observed response, dev verification, production status, fallback, backend action.

- [ ] **Step 1: Inventory the twelve network actions from the spec and resolve each current call site with `rg`**

- [ ] **Step 2: Compare `src/api/generated/memento-api.ts`, endpoint declarations, deployed API responses available in logs, and existing web/backend contracts without inventing absent routes**

- [ ] **Step 3: Exercise safe dev calls for registration/OTP/onboarding using a disposable test account only if credentials/environment permit; redact tokens, codes, and personal data from the document**

- [ ] **Step 4: Write the map with one row per action and classify every row as `verified`, `compatibility`, or `backend required`**

- [ ] **Step 5: Include explicit backend tickets for resend verification; typed onboarding schemas; completion/skip response contracts; OTP expiry/rate/error codes; OAuth onboarding propagation; and atomic completion/idempotency where still absent**

- [ ] **Step 6: Add a backend readiness summary separating mobile-shippable behavior from release blockers**

- [ ] **Step 7: Run `git diff --check` and commit with `git commit -m "docs: map onboarding backend gaps"`**

### Task 11: Full verification and simulator fidelity pass

**Files:**
- Modify only files with evidenced defects found during verification.
- Reference: all ten supplied screenshots.

- [ ] **Step 1: Run `bun run verify` and record the exact passing test count**

- [ ] **Step 2: Run `bun run doctor` and separate actionable project failures from environment/network diagnostics**

- [ ] **Step 3: Rebuild the `dev` checkout for the booted iOS simulator with `npx expo prebuild --platform ios --no-install` and `npx expo run:ios --device <booted-device-id>`**

- [ ] **Step 4: Test invalid password, email registration, wrong OTP, paste, resend/cooldown, each Back/Skip path, interrupted resume, 2/3/4 life-area interactions, completion failure/retry, and Overview entry**

- [ ] **Step 5: Capture screenshots for all ten states at the same simulator viewport and compare hierarchy, x/y placement, typography, line wrapping, control dimensions, borders, colors, and safe-area spacing**

- [ ] **Step 6: Correct only evidenced parity defects through a RED test where behavior is affected; re-run targeted checks after each correction**

- [ ] **Step 7: Re-run `bun run verify`, `git diff --check`, and `git status --short`**

- [ ] **Step 8: Review `docs/backend/registration-onboarding-gap-map.md` against observed runtime behavior and update any classification changed by testing**

- [ ] **Step 9: Commit final evidenced fixes with `git commit -m "fix(onboarding): close visual and interaction gaps"` only when changes exist**

### Task 12: Final code review and handoff

**Files:**
- Review all files changed since spec commit `596035e`.

- [ ] **Step 1: Use the requesting-code-review skill against the complete diff and classify findings by severity**

- [ ] **Step 2: Fix every correctness, security, accessibility, contract, and high-fidelity issue using a failing regression test first**

- [ ] **Step 3: Run the final `bun run verify` and targeted simulator smoke flow after fixes**

- [ ] **Step 4: Report the exact commits, verification evidence, simulator states tested, temporary assets awaiting Figma replacement, and every backend-required item from the gap map**
