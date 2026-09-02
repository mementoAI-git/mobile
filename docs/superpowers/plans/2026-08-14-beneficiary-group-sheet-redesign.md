# Beneficiary and Group Sheet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Invite Beneficiary and Create Group sheets with the approved functional reference designs.

**Architecture:** Pure form helpers normalize and validate payloads. Existing query, upload, mutation, and SheetManager infrastructure remains responsible for network and presentation behavior; each sheet owns only form state and layout.

**Tech Stack:** React Native, Expo Router, Gorhom Bottom Sheet, TanStack Query, Expo Image Picker, NativeWind, Bun tests, TypeScript.

## Global Constraints

- Preserve existing API mutations and query invalidation patterns.
- Use a fixed header, scrollable keyboard-aware body, and fixed safe-area footer.
- Use semantic `COLORS`/`FONTS` tokens and shared UI controls where their anatomy matches the reference.
- Invite Beneficiary sends every functional field in one atomic invite payload.
- Create Group persists a zero-based colour index from `0` through `5`.
- Documentation remains local and uncommitted.

---

### Task 1: Beneficiary and group form contracts

**Files:**
- Create: `src/features/beneficiaries/sheet-forms.ts`
- Create: `src/features/beneficiaries/sheet-forms.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `buildBeneficiaryInvitePayload(values): CreateBeneficiaryBody`
- Produces: `buildGroupPayload(values): CreateGroupBody`
- Produces: `GROUP_COLOR_PALETTE` with six stable palette entries.

- [ ] Write failing table tests for trimming, lowercasing email, email validation, optional-field omission, avatar file ID, group IDs, description omission, and colour bounds.
- [ ] Run `bun test src/features/beneficiaries/sheet-forms.test.ts` and confirm the module/API is missing.
- [ ] Implement typed payload builders and extend beneficiary/group types minimally.
- [ ] Run the focused test and confirm it passes.

### Task 2: Expanded beneficiary mutation

**Files:**
- Modify: `src/hooks/mutations/use-beneficiary-mutations.ts`
- Modify: `src/features/beneficiaries/settings-flow.test.ts`

**Interfaces:**
- Consumes: `CreateBeneficiaryBody`.
- Produces: `useAddBeneficiary().mutateAsync(payload)` with the full atomic payload and existing cache behavior.

- [ ] Add a failing contract test proving the hook consumes the shared expanded payload rather than an inline three-field type.
- [ ] Run the focused beneficiary test and confirm failure.
- [ ] Replace the inline payload type with `CreateBeneficiaryBody`; keep the endpoint and cache update unchanged.
- [ ] Run focused tests and confirm they pass.

### Task 3: Invite Beneficiary reference sheet

**Files:**
- Replace: `src/components/sheets/AddBeneficiarySheet.tsx`
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `src/features/beneficiaries/settings-flow.test.ts`

**Interfaces:**
- Consumes: `useGroups`, `useFileUpload`, `buildBeneficiaryInvitePayload`, and expanded `useAddBeneficiary`.
- Produces: self-managed 92% sheet with avatar picker, five form areas, searchable multi-select groups, and fixed footer.

- [ ] Add failing layout/contract assertions for self-managed registration, 92% snap point, fixed sibling footer, image picker, group query, and payload builder.
- [ ] Run the focused test and confirm failure.
- [ ] Implement the header/body/footer layout, functional controls, validation, upload-before-submit flow, haptics, loading, and warm error feedback.
- [ ] Run focused tests and TypeScript; confirm they pass.

### Task 4: Create Group reference sheet

**Files:**
- Replace: `src/components/sheets/CreateGroupSheet.tsx`
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `src/features/beneficiaries/create-group-sheet-runtime.test.ts`

**Interfaces:**
- Consumes: `GROUP_COLOR_PALETTE`, `buildGroupPayload`, `useCreateGroup`, and `useUpdateGroup`.
- Produces: self-managed 78% create/edit sheet with fixed footer and persisted colour selection.

- [ ] Add failing tests for 78% registration, Group copy, absence of member-selection UI, palette use, payload builder, and fixed sibling footer.
- [ ] Run the focused test and confirm failure.
- [ ] Implement the reference layout, create/edit initialization, colour selection, submission, haptics, and error retention.
- [ ] Run focused tests and TypeScript; confirm they pass.

### Task 5: Verification

**Files:**
- Verify all files above.

- [ ] Run `bun run verify` and require lint, TypeScript, all tests, and production readiness to pass.
- [ ] Launch the iOS simulator build and manually verify sheet heights, keyboard focus on final inputs, pinned footers, avatar selection, group filtering, colour selection, and create/edit submission wiring.
- [ ] Keep the specification and plan uncommitted.
