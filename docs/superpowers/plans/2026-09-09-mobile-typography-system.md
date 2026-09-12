# Mobile Typography System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Memento mobile’s fragmented typography declarations with one Overview-derived semantic scale across every visible application surface.

**Architecture:** `src/constants/typography.ts` will be the only authority for visible font family, size, weight, and line height. Shared UI primitives will apply semantic roles internally; screens and feature components will compose those roles with color and layout only. A final repository scanner prevents arbitrary sizes, raw weights, and feature-specific typography maps from returning.

**Tech Stack:** React Native 0.86, Expo Router 57, TypeScript 6, NativeWind 4, Bun test, ESLint, iOS Simulator

**Spec:** `docs/superpowers/specs/2026-09-09-mobile-typography-system-design.md`

## Global Constraints

- Overview is the typography baseline for the entire mobile application.
- EBGaramond is used only for editorial display roles; Inter is used for UI, body, forms, metadata, and controls.
- Font weight comes from a loaded `FONTS.*` family and is never layered on with `fontWeight`.
- Existing colors, copy, data contracts, navigation, business logic, accessibility scaling, and minimum tap targets must remain unchanged.
- Layout spacing may change only where normalized text metrics otherwise clip or wrap incorrectly.
- Every migration batch must pass its targeted contract tests, lint, and typecheck before commit.

---

### Task 1: Establish the global semantic typography authority

**Files:**
- Create: `src/constants/typography.ts`
- Create: `src/features/startup/typography-system.test.ts`
- Modify: `src/constants/tokens.ts`

**Interfaces:**
- Consumes: existing `FONTS` family names from `src/constants/tokens.ts`
- Produces: `TYPE: Record<TypographyRole, TextStyle>` and `TypographyRole`

- [ ] **Step 1: Write the failing semantic-scale test**

Create `src/features/startup/typography-system.test.ts`:

