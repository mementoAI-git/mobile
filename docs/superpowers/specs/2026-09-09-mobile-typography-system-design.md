# Mobile Typography System Design

## Purpose

Make typography consistent across the entire Memento mobile application. The authenticated Overview experience is the visual baseline: restrained editorial headings, readable Inter body copy, compact metadata, and strong but non-oversized controls. Every screen—including authentication, onboarding, settings, sheets, editors, media views, and billing—must use the same semantic roles.

Consistency does not mean rendering every string at one size. It means that text with the same job has the same font family, size, weight, and line height everywhere.

## Current State

The application currently mixes NativeWind size classes, arbitrary pixel classes, inline `fontSize` values, explicit `fontWeight`, and feature-specific style maps. The audit found:

- More than 700 direct `FONTS.*` family assignments.
- More than 30 distinct size patterns, ranging from 7 to 52 points.
- Parallel definitions for equivalent roles, especially between Overview, Settings, sheets, editors, and detail screens.
- Conflicting declarations such as a regular font-family file combined with a bold Tailwind weight.
- Large one-off settings and sheet typography that does not match equivalent Overview content.

The highest concentrations of arbitrary sizes are in `app/editor.tsx`, `app/article.tsx`, `src/components/ui/MediaPreviewModal.tsx`, `app/create.tsx`, story detail, privacy and action sheets, chat messages, beneficiary details, and chat settings.

## Canonical Scale

Create a single exported `TYPE` style map in `src/constants/typography.ts`. Each role owns its family, size, and line height. Consumers may add color, alignment, truncation, or layout styles, but may not override typography metrics.

| Role | Family | Size | Line height | Intended use |
|---|---|---:|---:|---|
| `displayStat` | EBGaramond Regular | 48 | 54 | Singular hero statistics such as enrichment score |
| `displayTitle` | EBGaramond Regular | 36 | 42 | Rare onboarding or campaign hero headline |
| `screenTitle` | EBGaramond Regular | 28 | 34 | Every screen’s primary title |
| `greeting` | Inter Regular | 24 | 32 | Personalized Overview-style greeting only |
| `sectionTitle` | EBGaramond Regular | 22 | 28 | Major section headings |
| `cardTitle` | EBGaramond Medium | 20 | 26 | Editorial card and sheet content titles |
| `uiTitle` | Inter SemiBold | 20 | 26 | Functional modal or sheet titles |
| `bodyLarge` | Inter Regular | 16 | 24 | Prominent explanatory copy |
| `body` | Inter Regular | 15 | 23 | Standard paragraphs and values |
| `bodySmall` | Inter Regular | 13 | 19 | Supporting descriptions and secondary copy |
| `label` | Inter Medium | 14 | 20 | Field, row, filter, and compact control labels |
| `button` | Inter SemiBold | 16 | 22 | Standard CTA labels |
| `buttonSmall` | Inter SemiBold | 14 | 20 | Compact CTA labels |
| `metadata` | Inter Medium | 11 | 16 | Dates, counts, helper metadata |
| `eyebrow` | Inter Bold | 10 | 14 | Uppercase, tracked category or status labels |
| `input` | Inter Regular | 16 | 22 | User-entered and placeholder text |
| `stat` | Inter Bold | 20 | 26 | Ordinary numeric values and compact statistics |
| `mono` | Azeret Mono Regular | 13 | 19 | Code-like identifiers only |

The scale intentionally reuses the Overview hierarchy. It removes nearby duplicates such as 17 versus 18 for ordinary values, 21 versus 22 for section headings, and 26 versus 28 for screen titles.

## Family and Weight Rules

- EBGaramond is reserved for editorial display roles: `displayStat`, `displayTitle`, `screenTitle`, `sectionTitle`, and `cardTitle`.
- Inter is used for UI titles, body copy, labels, controls, forms, metadata, and ordinary statistics.
- Weight comes from the loaded font file (`FONTS.sansMedium`, `FONTS.sansSemi`, `FONTS.sansBold`, or the serif equivalent), never from a separate `fontWeight` declaration.
- Nested text inherits only when it represents the same semantic role. A highlighted fragment that changes emphasis uses the corresponding family token, not a Tailwind `font-bold` override.
- User content may retain semantic rich-text emphasis. The renderer maps `<strong>` and headings to approved roles rather than arbitrary numeric weights or sizes.

## Allowed Exceptions

Exceptions are role-based, not screen-based:

- Media timestamps and dense overlay metadata may use 10-point `eyebrow` text.
- Accessibility labels are not visually rendered and are outside the scale.
- Third-party editor or web-view content may use its own internal CSS only where native typography styles cannot reach it; its visible base and heading sizes must still map to this scale.
- Chat bubbles use `body` by default and may use `bodySmall` for attachment metadata.
- A design requiring a new visible size must first add a named semantic role and a contract test. One-off `fontSize` values remain prohibited.

## Architecture

`src/constants/typography.ts` becomes the single typography authority and exports:

