# Memento Agent Guidelines

This document is the **single source of truth** for design language, technical architecture, and implementation standards for the Memento mobile application. Every AI agent and developer must follow it strictly before writing a single line of UI code.

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

All colors come from `COLORS` in `src/constants/tokens.ts` and the Tailwind config in `tailwind.config.ts`. **Never hardcode hex values except for the explicitly approved exceptions below.**

#### Background Surfaces
| Use | Token | Value | Tailwind class |
|-----|-------|-------|----------------|
| Primary screen bg | `COLORS.background` | `#fefbf8` | `bg-background` |
| Card / Sheet bg | `COLORS.card` | `#ffffff` | `bg-card` or `bg-white` |
| Onboarding screens | `COLORS.onboardingCream` | `#FAF7F2` | `bg-onboarding-cream` |
| Elevated fill | `COLORS.fillWeak` | `rgba(23,11,0,0.04)` | `bg-fill-weak` |
| Subtle fill | `COLORS.fillWeaker` | `rgba(23,11,0,0.02)` | `bg-fill-weaker` |

> ⚠️ **Never use pure `#ffffff` for full-screen backgrounds.** Use `bg-background` (`#fefbf8`) — the warm cream is what makes the app feel like a physical journal.

#### Brand
| Use | Token | Value | Tailwind |
|-----|-------|-------|----------|
| Primary CTA, active states | `COLORS.brand` | `#FF5E00` | `bg-brand`, `text-brand`, `border-brand` |
| Button hover/press tint | `COLORS.brandTint` | `rgba(255,94,0,0.2)` | `bg-brand/20` |
| Very subtle brand wash | `COLORS.brandSubtle` | `rgba(255,94,0,0.05)` | `bg-brand/5` |

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
| `COLORS.background` | `#fefbf8` | `--background` / `--color-background` |
| `COLORS.textStrong` | `rgba(23,11,0,0.9)` | `--text-neutral-strong` / `--brown-1000` |
| `COLORS.textBase` | `rgba(23,11,0,0.65)` | `--text-neutral-weak` / `--brown-700` |
| `COLORS.textWeak` | `rgba(23,11,0,0.45)` | `--text-neutral-weaker` / `--brown-500` |
| `COLORS.textDisabled` | `rgba(23,11,0,0.1)` | `--text-neutral-disabled` / `--brown-100` |
| `COLORS.brand` | `#FF5E00` | `--v3-brand-strong` / `--orange-1000` |
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
| Weight | Token | Loaded as |
|--------|-------|-----------|
| Regular body | `FONTS.sans` | `Inter_400Regular` |
| Medium labels | `FONTS.sansMedium` | `Inter_500Medium` |
| Semi-bold UI | `FONTS.sansSemi` | `Inter_600SemiBold` |
| Bold CTAs | `FONTS.sansBold` | `Inter_700Bold` |
| Editorial headings | `FONTS.serif` | `EBGaramond_400Regular` |
| Editorial subheadings | `FONTS.serifMedium` | `EBGaramond_500Medium` |
| Code / mono | `FONTS.mono` | `AzeretMono_400Regular` |

#### Usage Rules
- **Every screen's primary title**: `FONTS.serif` — this is non-negotiable. The serif is the soul of the brand.
- **All interactive labels, button text, metadata**: `FONTS.sansBold` or `FONTS.sansSemi`
- **All body / paragraph copy**: `FONTS.sans`
- **All uppercase tracking labels** (e.g. "MAY 20 · 2 MIN READ"): `FONTS.sansBold` + `tracking-widest` + `uppercase` + small size (`text-[10px]` or `text-xs`)
- **Numbers and stats**: `FONTS.sansBold` — large numerics look best in Inter Bold
- **Never** render body copy in EBGaramond — it is purely a display/heading font

#### Scale Reference
| Context | Size | Font |
|---------|------|------|
| Screen hero title | 28–36px | `FONTS.serif` |
| Section header | 20–24px | `FONTS.serif` |
| Card title | 18–22px | `FONTS.serif` |
| Body paragraph | 14–16px | `FONTS.sans` |
| Secondary label | 12–13px | `FONTS.sansMedium` |
| Metadata / pill text | 10–11px | `FONTS.sansBold` uppercase |
| Stat numerics | 28–48px | `FONTS.sansBold` |

---

### 3. Layout & Spacing

#### Border Radius System
| Shape | Value | Use case |
|-------|-------|----------|
| Pill (full round) | `rounded-full` | All buttons, inputs, tags, metadata pills |
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
The shadow should be barely perceptible — it lifts the card off the cream background without dramatizing it.

#### Texture / Pattern Overlay
Every main screen content area should have the `welcome_bg.png` texture at `opacity: 0.03`. This is the subtle grain that makes the app feel like a physical artifact.
```tsx
<ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
```

---

### 4. Component Anatomy

