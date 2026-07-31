# Settings Typography Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the complete Settings flow the warm editorial typography hierarchy used by Memento onboarding and primary screens.

**Architecture:** Add one shared, semantic Settings typography module over the existing `FONTS` and `COLORS` tokens. Migrate Settings screens, Settings-specific rows, and Settings-owned sheets to those styles without changing navigation, data behavior, or interaction targets.

**Tech Stack:** React Native, Expo Router, TypeScript, NativeWind, Bun test

## Global Constraints

- Screen titles use EB Garamond Regular at 28px with a 34px line height.
- Section, card, empty-state, and confirmation headings use EB Garamond Regular or Medium at 20–22px.
- Profile, beneficiary, and group names use EB Garamond Medium at 20–22px.
- Navigation rows and field labels use Inter Medium at 15–16px.
- Body copy uses Inter Regular at 14–16px with relaxed line height.
- Buttons use Inter Semibold; Bold remains exceptional.
- Numeric statistics use Inter Semibold; Azeret Mono remains limited to codes and secrets.
- Existing colors, routes, APIs, interactions, and minimum tap targets remain unchanged.
- Reuse existing font assets and semantic color tokens.
- Keep specifications, plans, and implementation local and uncommitted unless explicitly requested.
- Preserve unrelated worktree changes.

---

### Task 1: Shared Settings typography contract

**Files:**
- Create: `src/components/settings/settings-typography.ts`
- Create: `src/features/settings/settings-typography.test.ts`

**Interfaces:**
- Consumes: `FONTS` and `COLORS` from `src/constants/tokens.ts`
- Produces: `SETTINGS_TYPE` with `screenTitle`, `sectionTitle`, `cardTitle`, `identityTitle`, `rowLabel`, `fieldLabel`, `body`, `supporting`, `buttonLabel`, `utilityLabel`, and `stat` styles

- [ ] **Step 1: Write the failing source-contract test**

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const typography = readFileSync(
  new URL('../../components/settings/settings-typography.ts', import.meta.url),
  'utf8',
);