```ts
import {describe, expect, test} from 'bun:test';
import {TYPE} from '@/constants/typography';
import {FONTS} from '@/constants/tokens';

describe('global typography system', () => {
  test('matches the approved Overview-derived role scale', () => {
    expect(TYPE).toMatchObject({
      displayStat: {fontFamily: FONTS.serif, fontSize: 48, lineHeight: 54},
      displayTitle: {fontFamily: FONTS.serif, fontSize: 36, lineHeight: 42},
      screenTitle: {fontFamily: FONTS.serif, fontSize: 28, lineHeight: 34},
      greeting: {fontFamily: FONTS.sans, fontSize: 24, lineHeight: 32},
      sectionTitle: {fontFamily: FONTS.serif, fontSize: 22, lineHeight: 28},
      cardTitle: {fontFamily: FONTS.serifMedium, fontSize: 20, lineHeight: 26},
      uiTitle: {fontFamily: FONTS.sansSemi, fontSize: 20, lineHeight: 26},
      bodyLarge: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 24},
      body: {fontFamily: FONTS.sans, fontSize: 15, lineHeight: 23},
      bodySmall: {fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19},
      label: {fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 20},
      button: {fontFamily: FONTS.sansSemi, fontSize: 16, lineHeight: 22},
      buttonSmall: {fontFamily: FONTS.sansSemi, fontSize: 14, lineHeight: 20},
      metadata: {fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 16},
      eyebrow: {fontFamily: FONTS.sansBold, fontSize: 10, lineHeight: 14},
      input: {fontFamily: FONTS.sans, fontSize: 16, lineHeight: 22},
      stat: {fontFamily: FONTS.sansBold, fontSize: 20, lineHeight: 26},
      mono: {fontFamily: FONTS.mono, fontSize: 13, lineHeight: 19},
    });
  });

  test('exposes only the approved role names', () => {
    expect(Object.keys(TYPE).sort()).toEqual([
      'body', 'bodyLarge', 'bodySmall', 'button', 'buttonSmall', 'cardTitle',
      'displayStat', 'displayTitle', 'eyebrow', 'greeting', 'input', 'label',
      'metadata', 'mono', 'screenTitle', 'sectionTitle', 'stat', 'uiTitle',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `bun test src/features/startup/typography-system.test.ts`

Expected: FAIL because `src/constants/typography.ts` does not exist.

- [ ] **Step 3: Implement the complete scale**

Create `src/constants/typography.ts` using `StyleSheet.create` and the exact 18 role objects asserted above. Export `type TypographyRole = keyof typeof TYPE`. Add `export {TYPE}` from `src/constants/tokens.ts` only if doing so does not create a module cycle; otherwise require direct imports from `@/constants/typography` throughout the migration.

- [ ] **Step 4: Verify the foundation**

Run: `bun test src/features/startup/typography-system.test.ts && bun run typecheck && bun run lint`

Expected: both tests pass; TypeScript and ESLint exit 0.

- [ ] **Step 5: Commit the foundation**

```bash
git add src/constants/typography.ts src/constants/tokens.ts src/features/startup/typography-system.test.ts
git commit -m "feat(mobile): add global typography roles"
```

---

### Task 2: Migrate shared primitives and application chrome

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/TextInput.tsx`
- Modify: `src/components/ui/DashboardHeader.tsx`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/ui/Select.tsx`
- Modify: `src/components/ui/Tabs.tsx`
- Modify: `src/components/ui/MemTag.tsx`
- Modify: `src/components/ui/Toast.tsx`
- Modify: `src/components/ui/OfflineNotice.tsx`
- Modify: `src/components/ui/PermissionRecoveryState.tsx`
- Modify: `src/components/ui/RecordingStatus.tsx`
- Modify: `src/components/ui/StatCard.tsx`
- Modify: `src/components/ui/LinkPreview.tsx`
- Modify: `src/components/ui/EditorActionBar.tsx`
- Modify: `src/components/ui/MediaPickerMenu.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/ui/Avatar.tsx`
- Modify: `src/components/ui/Logo.tsx`
- Modify: `src/components/TabBar.tsx`
- Create: `src/features/startup/shared-typography-wiring.test.ts`

**Interfaces:**
- Consumes: `TYPE` from Task 1
- Produces: shared primitives whose visible text metrics are controlled internally by semantic roles

- [ ] **Step 1: Write the failing shared-component contract**

Create a source contract that reads every file above and asserts each imports `@/constants/typography`. Assert `Button.tsx` uses `TYPE.button` and `TYPE.buttonSmall`, `TextInput.tsx` uses `TYPE.input` and `TYPE.label`, `DashboardHeader.tsx` uses `TYPE.screenTitle`, `EmptyState.tsx` uses `TYPE.cardTitle` and `TYPE.bodySmall`, and `TabBar.tsx` uses `TYPE.label` or `TYPE.metadata`. Also assert these files contain no `fontWeight:` declarations.

- [ ] **Step 2: Run the contract and observe failures**

Run: `bun test src/features/startup/shared-typography-wiring.test.ts`

Expected: FAIL listing shared components that still define local metrics.

- [ ] **Step 3: Apply semantic roles to shared controls**

For each component, import `TYPE` and compose it first in the `style` array:

```tsx
<Text style={[TYPE.button, {color: textColor}, textStyle]}>{children}</Text>
```

Map standard button sizes to `TYPE.button`, compact sizes to `TYPE.buttonSmall`, inputs to `TYPE.input`, field captions to `TYPE.label`, helper text to `TYPE.bodySmall`, badges/tags to `TYPE.eyebrow`, and ordinary navigation labels to `TYPE.label`. Remove typography-related Tailwind classes and local font declarations while retaining layout and color classes.

- [ ] **Step 4: Verify shared UI and smoke-test stateful variants**

Run: `bun test src/features/startup/shared-typography-wiring.test.ts src/features/navigation/tab-bar-layout.test.ts src/features/layout/modal-safe-area.test.ts && bun run typecheck && bun run lint`

In iOS Simulator, inspect Overview header, tab bar, a button loading state, a text input with placeholder, an empty state, and a toast. Confirm no label clipping or NativeWind animated-style upgrade errors.

- [ ] **Step 5: Commit shared primitives**

```bash
git add src/components/ui src/components/TabBar.tsx src/features/startup/shared-typography-wiring.test.ts
git commit -m "refactor(mobile): unify shared component typography"
```

---

### Task 3: Migrate the five primary product tabs

**Files:**
- Modify: `app/(tabs)/overview/index.tsx`
- Modify: `app/(tabs)/stories/index.tsx`
- Modify: `app/(tabs)/stories/[id].tsx`
- Modify: `app/(tabs)/explore/index.tsx`
- Modify: `app/(tabs)/explore/[id].tsx`
- Modify: `app/(tabs)/capsule/index.tsx`
- Modify: `src/screens/ChatScreen.tsx`
- Modify: `src/components/overview/ActivityListItem.tsx`
- Modify: `src/components/overview/BrowseTopicsSection.tsx`
- Modify: `src/components/overview/DailyPromptSection.tsx`
- Modify: `src/components/overview/RecentActivitiesSection.tsx`
- Modify: `src/components/overview/TopicCard.tsx`
- Modify: `src/components/memory/ConversationBar.tsx`
- Modify: `src/components/memory/MasonryMemoryCard.tsx`
- Modify: `src/components/memory/StoryHtmlBody.tsx`
- Modify: `src/components/explore/CategoryCard.tsx`
- Modify: `src/components/explore/ContinueReflectingCard.tsx`
- Modify: `src/components/capsule/CapsuleCard.tsx`
- Modify: `src/components/capsule/StylePicker.tsx`
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/TypingIndicator.tsx`
- Modify: `src/components/chat/DeepDiveBanner.tsx`
- Modify: `src/components/chat/DeepDiveNudge.tsx`
- Modify: `src/components/chat/HostChatJumpPills.tsx`
- Modify: `src/components/chat/MilestoneCard.tsx`
- Modify: `src/components/chat/PromptReflectionHeader.tsx`
- Modify: `src/components/chat/EmojiPickerSheet.tsx`
- Modify: `src/components/chat/ChatAttachmentPickerSheet.tsx`
- Modify: `src/components/chat/VoiceUpgradeScreen.tsx`
- Create: `src/features/startup/primary-surface-typography.test.ts`

