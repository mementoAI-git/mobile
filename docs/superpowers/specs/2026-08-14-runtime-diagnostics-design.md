# Runtime Diagnostics Design

## Goal

Expose low-overhead evidence for lag, heat, and media-preview failures in local simulator and release-like builds without recording personal content.

## Architecture

A focused diagnostics module owns a bounded in-memory event buffer and structured console output. Events contain category, name, timestamp, duration, and sanitized metadata. Instrumentation calls are cheap no-ops outside development unless `EXPO_PUBLIC_RUNTIME_DIAGNOSTICS=1` is set.

## Coverage

- Chat: count incoming stream chunks and emitted UI updates per second; never record message text.
- Media thumbnails: record local/server/client source, duration, and failure class; record only URL scheme and host.
- Media previews: record inferred media category, load success/failure, and player mount/play/pause/unmount lifecycle.
- Attachment normalization: infer image/video/audio MIME types from filenames and URLs when API metadata is missing or generic.
- Screens: record mount/unmount and slow development renders only at explicitly instrumented high-value screens.

## Privacy and Safety

- Never log message text, authentication data, user identifiers, full URLs, filenames, or file bytes.
- Keep at most 200 events.
- Do not send diagnostics over the network in this phase.
- Do not change production behavior except MIME normalization needed for correct preview selection.

## Verification

- Unit tests cover bounded buffering, enablement, URL sanitization, rate aggregation, and MIME inference.
- Existing media and chat tests continue to pass.
- Full `bun run verify` passes.
- Simulator logs demonstrate structured events during the fixed reproduction journey.
