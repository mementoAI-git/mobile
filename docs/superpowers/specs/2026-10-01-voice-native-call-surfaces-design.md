# Native Call Surfaces: Design

**Date:** 2026-10-01
**Status:** Implemented. Revised on 2026-10-01: the push-down strip was replaced by a floating call indicator, and a review led to ordering, hang-up and cleanup fixes.

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

**Inside the app, a floating indicator that moves nothing.** iOS hides an app's own Live Activity while that app is open, so the app still needs its own indicator. The first version, a strip that pushed every screen down, looked heavy and made the layout jump, so it was replaced:
- **On Dynamic Island iPhones:** a black capsule hangs from the island, so the island looks like it grew to show the call.
- **Elsewhere:** the status bar area turns green, like the classic iPhone in-call bar.

**Known trade-offs of the capsule:**
- **Apple's guidance:** Apple's design guidelines discourage app UI that draws attention to the Dynamic Island. That is a soft App Review risk.
- **Device geometry:** the capsule depends on island geometry, so a future iPhone could break it.
- **Covered content:** it covers about the top 14 points of each screen.

The fallback, if any of these becomes a problem, is a small call pill in the app's own header area.

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
| Cleanup | App delegate subscriber in the same module | Ends any leftover Live Activity at app launch and at termination. It also clears the card when a button is pressed while JS isn't listening, because no live call is behind it then. |

**Shared state.** `MementoCallAttributes` is defined twice, once in the module and once in the widget, with the same name and fields.
- `startedAt` is fixed for the whole call. The timer counts up from it on the device, so the app doesn't have to send updates every second.
- `ContentState` holds `status` (listening, speaking or muted) and `isMuted`.

**JS side.** `CallActivityController` in `src/features/chat/call-activity.ts`:
- starts the Live Activity when the call connects;
- sends an update only when the status changes;
- ends it when the call ends;
- runs native commands one at a time, in order, so a quick hang-up never ends the card before it has started;
- never throws into the app, and a failed command never blocks the next one.

`VoiceCallProvider` drives the controller. It maps the "toggle mute" button action to `setMuted`, and the "end" action to `disconnect`. If no call is live when a button arrives, it just clears the card.

**Force-quit is best effort.** Ending the card at termination depends on iOS calling the app's termination callback. iOS usually does this for an app running in the background, as Memento is during a call, but doesn't guarantee it. If the card survives, the next launch clears it.

**Devices.**
- **iPhone 14 Pro and later:** Dynamic Island plus lock screen.
- **Other iPhones on iOS 17 or later:** lock screen only.
- **iOS 16:** nothing new.

### In-app call indicator

`CallIndicatorLayout` wraps the root `<Stack>` and floats the indicator over it:
- **When it shows:** only while the call is live and the call screen isn't open.
  - A call stops being live the moment it is hung up. `useVoiceMode` exposes `isEnding`, so the indicator and the Live Activity hide at once, while audio teardown and transcript saving finish in the background.
  - On iOS it also hides under native full-screen modals, because those cover it anyway.
- **Capsule placement:** it is positioned from the top safe-area inset. On every island iPhone, the island's bottom edge sits about 10 points above that inset. The capsule is drawn a few points larger than the island on every side, so small differences between models stay hidden in the black.
- **Fixed tree:** the tree around the navigator never changes shape, so showing the indicator never resets navigation.

### Android

The audio library is patched to accept two new options, `callStyle` and `callerName`. These turn the recording notification into a call-style notification, whose hang-up button stops the recording like the existing Stop button.

The app sends four more options:
- the caller name "Memento";
- a call timer;
- the button label "End call";
- the link `memento://voice-call`, so tapping the notification opens the call.

## Testing

- **Unit tests:**
  - the controller's start, update and end behavior, including command ordering with a slow native side;
  - when the indicator shows, and the capsule geometry;
  - the live check during hang-up.
- **Source-contract tests:** the layout, the provider and the notification options.
- **Build checks:**
  - **iOS:** a full simulator build, which includes the widget extension and the module.
  - **Android:** compiling the patched audio library.
- **Device checklist:** see Task 6 of the plan. It covers:
  - the indicator on real screens;
  - the Dynamic Island and the lock screen;
  - the buttons with the app in the background;
  - force-quit, and the cleanup at next launch;
  - the Android call notification.
