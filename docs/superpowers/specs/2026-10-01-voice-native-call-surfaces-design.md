# Native Call Surfaces: Design

**Date:** 2026-10-01
**Status:** Approved in conversation

## Problem

A voice call keeps running when the user leaves the call screen, but it has two problems:

1. **The floating bar covers screens.** Inside the app, the call bar floats over the top of every screen and covers its header and navigation.
2. **The call disappears outside the app.**
   - **iOS:** once the user leaves Memento, nothing shows the call apart from the system's microphone indicator.
   - **Android:** the call shows only as a generic recording notification.

## Decisions

**iOS uses a Live Activity, not CallKit.** The call appears in the Dynamic Island and on the lock screen, with its timer, status, and Mute and End buttons.

CallKit was rejected for three reasons:
- **Audio:** CallKit takes control of when the audio session starts, which would mean reworking the audio pipeline.
- **App Review:** Apple intends CallKit for calls between people, so an AI conversation is a review risk.
- **China:** CallKit isn't allowed in apps sold there.

**Inside the app, a strip pushes screens down.** The floating bar is replaced by a call strip above the navigator, like the iOS in-call bar. iOS hides an app's own Live Activity while that app is open, so the app still needs its own indicator.

**Android uses a call-style notification.** The existing notification that keeps the call alive in the background becomes a call-style notification:
- Android shows it as an ongoing call, with "Memento" as the caller.
- It shows the call timer and a hang-up button.
- Tapping it returns to the call.

## Design

### iOS Live Activity

| Piece | Location | Job |
|---|---|---|
| Widget extension | `targets/CallActivity/` | Built with `@bacons/apple-targets`. Contains the SwiftUI views for the Dynamic Island and the lock screen. Requires iOS 17 or later. |
| Button intents | `targets/CallActivity/_shared/CallActivityIntents.swift` | Two `LiveActivityIntent`s, `ToggleCallMuteIntent` and `EndCallIntent`. The folder is linked into both the app and the widget. The intents run in the app's process and post the `MementoCallActivityAction` notification. |
| Bridge module | `modules/memento-call-activity/` | A local Expo module. JS calls its `isSupported`, `start`, `update` and `end` functions, and receives its `onAction` events. It starts, updates and ends the Live Activity, and relays button presses to JS. |
| Cleanup on launch and exit | App delegate subscriber in the same module | Ends any leftover Live Activity at app launch and at termination, so a force-quit never leaves a stale call showing. |

**Shared state.** `MementoCallAttributes` is defined twice, once in the module and once in the widget, with the same name and fields.
- `startedAt` is fixed for the whole call. The timer counts up from it on the device, so the app doesn't have to send updates every second.
- `ContentState` holds `status` (listening, speaking or muted) and `isMuted`.

**JS side.** `CallActivityController` in `src/features/chat/call-activity.ts`:
- starts the Live Activity when the call connects;
- sends an update only when the status changes;
- ends it when the call ends;
- never throws into the app.

`VoiceCallProvider` drives the controller. It maps the "toggle mute" button action to `setMuted`, and the "end" action to `disconnect`.

**Devices.**
- **iPhone 14 Pro and later:** Dynamic Island plus lock screen.
- **Other iPhones on iOS 17 or later:** lock screen only.
- **iOS 16:** nothing new.

### In-app call strip

`CallStripLayout` wraps the root `<Stack>`:
- The strip shows only while a call is connected and the call screen isn't open.
- On iOS it also hides under native full-screen modals, because those cover it anyway.
- While the strip shows, screens receive a top safe-area inset of 0, because the strip already covers the status bar.
- The tree around the navigator never changes shape, so showing the strip never resets navigation.

### Android

The audio library is patched to accept two new options, `callStyle` and `callerName`. These turn the recording notification into a call-style notification, whose hang-up button stops the recording like the existing Stop button.

The app sends four more options:
- the caller name "Memento";
- a call timer;
- the button label "End call";
- the link `memento://voice-call`, so tapping the notification opens the call.

## Testing

- **Unit tests:** the controller's start, update and end behavior, and when the strip shows.
- **Source-contract tests:** the layout, the provider and the notification options.
- **Build checks:**
  - **iOS:** a full simulator build, which includes the widget extension and the module.
  - **Android:** compiling the patched audio library.
- **Device checklist:** whether the Dynamic Island and lock screen appear, whether the buttons work with the app in the background, cleanup after a force-quit, and the Android call notification.
