# Memento Agent Guidelines

This document describes the design language, technical architecture, and implementation standards for the Memento mobile application. Every AI agent and developer must read it before writing a single line of UI code.

> 🧭 **The code is the source of truth.** Token values live in `src/constants/tokens.ts`, `src/constants/typography.ts` and `tailwind.config.ts`, and are enforced by the startup tests in `src/features/startup/` and the checks in `bun run verify`. If this document disagrees with the code or those checks, follow the code and update this document in the same change.

---

## 🎯 Design Identity: "Crispy, Sharp, Smooth, Happy"

Memento is a **premium personal legacy app** — it should feel like a high-end printed journal, a beautifully curated archive, and a warm companion all at once. Not a generic SaaS dashboard. Not a social media feed. Not a note-taking app.

**Four adjectives guide every design decision:**
- **Crispy** — edges are clean, spacing is deliberate, nothing is soft or blurry without reason
- **Sharp** — hierarchy is clear, the most important element commands attention instantly
- **Smooth** — transitions feel effortless, interactions have physical weight, nothing jumps
- **Happy** — the brand orange is warm, typography is inviting, surfaces have texture

---

## 🎨 Design Language

### 1. Color System

**Appearance:** The menu Appearance control supports System, Light, Light Sky, Dark, and Deep Sky and persists the device preference. Light Sky mirrors web `.light-sky`: light controls, `#1b1d23` ink, translucent white cards and fills over a pale blue sky with white clouds, and opaque white sheets and popovers. Both sky themes have a transparent `background`; use `colors.canvas` when a surface needs the opaque page colour behind them. For live UI, read semantic colors with `useThemeColors()`; use `useThemeStyles(createStyles)` with an explicit `(colors: ThemeColors)` factory for module-level styles. The older `useThemedStyles()` value mapper is legacy-only; identical light values can represent different semantic roles. NativeWind semantic classes resolve through `AppearanceProvider`. Static `COLORS` remains the light palette for artwork and style definitions; never mutate it. Keep inverse text on colored banners. The white background rule below applies to Light mode; Dark uses `DARK_COLORS.background` (`#12131a`, matching web). Dark semantic ink, strokes and status colors mirror `Web/memento-web/src/index.css`. In Deep Sky, `card`/`cardRaised`/`bg-card` resolve to `fillWeak` so on-page cards, buttons and tags never show a deep grey slab; anything floating over content uses `popover`. Use paired `activeFill`/`activeText` for selected tabs, `mediaSurface`/`mediaText` for fixed media overlays, and `ThemedCardBackground` for decorative raster card washes.

All colors come from `COLORS` in `src/constants/tokens.ts` and the Tailwind config in `tailwind.config.ts`. **Never hardcode hex values except for the explicitly approved exceptions below.**

#### Background Surfaces
| Use | Token | Value | Tailwind class |
|-----|-------|-------|----------------|
| Primary screen bg | `COLORS.background` | `#ffffff` | `bg-background` |
| Card / Sheet bg | `COLORS.card` | `#ffffff` | `bg-card` or `bg-white` |
| Onboarding screens | `COLORS.onboardingCream` | `#FAF7F2` | `bg-onboarding-cream` |
| Elevated fill | `COLORS.fillWeak` | `rgba(23,11,0,0.04)` | `bg-fill-weak` |
| Subtle fill | `COLORS.fillWeaker` | `rgba(23,11,0,0.02)` | `bg-fill-weaker` |
| Floating surface | `COLORS.popover` | `#ffffff` (dark `#1d1e26`, Deep Sky `#191e2c`) | `bg-popover` — toasts, menus, dropdowns, tab bar |
| Media viewer backdrop | `COLORS.mediaViewer` | `#EFEDEA` (dark `#0b0c10`, Deep Sky canvas) | — (full-screen photo/video viewer) |

> ⚠️ **Page background is `COLORS.background` (`#ffffff`), enforced by startup tests.** Warm journal cream lives on `sand-1` (`#fefbf8`) and `COLORS.onboardingCream` — use those for onboarding and textured washes, not as the default screen fill.

#### Brand
| Use | Token | Value | Tailwind |
|-----|-------|-------|----------|
| Primary CTA, active states | `COLORS.brand` | `#E98246` | `bg-brand`, `text-brand`, `border-brand` |
| Button hover/press tint | `COLORS.brandTint` | `rgba(233,130,70,0.2)` | `bg-brand/20` |
| Very subtle brand wash | `COLORS.brandSubtle` | `rgba(233,130,70,0.05)` | `bg-brand/5` |

#### Text — Always Warm Brown, Never Cool Grey
The text system is built on `rgba(23, 11, 0, *)` — a warm, almost-black brown. This is what makes Memento feel editorial and grounded, not clinical.

