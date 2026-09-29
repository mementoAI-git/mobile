# Responsive Size Matters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a safe, consistent responsive sizing system across Memento so the UI preserves its design hierarchy on compact phones, large phones, tablets, split view, landscape, and increased font scales.

**Architecture:** Wrap `react-native-size-matters` in one semantic responsive-metrics module, migrate typography and shared primitives first, and then migrate feature surfaces in dependency order. Use Size Matters only for numeric visual metrics; continue using flexbox, container width, `useWindowDimensions`, safe-area insets, and max-width constraints for actual layout decisions.

**Tech Stack:** Expo, React Native, TypeScript, NativeWind, `react-native-size-matters`, React Native Testing Library/Bun static contract tests, Expo Router.

**Spec:** `docs/superpowers/specs/2026-09-29-responsive-size-matters.md`

## Global Constraints

- Follow `AGENTS.md`; colors and typography must continue using shared semantic tokens.
- Never scale safe-area insets, keyboard values, flex values, percentages, aspect ratios, opacity, animation time, z-index, or 1 dp borders.
- Never reduce a touchable below 44×44 dp.
- Never use Size Matters as a substitute for `flexShrink`, `minWidth: 0`, wrapping, max-width, or measured container width.
- Keep pill radii at `999`; scale only finite radii.
- Preserve Dynamic Type. Do not introduce `allowFontScaling={false}`.
- Do not migrate HTML/PDF/export CSS values in `src/features/export/memoir-html-generator.ts`.
- Do not mechanically transform every numeric literal. Each task below names the permitted categories.
- All changes follow red-green TDD and end in an independently reviewable commit.

## Review Focus

- Compact width plus long/localized labels: badges, tabs, buttons, and headers must wrap or flex without leaving the viewport; Task 3 and Task 5 add containment tests.
- Font scale 1.3–1.5: critical auth, onboarding, settings, billing, and chat actions must remain visible and tappable; Tasks 2, 4, 6, and 8 add accessibility assertions.
- Tablet and split-view widths: content must center and cap instead of expanding indefinitely; Tasks 1, 5, 7, and 12 add max-width tests.
- Rotation/resizing: media grids, emoji grids, galleries, charts, and editor overlays must recompute from live width; Tasks 9, 10, and 13 remove module-level dimension snapshots.
- Keyboard plus safe-area interaction: chat composers and sheet footers must not double-scale inset/keyboard distances; Tasks 8 and 11 add geometry tests.

---

## File structure and ownership

### New shared files

- `src/constants/responsive.ts`: the only general-purpose wrapper around Size Matters.
- `src/features/layout/responsive-metrics.test.ts`: unit tests for floors, caps, and semantic helpers.
- `src/features/layout/responsive-compliance.test.ts`: repository contract preventing prohibited direct imports and module-level dimension snapshots.
- `src/components/ui/ResponsiveScreen.tsx`: optional centered/capped screen gutter wrapper used by ordinary screens, not full-bleed media.
- `src/components/ui/responsive-screen.test.tsx`: width/gutter/max-width tests.

### Existing central files

- `src/constants/typography.ts`: semantic type metrics, conservatively scaled once.
- `src/components/ui/Button.tsx`: responsive heights, spacing, and touch floors.
- `src/components/ui/TextInput.tsx`: responsive input heights, radii, paddings, and icon gaps.
- `src/components/ui/DashboardHeader.tsx`: responsive header geometry and fixed minimum touch target.
- `src/components/sheets/SheetManager.tsx`: responsive horizontal gutter only; measured sheet height remains viewport-based.

---

### Task 1: Responsive metrics foundation

**Files:**
- Create: `src/constants/responsive.ts`
- Create: `src/features/layout/responsive-metrics.test.ts`
- Modify: `src/features/startup/typography-system.test.ts`

**Interfaces:**
- Produces: `hs(value)`, `vs(value)`, `ms(value, factor?)`, `mvs(value, factor?)`, `iconSize(value)`, `radius(value)`, `responsiveSpace(value)`, `minTouchTarget(value?)`, `screenGutter(width)`, and `contentMaxWidth(width)`.
- Consumes: `scale`, `verticalScale`, `moderateScale`, and `moderateVerticalScale` from `react-native-size-matters`.

- [ ] **Step 1: Write failing helper tests**

```ts
import { describe, expect, test } from 'bun:test';
import { minTouchTarget, screenGutter, contentMaxWidth } from '@/constants/responsive';

describe('responsive metrics', () => {
  test('never shrinks a touch target below 44', () => {
    expect(minTouchTarget(32)).toBeGreaterThanOrEqual(44);
  });

  test('caps gutters and reading width on tablets', () => {
    expect(screenGutter(320)).toBeLessThanOrEqual(20);
    expect(screenGutter(1024)).toBeLessThanOrEqual(32);
    expect(contentMaxWidth(1024)).toBeLessThanOrEqual(720);
  });
});
```

- [ ] **Step 2: Run the test and verify missing-module failure**

Run: `bun test src/features/layout/responsive-metrics.test.ts`

Expected: FAIL because `src/constants/responsive.ts` does not exist.

