# Unused Startup Fonts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove four unused font weights from the splash-screen critical path without changing active typography.

**Architecture:** Use a source-policy regression test to protect root font registration, then remove unused Averia and Geist imports/registrations and their unused token aliases.

**Tech Stack:** TypeScript 6, Expo Font 56, Bun test.

## Global Constraints

- Preserve all Inter, EB Garamond, Azeret Mono, and capsule-theme fonts.
- Do not introduce lazy loading in this step.
- Verify no removed `FONTS` alias has a consumer.
- Run full verification.

### Task 1: Remove unused startup font registrations

**Files:**
- Create: `src/features/startup/font-loading.test.ts`
- Modify: `app/_layout.tsx`
- Modify: `src/constants/tokens.ts`

- [ ] **Step 1: Write the failing source-policy test**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('startup font loading', () => {
  test('excludes unused families while retaining core fonts', async () => {
    const layout = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const tokens = await Bun.file(new URL('../../constants/tokens.ts', import.meta.url)).text();

    for (const unused of ['AveriaSerifLibre_', 'Geist_400Regular', 'Geist_700Bold']) {
      expect(layout).not.toContain(unused);
    }
    for (const unusedAlias of ['averia:', 'averiaBold:', 'geist:', 'geistBold:']) {
      expect(tokens).not.toContain(unusedAlias);
    }
    for (const core of ['Inter_400Regular', 'Inter_700Bold', 'EBGaramond_400Regular', 'EBGaramond_700Bold']) {
      expect(layout).toContain(core);
    }
  });
});
```

- [ ] **Step 2: Verify red**

Run `bun test src/features/startup/font-loading.test.ts`; expect the unused-family assertions to fail.

- [ ] **Step 3: Remove only unused registrations**

Delete Averia and Geist Google-font imports and entries from `useFonts`. Delete only the four matching unused `FONTS` aliases. Keep the `'Geist Mono': AzeretMono_400Regular` capsule compatibility mapping.

- [ ] **Step 4: Verify green and full health**

Run the focused test, `bun run verify`, `git diff --check`, and inspect only the test, root layout, and tokens changes.
