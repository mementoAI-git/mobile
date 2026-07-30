# Beneficiaries and Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the supplied People/Groups settings flow using the existing beneficiary and group APIs and sheets.

**Architecture:** A focused feature helper normalizes backend collections. The existing screen becomes the tabbed coordinator, shared beneficiary components render list states, and SheetManager owns beneficiary actions and confirmations.

**Tech Stack:** Expo Router, React Native, TanStack Query, Zustand SheetManager, NativeWind/token styles, Bun tests.

## Global Constraints

- Reuse existing UI, query, mutation, and sheet components before creating new primitives.
- Use only semantic Memento color and font tokens.
- Every interaction fires haptics and every touch target is at least 44px.
- Keep this plan and its design spec local and uncommitted.

---

### Task 1: Normalize beneficiary and group collections

**Files:**
- Create: `src/features/beneficiaries/collections.ts`
- Test: `src/features/beneficiaries/collections.test.ts`
- Modify: `src/hooks/use-beneficiaries-settings-logic.ts`

**Interfaces:**
- Produces: `normalizeCollection<T>(value: unknown): T[]`
- Produces: `getGroupMemberCount(group: IGroup): number`

- [ ] Write tests covering arrays, `docs`, nested `data`, and empty values.
- [ ] Run `bun test src/features/beneficiaries/collections.test.ts` and verify RED.
- [ ] Implement the helpers and use both `useBeneficiaries` and `useGroups` in settings logic.
- [ ] Re-run the focused test and verify GREEN.

### Task 2: Build the tabbed reference screen

**Files:**
- Modify: `app/settings/beneficiaries.tsx`
- Create: `src/components/beneficiaries/BeneficiaryEmptyState.tsx`
- Create: `src/components/beneficiaries/BeneficiaryPersonRow.tsx`
- Create: `src/components/beneficiaries/BeneficiaryGroupRow.tsx`
- Test: `src/features/beneficiaries/settings-flow.test.ts`

**Interfaces:**
- Consumes normalized `beneficiaries`, `groups`, loading/error/refetch state.
- Opens `add-beneficiary`, `beneficiary-actions`, and `create-group` sheets.

- [ ] Write a source-contract test for People/Groups tabs, both CTAs, and row actions.
- [ ] Run the test and verify RED.
- [ ] Implement the reference screen and reusable components.
- [ ] Run the test and verify GREEN.

### Task 3: Add beneficiary actions and styled removal confirmation

**Files:**
- Create: `src/components/sheets/BeneficiaryActionsSheet.tsx`
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `src/store/ui.store.ts`
- Modify: `src/components/sheets/SecurityConfirmationSheet.tsx`
- Modify: `src/hooks/use-beneficiaries-settings-logic.ts`
- Test: `src/features/beneficiaries/settings-flow.test.ts`

**Interfaces:**
- `beneficiary-actions` consumes `{ beneficiary, onResend, onRemove }`.
- `security-confirmation` adds a `remove-beneficiary` presentation.

- [ ] Extend the contract test for sheet registration and non-native confirmation.
- [ ] Run the test and verify RED.
- [ ] Implement the actions sheet and confirmation wiring.
- [ ] Run the focused test and verify GREEN.

### Task 4: Verify the complete flow

**Files:**
- Modify only files required by verification failures attributable to this feature.

- [ ] Run `bun test src/features/beneficiaries`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run verify`.
- [ ] Run `git diff --check` and confirm the spec/plan remain uncommitted.