- [ ] **Step 3: Implement the semantic wrapper**

```ts
import {
  moderateScale,
  moderateVerticalScale,
  scale,
  verticalScale,
} from 'react-native-size-matters';

export const hs = (value: number) => Math.round(scale(value));
export const vs = (value: number) => Math.round(verticalScale(value));
export const ms = (value: number, factor = 0.3) => Math.round(moderateScale(value, factor));
export const mvs = (value: number, factor = 0.25) =>
  Math.round(moderateVerticalScale(value, factor));
export const iconSize = (value: number) => ms(value, 0.35);
export const radius = (value: number) => ms(value, 0.2);
export const responsiveSpace = (value: number) => ms(value, 0.35);
export const minTouchTarget = (value = 44) => Math.max(44, mvs(value, 0.2));
export const screenGutter = (width: number) =>
  Math.min(32, width <= 360 ? Math.max(16, hs(18)) : Math.max(20, hs(20)));
export const contentMaxWidth = (width: number) => Math.min(width, 720);
```

- [ ] **Step 4: Run tests, typecheck, and commit**

Run: `bun test src/features/layout/responsive-metrics.test.ts && bun run typecheck`

Expected: PASS.

Commit: `git commit -m "feat(ui): add responsive sizing metrics"`

---

### Task 2: Centralized responsive typography

**Files:**
- Modify: `src/constants/typography.ts`
- Modify: `src/features/startup/typography-system.test.ts`
- Modify: `src/features/settings/settings-typography.test.ts`

**Interfaces:**
- Consumes: `ms` from Task 1.
- Produces: the existing `TYPE` and `TYPE_METRICS` interfaces with conservatively scaled `fontSize` and `lineHeight`; no screen-facing API changes.

- [ ] **Step 1: Add failing semantic-role tests**

Assert that `typography.ts` imports `ms`, applies a factor of `0.2` to body/button/input roles, applies at most `0.25` to display roles, and preserves the existing semantic role names.

```ts
expect(source).toContain("import { ms } from '@/constants/responsive'");
expect(source).toContain("fontSize: ms(15, 0.2)");
expect(source).not.toContain('allowFontScaling={false}');
```

- [ ] **Step 2: Verify the tests fail**

Run: `bun test src/features/startup/typography-system.test.ts src/features/settings/settings-typography.test.ts`

Expected: FAIL because typography is fixed.

- [ ] **Step 3: Convert `TYPE_METRICS` centrally**

Use `ms(base, 0.2)` for metadata through body/input/button roles and `ms(base, 0.25)` for card through display roles. Scale line height independently from its original base; do not calculate line height from the already-scaled font size.

- [ ] **Step 4: Audit bounded text controls**

Keep or add `maxFontSizeMultiplier` only on tab labels, one-line buttons, compact badges, and navigation titles. Prefer wrapping for all other text.

- [ ] **Step 5: Run typography checks and commit**

Run: `bun run check:typography && bun test src/features/startup/typography-system.test.ts src/features/settings/settings-typography.test.ts && bun run typecheck`

Commit: `git commit -m "refactor(ui): scale semantic typography responsively"`

---

### Task 3: Shared primitives and touch targets

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/TextInput.tsx`
- Modify: `src/components/ui/PasswordInput.tsx`
- Modify: `src/components/ui/Checkbox.tsx`
- Modify: `src/components/ui/DashboardHeader.tsx`
- Modify: `src/components/ui/RecordingIconButton.tsx`
- Modify: `src/components/ui/RecordingStatus.tsx`
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/ui/Toast.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/ui/PermissionRecoveryState.tsx`
- Test: extend each adjacent existing UI test; create `src/features/layout/shared-control-sizing.test.ts` for static contracts.

**Interfaces:**
- Consumes: `responsiveSpace`, `radius`, `iconSize`, and `minTouchTarget`.
- Produces: responsive shared controls used by every later task.

- [ ] **Step 1: Write failing control tests**

Test that `Button` and `TextInput` use responsive style metrics rather than Tailwind-only `h-14`/`h-12`, and assert all interactive sizes resolve to at least 44.

- [ ] **Step 2: Migrate `Button` sizes**

Replace `h-*`, `px-*`, and `gap-*` size classes with `style` metrics. Keep variant color classes. `xs` and `sm` may remain visually compact, but their outer pressable must have a 44 dp hit region using `hitSlop` or minimum dimensions.

- [ ] **Step 3: Migrate inputs**

Scale heights modestly with `mvs`; preserve multiline content-driven height. Scale finite radii and internal spacing. Keep focus borders at 1/1.5 dp and pill radius at 999.

- [ ] **Step 4: Migrate headers, status controls, dialogs, toasts, and empty states**

Use responsive icons/artwork and spacing. Every close/back/icon-only control remains at least 44×44. Toast width remains container-aware and capped; do not create a scaled fixed screen width.

- [ ] **Step 5: Verify and commit**

Run: `bun test src/components/ui src/features/layout/shared-control-sizing.test.ts && bun run lint && bun run typecheck`

Commit: `git commit -m "refactor(ui): make shared controls responsive"`

---

