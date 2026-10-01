# Voice Call Actions and App-Wide Calls: Design

**Date:** 2026-10-01
**Status:** Approved in conversation (approach A)
**Scope:** Piece 1 of 3. Piece 2 (save and edit stories by voice) and piece 3 (automatic transcript clean-up) get their own designs.

## Goal

During a voice call, the model can act on what the user says:

| Say | Action |
| --- | --- |
| "Let's talk later", "bye" | Say a short goodbye, then hang up |
| "Hold on, stop listening" | Mute the microphone |
| "Show me my stories", "take me to settings" | Open that screen, and either keep talking or wrap up, as the user chooses |

A call can continue while the user moves around the app, like a phone call, with a floating call bar on every screen.

## Decisions

- **Goodbye, then hang up.** Clear goodbyes end the call directly. Ambiguous ones ("I'm tired") get "want to wrap up?" first.
- **Mute is voice-only in one direction.** The model can mute. Unmuting is a tap, because a muted model cannot hear "unmute".
- **Navigation asks each time.** Before opening a screen, the model asks whether to keep talking or wrap up, unless the user already said.
- **Destinations are a fixed list**, not free-form routes, so the model can never open a broken or unexpected screen. The list covers every user-facing screen: home, chat, stories, new story, quick note, time capsules, explore prompts, insights, account, settings, profile, plan and billing, upgrade, privacy, beneficiaries, feedback, activity, and two-factor. Sign-in, onboarding and internal screens are excluded.

## Architecture (approach A)

**Server (api).** The token locks three more function declarations into the session: `end_call`, `set_microphone` and `open_screen`. It does this only when the app sends the `call_actions` capability, mirroring `search_memories`. The voice prompt gains a CALL ACTIONS section describing the decisions above.

**Phone (mobile):**
- **`voice-call-actions.ts` (pure logic).** The destination catalog, argument validation, and a factory that turns the three tool calls into calls on an injected `CallControls` interface.
- **`voice-goodbye.ts` (pure logic).** Decides when it is safe to hang up after `end_call`:
  - The model may speak the goodbye before or after the tool call.
  - If speech follows the tool response, hang up after that turn completes and its audio finishes.
  - If no speech follows within 1.5 s, hang up once playback is idle.
  - Always hang up by 6 s.
- **`VoiceToolRelay`** becomes a map from tool name to handler. `search_memories` and the three call actions all plug in.
- **`useVoiceMode`** gains `setMuted` and `endCallAfterGoodbye(then?)`. It also tracks model speech and turn completion for the goodbye logic.
- **`VoiceCallProvider` (new).** Mounted once in the root layout, it owns the single `useVoiceMode` instance. It also:
  - pauses and resumes background music around a call;
  - ends the call on sign-out;
  - dismisses the call screen when the model ends the call;
  - performs navigation for `open_screen`.
- **`FloatingCallBar` (new).** Shown on every screen except the call screen while a call is live. It shows the time and status. Tap to return to the call; a button ends the call.
- **The call screen** becomes a view onto the provider's call. It gains a minimize button. Leaving the screen minimizes rather than ends the call. On reopening, it shows the live call instead of the voice picker, and it reflects model-initiated mute.

## Error handling

- Every tool call gets a response, even for unknown tools or bad arguments. Unknown destinations answer "That screen isn't available" and do nothing.
- Hang-up always happens within 6 s of `end_call`, even if Gemini never finishes its turn.
- Old app builds never see the new tools: no `call_actions` capability means no declarations.

## Testing

- **Pure logic.** Unit tests for the destination catalog, argument parsing, action handlers, and the goodbye timing, using a fake clock.
- **Server.** Tests for tool declarations and prompt guidance per capability, plus one real-API check that Gemini calls `end_call` after a goodbye phrase.
- **Wiring.** Source-level contract tests for the provider, the floating bar and the call screen, following the repo's existing pattern. Typecheck and the full suite pass.
- **Device checklist.** Goodbye flow, mute, navigate with and without keep-talking, minimize and restore, and sign-out during a call.
