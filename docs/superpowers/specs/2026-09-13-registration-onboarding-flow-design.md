# Registration and First-Run Onboarding Flow Design

## Purpose

Replace the current mobile registration, email verification, and first-run onboarding experience with the supplied ten-state design flow while preserving the existing authentication/session architecture and remaining compatible with the deployed API.

The finished flow must feel like one continuous Memento experience: editorial typography, warm surfaces, crisp controls, stable keyboard behavior, deliberate transitions, haptics on every interaction, and no visible jump between authentication and onboarding route groups.

## Scope

### Included

- Account creation with Google, Apple, or email/password.
- Inline registration validation, including the designed invalid-password state.
- Six-digit email OTP entry, paste/autofill support, resend, loading, and failure states.
- A welcome/education screen explaining Memento and its privacy model.
- Four onboarding steps:
  1. Preferred name.
  2. Primary motivation.
  3. Free-form personal context.
  4. Two or three starting life areas.
- A personalized completion summary.
- Draft persistence and restoration across app interruption.
- Backend-compatible payload mapping.
- Authenticated routing into the Overview tab after completion or an explicit skip.
- Automated behavior/contract tests plus a simulator-based visual and interaction audit.
- A final backend gap matrix covering every network-dependent action.

### Excluded

- Changes to the deployed backend.
- Replacing the supplied emoji/temporary artwork with final Figma exports.
- Adding trusted-person/beneficiary collection to first-run onboarding. That feature remains available elsewhere in the product.
- New authentication providers.
- A redesign of the login, forgot-password, or two-factor screens beyond shared components needed by this flow.

## Current-State Audit

The existing app has sound low-level infrastructure but implements a different product flow:

- `app/(auth)/register.tsx` supports email registration, Google, Apple, and a web passkey handoff. Its content hierarchy, copy, button shapes, and validation states do not match the supplied design.
- Password validation currently checks only a minimum length of eight characters. The new screen requires at least eight characters, one uppercase letter, one number, and one symbol.
- `app/(auth)/verify-email.tsx` accepts one free-form token and shows a success screen. The new flow requires six visual OTP cells, resend support, autofill/paste behavior, and direct onboarding progression after verification.
- Current onboarding is welcome, full-name/nickname, seven preference steps, then beneficiary. The new flow is welcome, preferred name, motivation, about, life areas, and summary.
- Existing session routing already directs authenticated users with `onboarding_status: 'never'` into `/(onboard)` and completed/skipped users into Overview. It remains the sole route owner.
- Existing profile/persona types already contain `nickname`, `context.self_description`, `context.join_reasons`, and enrichment category keys. These will be reused rather than duplicated.
- Existing onboarding endpoints are present, but their exact deployed schemas are not represented by generated request/response types. Mobile must isolate assumptions in a contract adapter and document unverified fields.

## Recommended Architecture

### Route structure

Keep the existing Expo Router groups and replace their contents without changing the session coordinator:

- `/(auth)/register` — registration form.
- `/(auth)/verify-email` — OTP verification.
- `/(onboard)` — welcome screen.
- `/(onboard)/nickname` — preferred name.
- `/(onboard)/preferences` — motivation, about, and life-area steps in one stateful route.
- `/(onboard)/summary` — completion summary.

The obsolete beneficiary route remains addressable for the existing beneficiary feature until a later cleanup, but the new first-run flow never routes through it.

OTP verification must establish the session through the existing `completeAuthResponse`/`establishSession` path. The root session coordinator then moves the user to `/(onboard)` based on the returned onboarding status. No screen may race the coordinator by independently navigating into an authenticated route.

### Domain model

Create a focused onboarding domain module with the following canonical draft:

```ts
type OnboardingMotivation =
  | 'preserve_memories'
  | 'self_reflection'
  | 'life_record'
  | 'organize_thoughts'
  | 'legacy_for_loved_ones'
  | 'exploring';

interface FirstRunOnboardingDraft {
  preferredName: string;
  motivation: OnboardingMotivation | null;
  about: string;
  lifeAreas: EnrichmentCategory[];
  step: 1 | 2 | 3 | 4;
}
```

Pure functions will own password validation, OTP normalization, per-step validation, life-area selection limits, display-summary generation, and API payload mapping. UI screens consume these functions; they do not recreate business rules inline.

### Persistence and API mapping

