# Registration and First-Run Onboarding Backend Gap Map

## Overview

This document tracks the integration status, payload schemas, observed API behaviors, and backend action items for the mobile registration and first-run onboarding flow implemented in September 2026.

Mobile clients implement the canonical onboarding contract defined in:
- Domain model: `src/features/onboarding/first-run-onboarding.ts`
- Completion coordinator: `src/features/onboarding/onboarding-completion.ts`
- Mutation hooks: `src/hooks/mutations/use-first-run-onboarding-mutation.ts`

---

## Endpoint Integration Matrix

| Action | Mobile Call Site | Endpoint | Method | Request Schema | Observed / Expected Response | Deployed Dev Status | Production Readiness | Required Backend Action |
|---|---|---|---|---|---|---|---|---|
| **Email Registration** | `useRegisterLogic()` | `/auth/register` | `POST` | `{ first_name, last_name, email, password }` | `{ status: 'success', data: { user, token?, verification_required?: boolean } }` | Verified | Ready | None. Mobile enforces strong password policy (8+ chars, upper, number, symbol) client-side. |
| **Google OAuth** | `register.tsx` / `login.tsx` | `/auth/oauth/google` | `GET` | Query param: `redirect_uri` | `{ status: 'success', data: { url: string } }` | Verified | Ready | Ensure `onboarding_status` is returned in user payload after token exchange. |
| **Apple OAuth** | `register.tsx` / `login.tsx` | `/auth/oauth/apple` | `GET` | Query param: `redirect_uri` | `{ status: 'success', data: { url: string } }` | Verified | Ready | Ensure full name and email claims map cleanly to `IUser` on first registration. |
| **OTP Verification** | `useVerifyEmailLogic()` | `/auth/verify-email` | `POST` | `{ email: string, code: string }` | `{ status: 'success', data: { token: string, user: IUser } }` | Verified | Ready | Ensure response returns active JWT session and latest `IUser` with `onboarding_status: 'never'`. |
| **OTP Resend** | `useVerifyEmailLogic()` | `/auth/resend-verification` | `POST` | `{ email: string }` | `{ status: 'success', message: string }` | Fallback Simulated | Pending Backend Endpoint | Add explicit `/auth/resend-verification` endpoint with rate-limiting and cooldown enforcement (60s). |
| **Preferred Name Persistence** | `useCompleteFirstRunOnboarding()` | `/users/profile` | `PUT` | `{ nickname: string }` | `{ status: 'success', data: IUser }` | Verified | Ready | Persists preferred name as `user.nickname`. |
| **Persona / About Persistence** | `useCompleteFirstRunOnboarding()` | `/users/persona` | `PUT` | `{ self_description: string, join_reasons: string[] }` | `{ status: 'success', data: IPersona }` | Verified | Ready | Preserves self description up to 500 chars and primary motivation key. |
| **Onboarding Answers** | `useCompleteFirstRunOnboarding()` | `/onboarding` | `POST` | `{ motivation: string, current_priority: string[], priority_dimensions: string[], step: number }` | `{ status: 'success' }` | Verified | Ready | Accepts motivation enum and priority life areas (`EnrichmentCategory` keys). |
| **Onboarding Completion** | `useCompleteFirstRunOnboarding()` | `/users/complete-onboarding` | `POST` | `{ self_description: string, join_reasons: string[], current_priority: string[], motivationType: string, stepReached: 4 }` | `{ status: 'success', data?: IUser }` | Verified | Ready | Mobile performs profile fetch (`/users/profile`) immediately after to guarantee refreshed `onboarding_status: 'completed'`. |
| **Onboarding Skip** | `useSkipFirstRunOnboarding()` | `/onboarding/skip` | `POST` | `{}` | `{ status: 'success' }` | Verified | Ready | Sets `onboarding_status: 'skipped'`. Mobile clears draft and transitions to Overview. |
| **Draft Persistence** | `useFirstRunOnboarding()` | Local SecureStore | N/A | `FirstRunOnboardingDraft` (version 1) | Local encrypted storage | Verified | Client-Only | None. Drafts persist across app restart and are cleared upon completion/skip. |

---

## Canonical Data Enums

### 1. Motivations (`OnboardingMotivation`)
| Key | Label | Emoji | Backend Payload Mapping |
|---|---|---|---|
| `preserve_memories` | Preserve memories | 📚 | `join_reasons: ["preserve_memories"]`, `motivationType: "preserve_memories"` |
| `self_reflection` | Reflect on my life | 🪞 | `join_reasons: ["self_reflection"]`, `motivationType: "self_reflection"` |
| `life_record` | Record my life | ✍️ | `join_reasons: ["life_record"]`, `motivationType: "life_record"` |
| `organize_thoughts` | Organize my thoughts | 🗂️ | `join_reasons: ["organize_thoughts"]`, `motivationType: "organize_thoughts"` |
| `legacy_for_loved_ones` | Leave a legacy for loved ones | 💌 | `join_reasons: ["legacy_for_loved_ones"]`, `motivationType: "legacy_for_loved_ones"` |
| `exploring` | I’m just exploring | 🔍 | `join_reasons: ["exploring"]`, `motivationType: "exploring"` |

### 2. Canonical Life Areas (`EnrichmentCategory`)
Mobile selects 2 or 3 of the following 10 canonical areas:
- `identity_self` ('Identity & Self')
- `relationships_people` ('Relationships & People')
- `work_purpose` ('Work & Purpose')
- `memories_experiences` ('Memories & Experiences')
- `beliefs_worldview` ('Beliefs & Worldview')
- `passions_interests` ('Passions & Interests')
- `heritage_roots` ('Heritage & Roots')
- `lessons_wisdom` ('Lessons & Wisdom')
- `hopes_legacy` ('Hopes & Legacy')
- `everyday_life` ('Everyday Life')

---

## Action Items for Backend Owners

1. **Verify `/auth/resend-verification` Deployment**:
   - Provide endpoint accepting `{ email: string }` returning standard `{ status: 'success' }` or rate-limit HTTP 429.
2. **Atomic Onboarding Transaction**:
   - Currently, mobile sends sequential requests (`/users/profile` -> `/users/persona` -> `/onboarding` -> `/users/complete-onboarding`).
   - A single unified endpoint (e.g. `POST /onboarding/complete` accepting all answers and returning the updated user) would reduce 4 roundtrips to 1.
3. **Response User Schema**:
   - Ensure `/users/complete-onboarding` returns the full refreshed `IUser` object with `onboarded: true` and `onboarding_status: 'completed'` so mobile does not need a secondary `GET /users/profile` call.
