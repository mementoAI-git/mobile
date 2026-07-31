# Account Insights and Settings Design

## Scope

Extend the Account experience with three full-screen destinations and one bottom sheet:

- `View Insights` and the enrichment card open `/insights`.
- The Account gear opens `/settings`.
- Settings `Personal Info` and the profile card open `/settings/profile`.
- `Edit Profile` on Account and Personal Info opens the `edit-profile` sheet.

All work remains local and uncommitted unless the user later requests otherwise.

## My Insights

`/insights` follows the supplied reference: centered title, back and settings controls, the user's self-description, horizontally scrollable tabs, and a large content card.

The Enrichment score tab uses the real enrichment score. It renders the ten life-area labels using a shared semantic palette. When the API supplies dimension values, they are normalized into percentages; absent values render as zero rather than invented user data. The Insights, Notes, and Preferences tabs reuse the existing persona and context queries and display warm empty states when data is unavailable.

The settings button navigates to `/settings`. Back uses `router.canGoBack()` and falls back to `/account`.

## Settings

`/settings` becomes the settings hub instead of redirecting. It matches the supplied reference with a centered header, compact profile card, simple icon rows, logout action, community links, and version copy.

Existing destinations are preserved:

- Personal Info: `/settings/profile`
- Security: `/settings/account`
- Privacy: `/settings/privacy`
- Beneficiaries: `/settings/beneficiaries`
- Billing: `/settings/billing`
- Send Feedback: existing `feedback` sheet
- Logout: existing confirmed logout mutation

The community buttons use existing social image assets. External URLs are centralized and opened with React Native `Linking`.

## Personal Info

`/settings/profile` becomes the read-only Personal Info screen. It displays About me, email, nickname, first and last names, birthday, phone, country, and city/location from `useProfile`.

Missing values render a subdued human-friendly fallback. Dates are formatted `DD/MM/YYYY`. The back button falls back to `/settings`. `Edit Profile` opens the global `edit-profile` sheet.

## Edit Profile Sheet

The sheet uses `@gorhom/bottom-sheet` through `SheetManager`. It contains email (disabled), nickname, first name, last name, birthday, phone, country, and city/location. About me is intentionally read-only and excluded because the supplied edit reference does not include it.

Saving posts the supported fields to `/users/profile`, updates the profile query cache and user store, shows success/error feedback, and closes only after success. Dismiss and close controls discard unsaved local form state. Every interaction retains the project's haptic and minimum tap-target behavior.

## Reuse and Boundaries

- Reuse `Avatar`, `Button`, `TextInput`, settings icons, profile/persona/stats hooks, `useProfileSettingsLogic`, `SheetManager`, and social assets.
- Keep enrichment derivation in `src/features/account/`.
- Keep write behavior in `src/hooks/mutations/`.
- Keep screens focused on composition; reusable cards, tab content, and the edit form live in components.
- Use semantic `COLORS` and `FONTS`; no generic gray colors or arbitrary hex values.

## Loading, Errors, and Testing

Loading states preserve the target layout with skeletons. Failed reads show partial available data plus warm retry/empty messaging. Failed saves keep the sheet open.

Tests cover:

- Account actions route to `/insights`, `/settings`, and `edit-profile`.
- Settings and Personal Info destinations remain connected.
- Profile payload normalization and date formatting.
- Enrichment dimension normalization.
- Sheet registration and shared-component/token reuse.

Full acceptance requires lint, typecheck, all Bun tests, production-readiness checks, and `git diff --check`.
