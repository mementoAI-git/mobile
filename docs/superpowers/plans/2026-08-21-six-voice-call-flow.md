# Six-Voice Call Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the six-voice chooser, persisted selection, reference-quality ready/live/muted call states, settings sheet, and end-session confirmation.

**Architecture:** A pure canonical catalog and pure flow reducer define product behavior. A user-scoped Zustand/AsyncStorage store persists selection. An Expo Router full-screen modal renders the flow, while SheetManager owns settings and end confirmation; the Gemini hook consumes the catalog's provider voice name.

**Tech Stack:** Expo Router, React Native, Zustand, AsyncStorage, TanStack Query conventions, Reanimated, Gorhom Bottom Sheet, Bun tests.

**Spec:** `docs/superpowers/specs/2026-08-21-six-voice-call-flow-design.md`

## Global Constraints

- Preserve all existing user changes in the dirty working tree.
- Use semantic `COLORS` and `FONTS`; do not introduce arbitrary hardcoded colors.
- Use the shared `Button`, haptics, safe-area boundary, and SheetManager patterns.
- Temporary gradient artwork is explicitly authorized and must be isolated behind `VoiceArtwork`.
- Do not commit unless the user explicitly authorizes commits.

---

### Task 1: Canonical voice catalog and artwork boundary

**Files:**
- Create: `src/features/chat/voice-catalog.ts`
- Create: `src/features/chat/voice-catalog.test.ts`
- Create: `src/components/chat/VoiceArtwork.tsx`

**Interfaces:**
- Produces: `VoiceId`, `VoiceDefinition`, `VOICE_CATALOG`, `getVoiceById(id)`, and `<VoiceArtwork voice size />`.

- [ ] Write a failing table-driven test asserting the six ordered mappings: `denver/fenrir`, `sue/aoede`, `josef/enceladus`, `hannah/kore`, `maya/leda`, `leo/puck`.
- [ ] Run `bun test src/features/chat/voice-catalog.test.ts` and verify the catalog import fails.
- [ ] Implement the typed catalog with display name, subtitle, provider voice name, and token-based placeholder gradient colors.
- [ ] Implement `VoiceArtwork` as a circular clipped `LinearGradient` with an optional future image source branch.
- [ ] Re-run the focused test and verify it passes.

### Task 2: User-scoped persisted preference

**Files:**
- Create: `src/features/chat/voice-preference-state.ts`
- Create: `src/features/chat/voice-preference-state.test.ts`
- Create: `src/store/voice-preference.store.ts`
- Modify: `src/store/index.ts`

**Interfaces:**
- Consumes: `VoiceId`, `getVoiceById`.
- Produces: `getVoicePreferenceStorageKey(userKey)`, `parseVoicePreference(raw)`, and `useVoicePreferenceStore` actions `hydrate(userKey)` and `selectVoice(voiceId)`.

- [ ] Write failing tests proving keys are account-scoped, missing storage remains `null`, valid IDs restore, and unknown IDs are rejected.
- [ ] Run the focused test and verify failure for missing behavior.
- [ ] Implement the pure key/parser functions.
- [ ] Implement the store with `selectedVoiceId`, `hydratedForUser`, `isHydrating`, `hydrate`, and `selectVoice`; persist via AsyncStorage only after a user key is known.
- [ ] Re-run focused tests and TypeScript.

### Task 3: Pure call-flow behavior

**Files:**
- Create: `src/features/chat/voice-call-flow.ts`
- Create: `src/features/chat/voice-call-flow.test.ts`

**Interfaces:**
- Produces: `VoiceCallStage`, `getInitialVoiceCallStage(selectedVoiceId)`, `getVoiceCallTransition(stage,event)`, and `formatVoiceCallDuration(seconds)`.

- [ ] Write failing tests for first-time chooser, returning ready state, ready-to-connecting, connected-to-live, mute preservation, voice change returning to ready, live end requesting confirmation, and `MM:SS` formatting.
- [ ] Run the focused test and verify failure.
- [ ] Implement the smallest pure transition functions satisfying the cases.
- [ ] Re-run the focused test.

### Task 4: Make Gemini consume the canonical selected voice

**Files:**
- Modify: `src/hooks/use-voice-mode.ts`
- Create: `src/features/chat/voice-provider-contract.test.ts`

**Interfaces:**
- Consumes: `VoiceDefinition.providerVoiceName` supplied as `voiceName` to `useVoiceMode({ memoryId, voiceName })`.
- Produces: existing connection controls without component-local voice selection.