describe('Settings typography', () => {
  test('defines the shared editorial hierarchy', () => {
    expect(typography).toContain('screenTitle');
    expect(typography).toContain('fontFamily: FONTS.serif');
    expect(typography).toContain('identityTitle');
    expect(typography).toContain('fontFamily: FONTS.serifMedium');
    expect(typography).toContain('rowLabel');
    expect(typography).toContain('fontFamily: FONTS.sansMedium');
    expect(typography).toContain('buttonLabel');
    expect(typography).toContain('fontFamily: FONTS.sansSemi');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/features/settings/settings-typography.test.ts`

Expected: FAIL because `settings-typography.ts` does not exist.

- [ ] **Step 3: Add the shared semantic styles**

```ts
import { StyleSheet } from 'react-native';
import { COLORS, FONTS } from '@/constants/tokens';

export const SETTINGS_TYPE = StyleSheet.create({
  screenTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  sectionTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  cardTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serifMedium,
    fontSize: 20,
    lineHeight: 26,
  },
  identityTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serifMedium,
    fontSize: 21,
    lineHeight: 27,
  },
  rowLabel: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  fieldLabel: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    color: COLORS.textBase,
    fontFamily: FONTS.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  supporting: {
    color: COLORS.textWeak,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  buttonLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 16,
    lineHeight: 22,
  },
  utilityLabel: {
    color: COLORS.textWeak,
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
  stat: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansSemi,
    fontSize: 28,
    lineHeight: 34,
  },
});
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `bun test src/features/settings/settings-typography.test.ts`

Expected: PASS.

### Task 2: Migrate Settings screens and rows

**Files:**
- Modify: `app/settings/index.tsx`
- Modify: `app/settings/profile.tsx`
- Modify: `app/settings/account.tsx`
- Modify: `app/settings/two-factor.tsx`
- Modify: `app/settings/privacy.tsx`
- Modify: `app/settings/beneficiaries.tsx`
- Modify: `app/settings/billing.tsx`
- Modify: `app/settings/feedback.tsx`
- Modify: `app/settings/activities.tsx`
- Modify: `src/components/settings/SettingsHubRow.tsx`
- Modify: `src/components/security/SecurityCredentialRow.tsx`
- Modify: `src/components/beneficiaries/BeneficiaryPersonRow.tsx`
- Modify: `src/components/beneficiaries/BeneficiaryGroupRow.tsx`
- Modify: `src/components/beneficiaries/BeneficiaryEmptyState.tsx`
- Test: `src/features/settings/settings-typography.test.ts`

**Interfaces:**
- Consumes: `SETTINGS_TYPE` from `src/components/settings/settings-typography.ts`
- Produces: consistent screen titles, editorial content headings and names, medium-weight control labels, and regular supporting copy

- [ ] **Step 1: Extend the contract test to require Settings consumers**

```ts
const settingsSources = [
  '../../../app/settings/index.tsx',
  '../../../app/settings/profile.tsx',
  '../../../app/settings/account.tsx',
  '../../../app/settings/privacy.tsx',
  '../../../app/settings/beneficiaries.tsx',
  '../../../app/settings/billing.tsx',
  '../../../app/settings/feedback.tsx',
  '../../components/settings/SettingsHubRow.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

test('applies the hierarchy throughout Settings', () => {
  for (const source of settingsSources) {
    expect(source).toContain('SETTINGS_TYPE');
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/features/settings/settings-typography.test.ts`

Expected: FAIL because Settings consumers still use ad hoc font definitions.

- [ ] **Step 3: Replace ad hoc typography with semantic styles**

For every listed screen and shared row:

```tsx
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';

<Text style={SETTINGS_TYPE.screenTitle}>Settings</Text>
<Text style={SETTINGS_TYPE.sectionTitle}>Manage your account privacy settings</Text>
<Text style={SETTINGS_TYPE.identityTitle}>{displayName}</Text>
<Text style={SETTINGS_TYPE.rowLabel}>{label}</Text>
<Text style={SETTINGS_TYPE.body}>{description}</Text>
```

When a component requires local layout or semantic color overrides, compose styles instead of duplicating typography:

```tsx
<Text style={[SETTINGS_TYPE.rowLabel, { color: COLORS.error }]}>Log out</Text>
```

- [ ] **Step 4: Run focused tests**

Run: `bun test src/features/settings src/features/account src/features/security src/features/privacy src/features/beneficiaries src/features/feedback`

Expected: PASS.

### Task 3: Migrate Settings-owned sheets and verify

**Files:**
- Modify: `src/components/sheets/EditProfileSheet.tsx`
- Modify: `src/components/sheets/ChangePasswordSheet.tsx`
- Modify: `src/components/sheets/SetupTwoFactorSheet.tsx`
- Modify: `src/components/sheets/SecurityConfirmationSheet.tsx`
- Modify: `src/components/sheets/BeneficiaryActionsSheet.tsx`
- Test: `src/features/settings/settings-typography.test.ts`

**Interfaces:**
- Consumes: `SETTINGS_TYPE`
- Produces: editorial sheet headings and confirmations with consistent labels and supporting copy

- [ ] **Step 1: Extend the contract test to cover Settings-owned sheets**

```ts
const settingsSheets = [
  '../../components/sheets/EditProfileSheet.tsx',
  '../../components/sheets/ChangePasswordSheet.tsx',
  '../../components/sheets/SetupTwoFactorSheet.tsx',
  '../../components/sheets/SecurityConfirmationSheet.tsx',
  '../../components/sheets/BeneficiaryActionsSheet.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

test('applies the hierarchy to Settings sheets', () => {
  for (const source of settingsSheets) {
    expect(source).toContain('SETTINGS_TYPE');
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/features/settings/settings-typography.test.ts`

Expected: FAIL because the sheets still define local font families.

- [ ] **Step 3: Migrate sheet typography**

Use `SETTINGS_TYPE.sectionTitle` for sheet titles, `SETTINGS_TYPE.cardTitle` for confirmation titles, `SETTINGS_TYPE.fieldLabel` for input labels, `SETTINGS_TYPE.body` for instructions, and `SETTINGS_TYPE.supporting` for metadata and recovery text.

- [ ] **Step 4: Run full verification**

Run: `bun run verify && git diff --check`

Expected: ESLint, TypeScript, all Bun tests, production-readiness checks, and whitespace validation pass.

- [ ] **Step 5: Keep changes local**

Do not stage or commit any files. Report the verification evidence and confirm the work remains local.
