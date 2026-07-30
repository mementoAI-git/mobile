# Send Feedback Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated feedback screen with robust optional screenshot uploads.

**Architecture:** The Settings hub navigates to a route. A mutation hook owns submission; the route owns draft and attachment presentation state and reuses shared media and UI infrastructure.

**Tech Stack:** Expo Router, Expo ImagePicker, TanStack Query, Axios upload progress, Zustand SheetManager, Bun tests.

## Global Constraints

- Reuse existing shared controls, permission recovery, upload mutation, and feedback endpoint.
- Keep specs and plans local and uncommitted.
- Do not submit while uploads are pending or failed.

---

### Task 1: Add failing flow contracts

**Files:**
- Create: `src/features/feedback/feedback-settings.test.ts`

- [ ] Test route navigation, shared select/input/button usage, multiple image picking, upload lifecycle UI, and feedback mutation.
- [ ] Run the test and verify RED.

### Task 2: Extract submission and build the route

**Files:**
- Create: `src/hooks/mutations/use-feedback-mutation.ts`
- Create: `app/settings/feedback.tsx`
- Modify: `app/settings/index.tsx`
- Modify: `src/features/account/settings-navigation.test.ts`

- [ ] Implement the mutation and dedicated reference screen.
- [ ] Add progress, retry, removal, submit gating, and safe-back behavior.
- [ ] Run the focused tests and verify GREEN.

### Task 3: Verify

- [ ] Run TypeScript, lint, the full test suite, production readiness, and `git diff --check`.