### Task 4: Responsive screen shell and standard gutters

**Files:**
- Create: `src/components/ui/ResponsiveScreen.tsx`
- Create: `src/components/ui/responsive-screen.test.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `app/settings/index.tsx`
- Modify: `app/settings/account.tsx`
- Modify: `app/settings/profile.tsx`
- Modify: `app/settings/privacy.tsx`
- Modify: `app/settings/activities.tsx`
- Modify: `app/settings/two-factor.tsx`
- Modify: `app/settings/feedback.tsx`
- Modify: `app/settings/beneficiaries.tsx`

**Interfaces:**
- Consumes: `screenGutter(width)` and `contentMaxWidth(width)`.
- Produces: `<ResponsiveScreen fullBleed={false} maxWidth={720}>` with live width and centered content.

- [ ] **Step 1: Write width behavior tests**

Render at widths 320, 393, and 1024. Assert compact gutters do not exceed 20, reference gutters match the intended composition, and tablet content caps at 720.

- [ ] **Step 2: Implement `ResponsiveScreen`**

Use `useWindowDimensions`; do not use module-level `Dimensions.get`. Preserve safe-area ownership in the route. Expose only container/gutter concerns.

- [ ] **Step 3: Adopt it on ordinary Settings screens**

Remove duplicated fixed horizontal paddings from the files listed above. Do not migrate full-bleed colored cards or list separators into the capped content wrapper unless the design requires it.

- [ ] **Step 4: Verify and commit**

Run: `bun test src/components/ui/responsive-screen.test.tsx src/features/settings && bun run typecheck`

Commit: `git commit -m "feat(ui): add responsive screen gutters"`

---

### Task 5: Navigation, tab bar, and shared banners

**Files:**
- Modify: `src/components/TabBar.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `src/components/subscription/PlanSummaryBanner.tsx`
- Modify: `src/components/settings/SettingsHubRow.tsx`
- Modify: `src/components/security/SecurityCredentialRow.tsx`
- Modify: `src/components/beneficiaries/BeneficiaryPersonRow.tsx`
- Modify: `src/components/beneficiaries/BeneficiaryGroupRow.tsx`
- Test: `src/features/settings/shared-plan-banner.test.ts`
- Test: create `src/features/layout/navigation-sizing.test.ts`

**Interfaces:**
- Consumes: responsive metrics and live width.
- Produces: compact-safe navigation geometry.

- [ ] **Step 1: Add tests for 320 pt width and font scale 1.3**

Assert the tab bar computes item widths from available width, the Pro badge caps its width, long row titles can shrink, and icon-only targets remain 44 dp.

- [ ] **Step 2: Migrate numeric tab geometry**

Scale icons, gaps, finite radii, and label metrics. Keep screen-width division and active-tab interpolation based on measured width. Keep safe-area bottom padding unscaled.

- [ ] **Step 3: Finish the plan-banner migration**

Replace its direct Size Matters import with the semantic responsive module. Preserve `flex: 1`, `minWidth: 0`, and `maxWidth: '44%'`; these—not scaling—guarantee containment.

- [ ] **Step 4: Migrate reusable settings/list rows**

Scale avatars/icons and local spacing while keeping row pressables at least 44 dp.

- [ ] **Step 5: Verify and commit**

Run: `bun test src/features/layout/navigation-sizing.test.ts src/features/settings/shared-plan-banner.test.ts && bun run typecheck`

Commit: `git commit -m "refactor(ui): scale navigation and shared rows"`

---

### Task 6: Authentication and onboarding

**Files:**
- Modify: `app/(auth)/login.tsx`
- Modify: `app/(auth)/register.tsx`
- Modify: `app/(auth)/forgot-password.tsx`
- Modify: `app/(auth)/set-password.tsx`
- Modify: `app/(auth)/verify-email.tsx`
- Modify: `app/(onboard)/nickname.tsx`
- Modify: `app/(onboard)/preferences.tsx`
- Modify: `app/(onboard)/summary.tsx`
- Modify: `src/components/auth/OtpCodeInput.tsx`
- Modify: `src/components/onboarding/OnboardingShell.tsx`
- Modify: `src/components/onboarding/OnboardingCelebrationOverlay.tsx`
- Test: `src/features/onboarding/onboarding-flow-wiring.test.ts`
- Create: `src/features/layout/auth-onboarding-sizing.test.ts`

**Interfaces:**
- Consumes: responsive typography, shared controls, gutters, `iconSize`, and viewport width.

- [ ] **Step 1: Write compact-width and large-font tests**

Pin two-column name fields to stack or use safe minimum widths at 320 pt. Assert six OTP cells fit the available width. Assert onboarding footer actions remain above the keyboard/safe area without scaling insets.

- [ ] **Step 2: Migrate auth artwork, logo, close controls, field gaps, and card radii**

Use flex/wrapping for form topology and Size Matters only for local metrics. Do not shrink input text below `TYPE.input`.

- [ ] **Step 3: Migrate onboarding shell and steps**

Scale decorative emoji/artwork and card metrics. Keep progress dots modestly scaled. Use live width to wrap choice chips and summary pills. Keep footer actions at a minimum 44 dp.

