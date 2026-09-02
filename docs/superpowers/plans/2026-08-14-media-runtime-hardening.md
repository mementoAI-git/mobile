# Media Runtime Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop remote thumbnail extraction, inactive video-player construction, and stale local attachment loading.

**Architecture:** A pure URI policy owns media-runtime decisions. Thumbnail cards and the preview carousel consume that policy without duplicating URI rules.

**Tech Stack:** React Native, Expo Video, Expo Video Thumbnails, Bun tests, TypeScript.

## Global Constraints

- No remote video frame extraction on mobile.
- No native video player for inactive preview slides.
- No attempt to load stale relative files from the installed application bundle.
- No new dependency and no backend API change.
- Specification and plan remain local and uncommitted.

---

### Task 1: Media runtime policy

**Files:**
- Create: `src/features/media/media-runtime-policy.ts`
- Create: `src/features/media/media-runtime-policy.test.ts`

**Interfaces:**
- Produces: `canExtractVideoThumbnail(uri: string): boolean`
- Produces: `canRenderAttachmentUri(uri: string): boolean`

- [ ] Write tests proving remote HTTP(S) videos cannot be extracted, valid local cache/document URIs can be extracted, and app-bundle-relative `file://` references are rejected.
- [ ] Run `bun test src/features/media/media-runtime-policy.test.ts` and confirm the missing module/API failure.
- [ ] Implement the smallest URI policy that passes those cases.
- [ ] Run the focused test and confirm it passes.

### Task 2: Remote-safe video thumbnails

**Files:**
- Modify: `src/components/ui/VideoThumbnail.tsx`
- Modify: `src/features/media/cache-retention.test.ts`

**Interfaces:**
- Consumes: `canExtractVideoThumbnail(uri)`
- Produces: server thumbnail, cached local thumbnail, locally extracted thumbnail, or static placeholder.

- [ ] Add a failing behavioral policy assertion protecting the remote-extraction boundary.
- [ ] Run the focused media tests and confirm the remote extraction path remains reachable.
- [ ] Skip `getThumbnailAsync` for remote URIs and record `thumbnail-source` as `placeholder`.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Active-only preview players and safe images

**Files:**
- Modify: `src/components/ui/MediaPreviewModal.tsx`
- Modify: `src/features/media/media-preview-modal.test.ts`

**Interfaces:**
- Consumes: `canRenderAttachmentUri(uri)`
- Produces: native video only for the active slide and a lightweight inactive/stale-media placeholder otherwise.

- [ ] Add failing integration safeguards for active-only `VideoSlide` creation and stale URI rejection.
- [ ] Run the preview test and confirm it fails for the absent boundary.
- [ ] Render `VideoSlide` only when active; render the existing thumbnail/placeholder otherwise. Reject unusable local image URIs before constructing `Image`.
- [ ] Run the preview tests and confirm they pass.

### Task 4: Verification

**Files:**
- Verify all files above.

- [ ] Run `bun run verify` and require lint, typecheck, all tests, and production readiness to exit successfully.
- [ ] Rebuild/launch the iOS development client if native code or dependency configuration changed; otherwise reload the existing client and capture a Stories trace confirming zero remote `thumbnail-extraction` events.