Persist the in-progress draft under the existing `storageKeys.onboardingState` key. Restore only valid fields and discard malformed or version-incompatible content. Clear the draft after successful completion or explicit skip.

The mobile canonical draft maps to existing server concepts as follows:

| Mobile field | Existing server concept | Proposed payload field |
|---|---|---|
| Preferred name | `IUser.nickname` | Profile update: `nickname` |
| Motivation | `context.join_reasons` / onboarding motivation | `join_reasons: [motivation]` plus compatibility `motivationType` |
| About | `context.self_description` | Persona/profile update: `self_description` |
| Life areas | Enrichment priorities | `priorityDimensions` using canonical `EnrichmentCategory` keys |
| Last reached step | `onboarding_step_reached` | `stepReached: 4` |
| Finished state | `onboarding_status` | `/users/complete-onboarding` completion call |

Network writes occur at completion as an ordered transaction from the client perspective:

1. Persist preferred name/profile-compatible fields.
2. Persist persona/onboarding answers.
3. Mark onboarding complete.
4. Update both authenticated user stores only after the completion response succeeds.
5. Clear the local draft and allow the session route policy to enter Overview.

If a pre-completion write fails, retain the draft and show a warm retry message. Do not mark the local user completed. Skip uses the dedicated onboarding-skip endpoint and updates local status only after a successful response; offline skip is not treated as server completion.

## Screen Design

### Shared auth/onboarding shell

- Screen background uses `COLORS.background`; cards and controls use semantic tokens.
- The safe area owns top and bottom spacing. The keyboard must never cover the active field or primary action.
- Main horizontal inset is 16px on the registration screen and 16px on onboarding, scaled only where narrow devices require it.
- Primary titles use `FONTS.serif`; italic emphasized words use the available editorial italic face if loaded, otherwise the existing supported serif italic treatment.
- Body and form copy use the project typography scale, not ad-hoc 16px defaults.
- Primary actions use the shared `Button` behavior, 56px minimum height, tokenized orange treatment, press scale, disabled state, and haptics.
- Screen content enters with short staggered `FadeInDown` animations. Step changes use a directional transition without moving the persistent progress/footer chrome.
- Reduced-motion users receive opacity-only transitions.

### Registration

- Close control in the upper-right safely returns to login.
- Memento mark and `Create an account` editorial heading match the supplied hierarchy.
- Google and Apple are full-width bordered controls. The passkey handoff is intentionally omitted from this screen for design parity; it remains available from account security settings.
- First and last name share one row where device width permits and stack on compact widths.
- Password input exposes visibility and inline validity state.
- Password errors move the legal copy below the account/login actions as shown in the supplied invalid state, without allowing controls to overlap.
- Legal links remain functional and open configured Terms and Privacy URLs.

### OTP verification

- Render six individual visual cells backed by one hidden/native numeric input to preserve paste, deletion, keyboard, and iOS one-time-code autofill behavior.
- Normalize all input to six ASCII digits.
- Use the email passed from registration and never log the code or email.
- Confirm is disabled until six digits are present.
- Resend has pending, success, error, and cooldown states. The cooldown prevents rapid repeat calls.
- Verification success establishes the session and lets the root route coordinator enter onboarding; there is no redundant success screen.

### Welcome

- Present the supplied welcome copy, three capability rows, privacy panel, Skip, and Continue.
- Continue opens preferred-name step 1.
- Skip calls the server skip endpoint and enters Overview only after success.
- Temporary artwork is isolated behind an asset map so Figma exports can replace it without layout changes.

### Step 1: preferred name

- Four-dot progress indicator with the first dot active.
- Skip pill delegates to the same explicit onboarding-skip behavior.
- Single preferred-name input, helper copy, and fixed Continue footer.
- Continue requires a trimmed non-empty name and persists it in the local draft.

### Step 2: motivation

- Heading interpolates the preferred name.
- Six single-select choices use the exact supplied copy and temporary emoji assets.
- Continue requires one selection.

### Step 3: about

- Multiline input limited to 500 characters with a live counter.
- Inspiration chips append or focus a short starter prompt without overwriting user-authored text.
- Back and Continue remain visible above the bottom safe area.
- Empty content is permitted only through Skip; Continue requires meaningful text.

### Step 4: life areas

- Use all ten canonical enrichment categories and the supplied labels/order.
- Selection is limited to two or three. A fourth selection gives warning haptics and leaves state unchanged.
- Selected pills receive the tokenized orange border state shown in the design.
- Continue is enabled only for two or three selections.