| Role | Token | Value | Tailwind |
|------|-------|-------|----------|
| Primary headings, bold UI | `COLORS.textStrong` | `rgba(23,11,0,0.9)` | `text-text-strong` |
| Body copy, labels | `COLORS.textBase` | `rgba(23,11,0,0.65)` | `text-text-base` |
| Secondary / placeholder text | `COLORS.textWeak` | `rgba(23,11,0,0.45)` | `text-text-weak` |
| Subdued metadata | `COLORS.textMuted` | `rgba(23,11,0,0.3)` | `text-text-muted` |
| Disabled state | `COLORS.textDisabled` | `rgba(23,11,0,0.1)` | `text-text-disabled` |
| On dark/color surfaces | `COLORS.textInverse` | `#FFFFFF` | `text-white` |

> ⚠️ **Never use `text-gray-*`, `text-slate-*`, or any Tailwind gray for body text.** Use the `text-text-*` tokens above.

> ✅ **Approved hardcoded exception:** `color: '#555555'` for body preview text on memory cards where contrast against white needs to exceed WCAG AA. This is the only approved hardcoded hex outside the token system.

#### Semantic States — No Generic Colors
| State | Token | Value | Never use |
|-------|-------|-------|-----------|
| Success | `COLORS.success` | `#067A57` deep green | `green-500`, `#00ff00` |
| Error / Danger | `COLORS.error` | `#C73A3A` brick red | `red-500`, `#ff0000` |
| Warning | `COLORS.warning` | `#8F6C1A` gold/amber | `yellow-400` |
| Info | `COLORS.info` | `#1A80F7` | `blue-500` |

#### Strokes / Borders
| Role | Token | Value | Tailwind |
|------|-------|-------|----------|
| Strong separator | `COLORS.strokeStrong` | `rgba(23,11,0,0.45)` | `border-stroke-strong` |
| Standard border | `COLORS.strokeWeak` | `rgba(23,11,0,0.1)` | `border-stroke-weak` |
| Ultra-subtle divider | `COLORS.strokeWeaker` | `rgba(23,11,0,0.04)` | `border-stroke-weaker` |

