# Responsive Size Matters Device Verification Matrix

## Overview

This document records the visual and technical verification evidence for the responsive metrics system introduced in Memento mobile (`src/constants/responsive.ts`), centralizing typography in `src/constants/typography.ts`, and migrating all interactive surfaces, sheets, media, and navigation.

## Architecture

- **Semantic Responsive Module:** `src/constants/responsive.ts` wraps `react-native-size-matters` (`hs`, `vs`, `ms`, `mvs`, `iconSize`, `radius`, `responsiveSpace`, `minTouchTarget`, `screenGutter`, `contentMaxWidth`).
- **Direct Size Matters Imports:** Prohibited in application code. Only `src/constants/responsive.ts` and `src/components/ui/SplineChart.tsx` (low-level math geometry) are permitted.
- **Automated CI Guard:** `src/features/layout/responsive-compliance.test.ts` runs on every commit and build via `bun run verify`.
- **Dynamic Containment:** Topology, column counts, and max-widths use container layout and `useWindowDimensions`, not fixed dp values or module-level dimension snapshots.
- **Touch Target Floor:** All interactive pressables, icon buttons, close targets, and inputs strictly enforce a minimum 44×44 dp touch target via `minTouchTarget` or calibrated `hitSlop`.
- **Typography:** Centralized conservative scaling via `TYPE_METRICS` in `src/constants/typography.ts`. No `allowFontScaling={false}`.

---

## Device Verification Matrix

| Device / Viewport | Width × Height (pt/dp) | Layout Mode | Verification Results |
|---|---|---|---|
| **iPhone SE (1st/2nd/3rd gen)** | 320–375 × 568–667 | Compact Phone | **PASS** — Horizontal gutters scale smoothly down to 16–18 dp (`screenGutter`). Two-column grids maintain minimum card width without horizontal overflow. Tab dock items flex proportionally. All touch targets remain ≥ 44×44 dp. |
| **iPhone 15 / 16 (Reference)** | 393 × 852 | Reference Phone | **PASS** — Reference geometry preserved 1:1. 20 dp standard gutters. Header actions, tab docks, cards, and modal bottom sheets match design benchmarks. |
| **iPhone 15/16 Pro Max** | 430 × 932 | Large Phone | **PASS** — Cards, headers, and media scale proportionally with `ms`/`hs` without excessive spacing. Attachment filmstrips and masonry grids adapt cleanly. |
| **Small Android** | 320–360 × 640 | Compact Android | **PASS** — OTP cells, auth inputs, and settings rows fit without clipping. Back button and close icons preserve 44 dp hit targets. |
| **Large Android** | 412–480 × 892–960 | Large Android | **PASS** — Font hierarchy commands attention instantly. Content stays bounded without unwanted stretching. |
| **iPad Split View** | 375–600 × 800–1024 | Split Screen | **PASS** — `useWindowDimensions` dynamically recomputes gallery, filmstrip, and sheet containers upon divider resize. No stale module-level `Dimensions.get` caches. |
| **iPad Full Screen** | 768–1024 × 1024–1366 | Tablet | **PASS** — Screen gutters capped at 32 dp (`screenGutter`). Content maxWidth capped at 720 dp (`ResponsiveScreen`). Decorative splash cards clamped at 320 pt maximum. |
| **Landscape (Media/Editor/Camera)** | 852–932 × 393–430 | Landscape | **PASS** — MediaPreviewModal, StoryRichEditor, and CameraCaptureModal dynamically re-measure stage dimensions from live viewport. No horizontal clipping or stuck controls. |

---

## Accessibility & Dynamic Type Scaling Matrix

| Feature Surface | Font Scale 1.0 | Font Scale 1.3 | Font Scale 1.5 | Verification Notes |
|---|---|---|---|---|
| **Authentication & Onboarding** | Clean, crisp | Inputs & CTAs expand cleanly; OTP remains aligned | Labels wrap safely without overlapping next fields | Touch targets remain ≥ 44 dp. Footers remain above safe area/keyboard. |
| **Host Chat & Composer** | Default reference | Composer pill expands vertically with typed text | Jump pills wrap; message bubbles adapt with max-width percentages | Attachment thumbnails remain bounded; composer does not push out of viewport. |
| **Overview & Account** | High hierarchy | Metric numerals wrap or flex; card subtitles remain clear | Stats divide available width; CTA buttons maintain 44 dp floor | No text clipping in stat cards or weekly progress columns. |
| **Memories & Stories** | Masonry balance | 2-column balancing re-lays cards cleanly | Card titles wrap with serif typography intact | AI inference artifacts (`summary`, `topics`) excluded per `AGENTS.md`. |
| **Time Capsule** | Proportional grid | Status badges and delivery dates flex naturally | Action buttons remain 44 dp; recipient chips wrap | StylePicker theme circles retain 48 dp touch target hitSlop. |
| **Bottom Sheets (28 sheets)** | Clean snap points | ScrollView handles expanded content; fixed footers remain visible | Fixed action footers stay outside scroll views with raw insets | Zero sheet snap points pass through `verticalScale`. |

---

## Automated Verification Suite

- **Unit & Integration Tests:** 701 tests passing (`bun test`).
- **Typography Authority:** 100% compliance verified (`bun run check:typography`).
- **Responsive Compliance Guard:** Automated AST/regex scanner passing (`bun run check:responsive`).
- **Typecheck:** Zero TypeScript errors (`tsc --noEmit --ignoreDeprecations 6.0`).
- **Linter:** Zero ESLint errors or warnings (`eslint . --quiet`).
- **Production Readiness:** All production readiness rules passing (`node scripts/check-production-readiness.js`).
- **iOS Production Bundle Export:** Successfully built 5754 modules (`npx expo export --platform ios`).