**Interfaces:**
- Consumes: global roles and migrated shared primitives
- Produces: canonical reference implementations for every major product surface

- [ ] **Step 1: Add a failing primary-surface compliance test**

Read the files above and assert they import `TYPE` whenever they render `Text` or `Animated.Text`. Reject `fontWeight:`, arbitrary `text-[Npx]`, and direct `fontSize:` declarations. Permit layout measurement constants only when their identifier contains `HEIGHT`, `WIDTH`, `OFFSET`, or `THRESHOLD` and they are not passed to a text style.

- [ ] **Step 2: Run the test and capture the migration list**

Run: `bun test src/features/startup/primary-surface-typography.test.ts`

Expected: FAIL with the remaining Overview, chat, story, explore, and capsule declarations.

- [ ] **Step 3: Migrate Overview without changing its optical baseline**

Replace the Overview reference values with equivalent roles: 48/54 enrichment → `TYPE.displayStat`; 24/32 greeting → `TYPE.greeting`; 22/28 sections → `TYPE.sectionTitle`; 16/24 hero copy → `TYPE.bodyLarge`; 15/23 explanatory text → `TYPE.body`; 20/26 counters → `TYPE.stat`; 11/16 metadata → `TYPE.metadata`; 10/14 uppercase chips → `TYPE.eyebrow`. Preserve colors and animated styles through arrays such as `[TYPE.greeting, animatedStyle, {color: COLORS.textStrong}]`.

- [ ] **Step 4: Migrate Stories, Explore, Capsules, and Chat**

