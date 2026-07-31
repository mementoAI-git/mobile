# Capsule Artwork Externalization Design

## Goal

Remove approximately 3.9 MB of embedded base64 image data from capsule-theme TypeScript while preserving all six rendered designs exactly.

## Scope

Externalize the seven PNG payloads embedded in Bead, Blush, Modern, Paper, and Sage. Dark contains no embedded raster payload and remains structurally unchanged. Preserve every SVG view box, vector element, clipping path, pattern transform, opacity, and theme mapping.

## Architecture

Each unique embedded `data:image/png;base64,...` payload will be decoded byte-for-byte into `assets/images/capsule-themes/`. Asset names will identify their theme and pattern position. Before replacement, each decoded payload's SHA-256 will be recorded. Tests will verify that committed asset bytes match those hashes.

The SVG components will replace data URI strings with module-level `require()` asset sources accepted by `react-native-svg`'s `Image` element. The SVG wrappers stay responsible for scaling, clipping, positioning, and composition, so the externalized assets render through the same geometry as before.

No complete-card rasterization, image recompression, or artwork redesign occurs.

## Bundle Behavior

The PNG bytes move from JavaScript source into Metro-managed binary assets. This removes base64 decoding and multi-megabyte JavaScript parsing from module evaluation. It also avoids base64's encoding overhead while leaving the actual image information unchanged.

## Testing and Visual Verification

Focused tests will enforce:

- No `data:image/...;base64` remains in capsule letter TypeScript.
- All expected external assets exist.
- Every asset's SHA-256 matches the original decoded payload.
- Theme exports and component mappings remain present.

Run strict TypeScript, lint, all tests, production-readiness checks, and compare total capsule-letter source size before and after.

Because this changes artwork loading, automated byte equality is necessary but not sufficient. Render all six themes in a development build and inspect create preview and capsule detail at phone width. Confirm pattern positioning, clipping, rounded corners, background fill, and text readability. Do not claim physical visual verification unless a runnable native target is available.

## Error Behavior

Missing or invalid assets must fail tests and Metro resolution rather than silently falling back. Existing theme selection and default-theme behavior remain unchanged.

## Success Criteria

- Seven embedded PNG payloads are committed as binary assets without byte changes.
- Capsule-letter TypeScript falls from roughly 3.9 MB to a small SVG wrapper layer.
- No base64 image data remains in those components.
- All six theme mappings remain intact.
- All automated verification passes.
- Native visual verification requirements are explicitly reported.
