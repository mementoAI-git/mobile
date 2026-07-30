# Privacy Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the supplied Privacy settings screen and connect its real actions.

**Architecture:** The route renders static transparency content and legal links, while the existing account deletion mutation is invoked through the global SheetManager confirmation flow.

**Tech Stack:** Expo Router, React Native, Zustand SheetManager, TanStack Query mutations, Bun tests.

## Global Constraints

- Reuse existing tokens, URLs, deletion mutation, and shared sheets.
- Do not implement unavailable export or story-sharing behavior.
- Keep this plan and design spec local and uncommitted.

---

### Task 1: Add privacy flow contract

**Files:**
- Create: `src/features/privacy/privacy-settings.test.ts`

- [ ] Test the two legal URLs, disabled “Coming soon” controls, account-deletion mutation, and shared confirmation sheet.
- [ ] Run `bun test src/features/privacy/privacy-settings.test.ts` and verify RED.

### Task 2: Build and wire the screen

**Files:**
- Modify: `app/settings/privacy.tsx`
- Modify: `src/components/sheets/SecurityConfirmationSheet.tsx`

- [ ] Implement the supplied layout using semantic tokens and shared components.
- [ ] Add the `delete-account` confirmation presentation and invoke `useDeleteAccount().mutateAsync()`.
- [ ] Run the focused test and verify GREEN.

### Task 3: Verify

- [ ] Run `bun run typecheck`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run verify`.
- [ ] Run `git diff --check`.