- [ ] **Step 4: Verify keyboard and Dynamic Type behavior**

Run tests at 320/393 widths and font scales 1.0/1.3. Manually verify nickname, preferences, summary, registration, and OTP.

- [ ] **Step 5: Commit**

Run: `bun test src/features/onboarding src/features/layout/auth-onboarding-sizing.test.ts && bun run typecheck`

Commit: `git commit -m "refactor(ui): make auth and onboarding responsive"`

---

### Task 7: Account, overview, insights, billing, and pricing

**Files:**
- Modify: `app/account.tsx`
- Modify: `app/(tabs)/overview/index.tsx`
- Modify: `app/(tabs)/overview/CalendarCard.tsx`
- Modify: `app/(tabs)/overview/MemoryCardArtwork.tsx`
- Modify: `app/(tabs)/overview/MemoryPromptCard.tsx`
- Modify: `app/insights.tsx`
- Modify: `app/pricing.tsx`
- Modify: `app/settings/billing.tsx`
- Modify: `app/settings/cancel-plan.tsx`
- Modify: `src/components/account/EnrichmentScoreCard.tsx`
- Modify: `src/components/account/InsightsContentCard.tsx`
- Modify: `src/components/account/WeeklyProgressCard.tsx`
- Modify: `src/components/overview/ActivityListItem.tsx`
- Modify: `src/components/overview/MemorySpotlightCard.tsx`
- Modify: `src/components/overview/TopicCard.tsx`
- Modify: `src/components/billing/BillingDetailsSection.tsx`
- Modify: `src/components/billing/BillingInvoicesPanel.tsx`
- Modify: `src/components/billing/BillingPaymentMethodsSection.tsx`
- Modify: `src/components/billing/BillingStorageCard.tsx`
- Test: existing `src/features/account/*`, `src/features/settings/billing-*`, and `src/features/settings/manage-plan-*` tests.

**Interfaces:**
- Consumes: ResponsiveScreen, responsive typography, shared controls, and local visual metrics.

- [ ] **Step 1: Add reference-width regression tests**

Keep the existing 393 pt design geometry while adding 320 pt containment and 768 pt max-width cases. Pin billing plan buttons, storage labels, invoice rows, score bars, and weekly-progress columns.

- [ ] **Step 2: Migrate card spacing, finite radii, icon/artwork sizes, and stats**

Use centralized typography for numbers instead of applying Size Matters locally to fonts. Keep progress widths percentage-based and chart domains data-driven.

- [ ] **Step 3: Convert fixed multi-column rows to measured layouts**

Weekly days and stat columns divide available width. Billing/payment rows use flex shrink and wrapping; they must not rely on a scaled fixed width.

- [ ] **Step 4: Verify and commit**

Run: `bun test src/features/account src/features/settings && bun run check:typography && bun run typecheck`

Commit: `git commit -m "refactor(ui): scale account and billing surfaces"`

---

### Task 8: Chat composer, conversation, and voice screens