#### Buttons
```
Primary CTA:     bg-brand, rounded-full, h-14, text-white, FONTS.sansBold
Secondary:       border border-stroke-weak, bg-fill-weaker, rounded-full, h-14
Destructive:     border-error/20, bg-error/5, text-error
Icon-only round: size-10 or size-11, rounded-full, bg-fill-weaker, border-stroke-weaker
Overlay pill:    bg-black/50, rounded-full, px-2.5 py-1 (for on-image overlays)
```

#### Inputs
```
Container:  bg-fill-weaker, border-stroke-weaker, rounded-full (pill shape)
Focus:      border-brand
Height:     h-14 (standard), h-12 (compact)
Text:       FONTS.sans, text-text-strong
Placeholder: COLORS.textMuted
```

#### Cards — Feed Cards (Memory List)
```
Outer:       rounded-[24px], border-stroke-weaker, bg-white, overflow-hidden
Shadow:      cardShadow (see above)
Hero image:  aspectRatio: 3/2, full-width, rounded-t-[24px]
Date pill:   absolute bottom-3 left-4, bg-black/50, rounded-full, white text
Actions pill: absolute top-3 right-4, bg-black/50, rounded-full, white icon
Title:       22px FONTS.serif, below image, mt-4
Body:        FONTS.sans, color: '#555555', 2 lines max
Tags:        MemTag component, flex-wrap
No footer row: actions are on the image overlay, not the bottom row
```

#### Cards — Masonry Grid Cards
```
Image/Video: seeded aspect ratio (4:5, 5:6, 3:4, 1:1), rounded-[20px]
Audio:       dark bg-text-strong, Mic icon + duration, wave lines
Text-only:   seeded pastel surface (5 options from stableHash of _id)
Actions:     ⋮ pill overlaid top-right on each card variant
Title:       FONTS.sansMedium, 12px, centered below the card
Body text:   FONTS.sans, 11px, max 4 lines — user's own words only
```

> ⚠️ **Never render AI-generated `summary` or `topics` fields on feed cards.** These are backend inference artifacts and may contain nonsense. Show only user-authored `body` and user-defined `tags`.

#### Sheets (Bottom Sheets)
```
Provider:      @gorhom/bottom-sheet via SheetManager
Header:        serif title left, X button right (size-8 rounded-full bg-fill-weaker)
Handle:        backgroundColor: COLORS.strokeStrong, opacity: 0.3
Background:    COLORS.background (#fefbf8)
Trigger:       useUiStore.getState().openSheet() — never use local Modal state
```

#### Pills / Tags / Badges
```
Standard tag:  FONTS.sansBold, uppercase, tracking-widest, text-[10px], rounded-full
              bg-fill-weaker, border-stroke-weaker
Brand tag:     bg-brand/5, border-brand/15, text-brand
Status badge:  Use the Badge UI component with variant prop
Topic pills:   Seeded hue system (stableHash of topic string → HSL color)
```

#### Navigation / Tab Bar
```
Tab bar bg:     bg-background (#fefbf8)
Active icon:    COLORS.brand + strokeWidth 2.2
Inactive icon:  COLORS.textMuted + strokeWidth 1.8
Active label:   FONTS.sansSemi, COLORS.brand
Inactive label: FONTS.sans, COLORS.textMuted
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
- ❌ Never use a pure `#ffffff` screen background — use `bg-background` (#fefbf8)
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
- Hero: 2 large `ImageBackground` cards (`rounded-[32px]`), `p-7`, editorial serif title
- Stats: 4 `OverviewJourneyCard` items with background images from `/assets/images/backgrounds/`
- Chart: `SplineChart` with touch-drag interaction and haptic feedback
- Greeting: EBGaramond 32px, `getGreeting()` + user nickname in italic success green

### Chat Tab (Host Chat)
- Entry screen: resolves `primary_conversation_id` then `router.replace` — never shows a blank spinner for long
- Chat screen: `FlatList inverted`, `TypingIndicator` when streaming, `MilestoneCard` for enrichment milestones
- Input: `ChatInput` floating pill with glassmorphism background on iOS
- Deep Dive: `DeepDiveBanner` + `DeepDiveNudge` surface contextually — never persistently

### Memories (Stories) Tab
- **Grid mode**: `MasonryMemoryGrid` with 2-column column-balancing algorithm
- **List mode**: `MemoryCard` editorial feed with 3:2 hero image, date pill overlay, actions pill overlay
- Never show AI `summary` or `topics` on feed cards
- Masonry cards: seeded aspect ratio + seeded pastel surface (text-only) — consistent per memory across sessions

### Explore Tab
- Category cards: full-bleed `CategoryCard` with cover image, EBGaramond title, chevron right
- Prompt pills: horizontal `ScrollView`, `ContinueReflectingCard`
- `useFocusEffect` to refetch on tab focus

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
