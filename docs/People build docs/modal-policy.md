# Native Modal Policy

New product sheets, dialogs, pickers, and action panels must use `SheetManager`
and `@gorhom/bottom-sheet`. A React Native `Modal` is allowed only when a
separate native full-screen window is required for capture or immersive media.
An exception must be listed here and covered by native QA; this document does
not authorize new exceptions implicitly.

## Approved full-screen exceptions

| File | Surface | Why a bottom sheet is insufficient | Native QA |
| --- | --- | --- | --- |
| `src/components/ui/CameraCaptureModal.tsx` | Camera photo/video capture | Owns a full-screen camera lifecycle, permissions, status bar, safe-area window, and recording controls. | Open/deny/grant permissions, rotate, capture photo/video, cancel, background/foreground. |
| `src/components/ui/MediaPreviewModal.tsx` | Immersive attachment preview | Full-screen paged image/video/audio preview needs a separate safe-area window and status-bar treatment. | Swipe items, play/seek, share, delete, close, rotate, background/foreground. |

## Existing migration debt

These usages predate the policy and must not be copied. Their behavior remains
unchanged until each has a SheetManager or route-based replacement with tests.

| File | Current surface | Required replacement |
| --- | --- | --- |
| `app/create.tsx` | Emoji picker overlay | `EmojiPickerSheet` through `SheetManager`. |
| `app/article.tsx` | Article composer/publish flow | Expo Router full-screen route. |
| `app/editor.tsx` | Publish-success window | Route-owned success state or registered full-height sheet. |
| `src/components/ui/MediaPreviewModal.tsx` | Nested share action panel | Registered share-actions sheet; the preview itself remains approved. |
| `src/components/ui/ConfirmDialog.tsx` | Generic confirmation dialog | Registered confirmation sheet with the existing API adapted centrally. |

## Review rule

Any pull request adding `Modal` from `react-native` fails review unless it updates
this registry with a concrete native-window requirement and QA matrix. Visual
preference alone is not a valid exception.
