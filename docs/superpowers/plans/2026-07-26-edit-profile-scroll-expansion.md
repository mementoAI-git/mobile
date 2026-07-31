# Edit Profile Scroll Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Edit Profile from 92% to full height when its form begins scrolling.

**Architecture:** Keep snap-point control in `SheetManager`, which owns the
modal ref. Pass a stable `expandSheet` callback to self-managed sheets and use
it only from Edit Profile's scroll view.

**Tech Stack:** React Native, Expo, `@gorhom/bottom-sheet`, Bun tests.

## Global Constraints

- Scope behavior only to Edit Profile.
- Preserve the pinned footer and explicit footer clearance.
- Keep all spec, plan, and implementation changes local and uncommitted.

---

### Task 1: Add Edit Profile scroll expansion

**Files:**
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `src/components/sheets/EditProfileSheet.tsx`
- Test: `src/features/settings/settings-sheet-footer-layout.test.ts`

**Interfaces:**
- `SheetManager` produces `expandSheet: () => void`.
- `EditProfileSheet` consumes `expandSheet` through its props.

- [ ] **Step 1: Write the failing test**

Assert that Edit Profile has `['92%', '100%']`, the manager passes
`expandSheet`, and the profile scroll view invokes it from
`onScrollBeginDrag`.

- [ ] **Step 2: Verify the test fails**

Run:

```bash
bun test src/features/settings/settings-sheet-footer-layout.test.ts
```

Expected: the new scroll-expansion test fails.

- [ ] **Step 3: Implement the minimal behavior**

Add the second snap point, create a stable callback that calls
`modalRef.current?.snapToIndex(1)`, pass it into self-managed content, and
attach it to Edit Profile's `BottomSheetScrollView.onScrollBeginDrag`.

- [ ] **Step 4: Verify focused and full checks**

Run:

```bash
bun test src/features/settings/settings-sheet-footer-layout.test.ts
bun run verify
git diff --check
```

Expected: every command exits successfully.