**Files:**
- Modify: `src/screens/ChatScreen.tsx`
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/components/chat/TypingIndicator.tsx`
- Modify: `src/components/chat/MilestoneCard.tsx`
- Modify: `src/components/chat/PromptReflectionHeader.tsx`
- Modify: `src/components/chat/DeepDiveNudge.tsx`
- Modify: `src/components/chat/HostChatJumpPills.tsx`
- Modify: `src/components/chat/VoiceUpgradeScreen.tsx`
- Modify: `app/chat/settings.tsx`
- Modify: `app/chat/media.tsx`
- Modify: `app/voice-call.tsx`
- Test: `src/features/chat/composer-layout.test.ts`
- Test: `src/features/chat/chat-settings-screen.test.ts`
- Create: `src/features/layout/chat-responsive-sizing.test.ts`

**Interfaces:**
- Consumes: semantic responsive helpers and live `useWindowDimensions` height.

- [ ] **Step 1: Test keyboard, compact height, and long-message cases**

Assert composer minimums, attachment strip sizing, voice controls, paywall plan rows, and chat settings fit at 320×568. Explicitly assert keyboard height and safe-area inset are never passed through `vs`/`mvs`.

- [ ] **Step 2: Replace direct Size Matters imports in `ChatInput` and `ChatScreen`**

Use semantic helpers. Keep viewport-derived composer max-height calculations live. Scale icons, attachment thumbnails, radii, and chrome spacing only.

- [ ] **Step 3: Migrate message and voice surfaces**

Message max-width stays percentage-based. Bubble padding/radius can scale modestly. Voice/paywall choices use flex and max-width; plan cards must not overflow at increased font scale.

- [ ] **Step 4: Verify and commit**

Run: `bun test src/features/chat src/features/layout/chat-responsive-sizing.test.ts && bun run typecheck`

Commit: `git commit -m "refactor(ui): make chat and voice layouts responsive"`

---

### Task 9: Stories, article, create, and editor

**Files:**
- Modify: `app/(tabs)/stories/index.tsx`
- Modify: `app/(tabs)/stories/[id].tsx`
- Modify: `app/article.tsx`
- Modify: `app/create.tsx`
- Modify: `app/editor.tsx`
- Modify: `app/share.tsx`
- Modify: `src/components/memory/MasonryMemoryCard.tsx`
- Modify: `src/components/memory/MasonryMemoryGrid.tsx`
- Modify: `src/components/memory/StoryHtmlBody.tsx`
- Modify: `src/components/ui/EditorActionBar.tsx`
- Modify: `src/components/ui/StoryRichEditor.tsx`
- Modify: `src/components/audio/StoryNarrationPlayer.tsx`
- Test: `src/features/memories/masonry-layout.test.ts`
- Test: `src/features/memories/masonry-scroll.test.ts`
- Test: existing editor publish/autosave tests.

**Interfaces:**
- Consumes: semantic helpers, live window/container width, and shared controls.

- [ ] **Step 1: Remove module-level `Dimensions.get` from story detail**

Use `useWindowDimensions` inside the screen. Recompute gallery and content width after rotation/split-view changes.

- [ ] **Step 2: Test 2-column/1-column breakpoints and editor toolbar overflow**

The masonry grid uses measured container width and a minimum viable card width. The editor toolbar scrolls intentionally rather than shrinking icons below tap size.

- [ ] **Step 3: Migrate local metrics**

Scale thumbnails, artwork, tool icons, finite radii, paddings, and gaps. Keep HTML body semantic font mapping centralized and do not scale CSS/PDF output.

- [ ] **Step 4: Verify and commit**

Run: `bun test src/features/memories src/features/editor && bun run typecheck`

Commit: `git commit -m "refactor(ui): scale stories and editor surfaces"`

---

### Task 10: Media, camera, audio, and gallery geometry

**Files:**
- Modify: `src/components/ui/MediaPreviewModal.tsx`
- Modify: `src/components/ui/CameraCaptureModal.tsx`
- Modify: `src/components/ui/MediaPickerMenu.tsx`
- Modify: `src/components/ui/LinkPreview.tsx`
- Modify: `src/components/ui/VideoThumbnail.tsx`
- Modify: `src/components/sheets/SelectFromMediaModal.tsx`
- Modify: `src/components/sheets/SelectFromMemoryModal.tsx`
- Modify: `src/components/chat/ChatAttachmentPickerSheet.tsx`
- Modify: `src/components/chat/EmojiPickerSheet.tsx`
- Test: `src/features/media/media-preview-modal.test.ts`
- Test: `src/features/chat/media-gallery-contract.test.ts`
- Create: `src/features/layout/media-responsive-sizing.test.ts`

**Interfaces:**
- Consumes: live dimensions and semantic metrics.

- [ ] **Step 1: Add rotation and split-view tests**

Test that gallery width, thumbnail strip, media picker columns, emoji columns, and camera controls recompute when dimensions change.

- [ ] **Step 2: Remove all module-level `Dimensions.get` snapshots**

Replace snapshots in `MediaPreviewModal`, `EmojiPickerSheet`, `ChatAttachmentPickerSheet`, and `SelectFromMediaModal` with `useWindowDimensions` or `onLayout` container width.

- [ ] **Step 3: Scale controls without scaling media topology**

Scale close/play/save icons, thumbnails, finite radii, and gaps. Media viewport width/height comes directly from live available size. Preserve native image aspect ratio and video sizing.

- [ ] **Step 4: Verify and commit**

Run: `bun test src/features/media src/features/layout/media-responsive-sizing.test.ts && bun run typecheck`

Commit: `git commit -m "refactor(ui): make media surfaces resize safely"`

---

### Task 11: Bottom sheets and fixed action footers

**Files:**
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `src/components/sheets/AddBeneficiarySheet.tsx`
- Modify: `src/components/sheets/AddMemberToGroupSheet.tsx`
- Modify: `src/components/sheets/AddPaymentMethodSheet.tsx`
- Modify: `src/components/sheets/CancelSubscriptionConfirmationSheet.tsx`
- Modify: `src/components/sheets/CapsuleSealedSheet.tsx`
- Modify: `src/components/sheets/ChangePasswordSheet.tsx`
- Modify: `src/components/sheets/CreateCapsuleSheet.tsx`
- Modify: `src/components/sheets/CreateGroupSheet.tsx`
- Modify: `src/components/sheets/CreateMemorySheet.tsx`
- Modify: `src/components/sheets/DraftsSheet.tsx`
- Modify: `src/components/sheets/EditBillingDetailsSheet.tsx`
- Modify: `src/components/sheets/EditProfileSheet.tsx`
- Modify: `src/components/sheets/ExportArchiveSheet.tsx`
- Modify: `src/components/sheets/FeedbackSheet.tsx`
- Modify: `src/components/sheets/FirstStoryMilestoneSheet.tsx`
- Modify: `src/components/sheets/MemoryActionsSheet.tsx`
- Modify: `src/components/sheets/MemoryInsightsSheet.tsx`
- Modify: `src/components/sheets/PreviewCapsuleModal.tsx`
- Modify: `src/components/sheets/PublishPrivacySheet.tsx`
- Modify: `src/components/sheets/QuickCaptureSheet.tsx`
- Modify: `src/components/sheets/SearchMemorySheet.tsx`
- Modify: `src/components/sheets/SecurityConfirmationSheet.tsx`
- Modify: `src/components/sheets/SetupTwoFactorSheet.tsx`
- Modify: `src/components/sheets/ShareMemorySheet.tsx`
- Modify: `src/components/sheets/StreakSheet.tsx`
- Modify: `src/components/sheets/UpgradePromptSheet.tsx`
- Modify: `src/components/sheets/UpgradeSuccessSheet.tsx`
- Modify: `src/components/sheets/VoiceDebriefSheet.tsx`
- Test: `src/features/settings/settings-sheet-footer-layout.test.ts`
- Test: `src/features/settings/sheet-typography-roles.test.ts`

**Interfaces:**
- Consumes: shared controls, responsive gutter/spacing/icon metrics, raw safe-area insets, and measured sheet viewport.

- [ ] **Step 1: Add sheet geometry contract tests**

Assert every fixed footer remains outside the scroll view, every close control is 44 dp, insets are used raw, and snap/fixed heights are not passed through `verticalScale`.

- [ ] **Step 2: Migrate shared sheet chrome in `SheetManager`**

Scale only horizontal gutter, header icon size, finite radius, and content spacing. Keep handle thickness and safe-area inset semantics unchanged.

- [ ] **Step 3: Migrate each listed sheet**

Use shared controls first. Scale artwork/QR/icon/avatar dimensions and finite radii. Convert fixed row widths to flex. Keep keyboard-aware containers measurement-driven.

- [ ] **Step 4: Verify every registered sheet**

Run targeted sheet tests, then open each registered sheet at 320 and 393 widths. Check long names, errors, and loading states.

- [ ] **Step 5: Commit**

Run: `bun test src/features/settings/settings-sheet-footer-layout.test.ts src/features/settings/sheet-typography-roles.test.ts && bun run typecheck`

Commit: `git commit -m "refactor(ui): scale sheet content safely"`

---

### Task 12: Capsules, explore, beneficiaries, groups, and security

**Files:**
- Modify: `src/components/capsule/CapsuleCard.tsx`
- Modify: `src/components/capsule/StylePicker.tsx`
- Modify: `app/(tabs)/capsule/index.tsx`
- Modify: `src/components/explore/CategoryCard.tsx`
- Modify: `app/(tabs)/explore/index.tsx`
- Modify: `app/(tabs)/explore/[id].tsx`
- Modify: `app/settings/beneficiary/[id].tsx`
- Modify: `app/settings/group/[id].tsx`
- Modify: `src/components/beneficiaries/BeneficiaryEmptyState.tsx`
- Modify: `src/components/security/AppSwitcherPrivacyBlur.tsx`
- Modify: `src/components/security/VaultLockoutScreen.tsx`
- Test: existing capsule, beneficiary, privacy, and security feature tests.

**Interfaces:**
- Consumes: responsive helpers and shared primitives.

- [ ] **Step 1: Replace direct Size Matters imports in `CapsuleCard`**

Use semantic helpers. Keep attachment strips and recipient rows flex-based; scale avatar/artwork sizes and card spacing.

- [ ] **Step 2: Migrate remaining feature cards and detail rows**

Scale local visual metrics, not data/layout topology. Selection grids use measured width and minimum card width.

- [ ] **Step 3: Verify and commit**

Run: `bun test src/features/capsules src/features/privacy src/features/settings && bun run typecheck`

Commit: `git commit -m "refactor(ui): scale capsules and secondary features"`

---

### Task 13: Splash, animation, and decorative geometry

**Files:**
- Modify: `src/components/system/AnimatedSplash.tsx`
- Modify: `src/features/startup/cinematic-splash.ts`
- Modify: `app/splash-preview.tsx`
- Modify: `src/components/onboarding/OnboardingCelebrationOverlay.tsx`
- Test: existing startup/splash tests.

**Interfaces:**
- Consumes: live viewport width/height and semantic helpers.

- [ ] **Step 1: Snapshot the approved 393×852 composition mathematically**

Add tests for reference coordinates and for normalized positions at 320×568 and 768×1024. Coordinates must derive from viewport ratios or bounded helpers, not independent blind scaling.

- [ ] **Step 2: Migrate outer artwork geometry**

Scale the containing artwork/SVG, not coordinates inside its viewBox. Keep animation durations unchanged. Clamp oversized decorative elements on tablets.

- [ ] **Step 3: Verify and commit**

Run: `bun test src/features/startup && bun run typecheck`

Commit: `git commit -m "refactor(ui): normalize splash and animation geometry"`

---

### Task 14: Remaining low-density screens and components

**Files:**
- Modify: `app/coming-soon.tsx`
- Modify: `src/components/system/AppErrorBoundary.tsx`
- Modify: `src/components/ui/AccountSkeleton.tsx`
- Modify: `src/components/ui/OfflineNotice.tsx`
- Modify: any remaining runtime UI file reported by the compliance test.

**Interfaces:**
- Consumes: all prior responsive APIs.

- [ ] **Step 1: Run the compliance audit and capture the exact remaining list**

Run: `bun test src/features/layout/responsive-compliance.test.ts`

Expected: FAIL listing only runtime UI files, not tests or export generators.

- [ ] **Step 2: Resolve each remaining finding deliberately**

For each numeric value, classify it as `scale`, `floor/cap`, `container-derived`, or `fixed`. Add a short inline comment only when a fixed value looks suspicious but is intentionally fixed.

- [ ] **Step 3: Verify and commit**

Run: `bun test src/features/layout/responsive-compliance.test.ts && bun run lint && bun run typecheck`

Commit: `git commit -m "chore(ui): finish responsive sizing migration"`

---

### Task 15: Automated compliance guard

**Files:**
- Create: `src/features/layout/responsive-compliance.test.ts`
- Modify: `package.json`
- Modify: `scripts/check-production-readiness.js`

**Interfaces:**
- Produces: a CI guard included in `bun run verify`.

- [ ] **Step 1: Write the guard**

The guard must fail when:

```ts
const approvedDirectImports = new Set([
  'src/constants/responsive.ts',
  'src/components/ui/SplineChart.tsx',
]);
```

- a runtime UI file imports `react-native-size-matters` outside the allowlist;
- a runtime UI file declares `Dimensions.get('window')` at module scope;
- an interactive style introduces `minHeight` or `height` below 44 without an explicit larger hit target;
- a screen introduces local `fontSize` instead of a semantic typography role, unless listed as an audited visual exception.

- [ ] **Step 2: Prove the guard fails on a fixture**

Create a temporary fixture inside the test and assert the scanner reports each violation category. Do not mutate production files during the test.

- [ ] **Step 3: Add the guard to production readiness**

Run it from the existing test suite and add a source-level assertion in `check-production-readiness.js` that the responsive module and compliance test exist.

- [ ] **Step 4: Verify and commit**

Run: `bun run verify`

Commit: `git commit -m "test(ui): guard responsive sizing conventions"`

---

### Task 16: Device matrix, screenshots, and performance sign-off

**Files:**
- Create: `docs/qa/responsive-size-matters-matrix.md`
- Modify only files with verified visual defects found during this task.

**Interfaces:**
- Consumes: completed migration.
- Produces: recorded QA evidence and final exception list.

- [ ] **Step 1: Build from a clean native state**

Run:

```bash
npx expo prebuild --clean
npx expo run:ios
```

- [ ] **Step 2: Capture critical flows at every required width**

Capture auth, onboarding, Overview, Account, Billing, Manage Plan, Chat, voice paywall/call, Stories list/detail, editor, media preview, Capsule, and representative sheets at compact/reference/large widths.

- [ ] **Step 3: Run accessibility-size verification**

Repeat critical flows at font scales 1.3 and 1.5. Log any intentional bounded-label exception with its component, maximum multiplier, and alternate accessible label.

- [ ] **Step 4: Run rotation and split-view verification**

Rotate media, chat, editor, camera, and splash screens. Resize iPad split view. Confirm no stale module-level geometry.

- [ ] **Step 5: Run final automated checks**

Run:

```bash
bun run verify:full
npx expo export --platform ios --output-dir /tmp/memento-responsive-export
git diff --check
```

Expected: all checks pass and export completes.

- [ ] **Step 6: Commit QA evidence**

Commit: `git commit -m "docs(ui): record responsive device verification"`

---

## Complete audit disposition

This matrix is the executor’s checklist. A file may be marked complete only when its numeric values were classified, even if the result is “keep fixed.”

### Foundation and shared UI — migrate first

- `src/constants/typography.ts`: central text scaling only.
- `src/components/ui/Button.tsx`: heights, padding, gap; preserve 44 dp target.
- `src/components/ui/TextInput.tsx`: height, padding, finite radius; keep borders fixed.
- `src/components/ui/PasswordInput.tsx`: icon offsets and touch target.
- `src/components/ui/Checkbox.tsx`: visual box may scale modestly; pressable remains 44 dp.
- `src/components/ui/DashboardHeader.tsx`: icon geometry, gap, padding; safe area fixed.
- `src/components/ui/EmptyState.tsx`, `PermissionRecoveryState.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`, `AppErrorBoundary.tsx`: artwork/icon/spacing/radius.
- `src/components/ui/AccountSkeleton.tsx`: spacing and placeholder geometry.
- `src/components/ui/OfflineNotice.tsx`: spacing only; absolute safe-area position remains inset-driven.
- `src/components/ui/RecordingIconButton.tsx`, `RecordingStatus.tsx`: icon/wave geometry and minimum target.

### Navigation and layout — container-derived first, scaling second

- `src/components/TabBar.tsx`: keep live width calculation; scale icons/gaps/radii.
- `app/(tabs)/_layout.tsx`: keep safe-area bottom raw; scale only decorative padding if still necessary.
- `src/components/subscription/PlanSummaryBanner.tsx`: semantic helpers plus flex/max-width containment.
- `src/components/settings/SettingsHubRow.tsx`, `src/components/security/SecurityCredentialRow.tsx`, beneficiary rows: row metrics and visual sizes.

### Auth/onboarding — migrate

- `app/(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`, `set-password.tsx`, `verify-email.tsx`.
- `app/(onboard)/nickname.tsx`, `preferences.tsx`, `summary.tsx`.
- `src/components/onboarding/OnboardingShell.tsx`, `OnboardingCelebrationOverlay.tsx`.
- `src/components/auth/OtpCodeInput.tsx`: cell width derived from available width; cell radius/icon spacing scaled.

### Settings/billing/account — migrate

- `app/settings/index.tsx`, `account.tsx`, `profile.tsx`, `privacy.tsx`, `activities.tsx`, `two-factor.tsx`, `feedback.tsx`, `beneficiaries.tsx`, `beneficiary/[id].tsx`, `group/[id].tsx`, `billing.tsx`, `cancel-plan.tsx`.
- `app/account.tsx`, `app/insights.tsx`, `app/pricing.tsx`.
- All `src/components/account/*`, `src/components/billing/*`, and `src/components/overview/*` files named in Task 7.
- `src/components/ui/SplineChart.tsx`: approved geometry exception; keep direct Size Matters import or migrate last after chart regression tests.
- `src/components/ui/StatCard.tsx`: replace direct import with semantic helpers after snapshotting current appearance.

### Chat/voice — migrate with keyboard/inset exclusions

- `src/screens/ChatScreen.tsx`, `src/components/chat/ChatInput.tsx`, `MessageBubble.tsx`, `TypingIndicator.tsx`, `MilestoneCard.tsx`, `PromptReflectionHeader.tsx`, `DeepDiveNudge.tsx`, `HostChatJumpPills.tsx`, `VoiceUpgradeScreen.tsx`.
- `app/chat/settings.tsx`, `app/chat/media.tsx`, `app/voice-call.tsx`.
- `src/components/chat/DeepDiveBanner.tsx`: absolute inset fills remain unscaled.

### Stories/editor — migrate

- `app/(tabs)/stories/index.tsx`, `app/(tabs)/stories/[id].tsx`, `app/article.tsx`, `app/create.tsx`, `app/editor.tsx`, `app/share.tsx`.
- `src/components/memory/MasonryMemoryCard.tsx`, `MasonryMemoryGrid.tsx`, `StoryHtmlBody.tsx`.
- `src/components/ui/EditorActionBar.tsx`, `StoryRichEditor.tsx`.
- `src/components/audio/StoryNarrationPlayer.tsx`.

### Media — migrate and remove static dimensions

- `src/components/ui/MediaPreviewModal.tsx`, `CameraCaptureModal.tsx`, `MediaPickerMenu.tsx`, `LinkPreview.tsx`, `VideoThumbnail.tsx`.
- `src/components/sheets/SelectFromMediaModal.tsx`, `SelectFromMemoryModal.tsx`.
- `src/components/chat/ChatAttachmentPickerSheet.tsx`, `EmojiPickerSheet.tsx`.

### Sheets — migrate local metrics; do not scale snap points/insets

- Every sheet listed in Task 11, including `SheetManager.tsx`.
- `CapsuleActionsSheet.tsx` and `SelectFromMemoryModal.tsx` have few raw values but still require classification.
- Close targets, row actions, radio controls, and footer buttons remain at least 44 dp.

### Capsules/explore/security — migrate

- `src/components/capsule/CapsuleCard.tsx`, `StylePicker.tsx`, and `app/(tabs)/capsule/index.tsx`.
- `src/components/explore/CategoryCard.tsx`, `app/(tabs)/explore/index.tsx`, `app/(tabs)/explore/[id].tsx`.
- `src/components/security/AppSwitcherPrivacyBlur.tsx`, `VaultLockoutScreen.tsx`.
- `src/components/beneficiaries/BeneficiaryEmptyState.tsx`.

### Splash/animation — normalize from viewport

- `src/components/system/AnimatedSplash.tsx`, `src/features/startup/cinematic-splash.ts`, `app/splash-preview.tsx`.
- Scale outer assets, not coordinates inside SVG viewBoxes.

### Explicitly do not migrate with Size Matters

- `src/features/export/memoir-html-generator.ts`: HTML/PDF output has its own physical/CSS layout system.
- Test fixtures containing numeric values: update only when their production contract intentionally changes.
- SVG path/viewBox internals in `src/components/capsule/letters/*` and `src/components/ui/GreetingIcon.tsx`.
- Safe-area insets, keyboard heights, animation durations, opacity, flex weights, percentages, aspect ratios, z-index, and hairline/border widths throughout the repository.
- Remote image/video intrinsic dimensions and backend media metadata.

## Self-review record

- Spec coverage: foundation, typography, shared primitives, navigation, every major feature group, all sheets, media/rotation, animation, compliance, device QA, and exclusions are assigned to tasks.
- Completeness scan: every step names files, tests, commands, and acceptance behavior.
- Type consistency: every task consumes the Task 1 helper names unchanged; `ResponsiveScreen` is introduced once in Task 4.
- Review-focus coverage: compact labels, Dynamic Type, tablets, resizing, keyboard, and safe areas each have an owning task and required tests.
