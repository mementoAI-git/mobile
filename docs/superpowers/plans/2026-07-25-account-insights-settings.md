# Account Insights and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the referenced My Insights, Settings, Personal Info, and Edit Profile experiences while preserving existing data and navigation behavior.

**Architecture:** Full-screen Expo Router routes compose focused reusable components. Read operations reuse current query hooks, profile writes use a dedicated mutation, and the edit form is registered in the global bottom-sheet manager.

**Tech Stack:** Expo Router, React Native, NativeWind, TanStack Query, Zustand, React Hook Form, Zod, Gorhom Bottom Sheet, Bun tests.

## Global Constraints

- Reuse existing UI components, hooks, icons, and assets before creating new primitives.
- Use semantic `COLORS` and `FONTS`; no generic Tailwind gray or arbitrary hex values.
- All interactions use haptics and 44px minimum tap targets.
- Specs and implementation remain local and uncommitted.

---

### Task 1: Account navigation and derivation

**Files:**
- Modify: `src/features/account/account-navigation.test.ts`
- Modify: `src/features/account/account-overview.test.ts`
- Modify: `src/features/account/account-overview.ts`
- Modify: `app/account.tsx`

**Interfaces:**
- Produces: `normalizeEnrichmentDimensions(input): EnrichmentDimension[]`
- Produces: Account routes `/insights`, `/settings`, and `openSheet('edit-profile')`

- [ ] Write failing tests for the new destinations and dimension normalization.
- [ ] Run `bun test src/features/account/account-navigation.test.ts src/features/account/account-overview.test.ts` and confirm expected failures.
- [ ] Implement the smallest derivation and Account handler changes.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: My Insights route

**Files:**
- Create: `app/insights.tsx`
- Create: `src/components/account/InsightsContentCard.tsx`
- Create: `src/features/account/account-insights.test.ts`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: profile, persona, context, stats, and normalized enrichment dimensions.
- Produces: full-screen `/insights` with Enrichment score, Insights, Notes, and Preferences tabs.

- [ ] Write a failing structural test for route registration, reusable hooks, tabs, and settings navigation.
- [ ] Run the test and confirm it fails because the route is absent.
- [ ] Build the route and focused content component with loading and empty states.
- [ ] Run the structural test and typecheck.

### Task 3: Settings hub and Personal Info

**Files:**
- Replace: `app/settings/index.tsx`
- Replace: `app/settings/profile.tsx`
- Create: `src/components/settings/SettingsHubRow.tsx`
- Create: `src/features/account/settings-navigation.test.ts`

**Interfaces:**
- Produces: `/settings` hub and read-only `/settings/profile`.
- Consumes: existing settings destinations, feedback sheet, logout logic, Avatar, and profile query.

- [ ] Write failing tests for all preserved destinations and Personal Info's edit-sheet action.
- [ ] Run the tests and confirm the redirect/current hub behavior fails.
- [ ] Implement the reference layouts using existing icons and social assets.
- [ ] Run focused tests and typecheck.

### Task 4: Edit Profile sheet

**Files:**
- Create: `src/hooks/mutations/use-profile-mutation.ts`
- Create: `src/components/sheets/EditProfileSheet.tsx`
- Create: `src/features/account/profile-form.ts`
- Create: `src/features/account/profile-form.test.ts`
- Modify: `src/store/ui.store.ts`
- Modify: `src/components/sheets/SheetManager.tsx`

**Interfaces:**
- Produces: `normalizeProfileForm(profile)`, `toProfileUpdatePayload(form)`, and `edit-profile` sheet.
- Mutation posts profile fields, updates `queryKeys.profile` and `useUserStore`, then closes on success.

- [ ] Write failing tests for form defaults, date formatting, payload trimming, and sheet registration.
- [ ] Run tests and confirm expected failures.
- [ ] Implement pure form helpers, mutation, form component, and sheet registration.
- [ ] Run focused tests, lint, and typecheck.

### Task 5: Verification

**Files:**
- Review all files changed by Tasks 1–4.

- [ ] Run `bun run verify`.
- [ ] Run `git diff --check`.
- [ ] Confirm the spec and plan remain untracked and nothing was committed.
- [ ] Report any visual-preview limitation separately from code/test verification.
