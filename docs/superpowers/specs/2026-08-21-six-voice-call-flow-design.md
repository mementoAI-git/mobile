# Six-Voice Call Flow Design

## Goal

Replace the current auto-connecting voice overlay with the supplied six-state voice-call experience, backed by one persisted, user-scoped voice selection and six curated Gemini voices.

## Voice catalog

The product catalog is stable and ordered:

1. Denver — `fenrir` — Male v1
2. Sue — `aoede` — Female v2
3. Josef — `enceladus` — Male v3
4. Hannah — `kore` — Female v4
5. Maya — `leda` — Female v5
6. Leo — `puck` — Male v6

Each entry owns its display copy, provider voice name, pagination position, accessibility label, and artwork definition. Until final image files arrive, `VoiceArtwork` renders a distinct branded gradient per entry. Replacing placeholders must require only adding each image source to the catalog.

## Entry and persistence

Voice selection is persisted in AsyncStorage under a user-scoped key derived from the authenticated user ID or email. No selection means the user is new to voice mode.

- First-time call entry opens the six-page chooser.
- Returning call entry opens the ready screen for the persisted voice.
- Selecting a voice in Chat Settings persists immediately.
- In-call settings stages selection and persists only on **Save changes**.
- A different signed-in account never inherits another account's voice.

## Navigation and states

Voice call becomes an Expo Router `fullScreenModal` route with its own local safe-area provider. The chat screen navigates to it with the current memory/conversation ID. The route owns the following explicit states:

- `choosing`: horizontally paged artwork, name, subtitle, six dots, and **Open voice call**.
- `ready`: selected artwork, `00:00`, “Ready when you are,” and **Start call**.
- `connecting`: selected artwork with progress feedback and no duplicate start action.
- `live`: selected artwork, `MM:SS`, live indicator, and mute control.
- `muted`: live state with error-colored mute control and “You’re muted.”
- `ending`: the live screen remains visible behind an end-session confirmation sheet.

Ending before connection dismisses the route. Ending a live call opens confirmation. Confirming disconnects, flushes transcripts, and returns to chat. Changing voice during a live call disconnects and returns to `ready` with the new voice because Gemini voice configuration is fixed when a session connects.

## Sheets

The existing SheetManager owns two new sheets:

- Voice settings: six rows, artwork thumbnails, staged selection, Dismiss, and Save changes.
- End voice session: reference icon, confirmation copy, elapsed time, Back to call, and End session.

Neither flow uses React Native `Modal`.

## Provider integration

The selected catalog entry's exact `providerVoiceName` is supplied to Gemini Live. Mobile continues fetching the ephemeral token from the backend. The backend voice-list route is not placed on the critical path because the product intentionally exposes a curated stable subset; catalog IDs match the backend catalog.

## Visual system

Layouts use the existing token system, shared Button component, haptics, local modal safe-area boundary, and bottom-sheet infrastructure. The chooser uses the cream-to-white composition from the references. Call screens use the white background and reference geometry. Timer output is `MM:SS` (and naturally expands beyond 59 minutes without resetting).

## Error behavior

The existing upgrade-required screen remains the response to the paid-tier 402. Ordinary connection failure remains on the ready screen with warm retry copy and a retry action; it never produces a blank screen or closes the route automatically.

## Verification

Tests cover catalog mappings/order, user-scoped persistence decisions, first-time versus returning entry, state transitions, timer formatting, selected provider voice configuration, Chat Settings integration, route registration, SheetManager registration, and safe-area ownership. Full tests, TypeScript, and ESLint must pass.