- [ ] Write a failing contract test proving the hook accepts `voiceName` and passes it directly to `prebuiltVoiceConfig.voiceName`, with no binary Aoede/Fenrir branch.
- [ ] Run the focused test and verify failure.
- [ ] Remove `VOICE_OPTIONS`, `activeVoice`, and `setActiveVoice` from the hook.
- [ ] Add the `voiceName` argument and use it in Gemini configuration and callback dependencies.
- [ ] Re-run the focused test and TypeScript.

### Task 5: Build the full-screen chooser and call route

**Files:**
- Create: `app/voice-call.tsx`
- Create: `src/components/chat/VoiceChooser.tsx`
- Create: `src/components/chat/VoiceCallScreen.tsx`
- Modify: `app/_layout.tsx`
- Modify: `src/hooks/use-chat-logic.ts`
- Modify: `src/screens/ChatScreen.tsx`
- Remove after migration: `src/components/chat/VoiceModeOverlay.tsx`
- Create: `src/features/chat/voice-call-route.test.ts`

**Interfaces:**
- Consumes: catalog, preference store, flow functions, `useVoiceMode`, `NativeModalSafeAreaBoundary`.
- Produces: `/voice-call?memoryId=...` full-screen modal route.

- [ ] Write a failing route test asserting route registration, chat navigation, local safe-area ownership, six-dot chooser, and absence of the old overlay mount.
- [ ] Run the focused test and verify failure.
- [ ] Register `voice-call` as a `fullScreenModal` with no native header.
- [ ] Replace chat's local overlay boolean with router navigation carrying the memory ID.
- [ ] Build the horizontally paged chooser with stable FlatList callbacks, six dots, selected artwork/name/subtitle, and bottom-safe CTA.
- [ ] Build ready, connecting, live, muted, retry, and upgrade states using reference geometry and shared controls.
- [ ] Ensure first-time/returning routing waits for preference hydration and never flashes the chooser incorrectly.
- [ ] Remove the migrated overlay file and references.
- [ ] Re-run focused tests, TypeScript, and lint.

### Task 6: Shared voice settings and end-session sheets

**Files:**
- Create: `src/components/sheets/VoiceCallSettingsSheet.tsx`
- Create: `src/components/sheets/EndVoiceSessionSheet.tsx`
- Modify: `src/components/sheets/SheetManager.tsx`
- Modify: `src/store/ui.store.ts`
- Create: `src/features/chat/voice-call-sheets.test.ts`

**Interfaces:**
- Consumes: catalog, `VoiceArtwork`, preference store, sheet props callbacks.
- Produces: sheet names `voice-call-settings` and `end-voice-session`.

- [ ] Write a failing test asserting both sheets are registered and use the six-item catalog, staged save behavior, and distinct cancel/confirm actions.
- [ ] Run the focused test and verify failure.
- [ ] Add both sheet names and SheetManager branches.
- [ ] Build the settings sheet with local draft selection, safe-area footer, Dismiss, and Save changes.
- [ ] Build the end sheet with elapsed duration, Back to call, and destructive End session action.
- [ ] Wire settings save to persist selection, disconnect any live session, and return the call screen to ready.
- [ ] Wire end confirmation to disconnect, close the sheet, and dismiss the route.
- [ ] Re-run focused tests, TypeScript, and lint.

### Task 7: Connect Chat Settings to the shared preference

**Files:**
- Modify: `app/chat/settings.tsx`
- Create: `src/features/chat/chat-voice-preference.test.ts`

**Interfaces:**
- Consumes: catalog, `VoiceArtwork`, authenticated user key, preference store.

- [ ] Write a failing test proving Chat Settings renders all six canonical voices and writes through the shared store rather than local `useState('denver')`.
- [ ] Run the focused test and verify failure.
- [ ] Hydrate the account-scoped preference and render six responsive cards using `VoiceArtwork`.
- [ ] Persist selection immediately with haptics and keep the existing chat-settings layout system.
- [ ] Re-run focused tests, TypeScript, and lint.

### Task 8: Full verification and visual handoff

**Files:**
- Modify only files required by failures found in this task.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified six-voice flow ready for final artwork substitution.

- [ ] Run `bun test` and require zero failures.
- [ ] Run `bun run typecheck` and require exit 0.
- [ ] Run `bun run lint` and require exit 0.
- [ ] Run `bun run check:prod`; report the separately known splash-asset mismatch if still present without modifying splash files.
- [ ] Audit the six catalog entries against chooser, call center, Chat Settings, in-call settings, and Gemini configuration.
- [ ] Record the exact future artwork filenames expected by the catalog in the final handoff.