Use `TYPE.screenTitle` for route headers, `TYPE.sectionTitle` for major groups, `TYPE.cardTitle` for editorial cards, `TYPE.body` for user-authored story and message text, `TYPE.bodySmall` for supporting descriptions, `TYPE.metadata` for dates/durations/file details, and `TYPE.eyebrow` for uppercase statuses. Rich story `<strong>` content uses the same body size with `FONTS.sansBold`; it must not introduce a second size.

- [ ] **Step 5: Verify primary surfaces visually and automatically**

Run: `bun test src/features/startup/primary-surface-typography.test.ts src/features/chat src/features/memories src/features/explore src/features/capsules && bun run typecheck && bun run lint`

Capture Overview, an active chat, Stories list/detail, Explore list/detail, and Capsules on the same simulator. Compare equivalent screen titles, section titles, card titles, body copy, and metadata side by side.

- [ ] **Step 6: Commit primary surfaces**

```bash
git add 'app/(tabs)' src/screens/ChatScreen.tsx src/components/overview src/components/memory src/components/explore src/components/capsule src/components/chat src/features/startup/primary-surface-typography.test.ts
git commit -m "refactor(mobile): align primary surface typography"
```

---

### Task 4: Migrate account, settings, billing, and management sheets

**Files:**
- Modify: `app/account.tsx`
- Modify: `app/insights.tsx`
- Modify: `app/pricing.tsx`
- Modify: every TSX route under `app/settings/`
- Modify: every TSX component under `src/components/account/`
- Modify: every TSX component under `src/components/billing/`
- Modify: `src/components/settings/SettingsHubRow.tsx`
- Delete: `src/components/settings/settings-typography.ts`
- Modify: every TSX component under `src/components/sheets/`
- Modify: `src/components/beneficiaries/BeneficiaryPersonRow.tsx`
- Create: `src/features/startup/settings-typography-compliance.test.ts`
- Modify: `src/features/settings/settings-typography.test.ts`

**Interfaces:**
- Consumes: `TYPE` and shared primitives
- Produces: Settings and account surfaces visually aligned with equivalent Overview roles

- [ ] **Step 1: Replace the old Settings test with a failing global-role contract**

Update `src/features/settings/settings-typography.test.ts` to assert the Settings routes import `TYPE`, use `TYPE.screenTitle` for route titles, `TYPE.sectionTitle` or `TYPE.uiTitle` for section/sheet headings, `TYPE.label` for rows and fields, and `TYPE.body`/`TYPE.bodySmall` for values and supporting copy. Assert no file imports `settings-typography`.

- [ ] **Step 2: Run the Settings contracts and verify failure**

Run: `bun test src/features/settings/settings-typography.test.ts src/features/startup/settings-typography-compliance.test.ts`

Expected: FAIL while `SETTINGS_TYPE` and local billing/sheet metrics remain.

- [ ] **Step 3: Migrate account and route-level Settings typography**

Replace `SETTINGS_TYPE` consumers with corresponding global roles. Use 28/34 serif for every route title, 22/28 serif for editorial sections, 20/26 Inter SemiBold for functional dialog headings, 15/23 for values, 14/20 Medium for rows/fields, and 13/19 for helper text. Remove oversized per-route headings and preserve each route’s spacing, iconography, and actions.

- [ ] **Step 4: Migrate billing and every shared sheet**

For billing, keep banner copy compact with `TYPE.bodySmall`/`TYPE.buttonSmall`, ledger rows at `TYPE.body` plus `TYPE.stat`, and section headers at `TYPE.uiTitle`. For sheets, use `TYPE.uiTitle` in functional headers, `TYPE.label` for fields, `TYPE.input` for inputs, `TYPE.bodySmall` for helper copy, and shared Button typography for footers. Confirm fixed footers remain outside scroll containers.

- [ ] **Step 5: Remove the feature-specific map and verify**

Delete `src/components/settings/settings-typography.ts`. Run:

