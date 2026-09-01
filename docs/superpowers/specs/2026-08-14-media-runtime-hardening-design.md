# Media Runtime Hardening Design

## Goal

Remove the confirmed client-side media work that makes Stories scrolling and previews expensive while preserving useful previews when the API supplies valid media.

## Evidence

The captured simulator trace contained 74 story-card image loads and four remote video frame extractions. The extractions consumed 6,441 ms in total. It also contained a stale `file://` attachment referencing a file that does not exist in the installed application bundle. Chat streaming was low-frequency and is outside this fix.

## Design

Create a pure media-runtime policy that classifies URIs as remote, usable local, or unusable bundled-local references. Remote video cards use only server thumbnails. If no server thumbnail exists, they render the existing branded video placeholder without invoking `expo-video-thumbnails`. Local videos may retain device-side extraction because they do not require downloading and decoding a remote asset.

The media preview carousel renders a lightweight poster/placeholder for inactive video slides. A `VideoSlide` and its native Expo video player are created only for the active slide. When the active slide changes, the old player unmounts and releases its resources.

Stale local image attachments do not reach React Native's `Image` component. They render the same intentional media placeholder and record a diagnostic failure with source `local`.

## Testing

Pure policy tests cover remote extraction denial, local extraction permission, stale bundle-path rejection, and valid cache/document local paths. Component integration tests protect the active-only player boundary. The complete project verification command remains `bun run verify`.

## Constraints

- No remote video frame extraction on mobile.
- No native video player for inactive preview slides.
- No attempt to load stale relative files from the installed application bundle.
- No new dependency and no backend API change.
- Specification and plan remain local and uncommitted.