```ts
export const TYPE = StyleSheet.create({
  displayStat: { fontFamily: FONTS.serif, fontSize: 48, lineHeight: 54 },
  displayTitle: { fontFamily: FONTS.serif, fontSize: 36, lineHeight: 42 },
  screenTitle: {
    fontFamily: FONTS.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  greeting: { fontFamily: FONTS.sans, fontSize: 24, lineHeight: 32 },
  sectionTitle: { fontFamily: FONTS.serif, fontSize: 22, lineHeight: 28 },
  cardTitle: { fontFamily: FONTS.serifMedium, fontSize: 20, lineHeight: 26 },
  uiTitle: { fontFamily: FONTS.sansSemi, fontSize: 20, lineHeight: 26 },
  bodyLarge: { fontFamily: FONTS.sans, fontSize: 16, lineHeight: 24 },
  body: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  bodySmall: { fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 20 },
  button: { fontFamily: FONTS.sansSemi, fontSize: 16, lineHeight: 22 },
  buttonSmall: { fontFamily: FONTS.sansSemi, fontSize: 14, lineHeight: 20 },
  metadata: { fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 16 },
  eyebrow: { fontFamily: FONTS.sansBold, fontSize: 10, lineHeight: 14 },
  input: { fontFamily: FONTS.sans, fontSize: 16, lineHeight: 22 },
  stat: { fontFamily: FONTS.sansBold, fontSize: 20, lineHeight: 26 },
  mono: { fontFamily: FONTS.mono, fontSize: 13, lineHeight: 19 },
});

export type TypographyRole = keyof typeof TYPE;
```

Colors do not live in `TYPE`; semantic color tokens remain controlled by each component. The existing `FONTS` map remains the source of loaded family names.

`src/components/settings/settings-typography.ts` is removed after all consumers migrate. Shared primitives (`Button`, `TextInput`, badges, empty states, headers, and sheet headers) apply global roles internally so downstream screens do not repeat metrics.

## Migration Boundaries

Migration proceeds in independently verifiable batches:

1. Add the global scale and enforcement tests without changing rendered output.
2. Migrate shared UI primitives and headers.
3. Migrate the five primary tab experiences: Overview, Chat, Stories, Explore, and Capsules.
4. Migrate account, settings, billing, beneficiaries, security, privacy, and all related sheets.
5. Migrate story/article/create/editor flows, media preview, and rich-text rendering.
6. Migrate authentication, onboarding, pricing, share, insights, and remaining routes.
7. Remove the Settings-only map and all obsolete direct typography declarations.

Each batch may adjust spacing only when normalized line height changes wrapping or vertical rhythm. It must not change copy, navigation, data contracts, business logic, or API behavior.

## Enforcement

Add a source-level contract test that scans application TypeScript and TSX files and fails on:

- Numeric `fontSize` declarations outside `src/constants/typography.ts` and an explicit, documented allowlist for non-visible measurement constants.
- Arbitrary NativeWind classes such as `text-[17px]`.
- Visual `fontWeight` declarations.
- Tailwind `font-normal`, `font-medium`, `font-semibold`, or `font-bold` on elements whose family is already supplied through a `TYPE` role.
- Imports of the removed Settings-specific typography map.

Standard Tailwind size classes are also migrated rather than silently allowed, because a later Tailwind configuration change must not create a second typography authority.

## Visual Verification

Automated checks cannot prove optical consistency. The final gate uses iOS simulator captures at the same device size for:

- Overview and one representative screen from every primary tab.
- Settings hub plus billing, beneficiary detail, security, and privacy.
- A short and long bottom sheet with keyboard shown and hidden.
- Story detail, editor, chat, media preview, login, onboarding, pricing, and an empty state.

Review checks title alignment, role parity, wrapping, truncation, dynamic content expansion, button-label fit, input legibility, and sheet footer visibility. Android receives a build/type gate and targeted screenshots for text clipping because its font metrics differ from iOS.

## Compatibility and Risk Controls

- This change is presentation-only and introduces no API or navigation contract changes.
- Existing accessibility scaling remains enabled; no component sets `allowFontScaling={false}`.
- Buttons and inputs preserve their existing minimum tap targets.
- Long translations and user-generated content remain allowed to wrap unless the existing product behavior intentionally truncates them.
- Migration commits remain small enough to revert by surface if visual regression appears.
- The final repository gate is `bun run verify:full`, with simulator smoke testing performed before integration.

## Acceptance Criteria

- Every visible native text element maps to one named global role or a documented exception.
- Equivalent roles render with identical family, size, weight, and line height across the app.
- No feature-specific typography map remains.
- No arbitrary native font sizes or visual `fontWeight` declarations remain outside the approved authority and exceptions.
- Primary navigation, sheets, forms, editor flows, and media views remain functional.
- All automated tests, lint, typecheck, readiness checks, and Expo Doctor pass when external services are available.
- Simulator review finds no clipping, unintended wrapping, hidden footer, or oversized Settings typography regression.
