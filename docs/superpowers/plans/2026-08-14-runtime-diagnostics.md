# Runtime Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-safe runtime evidence for lag, heating, and failed media previews while repairing attachment type inference.

**Architecture:** A small pure diagnostics core supplies bounded storage, sanitization, timing, and rate aggregation. Thin call sites instrument chat streaming and media lifecycle without subscribing components to diagnostics state.

**Tech Stack:** TypeScript, React Native, Expo Video/Image/Video Thumbnails, Bun test.

## Global Constraints

- Do not log message text, tokens, identifiers, filenames, full URLs, or media bytes.
- Store at most 200 diagnostic events.
- Diagnostics are enabled in development or by `EXPO_PUBLIC_RUNTIME_DIAGNOSTICS=1`.
- Keep design and plan files local and uncommitted.

---

### Task 1: Diagnostics Core

**Files:**
- Create: `src/lib/runtime-diagnostics.ts`
- Test: `src/lib/runtime-diagnostics.test.ts`

**Interfaces:**
- Produces: `runtimeDiagnostics.record`, `runtimeDiagnostics.start`, `runtimeDiagnostics.rate`, `runtimeDiagnostics.snapshot`, and `sanitizeMediaUri`.

- [ ] Write tests proving enablement, 200-event eviction, sanitized URI metadata, duration recording, and windowed rate counts.
- [ ] Run the test and confirm missing-module failure.
- [ ] Implement the minimal synchronous bounded buffer and timer/rate helpers.
- [ ] Run the test and confirm it passes.

### Task 2: Attachment Media-Type Normalization

**Files:**
- Create: `src/features/media/media-type.ts`
- Test: `src/features/media/media-type.test.ts`
- Modify: `src/components/chat/MessageBubble.tsx`

**Interfaces:**
- Produces: `inferMediaMimeType({ mimeType, name, uri }): string` and `getMediaCategory(...)`.

- [ ] Write table tests for missing, generic, uppercase, query-string, image, video, audio, and unknown inputs.
- [ ] Run the test and confirm missing-module failure.
- [ ] Implement inference and use it for chat tiles and full-preview attachments.
- [ ] Run media-type and existing media preview tests.

### Task 3: Thumbnail and Preview Diagnostics

**Files:**
- Modify: `src/components/ui/VideoThumbnail.tsx`
- Modify: `src/components/ui/MediaPreviewModal.tsx`

**Interfaces:**
- Consumes: `runtimeDiagnostics`, `sanitizeMediaUri`, and normalized preview MIME types.

- [ ] Add behavior tests to the diagnostics core for timer completion and sanitized errors.
- [ ] Record thumbnail source, extraction duration/failure, image load success/failure, and video lifecycle.
- [ ] Ensure effects clean up timers and never include full URIs.
- [ ] Run media and diagnostics tests.

### Task 4: Chat Stream Rate Diagnostics

**Files:**
- Modify: `src/hooks/use-stream-chat.ts`
- Test: `src/lib/runtime-diagnostics.test.ts`

**Interfaces:**
- Consumes: `runtimeDiagnostics.rate(name, metadata)` and timer completion.

- [ ] Add a rate-window test proving many calls create one aggregate event with a count.
- [ ] Instrument stream start, chunk rate, completion duration, abort, and error class without content.
- [ ] Run chat and diagnostics tests.

### Task 5: Verification and Simulator Evidence

**Files:**
- Modify only if verification reveals a scoped defect.

- [ ] Run targeted diagnostics, media, and chat tests.
- [ ] Run `bun run verify`.
- [ ] Launch the installed simulator build and capture idle CPU/memory.
- [ ] Exercise available authenticated screens and collect `[runtime]` logs.
- [ ] Report confirmed findings, remaining real-device limitations, and the exact reproduction script.
