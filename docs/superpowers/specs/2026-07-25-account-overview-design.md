# Account Overview Design

## Goal

Add a dedicated Account overview screen matching the supplied mobile reference. The profile circle in every `DashboardHeader` opens this Account screen. The gear button on the Account screen opens the existing settings hub.

## Navigation

- Add the top-level Expo Router route `/account`.
- Change the `DashboardHeader` profile-circle destination from `/settings/profile` to `/account`.
- The Account back button uses `router.canGoBack()` before `router.back()` and falls back to `/(tabs)/overview`.
- The Account gear button pushes `/settings/profile`.
- Keep `/settings/profile` and all existing settings child routes unchanged.
- Register `/account` in the root stack with the same full-screen transition family as settings.

## Screen Structure

The screen uses the supplied reference as the visual source of truth while following Memento's token and typography system.

1. Header
   - Circular back control on the left.
   - Centered `Account` title.
   - Circular gear control on the right.
   - Safe-area aware and visually balanced.

2. Pro banner
   - Full-width rounded gradient card.
   - Upgrade message and compact upgrade pill.
   - Uses current subscription state: paid users do not receive a misleading upgrade action.
   - Upgrade action opens the existing billing or upgrade flow.

3. Profile summary
   - Name, email, member-since date, avatar, and optional user-authored profile description.
   - `Edit Profile` uses the existing profile/settings destination until a dedicated edit route exists.
   - `View Insights` opens the existing memory-insights sheet.
   - Missing data receives warm, intentional fallbacks; no placeholder image is introduced.

4. Enrichment card
   - Current enrichment score from the existing user-stats query.
   - Explanatory copy and a segmented multicolor score rail.
   - The percentage determines filled progress without hardcoded account data.
   - The insight row opens the existing memory-insights sheet.

5. Weekly progress card
   - Dark rounded card based on the supplied composition.
   - Reuses the existing streak/user-stats data and week calculations already established by `StreakSheet`.
   - Shows the current week, today marker, streak, stories, and reflections.
   - The card may open the existing streak sheet for expanded detail.

## Reuse and Component Boundaries

Before adding components, implementation must reuse:

- `Avatar`
- `Button` where its supported variants match the reference
- `useProfile`
- `useUserStats`
- `useSubscription`
- `useUiStore` sheet actions
- date/week derivation patterns from `StreakSheet`
- `COLORS`, `FONTS`, and existing background texture
- existing settings and billing routes

New account-specific presentation components may be extracted only where they have a clear role, such as:

- `AccountUpgradeBanner`
- `EnrichmentScoreCard`
- `WeeklyProgressCard`

These components remain presentation-focused and receive derived values and stable callbacks through props. The route owns navigation and data composition.

## Data and State

- Server state remains in TanStack Query.
- The screen must not introduce duplicate profile, stats, or subscription requests; it consumes existing query hooks and shared cache keys.
- Loading uses a layout-faithful skeleton rather than a blank screen.
- Refresh uses the existing query refetch functions and brand-colored `RefreshControl`.
- Derived week cells and display values are memoized.
- Event handlers passed to child components are stable callbacks.

## Interaction and Motion

- Every press fires the appropriate haptic.
- Cards and buttons use the established spring press scale.
- Major sections enter with staggered `FadeInDown` animations.
- All touch targets are at least 44 points.
- Navigation is guarded and uses typed Expo Router destinations.

## Visual Rules

- Full-screen background uses `COLORS.background`.
- Text uses warm semantic text tokens; no generic gray palette.
- The reference's blue gradient, dark weekly card, and progress-segment colors must be represented through centralized account-specific constants or existing tokens, not scattered inline values.
- Screen title uses `FONTS.serif` to preserve the project-wide title rule, even though the reference title appears sans-serif.
- User-provided avatar is used when available; otherwise the shared `Avatar` fallback renders initials.
- The `welcome_bg.png` texture remains present at subtle opacity.

## Error and Empty Handling

- Profile/stat query failure retains the screen shell and shows warm retry copy.
- Missing biography omits the paragraph rather than inventing user content.
- Missing subscription data defaults to a neutral state and does not assert that the user is free or paid.
- Missing weekly values render zero without breaking layout.

## Testing and Verification

- Add a navigation policy test proving `DashboardHeader` targets `/account`, Account gear targets `/settings/profile`, and the existing settings redirect remains intact.
- Add pure tests for weekly progress derivation and enrichment progress clamping.
- Run focused tests, lint, strict TypeScript, the full Bun test suite, and production-readiness checks.
- Perform visual comparison at the reference viewport and at one smaller supported phone width.
- Native smoke checklist: profile-circle navigation, back fallback, gear navigation, upgrade behavior, insight sheet, streak sheet, pull-to-refresh, and paid/free subscription states.

## Non-Goals

- Redesigning the existing settings hub.
- Adding backend fields or inventing biography content.
- Reworking billing, memory insights, or streak sheet behavior.
- Changing tab navigation or other `DashboardHeader` behavior.
