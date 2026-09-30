# Responsive Size Matters Specification

## Purpose

Make Memento’s React Native interface remain visually proportional and usable from compact phones through large phones and tablets without replacing flexbox, safe-area handling, Dynamic Type, or container-aware layout.

## Baseline audit

- 208 TSX files exist under `app/` and `src/`.
- 59 TSX files define `StyleSheet.create` styles.
- 118 TSX files contain raw numeric layout values that require review.
- Six production modules currently import `react-native-size-matters`: `CapsuleCard`, `ChatInput`, `PlanSummaryBanner`, `SplineChart`, `StatCard`, and `ChatScreen`.
- Several modules capture `Dimensions.get('window')` at module load, which does not respond to rotation, split view, or resizing.
- Shared typography, buttons, and inputs still use fixed dp values, so isolated Size Matters use cannot create consistent app-wide behavior.

## Required architecture

Create one responsive metrics module over `react-native-size-matters`. Application code must import semantic helpers and metrics from that module instead of importing Size Matters directly, except low-level geometry components such as charts.

```ts
export const hs = (value: number) => scale(value);
export const vs = (value: number) => verticalScale(value);
export const ms = (value: number, factor = 0.3) => moderateScale(value, factor);
export const mvs = (value: number, factor = 0.25) => moderateVerticalScale(value, factor);
export const iconSize = (value: number) => Math.round(ms(value, 0.35));
export const radius = (value: number) => Math.round(ms(value, 0.2));
export const minTouchTarget = (value = 44) => Math.max(44, Math.round(mvs(value, 0.2)));
export const responsiveSpace = (value: number) => Math.round(ms(value, 0.35));
```

Use `useWindowDimensions` and container `onLayout` measurements for topology changes such as column counts, card width calculations, modal width, media viewport size, and tablet max-width. Size Matters is not a replacement for available-width measurement.

## Scaling rules

### Scale

- Icons and decorative glyph sizes: `iconSize`.
- Avatar, thumbnail, artwork, and fixed visual dimensions: `ms` or `hs`.
- Card radii: `radius`; keep pill radius `999` unchanged.
- Component-local spacing that must preserve visual proportions: `responsiveSpace`.
- Fixed text roles through centralized typography only: `ms` with a conservative factor.
- Decorative animation coordinates: helpers derived from the current viewport.

### Scale with a floor or cap

- Interactive heights: `minTouchTarget`; never below 44 dp.
- Screen gutters: scale, then cap so tablets do not create giant margins; use a centered max-width container on tablets.
- Inputs and buttons: scale modestly but preserve 44 dp minimum.
- Sheet and modal widths: derive from viewport, cap at the component’s desktop/tablet maximum.
- Large illustrations: derive from `Math.min(availableWidth, maxWidth)` rather than raw scaling alone.

### Keep fixed

- `StyleSheet.hairlineWidth`, 1 dp borders, and focus-border widths.
- Safe-area inset values returned by the platform.
- Keyboard measurements.
- Opacity, animation duration, z-index, flex weights, aspect ratios, percentages, and color values.
- Pill radius `999`.
- Minimum 44 dp touch target.
- Server/PDF/HTML layout values, including `memoir-html-generator.ts`.
- Canvas coordinates that are in an SVG `viewBox`; scale the outer SVG instead.

## Typography policy

- Preserve the semantic roles in `TYPE`; screens must not call `moderateScale` for text directly.
- Apply conservative scaling centrally in `src/constants/typography.ts`.
- Continue allowing native font scaling. Do not set `allowFontScaling={false}`.
- Use `maxFontSizeMultiplier` only where a bounded label would otherwise destroy navigation; provide wrapping or alternate layout first.
- Body text must remain at least 14 dp-equivalent and metadata at least 10 dp-equivalent.

## Layout policy

- Flexbox, `flexShrink`, `minWidth: 0`, percentage widths, and `maxWidth` solve containment. Size Matters only adjusts numeric metrics.
- Compact phones must not require horizontal scrolling except intentional carousels.
- Tablet layouts must center content and cap reading width rather than scaling every element indefinitely.
- Bottom sheets must use measured viewport height and safe-area padding; do not apply `verticalScale` to snap points blindly.
- Media viewers must use live `useWindowDimensions`, not module-level `Dimensions.get` constants.

## Device verification matrix

- iPhone SE / 320–375 pt compact width.
- iPhone 15 / approximately 393 pt reference width.
- iPhone Pro Max / approximately 430 pt width.
- Small Android / 320–360 dp width with font scale 1.0 and 1.3.
- Large Android / 412–480 dp width.
- iPad split view / approximately 375–600 pt available width.
- iPad full screen / 768 pt and above, with centered capped content.
- Portrait and landscape for media, editor, chat, and camera surfaces.

## Acceptance criteria

- No new direct raw `scale`, `verticalScale`, or `moderateScale` imports outside the responsive module and approved geometry components.
- No module-level window dimension snapshots remain in interactive UI.
- Every touchable remains at least 44×44 dp.
- Text remains readable with font scale 1.3 and does not clip at font scale 1.5 in critical flows.
- Shared controls define responsive dimensions once; screens do not duplicate them.
- Auth, onboarding, settings, billing, chat, memories, capsules, media, and sheets pass compact-phone screenshot checks.
- Existing typography, production-readiness, lint, typecheck, and unit tests remain green.