`bun test src/features/settings src/features/account src/features/startup/settings-typography-compliance.test.ts && bun run typecheck && bun run lint`

In Simulator, inspect Settings hub, Account, Insights, free and paid Billing, beneficiary detail, Privacy, Security, Edit Profile, Edit Billing Details, Add Payment Method, and one destructive confirmation.

- [ ] **Step 6: Commit settings and sheets**

```bash
git add app/account.tsx app/insights.tsx app/pricing.tsx app/settings src/components/account src/components/billing src/components/settings src/components/sheets src/components/beneficiaries src/features/settings src/features/startup/settings-typography-compliance.test.ts
git commit -m "refactor(mobile): normalize settings typography"
```

---

### Task 5: Migrate editors, creation flows, media, and voice surfaces

**Files:**
- Modify: `app/editor.tsx`
- Modify: `app/article.tsx`
- Modify: `app/create.tsx`
- Modify: `app/share.tsx`
- Modify: `app/chat/media.tsx`
- Modify: `app/chat/settings.tsx`
- Modify: `app/voice-call.tsx`
- Modify: `app/coming-soon.tsx`
- Modify: `src/components/ui/MediaPreviewModal.tsx`
- Modify: `src/components/ui/CameraCaptureModal.tsx`
- Modify: `src/components/audio/StoryNarrationPlayer.tsx`
- Create: `src/features/startup/editor-media-typography.test.ts`

**Interfaces:**
- Consumes: global roles and migrated UI controls
- Produces: typography-compliant long-form creation, media, and voice experiences

- [ ] **Step 1: Add the failing editor/media source contract**

Assert every file above imports `TYPE`, contains no numeric native `fontSize`, no arbitrary pixel text class, and no raw `fontWeight`. Assert editor WebView CSS interpolates approved exported numeric metrics rather than duplicating unexplained literals.

- [ ] **Step 2: Run the contract and confirm the high-density files fail**

Run: `bun test src/features/startup/editor-media-typography.test.ts`

Expected: FAIL, led by `app/editor.tsx`, `app/article.tsx`, `app/create.tsx`, and `MediaPreviewModal.tsx`.

- [ ] **Step 3: Migrate native editor and media chrome**

Map screen headers to `TYPE.screenTitle`, functional tool headings to `TYPE.uiTitle`, user content to `TYPE.body`, field labels to `TYPE.label`, controls to shared Button roles, and media metadata to `TYPE.metadata` or `TYPE.eyebrow`. Keep overlay contrast colors and all media playback behavior unchanged.

- [ ] **Step 4: Align rich editor CSS with the native scale**

Export a frozen `TYPE_METRICS` object from `src/constants/typography.ts` containing the same numeric sizes and line heights used by `TYPE`. Interpolate `TYPE_METRICS.body`, `TYPE_METRICS.sectionTitle`, and `TYPE_METRICS.metadata` into editor CSS generation so the WebView renders 15/23 body copy, 22/28 section headings, and 11/16 metadata. Do not alter persisted HTML.

- [ ] **Step 5: Verify creation and media behavior**

Run: `bun test src/features/startup/editor-media-typography.test.ts src/features/editor src/features/media src/features/audio && bun run typecheck && bun run lint`

In Simulator, verify short and long editor content, publish sheet, create flow, story narration, media gallery, image/video preview, chat media, voice call, and Coming Soon without clipped controls or changed persisted content.

- [ ] **Step 6: Commit editor and media surfaces**

```bash
git add app/editor.tsx app/article.tsx app/create.tsx app/share.tsx app/chat app/voice-call.tsx app/coming-soon.tsx src/components/ui/MediaPreviewModal.tsx src/components/ui/CameraCaptureModal.tsx src/components/audio src/constants/typography.ts src/features/startup/editor-media-typography.test.ts
git commit -m "refactor(mobile): unify editor and media typography"
```

---

### Task 6: Migrate authentication, onboarding, invitation, and system states