### Summary

- Build deterministic summary copy from the selected motivation, about text, and life areas; do not make an AI request during onboarding.
- Render the three colored summary panels and the edit-later note.
- `Start using Memento AI` performs the completion transaction and displays an inline retry state on failure.
- The fourth progress dot is active and no Skip control is shown.

## Error Handling

- Field errors are shown beside their owning field with `COLORS.error`; server-level errors use a compact warm error surface.
- No network failure is swallowed. Registration, resend, verification, skip, and completion each provide actionable feedback.
- Buttons remain idempotent while a mutation is pending.
- A failed onboarding completion retains the draft and remains on Summary.
- A malformed restored draft falls back to the earliest valid step.
- OAuth cancellation returns to registration without showing an error; provider/server failures show a retry message.

## Accessibility

- Every control has an accessibility role, label, and selected/disabled state where applicable.
- OTP cells announce position and completion without exposing entered digits in logs.
- Dynamic type may expand body copy, but fixed footer controls must remain reachable through scrolling.
- Tap targets are at least 44px.
- Text and state colors use semantic tokens and preserve contrast.
- Focus moves to the first invalid field after submission.

## Testing and Verification

### Automated

- Password-policy unit tests for every required character class.
- OTP normalization, paste, deletion, and completion tests.
- Draft validation/migration and resume-step tests.
- Motivation and life-area selection tests, including the 2–3 rule.
- API payload mapping tests using canonical enrichment keys.
- Registration-to-verification and verification-to-onboarding route-policy tests.
- Completion failure/success state tests ensuring local status is not advanced early.
- Static typography/token/safe-area checks for every new screen.
- Existing auth/session tests, typecheck, lint, typography check, and production-readiness check.

### Simulator flow matrix

- Email registration happy path.
- Invalid password state.
- OTP manual entry, paste, autofill where available, wrong code, resend, and cooldown.
- Back, Skip, and interrupted/resumed onboarding from every step.
- Two, three, and attempted-fourth life-area selections.
- Completion failure and retry.
- Small-screen keyboard behavior and standard iPhone layout.
- Google and Apple launch/cancel behavior.
- Final screenshot comparison against all ten supplied reference states.

## Backend Gap Matrix Deliverable

Implementation completion includes `docs/backend/registration-onboarding-gap-map.md`. For every action below it will record the mobile call site, endpoint, method, request schema, observed response, deployed-dev verification result, production readiness, and required backend owner action:

- Email registration.
- Google OAuth initiation/callback.
- Apple OAuth initiation/callback.
- OTP verification.
- OTP resend.
- Preferred-name/profile persistence.
- Motivation persistence.
- About/persona persistence.
- Life-area priority persistence.
- Draft/progress persistence expectations.
- Onboarding completion.
- Onboarding skip.

Known gaps at design time, pending implementation-time API verification:

1. No resend-verification endpoint is currently declared in the mobile endpoint map.
2. Generated API types do not define onboarding request/response schemas.
3. The accepted field names for motivation, self-description, canonical life areas, and step progress are not proven by a checked-in contract.
4. Completion response semantics are unclear: mobile does not know whether it returns a refreshed user/session or only acknowledgement.
5. Skip response semantics and offline behavior are not typed.
6. OTP expiry, attempt limits, resend cooldown, and error codes are not represented as structured client contracts.
7. OAuth onboarding status propagation must be verified for both providers.

These unknowns must not be hidden behind placeholder success behavior. The mobile flow may use compatibility adapters for existing deployed behavior, but the final gap map must explicitly distinguish verified integrations from fallbacks and backend-blocked states.

## Acceptance Criteria

- All ten supplied reference states exist in the running mobile app with high visual fidelity.
- The flow is navigable using touch, keyboard, paste/autofill, Back, Close, and Skip without traps.
- Registration and verification use the existing secure session coordinator.
- Onboarding survives interruption and never marks a user completed before server acknowledgement.
- Two or three canonical life areas are saved and reflected in the summary.
- Existing authenticated routing, login, billing, splash, and settings behavior remain green.
- No hardcoded non-approved colors, generic grey text, primitive screen-local modal, or unsafe-area workaround is introduced.
- The final backend gap map clearly identifies everything still requiring backend implementation or contract confirmation.