#### Sand Palette (Onboarding & Warm Accents)
Use the `sand-*` ramp for warm surfaces in onboarding flows and anywhere an amber/cream warmth is needed beyond the primary brand.
`sand-1` (#fefbf8) → `sand-12` (#412c09) — progressively deeper warm brown.

---

### Cross-Platform Parity: Web CSS Vars → Mobile Tokens

The web (`web/src/index.css`) uses a v3 semantic token system built on `rgba(23, 11, 0, *)` — the "warm brown base" (#170B00). Every mobile `COLORS.*` token maps 1:1 to a web CSS variable. **When adding new color usage, verify parity with the web token before using.**

| Mobile token | Value | Web CSS variable |
|---|---|---|
| `COLORS.background` | `#ffffff` | `--background` / `--color-background` |
| `COLORS.textStrong` | `rgba(23,11,0,0.9)` | `--text-neutral-strong` / `--brown-1000` |
| `COLORS.textBase` | `rgba(23,11,0,0.65)` | `--text-neutral-weak` / `--brown-700` |
| `COLORS.textWeak` | `rgba(23,11,0,0.45)` | `--text-neutral-weaker` / `--brown-500` |
| `COLORS.textDisabled` | `rgba(23,11,0,0.1)` | `--text-neutral-disabled` / `--brown-100` |
| `COLORS.brand` | `#E98246` | `--v3-brand-strong` / `--orange-1000` |
| `COLORS.success` | `#067A57` | `--text-success-strong` / `--green-1000` |
| `COLORS.error` | `#C73A3A` | `--text-error-strong` / `--red-1000` |
| `COLORS.warning` | `#8F6C1A` | `--text-warning-strong` / `--amber-1000` |
| `COLORS.info` | `#1A80F7` | `--text-info-strong` / `--blue-1000` |
| `COLORS.strokeStrong` | `rgba(23,11,0,0.45)` | `--stroke-neutral-strong` / `--brown-500` |
| `COLORS.strokeWeak` | `rgba(23,11,0,0.1)` | `--stroke-neutral-weak` / `--brown-100` |
| `COLORS.strokeWeaker` | `rgba(23,11,0,0.04)` | `--stroke-neutral-weaker` / `--brown-50` |
| `COLORS.fillWeak` | `rgba(23,11,0,0.04)` | `--fill-neutral-weak` / `--v3-fill-weak` |
| `COLORS.fillWeaker` | `rgba(23,11,0,0.02)` | `--fill-neutral-weaker` / `--v3-fill-weaker` |
| `COLORS.shadow` | `#170B00` | `--v3-base` (warm brown base) |

#### Semantic Token Naming Convention
The web uses a **strong / weak / weaker / disabled** scale for every semantic role. Mobile mirrors this:
- `Strong` = highest emphasis (headings, active borders)
- `Weak` = body copy, standard labels
- `Weaker` = placeholder, subdued UI
- `Disabled` = inactive / unavailable

This same convention applies to fill, stroke, text, and icon tokens. When deciding which weight to use — **strong for primary attention, weak for supporting information, weaker for structure.**

---

### 2. Typography

#### Font Stack
These are the loaded families. Screens don't set them directly; the `TYPE` roles below do.

| Weight | Token | Loaded as |
|--------|-------|-----------|
| Regular body | `FONTS.sans` / `FONTS.chatBody` | SF Pro Rounded (`ui-rounded`) on iOS; `Inter_400Regular` on Android |
| Medium labels | `FONTS.sansMedium` | `Inter_500Medium` |
| Semi-bold UI | `FONTS.sansSemi` | `Inter_600SemiBold` |
| Bold CTAs | `FONTS.sansBold` | `Inter_700Bold` |
| Editorial headings | `FONTS.serif` | `EBGaramond_400Regular` |
| Editorial subheadings | `FONTS.serifMedium` | `EBGaramond_500Medium` |
| Greeting name accent | `FONTS.serifMediumItalic` | `EBGaramond_500Medium_Italic` |
| Code / mono | `FONTS.mono` | `AzeretMono_400Regular` |

#### Usage Rules
- Body text uses the system SF Pro Rounded design on iOS. Web requests `ui-rounded` with Inter/system fallbacks; Android retains bundled Inter. Keep `font-sans` aligned with `FONTS.sans`. Editorial headings and medium/semibold/bold UI font tokens retain their existing families.
- Bold body emphasis uses `TYPE.bodyStrong` (`FONTS.bodyBold` with weight 700), so chat and story emphasis also stays in SF Pro Rounded on iOS. Custom capsule designs and exported memoir typography retain their dedicated families.
- **Every screen's primary title** uses a serif role (`screenTitle` or `displayTitle`). The serif is the soul of the brand.
- **Never** render body copy in EBGaramond — it is purely a display/heading font.
- **Uppercase tracking labels**: `TYPE.eyebrow` plus `uppercase tracking-widest` classes.
- Color, alignment, letter spacing and margins can be layered on top: `style={[TYPE.body, { color: COLORS.textBase }]}`.
- Need a size no role covers? Add a role to `typography.ts` rather than styling inline.
- Muted words within main-page section headings use `TYPE.sectionTitleWeak` (the loaded serif italic face), not synthetic italics.

#### Type Roles — Always Use `TYPE.*`
Text is styled with a role from `TYPE` in `src/constants/typography.ts`. Each role sets the font family, size and line height together. Most sizes are scaled for the device with `ms()` from `src/constants/responsive.ts`, so the base sizes below grow slightly on larger screens.

```tsx
import { TYPE } from '@/constants/typography';

<Text style={TYPE.screenTitle} className="text-text-strong">Your stories</Text>
<Text style={[TYPE.eyebrow, { color: COLORS.brand }]} className="uppercase tracking-widest">May 20 · 2 min read</Text>
```

| Role | Font | Base size / line height | Use |
|------|------|------------------------|-----|
| `displayStat` | `FONTS.serif` | 48 / 54 | Hero numerics |
| `displayTitle` | `FONTS.serif` | 36 / 42 | Hero titles |
| `screenTitle` | `FONTS.serif` | 28 / 34 | Every screen's primary title |
| `screenTitleAccent` | `FONTS.serifItalic` | 28 / 34 | The italic word in a screen title ("My *insights*") |
| `captureInput` | `FONTS.serif` | 20 / 28 | Overview capture card writing area (the placeholder stays on one line) |
| `reflectionTitle` / `reflectionTitleAccent` | `FONTS.serif` / `FONTS.serifItalic` | 20 / 27 | Continue reflecting card prompt; its orange highlighted words |
| `greeting` / `greetingName` | `FONTS.sans` 600 on iOS (SF Pro Rounded), `FONTS.sansSemi` elsewhere / `FONTS.serifMediumItalic` | 28 / 34 (fixed); name 32 / 34 | Overview two-line greeting ("Good morning, *Groot*," / "What’s on your mind today?"); the name is the muted serif medium italic accent |
| `greetingEditorial` / `greetingEditorialName` | `FONTS.serif` / `FONTS.serifItalic` | 24 / 32 | The editorial greeting variant (web's welcome section): one serif line beside the sun/moon |
| `sectionTitle` / `sectionTitleWeak` | `FONTS.serif` / `FONTS.serifItalic` | 22 / 28 | Section headers; muted words within them |
| `cardTitle` | `FONTS.serifMedium` | 20 / 26 | Card titles |
| `uiTitle` | `FONTS.sansSemi` | 20 / 26 | Non-editorial UI titles |
| `sheetTitle` | `FONTS.sans` 600 on iOS, `FONTS.sansSemi` elsewhere | 20 / 32 (fixed) | Bottom sheet titles |
| `bodyLarge` | `FONTS.sans` | 16 / 24 | Lead paragraphs |
| `bodyLargeSemi` | `FONTS.sans` 600 on iOS, `FONTS.sansSemi` elsewhere | 16 / 24 | Account enrichment strength word |
| `body` | `FONTS.sans` | 15 / 23 | Body copy |
| `bodyStrong` | `FONTS.bodyBold` 700 | 15 / 23 | Emphasised body copy |
| `bodySmall` | `FONTS.sans` | 14 / 20 | Secondary copy and body descriptions (no 13px text) |
| `label` | `FONTS.sansMedium` | 14 / 20 | Labels, list rows |
| `button` | `FONTS.sansSemi` | 16 / 22 | Standard button text |
| `buttonSmall` | `FONTS.sansSemi` | 14 / 20 | Compact button text |
| `metadata` | `FONTS.sansMedium` | 11 / 16 | Dates, counts, pill text, tab labels |
| `eyebrow` | `FONTS.sansBold` | 10 / 14 | Uppercase tracking labels |
| `input` | `FONTS.sans` | 16 / 22 | Text inputs |
| `stat` | `FONTS.sansBold` | 20 / 26 | Inline stat numerics |
| `insightStat` | `FONTS.sans` 600 on iOS, `FONTS.sansSemi` elsewhere | 20 / 26 | Insights statistics tiles (all four the same size, no shrink-to-fit) |
| `streakCount` | `FONTS.sansSemi` | 28 / 36 | Streak card day count (web streak card B) |
| `bodySmallStrong` | `FONTS.sansSemi` | 14 / 20 | Bold figures inside small copy |
| `planPrice` | `FONTS.sansSemi` | 36 / 40 | Plan prices on the plans page |
| `mono` | `FONTS.mono` | 14 / 20 | Code / mono |

`typography.ts` also holds single-purpose roles (`dashboardTitle`, `editorTitle`, `voicePickerTitle`, the music and publish-success roles, and others). Read the file for those rather than copying their values.

#### Enforced by `bun run check:typography`
`scripts/check-typography-compliance.js` scans `app/` and `src/` (except `typography.ts` and tests) and fails on:
- inline `fontSize`, `fontFamily` or `fontWeight` in styles
- arbitrary sizes like `text-[10px]`
- Tailwind size classes (`text-xs` … `text-6xl`) and weight classes (`font-medium`, `font-bold`, …)

The only exception is capsule theme previews, marked with a `typography-exception: capsule-theme-preview` comment on or above the line. The pre-commit hook runs this through `bun run verify`.

---------|------|------|
| Screen hero title | 28–36px | `FONTS.serif` |
| Section header | 20–24px | `FONTS.serif` |
| Card title | 18–22px | `FONTS.serif` |
| Body paragraph | 14–16px | `FONTS.sans` |
| Secondary label | 12–13px | `FONTS.sansMedium` |
| Metadata / pill text | 10–11px | `FONTS.sansBold` uppercase |
| Stat numerics | 28–48px | `FONTS.sansBold` |

---

### Mobile shape standard (updated October 17, 2026)

- Cards and buttons default to **10px radius** (`rounded-[10px]`). This supersedes the older card and pill defaults below. Shared `Card` and `Button` use this default; explicit specialized shapes remain opt-in (for example circular icon buttons).
- The side menu sits on `COLORS.sheet` (the bottom-sheet surface) with no texture pattern. The Explore section is called **Topics** everywhere people see it (routes stay `/explore`).
- Side-menu navigation and Search use **48px height**, **10px radius**, and **12px horizontal padding**; content is centered vertically. The active item uses `fillWeak` with neutral text.
- Side-menu Settings uses **48px height**, **100px radius**, and responsive 24px base horizontal padding.
- The side-menu profile and Search share a container, with a 32px gap before navigation. The profile uses the Overview prompt blue gradient.
- The side-menu account card uses **12px padding on all sides** and a **14px radius**.

### 3. Layout & Spacing

- The `DashboardHeader` right-most control is the user's avatar, which opens `/account`. The account page shows Quick actions (`QuickActions`: Quick note, Add people, Insights) under the profile card; there is no Quick tools sheet.
- Account page cards (profile, music, streak, enrichment) share **20px radius and 20px padding**. The profile card is white with light-mode ink on Dark and Deep Sky.

- Page content and headers use **16px** left/right gutters. Bottom sheets use **20px** total left/right gutters; avoid adding the sheet manager gutter twice. Internal card/control padding stays component-specific.

- Bottom sheets use three main groups: header (drag handle, title, close control), body, and actions. Keep **8px** from the visible drag indicator to the header row, **32px** between the main groups, and **24px** between sections inside the body. Sheet titles use **20px** SF Pro Rounded semibold with **32px** line height. The Publish post sheet implements this structure with a shared native handle/header component. A bottom CTA sits **8px** above the home indicator: `getSheetActionsBottomPadding(insets.bottom)` (`src/features/layout/sheet-safe-area.ts`). `SheetManager`'s shared container already applies it, so sheets rendered inside it add no bottom padding of their own; self-managed sheets and modal sheets call the helper directly. Sheets are at least `min(524px, 92%)` tall, so a sheet with buttons spreads `SHEET_FILL` on its root (or scroll content) and wraps the buttons in `<SheetActions>` (`src/components/sheets/SheetActions.tsx`); that pins them to the bottom instead of leaving them mid-sheet under short content.

- Main-screen sections use **40px** separation (`gap-10`, `mb-10`, or `pb-10` at list-header boundaries). Keep related controls, list rows, and content inside a section at their component spacing.
- The Overview greeting and primary action card are separate sections with **40px** between them.
- Continue Reflecting cards match web mobile: `min(78vw, 320px)` wide, 230px tall on Overview (200px compact on Topics, 3 prompt lines), 23px padding, 24px inner gap (16px compact), 16px between cards, scrolling edge to edge and snapping to the 16px gutter.
- Continue Reflecting groups its title and shuffle status in a zero-gap text column beside the shuffle button, with **16px** from the complete header group to the cards.

#### Border Radius System
| Shape | Value | Use case |
|-------|-------|----------|
| Pill (full round) | `rounded-full` | Buttons, tags, metadata pills (never inputs) |
| Input field | 12px (`INPUT_RADIUS`) | Every text input, single or multi-line |
| Large card | `rounded-[32px]` or `rounded-4xl` | Hero cards, primary feed cards |
| Standard card | `rounded-[24px]` | Standard list cards, sheets |
| Medium | `rounded-2xl` (16px) | Inner cards, secondary surfaces |
| Small | `rounded-xl` (12px) | Icon containers, nested elements |
| Tiny | `rounded-lg` (8px) | Badges, small chips |

> ⚠️ **Never use square corners** (`rounded-none` or `rounded-sm`) on any interactive surface. Every card, button, and input must be rounded.

#### Padding Philosophy
- **Hero cards / primary cards**: `p-6` or `p-7` internal padding
- **List cards body**: `px-5 pt-4 pb-5` (or `pb-6` when there's no footer row)
- **Sheets**: `px-5` or `px-6` horizontal, `pt-4 pb-8` vertical
- **Stat cards**: `p-5`
- **Buttons** (standard): `h-14` height, `px-6` horizontal
- **Buttons** (compact): `h-10` or `h-11`, `px-4`
- **Minimum tap target**: `minHeight: 44px` (iOS HIG) — every touchable must meet this

#### Shadow System
Use `styles.cardShadow` from `StyleSheet.create` — never use heavy `elevation` or hard drop shadows.
```ts
// iOS
shadowColor: COLORS.shadow, // '#170B00'
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.07,
shadowRadius: 16,
// Android
elevation: 3,
```
The shadow should be barely perceptible — it lifts the card off the page background without dramatizing it.

#### Texture / Pattern Overlay
Main pages use the same untextured, theme-adaptive `COLORS.background` surface as Overview. Do not add a page-wide `welcome_bg.png` overlay to Explore, Stories, Capsules, or Chat. The texture example below is reserved for explicitly textured surfaces.
```tsx
<ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
```

---

### 4. Component Anatomy

#### Buttons
```
Primary CTA:     bg-brand, rounded-full, h-14, text-white, TYPE.button
Secondary:       border border-stroke-weak, bg-fill-weaker, rounded-full, h-14
Destructive:     border-error/20, bg-error/5, text-error
Icon-only round: size-10 or size-11, rounded-full, bg-fill-weaker, border-stroke-weaker
Overlay pill:    bg-black/50, rounded-full, px-2.5 py-1 (for on-image overlays)
```

#### Inputs
```
Container:  bg-fill-weaker, border-stroke-weaker, 12px radius (`INPUT_RADIUS` in TextInput — never pill or large rounded corners)
Focus:      border-brand
Height:     h-14 (standard), h-12 (compact)
Text:       TYPE.input, text-text-strong
Placeholder: COLORS.textMuted
```

#### Cards — Feed Cards (Memory List)
```
Outer:       rounded-[24px], border-stroke-weaker, bg-white, overflow-hidden
Shadow:      cardShadow (see above)
Hero image:  aspectRatio: 3/2, full-width, rounded-t-[24px]
Date pill:   absolute bottom-3 left-4, bg-black/50, rounded-full, white text
Actions pill: absolute top-3 right-4, bg-black/50, rounded-full, white icon
Title:       TYPE.cardTitle, below image, mt-4
Body:        TYPE.body, color: COLORS.previewText ('#555555'), 2 lines max
Tags:        MemTag component, flex-wrap
No footer row: actions are on the image overlay, not the bottom row
```

#### Cards — Masonry Grid Cards
```
Image/Video: seeded aspect ratio (4:5, 5:6, 3:4, 1:1), rounded-[20px]
Audio:       dark bg-text-strong, Mic icon + duration, wave lines
Text-only:   seeded pastel surface (5 options from stableHash of _id)
Actions:     ⋮ pill overlaid top-right on each card variant
Title:       TYPE.bodySmall, centered below the card
Body text:   TYPE.bodySmall, text-text-base — user's own words only
```

> ⚠️ **Never render AI-generated `summary` or `topics` fields on feed cards.** These are backend inference artifacts and may contain nonsense. Show only user-authored `body` and user-defined `tags`.

#### Sheets (Bottom Sheets)
```
Provider:      @gorhom/bottom-sheet via SheetManager
Header:        <SheetHeader title onClose /> (no description line under the title) (src/components/sheets/SheetHeader.tsx): TYPE.sheetTitle left, 44px close right.
               32px (SHEET_GROUP_GAP) between header, body and actions; 24px (SHEET_SECTION_GAP) between body sections.
               Alert-style confirmations and celebration sheets keep their centred layout.
Chrome:        useSheetChrome() (src/components/sheets/use-sheet-chrome.ts) on every BottomSheetModal — matches web phone sheets:
               top radius 20px; max height 92% of screen (8% top gap, never under the status bar);
               min height min(524px, 92%) (compact: true for short confirmations, like web alert dialogs);
               grabber 36×4, strokeStrong at 35%; backdrop light rgba(94,94,94,0.5), dark/Deep Sky rgba(64,66,76,0.55) (lighter, so the dark sheet stands out)
Background:    colors.sheet from useThemeColors() — #ffffff light, #12131a dark; Deep Sky uses the same #12131a as Dark
Backdrop:      backdropComponent={SheetBackdrop} (SHEET_BACKDROP in sheet-presentation.ts)
Trigger:       useUiStore.getState().openSheet() — never use local Modal state
```

#### Pills / Tags / Badges
```
Standard tag:  TYPE.eyebrow, uppercase, tracking-widest, rounded-full
              bg-fill-weaker, border-stroke-weaker
Brand tag:     bg-brand/5, border-brand/15, text-brand
Status badge:  Use the Badge UI component with variant prop
Topic pills:   Seeded hue system (stableHash of topic string → HSL color)
```

#### Navigation / Tab Bar
```
Tab bar bg:     bg-background (#ffffff)
Active icon:    COLORS.brand + strokeWidth 2.2
Inactive icon:  COLORS.textMuted + strokeWidth 1.8
Active label:   TYPE.metadata, COLORS.textStrong
Inactive label: TYPE.metadata, COLORS.textBase
Active dot:     size-1, bg-brand, above icon
```

---

### 5. Micro-Interactions

Every interaction must have physical weight. The app should feel alive.

#### Haptics (mandatory on all interactions)
```ts
// Selection / tap:
Haptics.selectionAsync()
// Action (destructive or significant):
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
// Heavy (confirmation, success):
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
// Warning / alert:
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
```
**Every button press, filter change, modal open, tab switch, and card press must fire haptics.**

#### Press Animation (cards & buttons)
```ts
const cardScale = useSharedValue(1);
const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
onPressIn: cardScale.value = withSpring(0.97)  // cards
onPressIn: cardScale.value = withSpring(0.98)  // buttons
onPressOut: cardScale.value = withSpring(1)
```

#### Enter Animations
- New screens / list headers: `FadeInDown.duration(600)` with staggered children using `.delay(100 * index)`
- Sheet content: `FadeInDown.duration(300)`
- Modal overlays: `FadeIn.duration(300)`
- Never use abrupt `setState` transitions without an animation

#### Pulsing Live Indicators
Use `withRepeat(withSequence(withTiming(1), withTiming(0.4)), -1, true)` for live/connected indicators.

---

### 6. Screen-Level Patterns

#### Standard Screen Template
```tsx
<SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
  <DashboardHeader title="Screen Title" />
  <View className="flex-1">
    <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} />
    {/* content */}
  </View>
</SafeAreaView>
```

#### Loading States
- Use the dedicated skeleton components (`StoriesSkeleton`, `OverviewSkeleton`, `CapsuleSkeleton`, `ExploreSkeleton`)
- Never show a blank white screen — skeleton screens maintain layout fidelity
- Inline spinners: use `<Spinner />` from `@/components/ui`

#### Empty States
```tsx
<EmptyState
  title="Punchy, active title"
  description="Short, warm description — not technical."
  actionLabel="Clear action verb"
  onAction={handler}
/>
```
Empty state titles should be warm and inviting, not system-speak (e.g., "Your story begins here" not "No items found").
The simple form is an icon, the title and a CTA, with no illustration or description; pass `actionTone="inverse"` for the theme-adaptive white (dark) / ink (light) button. My Stories uses it.

#### List / Feed Screens
- Infinite scroll: `onEndReachedThreshold={0.3}`, `hasNextPage && fetchNextPage()`
- Pull to refresh: `<RefreshControl tintColor={COLORS.brand} />`
- FlatList: always set `initialNumToRender={8}`, `maxToRenderPerBatch={5}`, `windowSize={5}`, `removeClippedSubviews`
- `renderItem` must always be a stable `useCallback` — never an inline arrow function
- `keyExtractor` must return a stable unique string (prefer `item._id`)

---

## 🛠 Technical Implementation

### 1. Style Tools
- **NativeWind**: Use Tailwind classes for layout, spacing, and token-based colors
- **Theme Tokens**: Use `COLORS.[token]` in the `style` prop, or token-mapped Tailwind classes (`text-text-strong`, `bg-brand`, etc.)
- **One exception**: layout math and dynamic values go in `style={{}}`, not className
- **StyleSheet.create**: Only for shadow objects and platform-specific styles

### 2. Component Patterns
- **Centralized UI**: Use components from `@/components/ui` — `Button`, `TextInput`, `Avatar`, `Badge`, `Spinner`, `Skeleton`, `MemTag`, `EmptyState`
- **Never** build ad-hoc primitive buttons or inputs in screen files
- **Sheet Pattern**: `useUiStore.getState().openSheet(name, props)` for all bottom sheets — no local `Modal` state
- **React.memo**: All list card components must be wrapped in `React.memo`
- **useCallback**: All `renderItem`, `onPress`, and event handlers passed as props must be `useCallback`
- **useMemo**: Expensive derived values (column distribution, filtered arrays, headers) must be `useMemo`
- **No hooks after conditional returns**: Hooks must always be declared before any `if`/early return

### 3. State & Data Fetching
- **Queries**: All data fetching must live in `src/hooks/queries/`
- **Mutations**: All write operations must live in `src/hooks/mutations/`
- **Global Sync**: Query hooks should update global store on success (e.g., `useProfile` syncs `useUserStore`)
- **Store Selectors**: Always use field-level selectors — `useUiStore((s) => s.closeSheet)` — never `useUiStore()` without a selector
- **Imperative reads**: Use `useUiStore.getState()` / `useUserStore.getState()` to read store values inside callbacks without subscribing to rerenders

### 4. Navigation
- **Expo Router**: File-based routing only
- **Safe back**: Always use `router.canGoBack()` guard before `router.back()`
- **Deep links**: Handle via `useUiStore.pendingDeepLink` for unauthenticated cases

### 5. Performance Rules
- **PanResponder**: Must be created in `useRef` — never in the render body
- **Streaming text**: Use `streamingRef` (not `useState`) as the guard for concurrent send prevention
- **Notification listeners**: Must be registered with `[]` deps — never include `router` as a dep
- **isMountedRef**: All async operations (uploads, API calls) that `setState` after completion must check `isMountedRef.current` first
- **VirtualizedList**: `renderItem` must be a stable reference; `React.memo` on card components is required

---

## 🚫 Anti-Patterns (Hard Rules — Never Violate)

### Colors
- ❌ Never use `#ff0000`, `bg-red-500`, `text-red-600`, or any generic Tailwind red for errors
- ❌ Never use `text-gray-*`, `text-slate-*` for body/UI text — use `text-text-*` tokens
- ❌ Never invent a second page fill — use `bg-background` (`#ffffff`). Cream (`sand-1` / `onboardingCream`) is for onboarding and texture, not the default screen.
- ❌ Never hardcode arbitrary hex values — all color must come from `COLORS.*` or approved exceptions

### AI-Generated Content
- ❌ Never render `memory.summary` on feed cards — AI summaries can be broken/nonsensical
- ❌ Never render `memory.topics` (AI-inferred) as pills on feed cards — user's `tags` only
- ✅ AI content (`summary`, `topics`) is only shown in detail/insight views where the user has opted in

### Components
- ❌ Never use React Native's default `Modal` — always use `@gorhom/bottom-sheet` via SheetManager
- ❌ Never build inline primitive buttons in screen files — use `<Button />` from `@/components/ui`
- ❌ Never place `useState` or `useEffect` after a conditional `return` — violates Rules of Hooks
- ❌ Never pass an inline arrow function as `renderItem` to FlatList
- ❌ Never call `useUiStore()` without a selector — always subscribe to the minimum slice needed

### Content
- ❌ Never use placeholder images — use actual brand assets or leave the space intentional
- ❌ Never write system-speak in empty states or error messages — always warm, human copy
- ❌ Never truncate button labels with "..." — shorten the label instead

### Technical
- ❌ Never directly mutate Zustand state — always use store action functions
- ❌ Never create a new `PanResponder` in the render body — wrap in `useRef`
- ❌ Never register `router` as a `useEffect` dependency when its purpose is just navigation in a callback

---

## 📐 Tab-by-Tab Reference

### Overview Tab
- Primary action: `OverviewCaptureCard` ("What's on your mind today?"), ported from web `overview-capture-card.tsx`. Tapping the card opens the add-story editor, carrying any draft. Default actions: Talk (white pill, first), Write (orange, square-pen icon; opens the add-story editor), and record. With a draft (voice notes or a saved text): Save now, Use as story (editor `initialDraft` handoff), Discuss (chat `discussText`), clear and record more.
- The story editor's + button opens the iOS system menu (`NativeMediaMenu.ios.tsx`, `@expo/ui` SwiftUI `Menu`: Gallery, Camera, Audio, Files); other platforms keep the `MediaPickerMenu` tile popup.
- Add story (`app/editor.tsx`, new stories only) sits on web mobile's album paper via `StoryComposerBackdrop`: light/dark artwork by resolved appearance (Deep Sky uses dark), 10% paper grain on light; the rich-text WebView is transparent.
- Reflection cards open the full reflection conversation on the topic route (`/chat/[id]`, `type: 'prompt'`), including answered cards — never a sheet.
- Enrichment score: `EnrichmentSummaryCard`, matching web chat settings `enrichment-summary.tsx` (strength word, View Insight pill, `fillWeaker` surface, `strokeWeak` border). The enrichment card and the journey stat cards use the calendar card's 20px radius. No Memory Spotlight on Overview.
- Stats: 4 `OverviewJourneyCard` items with background images from `/assets/images/backgrounds/`
- Chart: `SplineChart` with touch-drag interaction and haptic feedback
- Greeting: two lines in `TYPE.greeting` (SF Pro Rounded semibold 28/34, no sun/moon icon): `getGreeting()` + the user's nickname in `TYPE.greetingName` (serif medium italic, muted `textWeak`) ending with ",", then "What’s on your mind today?"; question greetings ("Back at it, *Groot*?") end with "?" and get a statement instead, picked per visit from `GREETING_FOLLOW_UPS` in `src/features/overview/greeting.ts` ("Ready when you are.", "Take your time.", …). The capture card below shows the muted placeholder "Add something to your Memento". Both versions live in `OverviewGreeting` (`variant="stacked"` is the default; `variant="editorial"` is web's sun/moon + Garamond line, and pairs with `OverviewCaptureCard placeholder="What’s on your mind today?"`). Keep the editorial variant: web still uses it. The Overview `DashboardHeader` floats (`floating`) over the content on a frosted fade (`FrostedHeaderBackdrop`)

### Chat Tab (Host Chat)
- Entry screen: resolves `primary_conversation_id` then `router.replace` — never shows a blank spinner for long
- Voice mode: with a saved voice, the chat call button starts the call directly (no `/voice-call` page); the page only opens for the intro, the voice picker or the upgrade screen. When a call ends, a toast confirms the recording was saved to Stories (iOS records calls).
- Chat screen: `FlatList inverted`, `TypingIndicator` when streaming, `MilestoneCard` for enrichment milestones
- Input: `ChatInput` floating pill with glassmorphism background on iOS
- Deep Dive: `DeepDiveBanner` + `DeepDiveNudge` surface contextually — never persistently
- Chat settings (`app/chat/settings.tsx`): full-screen with the warm gradient; sections 32px apart. Enrichment summary (20px padding and radius) + "Shared media & links" row; AI Voice: Voice narration switch, then two-column voice cards; Background Ambience: volume slider, then two-column tune cards. Voice narration (`useSpokenRepliesStore`, `useSpokenReplies`) reads each finished reply aloud via `/ai/spoken-reply`; the chat header speaker button toggles the same setting.

### Memories (Stories) Tab
- **Grid mode**: `MasonryMemoryGrid` with 2-column column-balancing algorithm
- **List mode**: `MemoryCard` editorial feed with 3:2 hero image, date pill overlay, actions pill overlay
- Never show AI `summary` or `topics` on feed cards
- Masonry cards: seeded aspect ratio + seeded pastel surface (text-only) — consistent per memory across sessions

### Explore Tab
- Category cards: full-bleed `CategoryCard` with cover image, EBGaramond title, chevron right
- Prompt pills: horizontal `ScrollView`, `ContinueReflectingCard`
- `useFocusEffect` to refetch on tab focus

### Insights Screen (`app/insights.tsx`)
- Ported from web `src/pages/dashboard/insights` + `src/features/insights`: title, `MemoryStatistics` and the sections tabs 40px apart; sections Observations, Insights, Preferences, Enrichment fields, and Milestones (web has the same five tabs). Milestones is the milestone cards only, with no heading or "X of Y reached" count, like the other tabs (`MILESTONE_CATALOGUE`, closest unreached first, brand-orange ticks, green Unlocked pill, counts on multi-step goals; Future Messenger dimmed as Coming soon while capsules are paused; plan in `docs/milestones-plan.md`) — no ritual row, streak card or ceremony lab. The Enrichment score tile uses the enrichment card scale (`features/overview/enrichment-strength.ts`).
- Celebration sheets (`CelebrationSheet`): `first-story-milestone` opens once per account after the first story's publish success page closes (`celebrateFirstStory`); `upgrade-success` opens after a confirmed Pro store purchase or the web checkout return (`/overview?checkout=success`).
- Detail pages (insight, note, enrichment field) open in place with their memory sources; Android back steps out of them first. `/insights?observation=<id>` opens that note.
- Note options (Sources, Edit, Forget) use the `observation-note` sheet. Field colors and copy live in `src/features/insights/insights-model.ts`, mirroring web `insights.css` / `enrichment-fields.ts`.

### Capsule Tab
- Card variants: `grid` (default) and `list` layout modes
- `CapsuleCard`: status badge, attachment strip, recipient row, "Due in" footer
- Actions: `CapsuleActionsSheet` via `useUiStore.getState().openSheet`
- Detail: `CapsuleDetailSheet` with interactive `StylePicker` for theme preview

---

When making function calls using tools that accept array or object parameters ensure those are structured using JSON. For example:
```tsx
<example_complex_tool>
  <parameter>[{"color": "orange", "options": {"option_key_1": true, "option_key_2": "value"}}, {"color": "purple", "options": {"option_key_1": true, "option_key_2": "value"}}]</parameter>
</example_complex_tool>
```

## Verify the running product before reporting completion

- Always inspect the implementation against every part of the user's request before reporting it as done.
- For UI changes, open the actual running app, refresh/reload it from this checkout, and visually verify the requested layout and interaction states. Passing source checks, tests, typecheck, or lint alone is not visual verification.
- Confirm the development server is serving the edited checkout and the device/browser has received the latest bundle. If the user reports no visible change, investigate the running app and server connection first.
- Fix any mismatch found during verification. Report only what was actually verified; if a check is blocked, state the concrete blocker and do not claim the affected requirement is complete.