**Files:**
- Modify: every TSX route under `app/(auth)/`
- Modify: every TSX route under `app/(onboard)/`
- Modify: `app/accept-invite/[id].tsx`
- Modify: `src/components/onboarding/SelectionChip.tsx`
- Modify: `src/components/system/AnimatedSplash.tsx`
- Modify: `src/components/system/AppErrorBoundary.tsx`
- Create: `src/features/startup/auth-onboarding-typography.test.ts`

**Interfaces:**
- Consumes: `TYPE`, migrated inputs, and migrated buttons
- Produces: acquisition and recovery flows using the same hierarchy as the signed-in product

- [ ] **Step 1: Add the failing auth/onboarding contract**

Assert all route and component files above import `TYPE` when they render text and reject direct size/weight declarations. Assert page titles use `TYPE.screenTitle` or the rare `TYPE.displayTitle`, explanatory copy uses `TYPE.bodyLarge`/`TYPE.body`, labels use `TYPE.label`, and helper/error copy uses `TYPE.bodySmall`.

- [ ] **Step 2: Run the contract and confirm failures**

Run: `bun test src/features/startup/auth-onboarding-typography.test.ts`

Expected: FAIL for existing standalone marketing and form sizes.

- [ ] **Step 3: Migrate auth and onboarding**

Use `TYPE.displayTitle` only for the primary first-run headline. All other route titles use `TYPE.screenTitle`; option headings use `TYPE.cardTitle`; paragraphs use `TYPE.bodyLarge` or `TYPE.body`; input captions use `TYPE.label`; verification/helper text uses `TYPE.bodySmall`; action labels remain owned by Button. Preserve keyboard behavior, validation, OAuth, verification, and onboarding persistence.

- [ ] **Step 4: Migrate system and invitation states**

Apply `TYPE.screenTitle`, `TYPE.body`, `TYPE.bodySmall`, and shared Button roles to invitation acceptance, splash status, and fatal-error recovery. Do not change error-boundary behavior or splash timing.

- [ ] **Step 5: Verify acquisition flows**

Run: `bun test src/features/startup/auth-onboarding-typography.test.ts src/features/auth src/features/security && bun run typecheck && bun run lint`

Inspect login, registration, password recovery, verification, 2FA, each onboarding step, invitation acceptance, splash, and error recovery at standard and increased system text sizes.

- [ ] **Step 6: Commit acquisition surfaces**

```bash
git add 'app/(auth)' 'app/(onboard)' app/accept-invite src/components/onboarding src/components/system src/features/startup/auth-onboarding-typography.test.ts
git commit -m "refactor(mobile): align auth and onboarding typography"
```

---

### Task 7: Add repository-wide regression enforcement and clear residual debt

**Files:**
- Create: `scripts/check-typography-compliance.js`
- Create: `src/features/startup/typography-compliance.test.ts`
- Modify: `package.json`
- Modify: any remaining `.ts` or `.tsx` file reported by the scanner under `app/` or `src/`

**Interfaces:**
- Consumes: all migration batches
- Produces: `bun run check:typography` and a zero-debt application tree

- [ ] **Step 1: Write the failing repository-wide compliance test**

Create `src/features/startup/typography-compliance.test.ts` to execute the scanner and assert an empty violation array. The scanner recursively reads `.ts` and `.tsx` files under `app` and `src`, excluding tests, type-only declarations, and `src/constants/typography.ts`.

- [ ] **Step 2: Implement the scanner**

`scripts/check-typography-compliance.js` must report file, line, and rule for these patterns:

```js
const rules = [
  ['inline-font-size', /fontSize\s*:\s*\d+(?:\.\d+)?/g],
  ['inline-font-weight', /fontWeight\s*:/g],
  ['arbitrary-text-size', /text-\[\d+(?:\.\d+)?px\]/g],
  ['tailwind-text-size', /\btext-(?:xs|sm|base|lg|xl|[2-6]xl)\b/g],
  ['tailwind-font-weight', /\bfont-(?:normal|medium|semibold|bold)\b/g],
  ['settings-type-import', /settings-typography/g],
];
```

