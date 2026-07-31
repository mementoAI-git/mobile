# Edit Profile Scroll Expansion Design

## Goal

Let Edit Profile retain its bottom-sheet presentation while giving long form
content the full screen as soon as the user starts scrolling.

## Interaction

- Edit Profile opens at its existing 92% height.
- Its available snap points are 92% and 100%.
- The first scroll gesture expands the sheet to the 100% snap point.
- The fixed action footer remains visible.
- Existing explicit footer clearance remains in the form's scroll content.
- No other settings sheet receives this behavior.

## Architecture

`SheetManager` owns the `BottomSheetModal`, so it exposes an `expandSheet`
callback to self-managed sheet content. `EditProfileSheet` calls that callback
from `BottomSheetScrollView.onScrollBeginDrag`. The callback is idempotent
because snapping to the already-active final index is harmless.

## Verification

A focused source-level regression test verifies the two snap points, callback
propagation, and Edit Profile scroll trigger. The full verification suite must
also pass.

