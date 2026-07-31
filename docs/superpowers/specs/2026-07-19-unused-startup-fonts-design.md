# Unused Startup Fonts Design

## Goal

Remove font files that are loaded before splash dismissal but have no runtime consumers.

## Scope

Remove Averia Serif Libre regular/bold and Geist regular/bold from root imports, root font registration, and unused `FONTS` aliases. Preserve Inter, EB Garamond, Azeret Mono, and every capsule-theme font mapping.

## Architecture

The root layout remains the single core-font gate. Its `useFonts` call will contain only fonts that have verified consumers. A source-policy test will ensure the removed families are absent from the root critical path while required Inter and EB Garamond registrations remain.

No lazy-loading behavior is introduced in this step. Capsule typography, two-factor mono text, splash timing rules, and font-ready rendering behavior remain unchanged.

## Testing

A focused source-policy test will fail while Averia and Geist imports/registrations remain in `app/_layout.tsx`. After removal, it will also assert that core Inter and EB Garamond registrations are still present.

Run the focused test, full verification suite, and scoped diff review. Since all removed font aliases have no consumers, no visible behavior is expected to change; physical-device visual testing is optional rather than required for this step.

## Success Criteria

- Four unused Google-font weights leave the splash-screen critical path.
- No runtime file references the removed `FONTS.averia`, `FONTS.averiaBold`, `FONTS.geist`, or `FONTS.geistBold` aliases.
- Core and capsule font registrations remain intact.
- All automated verification passes.
