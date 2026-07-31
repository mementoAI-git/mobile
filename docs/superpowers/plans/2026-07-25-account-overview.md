# Account Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the supplied Account overview UI at `/account`, route every `DashboardHeader` profile circle to it, and keep the existing settings hub behind the Account gear button.

**Architecture:** A top-level route composes existing profile, user-stats, subscription, sheet, avatar, billing, and settings flows. Pure helpers own score clamping and Monday-first week derivation; focused presentation components render the three major cards without fetching data themselves.

**Tech Stack:** Expo Router 56, React Native 0.85, React 19, TypeScript 6, NativeWind, Reanimated 4, TanStack Query 5, Zustand 5, Bun test.

## Global Constraints

- The supplied screenshot is the visual source of truth at 786×1754.
- Reuse existing Memento components, hooks, assets, tokens, and sheets before creating new primitives.
- The profile circle routes to `/account`; Account gear routes to `/settings/profile`.
- Keep `/settings/profile` and all settings child routes unchanged.
- Do not invent biography, subscription, or progress data.
- Every interaction fires haptics and every touch target is at least 44 points.
- Full-screen background uses `COLORS.background`; screen title uses `FONTS.serif`.
- Documentation remains local and uncommitted per user instruction.

---

### Task 1: Account Data Derivation and Navigation Policy

**Files:**
- Create: `src/features/account/account-overview.ts`
- Create: `src/features/account/account-overview.test.ts`
- Modify: `src/components/sheets/StreakSheet.tsx`

**Interfaces:**
- Produces: `clampEnrichmentScore(value: unknown): number`
- Produces: `deriveAccountWeek(today: Date, streakCount: number): AccountWeekDay[]`
- Produces: `AccountWeekDay = { key: string; label: string; date: number; isToday: boolean; isCompleted: boolean }`
- Consumes later: `WeeklyProgressCard.weekDays`

- [ ] **Step 1: Write failing pure-behavior tests**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { clampEnrichmentScore, deriveAccountWeek } from './account-overview';