The module exports `findTypographyViolations(rootDir)` and exits non-zero when invoked directly with any violation. The allowlist contains only `src/constants/typography.ts`; code-rendered editor CSS is compliant through `TYPE_METRICS` and receives no blanket exemption.

- [ ] **Step 3: Run the scanner and migrate every residual file**

Run: `node scripts/check-typography-compliance.js`

For each reported visible text declaration, import and apply the correct `TYPE` role. For false positives in non-text utility code, narrow the scanner using AST-adjacent context or rename the non-typographic constant; do not add file-level allowlists.

- [ ] **Step 4: Wire compliance into standard verification**

Add `"check:typography": "node scripts/check-typography-compliance.js"` and change `verify` to:

```json
"verify": "bun run lint && bun run typecheck && bun run check:typography && bun run test && bun run check:prod"
```

- [ ] **Step 5: Verify zero typography debt**

Run:

```bash
bun run check:typography
rg -n "fontSize:\\s*[0-9]+|fontWeight:|text-\\[[0-9]+px\\]|\\btext-(xs|sm|base|lg|xl|[2-6]xl)\\b|\\bfont-(normal|medium|semibold|bold)\\b|settings-typography" app src --glob '!*.test.ts' --glob '!*.test.tsx'
```

Expected: compliance exits 0. The raw `rg` output contains only `src/constants/typography.ts` and documented non-runtime test fixtures.

- [ ] **Step 6: Commit enforcement**

```bash
git add scripts/check-typography-compliance.js src/features/startup/typography-compliance.test.ts package.json app src
git commit -m "test(mobile): enforce semantic typography"
```

---

### Task 8: Complete cross-surface visual and release verification

**Files:**
- Modify only files with defects discovered by this verification task
- Update: `docs/superpowers/plans/2026-09-09-mobile-typography-system.md` checkbox state

**Interfaces:**
- Consumes: the fully migrated application and compliance scanner
- Produces: release-ready evidence and a clean integration boundary

- [ ] **Step 1: Run the complete automated gate**

Run: `bun run verify:full`

Expected: ESLint, TypeScript, typography compliance, all Bun tests, production readiness, and all 21 Expo Doctor checks pass. If Expo Doctor cannot reach Expo’s API, record the network failure separately and rerun when connectivity is available; do not label it a code failure.

- [ ] **Step 2: Run iOS visual matrix**

Start `npx expo start --ios --port 3001`. Capture and compare: Overview; Chat; Stories list/detail; Explore list/detail; Capsules; Account; Settings; Billing free/paid/invoices; beneficiary detail; security/privacy; short and long sheets; editor with short/long content; media preview; login; onboarding; pricing; invitation; empty state. Repeat form and long-sheet captures with the keyboard open.

- [ ] **Step 3: Run accessibility scaling matrix**

On iOS, increase system text to one step above default and repeat Settings, Billing, editor, chat composer, and a long sheet. Confirm wrapping occurs without overlap, truncation, hidden actions, or disabled scrolling. No component may disable font scaling to force a pass.

- [ ] **Step 4: Run Android metric checks**

Run `npx expo start --android --port 3002` on an available emulator. Inspect Overview, Settings, Billing, editor, and a long sheet for baseline drift or clipping. Make platform-specific layout adjustments only when required; typography roles remain identical.

- [ ] **Step 5: Re-run the full gate after visual corrections**

Run: `bun run verify:full && git diff --check`

Expected: complete exit 0 and no whitespace errors.

- [ ] **Step 6: Commit final visual corrections**

```bash
git add app src docs/superpowers/plans/2026-09-09-mobile-typography-system.md
git commit -m "fix(mobile): finish typography visual parity"
```

- [ ] **Step 7: Review the branch for integration**

Run: `git status --short && git log --oneline --decorate -10`

Expected: clean worktree with the typography commits ordered after design and plan documentation.