describe('account overview derivation', () => {
  test('clamps enrichment to an integer percentage', () => {
    expect(clampEnrichmentScore(-4)).toBe(0);
    expect(clampEnrichmentScore(36.4)).toBe(36);
    expect(clampEnrichmentScore(180)).toBe(100);
    expect(clampEnrichmentScore(undefined)).toBe(0);
  });

  test('builds a Monday-first week and marks streak days through today', () => {
    const week = deriveAccountWeek(new Date('2026-07-22T12:00:00.000Z'), 3);
    expect(week.map((day) => day.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(week.map((day) => day.date)).toEqual([20, 21, 22, 23, 24, 25, 26]);
    expect(week.filter((day) => day.isCompleted).map((day) => day.date)).toEqual([20, 21]);
    expect(week.find((day) => day.isToday)?.date).toBe(22);
  });
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `bun test src/features/account/account-overview.test.ts`

Expected: FAIL because `account-overview.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```ts
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export interface AccountWeekDay {
  key: string;
  label: string;
  date: number;
  isToday: boolean;
  isCompleted: boolean;
}

export function clampEnrichmentScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function toMondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export function deriveAccountWeek(today: Date, streakCount: number): AccountWeekDay[] {
  const todayIndex = toMondayFirstIndex(today.getDay());
  const completedStart = Math.max(0, todayIndex - Math.max(0, streakCount - 1));

  return WEEK_LABELS.map((label, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index - todayIndex);
    return {
      key: day.toISOString().slice(0, 10),
      label,
      date: day.getDate(),
      isToday: index === todayIndex,
      isCompleted: streakCount > 0 && index < todayIndex && index >= completedStart,
    };
  });
}
```

- [ ] **Step 4: Reuse the exported week-index helper in `StreakSheet`**

Remove the sheet-local `toMonFirstIndex` and import:

```ts
import { toMondayFirstIndex } from '@/features/account/account-overview';
```

Replace:

```ts
const todayMonFirst = toMonFirstIndex(today.getDay());
```

with:

```ts
const todayMonFirst = toMondayFirstIndex(today.getDay());
```

- [ ] **Step 5: Verify green**

Run: `bun test src/features/account/account-overview.test.ts`

Expected: 2 pass, 0 fail.

---

### Task 2: Reusable Account Presentation Components

**Files:**
- Create: `src/components/account/AccountUpgradeBanner.tsx`
- Create: `src/components/account/EnrichmentScoreCard.tsx`
- Create: `src/components/account/WeeklyProgressCard.tsx`
- Create: `src/features/account/account-components.test.ts`

**Interfaces:**
- Consumes: `AccountWeekDay[]`
- Produces: `AccountUpgradeBanner({ isProOrAbove, subscriptionKnown, onPress })`
- Produces: `EnrichmentScoreCard({ score, onPress })`
- Produces: `WeeklyProgressCard({ weekDays, streakCount, storiesCount, reflectionsCount, onPress })`

- [ ] **Step 1: Add a failing source-policy test**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('account overview components', () => {
  test('reuse shared UI and semantic design tokens', async () => {
    const banner = await Bun.file(new URL('../../components/account/AccountUpgradeBanner.tsx', import.meta.url)).text();
    const score = await Bun.file(new URL('../../components/account/EnrichmentScoreCard.tsx', import.meta.url)).text();
    const weekly = await Bun.file(new URL('../../components/account/WeeklyProgressCard.tsx', import.meta.url)).text();

    expect(banner).toContain("from '@/constants/tokens'");
    expect(banner).toContain('LinearGradient');
    expect(banner).toContain('isProOrAbove');
    expect(score).toContain('clampEnrichmentScore');
    expect(score).toContain('accessibilityRole="progressbar"');
    expect(weekly).toContain('AccountWeekDay');
    expect(weekly).toContain('React.memo');
    expect(`${banner}${score}${weekly}`).not.toMatch(/text-gray-|text-slate-|#[0-9a-fA-F]{6}/);
  });
});
```

- [ ] **Step 2: Run the component policy test and verify red**

Run: `bun test src/features/account/account-components.test.ts`

Expected: FAIL because the account components do not exist.

- [ ] **Step 3: Implement `AccountUpgradeBanner`**

Use `expo-linear-gradient`, `Button`, `COLORS`, `FONTS`, and a memoized component. The banner:

- matches the rounded blue reference composition;
- renders `Unlock more with Pro` and upgrade copy for a known free tier;
- renders `Your Pro legacy is active` without an upgrade CTA for paid users;
- renders neutral `Plan details` copy while subscription state is unknown;
- calls the stable `onPress` callback only when an action is shown.

- [ ] **Step 4: Implement `EnrichmentScoreCard`**

Render the title, explanatory copy, large score, segmented rail, and insight row. Use:

```ts
const safeScore = clampEnrichmentScore(score);
```

The rail has an absolute clipping overlay whose width is `${safeScore}%`; include:

```tsx
accessibilityRole="progressbar"
accessibilityValue={{ min: 0, max: 100, now: safeScore }}
```

Use account-level semantic constants derived from existing `COLORS.info`, `COLORS.success`, `COLORS.warning`, `COLORS.brand`, `COLORS.error`, and opacity variants rather than hardcoded hex colors.

- [ ] **Step 5: Implement `WeeklyProgressCard`**

Render:

- dark `COLORS.textStrong` surface;
- seven memoized weekday cells;
- success-token completion circles with `Check`;
- brand-colored today state with `Zap`;
- upcoming numeric dates;
- bottom stats for streak, stories, and reflections.

Wrap the exported component in `React.memo` and use a press-scale animated container with a 44-point minimum target.

- [ ] **Step 6: Verify component policy**

Run: `bun test src/features/account/account-components.test.ts`

Expected: 1 pass, 0 fail.

---

### Task 3: Build the `/account` Route From Existing Data Flows

**Files:**
- Create: `app/account.tsx`
- Create: `src/components/ui/AccountSkeleton.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `app/_layout.tsx`
- Create: `src/features/account/account-navigation.test.ts`

**Interfaces:**
- Consumes: `useProfile()`, `useUserStats()`, `useSubscription()`, `useUiStore`, account presentation components, `Avatar`, `AccountSkeleton`
- Produces: Expo Router route `/account`

- [ ] **Step 1: Write the failing navigation policy test**

```ts
// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('account overview navigation', () => {
  test('registers account and preserves settings as the gear destination', async () => {
    const root = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const account = await Bun.file(new URL('../../../app/account.tsx', import.meta.url)).text();

    expect(root).toContain('<Stack.Screen name="account"');
    expect(account).toContain("router.push('/settings/profile')");
    expect(account).toContain("router.replace('/(tabs)/overview')");
    expect(account).toContain("openSheet('memory-insights')");
    expect(account).toContain("openSheet('streak')");
  });
});
```

- [ ] **Step 2: Run the navigation test and verify red**

Run: `bun test src/features/account/account-navigation.test.ts`

Expected: FAIL because `app/account.tsx` does not exist.

- [ ] **Step 3: Add `AccountSkeleton` and export it**

Create a layout-faithful skeleton using the shared `Skeleton` primitive for the header, banner, profile summary, enrichment card, and weekly card. Export it from `src/components/ui/index.ts`.

- [ ] **Step 4: Implement `app/account.tsx`**

The route:

```ts
const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useProfile();
const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats();
const {
  isProOrAbove,
  data: subscription,
  isLoading: subscriptionLoading,
  refetch: refetchSubscription,
} = useSubscription();
```

Derive:

```ts
const displayName =
  profile?.fullname?.trim() ||
  `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
  profile?.nickname ||
  'Your account';
const biography = profile?.context?.self_description?.trim() || null;
const memberSince = profile?.created_at
  ? `Member since ${dayjs(profile.created_at).format('MMM YYYY')}`
  : null;
const score = clampEnrichmentScore(stats?.enrichment_score);
const streakCount = Number(profile?.streak) || Number(stats?.streak_count) || 0;
const weekDays = deriveAccountWeek(new Date(), streakCount);
```

Stable handlers:

```ts
const handleBack = useCallback(() => {
  Haptics.selectionAsync();
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/overview');
}, [router]);

const handleSettings = useCallback(() => {
  Haptics.selectionAsync();
  router.push('/settings/profile');
}, [router]);

const handleUpgrade = useCallback(() => {
  Haptics.selectionAsync();
  router.push('/settings/billing');
}, [router]);

const handleInsights = useCallback(() => {
  Haptics.selectionAsync();
  openSheet('memory-insights');
}, [openSheet]);

const handleWeeklyProgress = useCallback(() => {
  Haptics.selectionAsync();
  openSheet('streak');
}, [openSheet]);
```

Use `SafeAreaView`, the welcome texture, a `ScrollView`, `RefreshControl`, staggered `FadeInDown`, shared `Avatar`, shared `Button` for compatible actions, and the three account presentation components.

`Edit Profile` routes to `/settings/profile` because no dedicated profile editor exists. Do not invent or edit user biography content.

- [ ] **Step 5: Register the route**

Add to the root stack:

```tsx
<Stack.Screen
  name="account"
  options={{ presentation: 'fullScreenModal', animation: 'slide_from_right' }}
/>
```

- [ ] **Step 6: Verify the route**

Run:

```bash
bun test src/features/account/account-overview.test.ts \
  src/features/account/account-components.test.ts \
  src/features/account/account-navigation.test.ts
bun run typecheck
```

Expected: focused tests and strict TypeScript pass.

---

### Task 4: Redirect the Existing Profile Circle and Validate the UI

**Files:**
- Modify: `src/components/ui/DashboardHeader.tsx`
- Modify: `src/features/account/account-navigation.test.ts`

**Interfaces:**
- Consumes: `/account`
- Produces: profile-circle navigation from every tab header

- [ ] **Step 1: Extend the failing navigation test**

Add:

```ts
const header = await Bun.file(
  new URL('../../components/ui/DashboardHeader.tsx', import.meta.url),
).text();
const settingsIndex = await Bun.file(
  new URL('../../../app/settings/index.tsx', import.meta.url),
).text();

expect(header).toContain("router.push('/account')");
expect(header).not.toContain("router.push('/settings/profile')");
expect(settingsIndex).toContain('href="/settings/profile"');
```

- [ ] **Step 2: Run the navigation test and verify red**

Run: `bun test src/features/account/account-navigation.test.ts`

Expected: FAIL because `DashboardHeader` still pushes `/settings/profile`.

- [ ] **Step 3: Change only the avatar destination**

In `DashboardHeader`, replace:

```ts
router.push('/settings/profile');
```

with:

```ts
router.push('/account');
```

Preserve haptics, avatar rendering, streak behavior, and all header layout.

- [ ] **Step 4: Run focused and full automated verification**

Run:

```bash
bun test src/features/account
bun run lint
bun run typecheck
bun test
bun run check:prod
git diff --check
```

Expected: all commands exit zero.

- [ ] **Step 5: Perform visual and native validation**

Validate against the supplied 786×1754 reference:

- header centering and 44-point controls;
- banner gradient, radius, and CTA;
- name/email/date/avatar alignment;
- profile action sizing;
- enrichment typography, progress fill, and insight row;
- weekly card spacing and seven-day states;
- bottom safe-area clearance;
- one smaller phone width without clipping.

Native checklist:

- profile circle from Overview, Stories, Explore, and Capsule opens `/account`;
- Back returns to the originating tab;
- cold deep link Back falls back to Overview;
- gear opens the unchanged settings hub;
- upgrade opens Billing only when appropriate;
- insights and weekly progress open their existing sheets;
- pull-to-refresh updates shared query caches.

- [ ] **Step 6: Commit implementation only if requested**

Do not stage or commit either local documentation file. If the user requests a commit, stage only runtime source, tests, and any new UI files.
