# Native Call Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a live Memento voice call the way the phone shows calls. On iOS the call appears in the Dynamic Island and on the lock screen as a Live Activity, with Mute and End buttons. On Android it appears as a call-style notification. Inside the app, a call strip pushes screens down instead of covering their headers.

**Architecture:**
- **In-app strip.** `CallStripLayout` wraps the root `<Stack>` and replaces `FloatingCallBar`.
- **iOS JavaScript.** `CallActivityController` mirrors the call state into the Live Activity through a new local Expo module, `modules/memento-call-activity`.
- **iOS native.** A widget extension in `targets/CallActivity`, built by `@bacons/apple-targets`, draws the Dynamic Island and the lock screen card. Its button intents run in the app's process. The module forwards them to JavaScript.
- **Android.** A patch to `react-native-audio-api` adds a `callStyle` option to the recording notification that already keeps calls alive in the background.

**Tech Stack:**
- Expo SDK 57 with Continuous Native Generation, so `ios/` and `android/` are generated and gitignored.
- React Native 0.86, expo-router and Bun tests.
- Swift and SwiftUI with ActivityKit, WidgetKit and AppIntents, on iOS 17 or later for the Live Activity.
- Kotlin and `NotificationCompat.CallStyle` on Android.

**Design spec:** `docs/superpowers/specs/2026-10-01-voice-native-call-surfaces-design.md`

## Global Constraints

- **Branch:** work on `voice/call-actions` in the mobile repo. Start from a clean tree.
- **Commits:** use exactly the commit message given in each task. Never add a `Co-Authored-By` line or any other attribution line to a commit message.
- **Pre-commit hook:** the hook runs `bun run verify`, which covers lint, typecheck, typography, responsive, tests and production checks. It takes a few minutes. If it fails, fix the cause. Never use `--no-verify`.
- **Copy text exactly:** copy every code block exactly, including blank lines and indentation. Each "find" text occurs exactly once in its file. If a find text is not found, stop and report it. Do not improvise.
- **Before Task 5:** do not run `npx expo prebuild`, `pod install` or any native build. Task 5 does all native builds.
- **Exact versions:** `@bacons/apple-targets` must be exactly `5.0.0`.
- **Bun test errors:** when a test file imports a module that does not exist yet, `bun test` fails with `Cannot find module`. That is the expected red step.
- **Out of scope:** do not change any file that no task names.

## Before Task 1

- [ ] Commit the design spec and this plan so the tree is clean:

```bash
git add docs/superpowers/specs/2026-10-01-voice-native-call-surfaces-design.md docs/superpowers/plans/2026-10-01-voice-native-call-surfaces.md
git commit -m "docs(voice): plan for native call surfaces"
```

## File Map

| File | Change | Responsibility |
|---|---|---|
| `src/features/chat/call-strip.ts` | Create | Decides when the strip shows, and its status text. Pure functions. |
| `src/components/chat/CallStrip.tsx` | Create | `CallStripLayout` wraps the navigator, renders the strip, and sets the screens' top inset to 0 while the strip shows. |
| `src/components/chat/FloatingCallBar.tsx` | Delete | Replaced by the strip. |
| `app/_layout.tsx` | Modify | Wraps `<Stack>` in `<CallStripLayout>`. |
| `patches/react-native-audio-api@1.0.0-nightly-3310950-20260927.patch` | Replace | Keeps the existing fixes and adds the `callStyle` and `callerName` options. |
| `src/features/chat/voice-call-notification.ts` | Modify | Adds call style, timer, "End call" label and a link back to the call. |
| `src/features/chat/call-activity.ts` | Create | `CallActivityController` and the bridge to the native module. |
| `src/hooks/use-voice-call.tsx` | Modify | Drives the controller and handles the Mute and End buttons. |
| `modules/memento-call-activity/**` | Create | Local Expo module. Starts, updates and ends the Live Activity, relays button presses, and cleans up on launch and exit. |
| `targets/CallActivity/**` | Create | Widget extension with the Dynamic Island and lock screen UI, plus the shared button intents. |
| `app.json`, `package.json`, `bun.lock` | Modify | Apple team ID, `NSSupportsLiveActivities`, and the `@bacons/apple-targets` plugin. |

---

### Task 1: Call strip that pushes screens down

**Files:**
- Create: `src/features/chat/call-strip.ts`
- Create: `src/features/chat/call-strip.test.ts`
- Create: `src/components/chat/CallStrip.tsx`
- Delete: `src/components/chat/FloatingCallBar.tsx`
- Modify: `app/_layout.tsx`
- Modify: `src/features/chat/voice-call-provider-contract.test.ts`

**Interfaces:**
- **Produces:**
  - `shouldShowCallStrip({ isConnected, pathname, platform, callPath }): boolean`
  - `callStripStatus(voice: { isMuted: boolean; isAiSpeaking: boolean }): string`
  - `IOS_FULL_SCREEN_MODAL_PATHS: ReadonlySet<string>`
  - `CallStripLayout({ children })`
- **Consumes:**
  - `useVoiceCall()` and `VOICE_CALL_PATH` from `@/hooks/use-voice-call`
  - `formatVoiceCallDuration` from `@/features/chat/voice-call-flow`

**Why the strip works this way:**
- **Safe-area insets.** Screens use two sources for the top inset:
  - Native `SafeAreaView` measures its own position, so it adapts by itself once the strip pushes it down.
  - `useSafeAreaInsets()` reads React context, which still reports the status bar height. `CallStripLayout` therefore provides an override with `top: 0` while the strip shows.
- **Full-screen modals.** On iOS, routes presented as full-screen modals cover the whole window, including the strip. So the strip and the override stay off on those routes.
- **Fixed tree.** The tree around `{children}` must never change shape. If it did, the navigator would remount and navigation would reset.

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/call-strip.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import { callStripStatus, shouldShowCallStrip } from './call-strip';

const show = (overrides: Partial<Parameters<typeof shouldShowCallStrip>[0]> = {}) =>
  shouldShowCallStrip({
    isConnected: true,
    pathname: '/chat/abc',
    platform: 'ios',
    callPath: '/voice-call',
    ...overrides,
  });

describe('shouldShowCallStrip', () => {
  test('shows during a call on ordinary screens', () => {
    expect(show()).toBe(true);
    expect(show({ platform: 'android' })).toBe(true);
  });

  test('hides with no call and on the call screen', () => {
    expect(show({ isConnected: false })).toBe(false);
    expect(show({ pathname: '/voice-call' })).toBe(false);
  });

  test('hides under iOS full-screen modals only', () => {
    expect(show({ pathname: '/editor' })).toBe(false);
    expect(show({ pathname: '/article' })).toBe(false);
    expect(show({ pathname: '/editor', platform: 'android' })).toBe(true);
  });
});

describe('callStripStatus', () => {
  test('describes the call state', () => {
    expect(callStripStatus({ isMuted: true, isAiSpeaking: true })).toBe('Muted, tap to talk');
    expect(callStripStatus({ isMuted: false, isAiSpeaking: true })).toBe('Memento is speaking');
    expect(callStripStatus({ isMuted: false, isAiSpeaking: false })).toBe('Listening');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/call-strip.test.ts`

Expected: FAIL with `Cannot find module './call-strip'`.

- [ ] **Step 3: Write the strip logic**

Create `src/features/chat/call-strip.ts`:

```ts
/**
 * Routes iOS presents as native full-screen modals. They cover the whole
 * window, including the call strip, so the strip must not reserve space or
 * remove the screens' top inset while one is open. Android draws these
 * routes inside the navigator, below the strip, so they keep it.
 */
export const IOS_FULL_SCREEN_MODAL_PATHS: ReadonlySet<string> = new Set([
  '/coming-soon',
  '/share',
  '/editor',
  '/create',
  '/article',
]);

export function shouldShowCallStrip({
  isConnected,
  pathname,
  platform,
  callPath,
}: {
  isConnected: boolean;
  pathname: string;
  platform: string;
  callPath: string;
}): boolean {
  if (!isConnected || pathname === callPath) return false;
  return !(platform === 'ios' && IOS_FULL_SCREEN_MODAL_PATHS.has(pathname));
}

export function callStripStatus(voice: { isMuted: boolean; isAiSpeaking: boolean }): string {
  if (voice.isMuted) return 'Muted, tap to talk';
  return voice.isAiSpeaking ? 'Memento is speaking' : 'Listening';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/call-strip.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Create the strip component**

Create `src/components/chat/CallStrip.tsx`:

```tsx
import React, { useMemo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicOff, PhoneOff } from 'lucide-react-native';

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { callStripStatus, shouldShowCallStrip } from '@/features/chat/call-strip';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { useVoiceCall, VOICE_CALL_PATH } from '@/hooks/use-voice-call';

const STRIP_ROW_HEIGHT = 36;
const BUTTON_HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

/**
 * Wraps the root navigator. While a call runs away from the call screen, a
 * strip sits above the screens and pushes them down, like the iOS in-call
 * bar, instead of covering their headers. The screens then get a top inset
 * of 0, because the strip already covers the status bar.
 */
export function CallStripLayout({ children }: { children: React.ReactNode }) {
  const { voice } = useVoiceCall();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const visible = shouldShowCallStrip({
    isConnected: voice.isConnected,
    pathname,
    platform: Platform.OS,
    callPath: VOICE_CALL_PATH,
  });
  const screenInsets = useMemo(() => (visible ? { ...insets, top: 0 } : insets), [visible, insets]);

  // Keep this tree shape fixed whether or not the strip shows. Changing it
  // would remount the navigator and reset navigation.
  return (
    <View style={{ flex: 1 }}>
      {visible ? <CallStrip topInset={insets.top} /> : null}
      <SafeAreaInsetsContext.Provider value={screenInsets}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

function CallStrip({ topInset }: { topInset: number }) {
  const { voice } = useVoiceCall();
  const dotColor = voice.isMuted ? COLORS.error : voice.isAiSpeaking ? COLORS.brand : COLORS.success;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={{ backgroundColor: COLORS.backgroundInverse, paddingTop: topInset }}
    >
      {Platform.OS === 'ios' ? <StatusBar style="light" /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to voice call"
        onPress={() => router.push(VOICE_CALL_PATH as never)}
        className="flex-row items-center pl-4"
        style={{ height: STRIP_ROW_HEIGHT }}
      >
        <View className="size-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <Text
          numberOfLines={1}
          className="ml-3 flex-1"
          style={{ ...TYPE.label, color: COLORS.textInverse }}
        >
          {`${formatVoiceCallDuration(voice.recordingTime)} · ${callStripStatus(voice)}`}
        </Text>
        {voice.isMuted ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unmute"
            onPress={voice.toggleMute}
            hitSlop={BUTTON_HIT_SLOP}
            className="min-w-11 items-center justify-center"
            style={{ height: STRIP_ROW_HEIGHT }}
          >
            <MicOff size={18} color={COLORS.textInverse} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End call"
          onPress={() => void voice.disconnect()}
          hitSlop={BUTTON_HIT_SLOP}
          className="min-w-11 items-center justify-center"
          style={{ height: STRIP_ROW_HEIGHT }}
        >
          <PhoneOff size={18} color={COLORS.error} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 6: Update the provider contract test for the strip (red)**

In `src/features/chat/voice-call-provider-contract.test.ts`, find:

```ts
  test('the root layout owns the call and shows the floating bar', async () => {
    const layout = await read('app/_layout.tsx');

    expect(layout).toContain('<VoiceCallProvider>');
    expect(layout).toContain('<FloatingCallBar />');
```

Replace it with:

```ts
  test('the root layout owns the call and wraps the screens in the call strip', async () => {
    const layout = await read('app/_layout.tsx');

    expect(layout).toContain('<VoiceCallProvider>');
    expect(layout).not.toContain('FloatingCallBar');
    expect(layout.indexOf('<CallStripLayout>')).toBeLessThan(layout.indexOf('<Stack'));
    expect(layout.indexOf('</Stack>')).toBeLessThan(layout.indexOf('</CallStripLayout>'));
```

In `src/features/chat/voice-call-provider-contract.test.ts`, find:

```ts
  test('the floating bar hides on the call screen and can end the call', async () => {
    const bar = await read('src/components/chat/FloatingCallBar.tsx');

    expect(bar).toContain('pathname === VOICE_CALL_PATH');
    expect(bar).toContain('accessibilityLabel="End call"');
    expect(bar).toContain('voice.disconnect()');
  });
```

Replace it with:

```ts
  test('the call strip pushes screens down instead of covering them', async () => {
    const strip = await read('src/components/chat/CallStrip.tsx');

    expect(strip).toContain('shouldShowCallStrip({');
    expect(strip).toContain('<SafeAreaInsetsContext.Provider value={screenInsets}>');
    expect(strip).toContain('{ ...insets, top: 0 }');
    expect(strip).toContain('accessibilityLabel="End call"');
    expect(strip).toContain('voice.disconnect()');
  });
```

Run: `bun test src/features/chat/voice-call-provider-contract.test.ts`

Expected: FAIL in "the root layout owns the call and wraps the screens in the call strip". The layout is not changed yet.

- [ ] **Step 7: Swap the import in the root layout**

In `app/_layout.tsx`, find:

```tsx
import { BackgroundMusicProvider } from '@/hooks/use-background-music';
import { VoiceCallProvider } from '@/hooks/use-voice-call';
import { FloatingCallBar } from '@/components/chat/FloatingCallBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from '@/constants/storage-keys';
```

Replace it with:

```tsx
import { BackgroundMusicProvider } from '@/hooks/use-background-music';
import { VoiceCallProvider } from '@/hooks/use-voice-call';
import { CallStripLayout } from '@/components/chat/CallStrip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from '@/constants/storage-keys';
```

- [ ] **Step 8: Wrap the `<Stack>` in `<CallStripLayout>`**

The `<Stack>` block is about 130 lines long. Wrap it with this script, not by hand. The script also removes `<FloatingCallBar />` and indents the block by two spaces. Run it from the repo root:

```bash
python3 - <<'EOF'
p = 'app/_layout.tsx'
lines = open(p).read().split('\n')
start = next(i for i, l in enumerate(lines) if l == '                      <Stack')
end = next(i for i, l in enumerate(lines) if l == '                      </Stack>')
assert lines[end + 1] == '' and lines[end + 2] == '                      <FloatingCallBar />', lines[end + 1:end + 3]
block = [('  ' + l if l else l) for l in lines[start:end + 1]]
lines = (
    lines[:start]
    + ['                      <CallStripLayout>']
    + block
    + ['                      </CallStripLayout>']
    + lines[end + 3:]
)
open(p, 'w').write('\n'.join(lines))
print('wrapped lines', start + 1, 'to', end + 1)
EOF
```

Expected output: `wrapped lines 539 to 669`. If the script fails an assertion, stop and report it.

Check the result:

Run: `grep -nE "CallStripLayout|FloatingCallBar|^ {24}<Stack$|^ {24}</Stack>$" app/_layout.tsx`

Expected: exactly these lines, with no `FloatingCallBar` line:

```
68:import { CallStripLayout } from '@/components/chat/CallStrip';
539:                      <CallStripLayout>
540:                        <Stack
670:                        </Stack>
671:                      </CallStripLayout>
```

- [ ] **Step 9: Delete the floating bar**

Run: `git rm src/components/chat/FloatingCallBar.tsx`

Run: `grep -rn "FloatingCallBar" app src`

Expected: one match only, the `not.toContain('FloatingCallBar')` line in `src/features/chat/voice-call-provider-contract.test.ts`.

- [ ] **Step 10: Run the tests, typecheck and lint**

Run: `bun test src/features/chat/call-strip.test.ts src/features/chat/voice-call-provider-contract.test.ts && bun run typecheck && bun run lint`

Expected: all tests pass, and typecheck and lint print no errors.

- [ ] **Step 11: Commit**

```bash
git add src/features/chat/call-strip.ts src/features/chat/call-strip.test.ts src/components/chat/CallStrip.tsx app/_layout.tsx src/features/chat/voice-call-provider-contract.test.ts
git commit -m "feat(voice): call strip pushes screens down instead of covering them"
```

---

### Task 2: Android call-style notification

**Files:**
- Replace: `patches/react-native-audio-api@1.0.0-nightly-3310950-20260927.patch`
- Modify: `src/features/chat/voice-call-notification.ts`
- Modify: `src/features/chat/voice-call-notification.test.ts`

**Interfaces:**
- **Produces:** `CALL_NOTIFICATION` is exported, and `CallNotificationInfo` gains five fields: `stopActionTitle`, `deepLinkUri`, `usesChronometer`, `callStyle` and `callerName`.
- **Consumes:** the patched `react-native-audio-api` reads two new options in its recording notification:
  - `callStyle` turns the notification into an ongoing call with a hang-up button. The button stops the recording like the Stop action, so the app receives `recordingNotificationStop` and hangs up.
  - `callerName` sets the caller name shown on the call.

**About the patch:** the new patch keeps the two existing fixes:
- the external memory pressure on audio buffers;
- the removal of the iOS output normalization.

It adds the Kotlin changes for the two new options. Replace the whole file and do not edit it by hand.

- [ ] **Step 1: Replace the patch**

Replace the whole of `patches/react-native-audio-api@1.0.0-nightly-3310950-20260927.patch` with:

```diff
diff --git a/android/src/main/java/com/swmansion/audioapi/system/notification/RecordingNotification.kt b/android/src/main/java/com/swmansion/audioapi/system/notification/RecordingNotification.kt
index ca97de44b65d74c8f88a2f57e2fd6535ed0906ba..0dae66d0795e2ac7809101921d987576b095453d 100644
--- a/android/src/main/java/com/swmansion/audioapi/system/notification/RecordingNotification.kt
+++ b/android/src/main/java/com/swmansion/audioapi/system/notification/RecordingNotification.kt
@@ -12,6 +12,7 @@ import android.net.Uri
 import android.os.Build
 import android.util.Log
 import androidx.core.app.NotificationCompat
+import androidx.core.app.Person
 import androidx.core.content.ContextCompat
 import com.facebook.react.bridge.ReactApplicationContext
 import com.facebook.react.bridge.ReadableMap
@@ -100,7 +101,11 @@ class RecordingNotification(
     state.backgroundColor?.let { builder.setColor(it) }
 
     setupContentIntent(context, builder)
-    setupActions(context, builder)
+    if (state.callStyle) {
+      setupCallStyle(context, builder)
+    } else {
+      setupActions(context, builder)
+    }
     setupDeleteIntent(context, builder)
     setupChronometer(builder)
 
@@ -163,6 +168,24 @@ class RecordingNotification(
     }
   }
 
+  // An ongoing call: the system shows it as a call, with the caller's name and
+  // a hang-up button that stops the recording like the stop action does.
+  private fun setupCallStyle(
+    context: Context,
+    builder: NotificationCompat.Builder,
+  ) {
+    val caller =
+      Person
+        .Builder()
+        .setName(state.callerName ?: state.title ?: "Call")
+        .setImportant(true)
+        .build()
+    val hangUp = createBroadcast(context, Intent(RecordingNotificationReceiver.ACTION_STOP), REQUEST_CODE_STOP)
+    builder
+      .setCategory(NotificationCompat.CATEGORY_CALL)
+      .setStyle(NotificationCompat.CallStyle.forOngoingCall(caller, hangUp))
+  }
+
   private fun setupDeleteIntent(
     context: Context,
     builder: NotificationCompat.Builder,
@@ -243,6 +266,8 @@ class RecordingNotification(
     state.stopActionTitle = options.stringOr("stopActionTitle", state.stopActionTitle)
     state.deepLinkUri = options.stringOr("deepLinkUri", state.deepLinkUri)
     state.usesChronometer = options.boolOr("usesChronometer", state.usesChronometer)
+    state.callStyle = options.boolOr("callStyle", state.callStyle)
+    state.callerName = options.stringOr("callerName", state.callerName)
     state.paused = options.boolOr("paused", state.paused)
   }
 
@@ -303,6 +328,8 @@ class RecordingNotification(
       state.stopActionTitle = null
       state.deepLinkUri = null
       state.usesChronometer = false
+      state.callStyle = false
+      state.callerName = null
       state.startedAtMs = null
       state.pausedAtMs = null
       state.paused = false
diff --git a/android/src/main/java/com/swmansion/audioapi/system/notification/state/RecordingNotificationState.kt b/android/src/main/java/com/swmansion/audioapi/system/notification/state/RecordingNotificationState.kt
index 38f271ddb315c8b0a35b86eb778b74e82b47bb66..f7c04f6be64b982c34f4b83d67f22c7a77fed816 100644
--- a/android/src/main/java/com/swmansion/audioapi/system/notification/state/RecordingNotificationState.kt
+++ b/android/src/main/java/com/swmansion/audioapi/system/notification/state/RecordingNotificationState.kt
@@ -25,6 +25,9 @@ class RecordingNotificationState(
   var stopActionTitle: String? = null,
   var deepLinkUri: String? = null,
   var usesChronometer: Boolean = false,
+  /** Shows the notification as an ongoing call (CallStyle) with a hang-up button. */
+  var callStyle: Boolean = false,
+  var callerName: String? = null,
   var startedAtMs: Long? = null,
   var pausedAtMs: Long? = null,
 )
diff --git a/common/cpp/audioapi/AudioAPIModuleInstaller.h b/common/cpp/audioapi/AudioAPIModuleInstaller.h
index ba15c738b00b47a4950d1bed4caa2961c0eacdb8..141b63615cfb0b152f5fd6ff7f366028547caa08 100644
--- a/common/cpp/audioapi/AudioAPIModuleInstaller.h
+++ b/common/cpp/audioapi/AudioAPIModuleInstaller.h
@@ -224,7 +224,9 @@ class AudioAPIModuleInstaller {
 
           auto audioBuffer = std::make_shared<AudioBuffer>(length, numberOfChannels, sampleRate);
           auto audioBufferHostObject = std::make_shared<AudioBufferHostObject>(audioBuffer);
-          return jsi::Object::createFromHostObject(runtime, audioBufferHostObject);
+          auto audioBufferObject = jsi::Object::createFromHostObject(runtime, audioBufferHostObject);
+          audioBufferObject.setExternalMemoryPressure(runtime, audioBufferHostObject->getSizeInBytes());
+          return audioBufferObject;
         });
   }
 };
diff --git a/ios/audioapi/ios/core/IOSAudioPlayer.mm b/ios/audioapi/ios/core/IOSAudioPlayer.mm
index cfd860e3e119be8bbbd3324ec5f2b76f819f2296..e3adaa39bbcfcd3a107d53ecaded1213f536da7e 100644
--- a/ios/audioapi/ios/core/IOSAudioPlayer.mm
+++ b/ios/audioapi/ios/core/IOSAudioPlayer.mm
@@ -94,11 +94,6 @@
 
     renderAudio_(audioBuffer_.get(), RENDER_QUANTUM_SIZE);
 
-    // Peak-normalize the rendered quantum before it reaches the hardware. This
-    // limiting lives in the player (not the destination node) so offline
-    // renders stay spec-accurate.
-    audioBuffer_->normalize();
-
     // normal rendering - take RENDER_QUANTUM_SIZE frames from the graph and copy to output
     const int stillNeed = numFrames - outPos;
     if (stillNeed >= RENDER_QUANTUM_SIZE) {
```

- [ ] **Step 2: Reinstall so Bun applies the patch**

Run: `rm -rf node_modules/react-native-audio-api && bun install`

Expected: the install succeeds and reports no patch errors.

Run: `grep -c "callStyle" node_modules/react-native-audio-api/android/src/main/java/com/swmansion/audioapi/system/notification/RecordingNotification.kt`

Expected: `3`.

Run: `grep -c "normalize()" node_modules/react-native-audio-api/ios/audioapi/ios/core/IOSAudioPlayer.mm`

Expected: `0`. The existing iOS fix is still applied.

- [ ] **Step 3: Write the failing test**

In `src/features/chat/voice-call-notification.test.ts`, find:

```ts

import {
  VoiceCallNotification,
  type CallNotificationAdapter,
```

Replace it with:

```ts

import {
  CALL_NOTIFICATION,
  VoiceCallNotification,
  type CallNotificationAdapter,
```

In `src/features/chat/voice-call-notification.test.ts`, find:

```ts
    await expect(notification.stop()).resolves.toBeUndefined();
  });
});
```

Replace it with:

```ts
    await expect(notification.stop()).resolves.toBeUndefined();
  });

  test('shows the call time, an End call button, and returns to the call on tap', () => {
    expect(CALL_NOTIFICATION).toMatchObject({
      showStopAction: true,
      stopActionTitle: 'End call',
      deepLinkUri: 'memento://voice-call',
      usesChronometer: true,
      callStyle: true,
      callerName: 'Memento',
    });
  });
});
```

Run: `bun test src/features/chat/voice-call-notification.test.ts`

Expected: FAIL with `SyntaxError: Export named 'CALL_NOTIFICATION' not found`.

- [ ] **Step 4: Add the call notification options**

In `src/features/chat/voice-call-notification.ts`, find:

```ts
  contentText: string;
  showStopAction: boolean;
};
```

Replace it with:

```ts
  contentText: string;
  showStopAction: boolean;
  stopActionTitle: string;
  /** Tapping the notification opens this link, which routes to the call screen. */
  deepLinkUri: string;
  /** Shows the running call time. */
  usesChronometer: boolean;
  /**
   * Android shows it as an ongoing call, with a hang-up button. Needs the
   * callStyle option added by patches/react-native-audio-api@*.patch.
   */
  callStyle: boolean;
  callerName: string;
};
```

In `src/features/chat/voice-call-notification.ts`, find:

```ts
}

const CALL_NOTIFICATION: CallNotificationInfo = {
  title: 'Memento voice call',
  contentText: 'Tap to return to your conversation',
  showStopAction: true,
};
```

Replace it with:

```ts
}

export const CALL_NOTIFICATION: CallNotificationInfo = {
  title: 'Memento voice call',
  contentText: 'Tap to return to your conversation',
  showStopAction: true,
  stopActionTitle: 'End call',
  deepLinkUri: 'memento://voice-call',
  usesChronometer: true,
  callStyle: true,
  callerName: 'Memento',
};
```

In `src/features/chat/voice-call-notification.ts`, find:

```ts
 * Keeps an Android voice call alive in the background. Showing the
 * react-native-audio-api recording notification starts its foreground
 * service with the microphone type. iOS needs nothing: UIBackgroundModes
 * `audio` keeps the active voice-chat audio session running.
 */
```

Replace it with:

```ts
 * Keeps an Android voice call alive in the background. Showing the
 * react-native-audio-api recording notification starts its foreground
 * service with the microphone type. The notification is a call-style one,
 * so Android presents it as an ongoing call. iOS needs nothing: UIBackgroundModes
 * `audio` keeps the active voice-chat audio session running.
 */
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test src/features/chat/voice-call-notification.test.ts && bun run typecheck`

Expected: PASS, 4 tests, and typecheck prints no errors.

- [ ] **Step 6: Commit**

```bash
git add patches/react-native-audio-api@1.0.0-nightly-3310950-20260927.patch src/features/chat/voice-call-notification.ts src/features/chat/voice-call-notification.test.ts
git commit -m "feat(voice): show Android voice calls as a call-style notification"
```

---

### Task 3: Live Activity controller in JS

**Files:**
- Create: `src/features/chat/call-activity.ts`
- Create: `src/features/chat/call-activity.test.ts`
- Modify: `src/hooks/use-voice-call.tsx`
- Modify: `src/features/chat/voice-call-provider-contract.test.ts`

**Interfaces:**
- **Produces:**
  - `type CallActivityStatus = 'listening' | 'speaking' | 'muted'`
  - `type CallActivityAction = 'toggleMute' | 'end'`
  - `callActivityStatus(snapshot)`
  - `class CallActivityController { constructor(adapter, now?); sync(snapshot): void }`
  - `createCallActivityAdapter(platform): CallActivityAdapter | null`
- **Consumes:** the native module `MementoCallActivity`, which Task 4 creates. It exposes:
  - `isSupported(): boolean`
  - `start(startedAtMs: number, status: string, isMuted: boolean): Promise<void>`
  - `update(status: string, isMuted: boolean): Promise<void>`
  - `end(): Promise<void>`
  - the event `onAction` with the payload `{ action: 'toggleMute' | 'end' }`

  The module is optional. Until Task 4 exists, and on Android, `createCallActivityAdapter` returns `null` and nothing happens.
- **Uses from `voice`:** `isConnected`, `isMuted`, `isAiSpeaking`, `recordingTime`, `setMuted(muted: boolean)` and `disconnect()`.

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/call-activity.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

import {
  CallActivityController,
  callActivityStatus,
  type CallActivityAdapter,
  type CallActivitySnapshot,
} from './call-activity';

function fakeAdapter() {
  const calls: unknown[][] = [];
  const adapter: CallActivityAdapter = {
    start: async (...args) => {
      calls.push(['start', ...args]);
    },
    update: async (...args) => {
      calls.push(['update', ...args]);
    },
    end: async () => {
      calls.push(['end']);
    },
    onAction: () => ({ remove: () => undefined }),
  };
  return { adapter, calls };
}

const live = (overrides: Partial<CallActivitySnapshot> = {}): CallActivitySnapshot => ({
  isConnected: true,
  isMuted: false,
  isAiSpeaking: false,
  recordingTime: 0,
  ...overrides,
});

describe('callActivityStatus', () => {
  test('muted wins, then speaking, then listening', () => {
    expect(callActivityStatus(live({ isMuted: true, isAiSpeaking: true }))).toBe('muted');
    expect(callActivityStatus(live({ isAiSpeaking: true }))).toBe('speaking');
    expect(callActivityStatus(live())).toBe('listening');
  });
});

describe('CallActivityController', () => {
  test('starts once with the call start time, then sends only changes', () => {
    const { adapter, calls } = fakeAdapter();
    const controller = new CallActivityController(adapter, () => 100_000);

    controller.sync(live({ recordingTime: 4 }));
    controller.sync(live({ recordingTime: 5 }));
    controller.sync(live({ isAiSpeaking: true }));
    controller.sync(live({ isAiSpeaking: true, recordingTime: 9 }));
    controller.sync(live({ isMuted: true }));

    expect(calls).toEqual([
      ['start', 96_000, 'listening', false],
      ['update', 'speaking', false],
      ['update', 'muted', true],
    ]);
  });

  test('ends when the call ends and starts fresh for the next call', () => {
    const { adapter, calls } = fakeAdapter();
    const controller = new CallActivityController(adapter, () => 50_000);

    controller.sync(live());
    controller.sync(live({ isConnected: false }));
    controller.sync(live({ isConnected: false }));
    controller.sync(live({ isMuted: true }));

    expect(calls).toEqual([
      ['start', 50_000, 'listening', false],
      ['end'],
      ['start', 50_000, 'muted', true],
    ]);
  });

  test('does nothing without a native adapter or before a call', () => {
    const { adapter, calls } = fakeAdapter();
    new CallActivityController(null).sync(live());
    new CallActivityController(adapter).sync(live({ isConnected: false }));
    expect(calls).toEqual([]);
  });

  test('a failing native call never throws into the app', async () => {
    const failing: CallActivityAdapter = {
      start: () => Promise.reject(new Error('activities disabled')),
      update: () => Promise.reject(new Error('x')),
      end: () => Promise.reject(new Error('x')),
      onAction: () => ({ remove: () => undefined }),
    };
    const controller = new CallActivityController(failing);
    expect(() => {
      controller.sync(live());
      controller.sync(live({ isMuted: true }));
      controller.sync(live({ isConnected: false }));
    }).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/features/chat/call-activity.test.ts`

Expected: FAIL with `Cannot find module './call-activity'`.

- [ ] **Step 3: Write the controller**

Create `src/features/chat/call-activity.ts`:

```ts
export type CallActivityStatus = 'listening' | 'speaking' | 'muted';
export type CallActivityAction = 'toggleMute' | 'end';

export type CallActivitySnapshot = {
  isConnected: boolean;
  isMuted: boolean;
  isAiSpeaking: boolean;
  /** Seconds the call has been running. */
  recordingTime: number;
};

export type CallActivitySubscription = { remove(): void };

export interface CallActivityAdapter {
  start(startedAtMs: number, status: CallActivityStatus, isMuted: boolean): Promise<void>;
  update(status: CallActivityStatus, isMuted: boolean): Promise<void>;
  end(): Promise<void>;
  onAction(listener: (action: CallActivityAction) => void): CallActivitySubscription;
}

export function callActivityStatus(snapshot: CallActivitySnapshot): CallActivityStatus {
  if (snapshot.isMuted) return 'muted';
  return snapshot.isAiSpeaking ? 'speaking' : 'listening';
}

/**
 * Mirrors the live call into the iOS Live Activity (Dynamic Island and lock
 * screen). Starts it when the call connects, sends only real changes, and
 * ends it when the call ends. Native failures never affect the call.
 */
export class CallActivityController {
  private active = false;
  private lastKey = '';

  constructor(
    private readonly adapter: CallActivityAdapter | null,
    private readonly now: () => number = Date.now,
  ) {}

  sync(snapshot: CallActivitySnapshot): void {
    if (!this.adapter) return;
    if (!snapshot.isConnected) {
      if (!this.active) return;
      this.active = false;
      this.lastKey = '';
      this.adapter.end().catch(() => undefined);
      return;
    }

    const status = callActivityStatus(snapshot);
    const key = `${status}:${snapshot.isMuted}`;
    if (!this.active) {
      this.active = true;
      this.lastKey = key;
      const startedAtMs = this.now() - Math.max(0, snapshot.recordingTime) * 1_000;
      this.adapter.start(startedAtMs, status, snapshot.isMuted).catch(() => undefined);
      return;
    }
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.adapter.update(status, snapshot.isMuted).catch(() => undefined);
  }
}

type CallActivityNativeModule = {
  isSupported(): boolean;
  start(startedAtMs: number, status: CallActivityStatus, isMuted: boolean): Promise<void>;
  update(status: CallActivityStatus, isMuted: boolean): Promise<void>;
  end(): Promise<void>;
  addListener(
    eventName: 'onAction',
    listener: (event: { action: string }) => void,
  ): CallActivitySubscription;
};

function isCallActivityAction(action: string): action is CallActivityAction {
  return action === 'toggleMute' || action === 'end';
}

/** Null on Android, on iOS before 17, and when Live Activities are turned off. */
export function createCallActivityAdapter(platform: string): CallActivityAdapter | null {
  if (platform !== 'ios') return null;
  const { requireOptionalNativeModule } = require('expo') as typeof import('expo');
  const native = requireOptionalNativeModule<CallActivityNativeModule>('MementoCallActivity');
  if (!native) return null;
  try {
    if (!native.isSupported()) return null;
  } catch {
    return null;
  }
  return {
    start: (startedAtMs, status, isMuted) => native.start(startedAtMs, status, isMuted),
    update: (status, isMuted) => native.update(status, isMuted),
    end: () => native.end(),
    onAction: (listener) =>
      native.addListener('onAction', (event) => {
        if (isCallActivityAction(event.action)) listener(event.action);
      }),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/features/chat/call-activity.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 5: Add the provider contract test (red)**

Append inside the `describe` of `src/features/chat/voice-call-provider-contract.test.ts`:

```ts
  test('the provider mirrors the call into the iOS Live Activity', async () => {
    const provider = await read('src/hooks/use-voice-call.tsx');

    expect(provider).toContain('createCallActivityAdapter(Platform.OS)');
    expect(provider).toContain('callActivity.controller.sync({');
    expect(provider).toContain("if (action === 'end') void current.disconnect();");
    expect(provider).toContain('current.setMuted(!current.isMuted)');
  });
```

This means: remove the file's final `});` line, add the block above, then put `});` back at the end.

Run: `bun test src/features/chat/voice-call-provider-contract.test.ts`

Expected: FAIL in "the provider mirrors the call into the iOS Live Activity".

- [ ] **Step 6: Drive the Live Activity from the call provider**

In `src/hooks/use-voice-call.tsx`, find:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';

import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useVoiceMode, type VoiceCallActionEffects } from '@/hooks/use-voice-mode';
```

Replace it with:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Platform } from 'react-native';

import { CallActivityController, createCallActivityAdapter } from '@/features/chat/call-activity';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useVoiceMode, type VoiceCallActionEffects } from '@/hooks/use-voice-mode';
```

In `src/hooks/use-voice-call.tsx`, find:

```tsx
  }, [active, disconnect, token]);

  const value = useMemo(() => ({ voice, configure }), [voice, configure]);
  return <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>;
```

Replace it with:

```tsx
  }, [active, disconnect, token]);

  // iOS Live Activity: the call in the Dynamic Island and on the lock screen.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const callActivity = useMemo(() => {
    const adapter = createCallActivityAdapter(Platform.OS);
    return { adapter, controller: new CallActivityController(adapter) };
  }, []);
  useEffect(() => {
    callActivity.controller.sync({
      isConnected: voice.isConnected,
      isMuted: voice.isMuted,
      isAiSpeaking: voice.isAiSpeaking,
      recordingTime: voiceRef.current.recordingTime,
    });
  }, [callActivity, voice.isConnected, voice.isMuted, voice.isAiSpeaking]);
  useEffect(() => {
    const subscription = callActivity.adapter?.onAction((action) => {
      const current = voiceRef.current;
      if (action === 'end') void current.disconnect();
      else current.setMuted(!current.isMuted);
    });
    return () => subscription?.remove();
  }, [callActivity]);

  const value = useMemo(() => ({ voice, configure }), [voice, configure]);
  return <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>;
```

- [ ] **Step 7: Run the tests, typecheck and lint**

Run: `bun test src/features/chat/call-activity.test.ts src/features/chat/voice-call-provider-contract.test.ts && bun run typecheck && bun run lint`

Expected: all tests pass, and typecheck and lint print no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/chat/call-activity.ts src/features/chat/call-activity.test.ts src/hooks/use-voice-call.tsx src/features/chat/voice-call-provider-contract.test.ts
git commit -m "feat(voice): mirror the call into a Live Activity controller"
```

---

### Task 4: iOS Live Activity extension and bridge module

**Files:**
- Modify: `package.json` and `bun.lock`, by running `bun add`
- Modify: `app.json`
- Create:
  - `modules/memento-call-activity/expo-module.config.json`
  - `modules/memento-call-activity/ios/MementoCallActivity.podspec`
  - `modules/memento-call-activity/ios/MementoCallAttributes.swift`
  - `modules/memento-call-activity/ios/MementoCallActivityModule.swift`
  - `modules/memento-call-activity/ios/MementoCallActivityAppDelegate.swift`
  - `targets/CallActivity/expo-target.config.js`
  - `targets/CallActivity/Info.plist`
  - `targets/CallActivity/MementoCallAttributes.swift`
  - `targets/CallActivity/CallActivityBundle.swift`
  - `targets/CallActivity/CallLiveActivity.swift`
  - `targets/CallActivity/_shared/CallActivityIntents.swift`

**Interfaces:**
- **Produces:** the native module `MementoCallActivity`, with the functions and the `onAction` event listed in Task 3.
- **Shared names, which must match exactly:**
  - **Attributes type:** `MementoCallAttributes`, with `startedAt: Date`. Its `ContentState` holds `status: String` and `isMuted: Bool`. It is defined twice with identical contents, once in the module and once in the widget, because ActivityKit matches the app and the widget by this type.
  - **Button notification:** the button intents post `Notification.Name("MementoCallActivityAction")`, with `userInfo["action"]` set to `"toggleMute"` or `"end"`. The module listens for that name.
  - **Shared intents:** files in `targets/CallActivity/_shared/` are compiled into both the widget and the main app. That is required, because a `LiveActivityIntent` runs in the app's process.
- **How these files get used:**
  - Expo autolinking finds `modules/memento-call-activity` by its `expo-module.config.json`. No `package.json` entry is needed.
  - `@bacons/apple-targets` turns `targets/CallActivity` into a widget extension target during prebuild.

- [ ] **Step 1: Install the targets plugin at the exact version**

Run: `bun add --exact @bacons/apple-targets@5.0.0`

Expected: `package.json` gains `"@bacons/apple-targets": "5.0.0"` under `dependencies`, and `bun.lock` changes.

- [ ] **Step 2: Configure the app**

These edits do three things:
- **Team ID:** set the Apple team ID used for signing. The widget target needs it for device builds.
- **Info.plist:** set `NSSupportsLiveActivities`.
- **Plugin:** register the plugin as the last entry in `plugins`.

In `app.json`, find:

```json
      "supportsTablet": false,
      "bundleIdentifier": "io.mymemento.app",
      "associatedDomains": [
        "applinks:app.mymemento.io",
```

Replace it with:

```json
      "supportsTablet": false,
      "bundleIdentifier": "io.mymemento.app",
      "appleTeamId": "9546K7Z2VT",
      "associatedDomains": [
        "applinks:app.mymemento.io",
```

In `app.json`, find:

```json
      ],
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
```

Replace it with:

```json
      ],
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSSupportsLiveActivities": true
      }
    },
```

In `app.json`, find:

```json
          "isAccessMediaLocationEnabled": false
        }
      ]
    ],
    "experiments": {
```

Replace it with:

```json
          "isAccessMediaLocationEnabled": false
        }
      ],
      "@bacons/apple-targets"
    ],
    "experiments": {
```

- [ ] **Step 3: Create the bridge module**

Create `modules/memento-call-activity/expo-module.config.json`:

```json
{
  "platforms": ["apple"],
  "apple": {
    "modules": ["MementoCallActivityModule"],
    "appDelegateSubscribers": ["MementoCallActivityAppDelegate"]
  }
}
```

Create `modules/memento-call-activity/ios/MementoCallActivity.podspec`:

```ruby
Pod::Spec.new do |s|
  s.name           = 'MementoCallActivity'
  s.version        = '0.1.0'
  s.summary        = 'Shows the Memento voice call as an iOS Live Activity'
  s.description    = 'Starts, updates and ends the voice call Live Activity, and relays its Mute and End buttons to JS.'
  s.license        = 'UNLICENSED'
  s.author         = 'Memento'
  s.homepage       = 'https://mymemento.io'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
```

Create `modules/memento-call-activity/ios/MementoCallAttributes.swift`:

```swift
import ActivityKit
import Foundation

// Keep in sync with targets/CallActivity/MementoCallAttributes.swift.
// ActivityKit matches the app and the widget by this type's name and shape.
struct MementoCallAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// "listening", "speaking" or "muted".
    var status: String
    var isMuted: Bool
  }

  /// When the call started; the widget counts up from it.
  var startedAt: Date
}
```

Create `modules/memento-call-activity/ios/MementoCallActivityModule.swift`:

```swift
import ActivityKit
import ExpoModulesCore

/// Posted by the Live Activity's buttons (see targets/CallActivity/_shared).
let mementoCallActionNotification = Notification.Name("MementoCallActivityAction")

public class MementoCallActivityModule: Module {
  private var actionObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("MementoCallActivity")

    Events("onAction")

    OnStartObserving {
      self.actionObserver = NotificationCenter.default.addObserver(
        forName: mementoCallActionNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let action = notification.userInfo?["action"] as? String else { return }
        self?.sendEvent("onAction", ["action": action])
      }
    }

    OnStopObserving {
      if let observer = self.actionObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.actionObserver = nil
    }

    Function("isSupported") { () -> Bool in
      guard #available(iOS 17.0, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("start") { (startedAtMs: Double, status: String, isMuted: Bool) async throws in
      guard #available(iOS 17.0, *) else { return }
      await MementoCallActivities.endAll()
      let attributes = MementoCallAttributes(
        startedAt: Date(timeIntervalSince1970: startedAtMs / 1000)
      )
      let state = MementoCallAttributes.ContentState(status: status, isMuted: isMuted)
      _ = try Activity.request(
        attributes: attributes,
        content: ActivityContent(state: state, staleDate: nil),
        pushType: nil
      )
    }

    AsyncFunction("update") { (status: String, isMuted: Bool) async in
      guard #available(iOS 17.0, *) else { return }
      let state = MementoCallAttributes.ContentState(status: status, isMuted: isMuted)
      for activity in Activity<MementoCallAttributes>.activities {
        await activity.update(ActivityContent(state: state, staleDate: nil))
      }
    }

    AsyncFunction("end") { () async in
      guard #available(iOS 17.0, *) else { return }
      await MementoCallActivities.endAll()
    }
  }
}

enum MementoCallActivities {
  @available(iOS 17.0, *)
  static func endAll() async {
    for activity in Activity<MementoCallAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
```

Create `modules/memento-call-activity/ios/MementoCallActivityAppDelegate.swift`:

```swift
import ExpoModulesCore
import UIKit

/// A call never outlives the app, so its Live Activity must not either.
/// Without this, a force-quit leaves the call in the Dynamic Island for hours.
public class MementoCallActivityAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if #available(iOS 17.0, *) {
      Task { await MementoCallActivities.endAll() }
    }
    return true
  }

  public func applicationWillTerminate(_ application: UIApplication) {
    guard #available(iOS 17.0, *) else { return }
    let done = DispatchSemaphore(value: 0)
    Task.detached {
      await MementoCallActivities.endAll()
      done.signal()
    }
    _ = done.wait(timeout: .now() + 2)
  }
}
```

- [ ] **Step 4: Create the widget extension**

Create `targets/CallActivity/expo-target.config.js`:

```js
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  displayName: 'Memento Call',
  bundleIdentifier: '.callactivity',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
});
```

Create `targets/CallActivity/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>NSExtension</key>
    <dict>
      <key>NSExtensionPointIdentifier</key>
      <string>com.apple.widgetkit-extension</string>
    </dict>
  </dict>
</plist>
```

Create `targets/CallActivity/MementoCallAttributes.swift`:

```swift
import ActivityKit
import Foundation

// Keep in sync with modules/memento-call-activity/ios/MementoCallAttributes.swift.
// ActivityKit matches the app and the widget by this type's name and shape.
struct MementoCallAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// "listening", "speaking" or "muted".
    var status: String
    var isMuted: Bool
  }

  /// When the call started; the widget counts up from it.
  var startedAt: Date
}
```

Create `targets/CallActivity/CallActivityBundle.swift`:

```swift
import SwiftUI
import WidgetKit

@main
struct CallActivityBundle: WidgetBundle {
  var body: some Widget {
    CallLiveActivity()
  }
}
```

Create `targets/CallActivity/CallLiveActivity.swift`:

```swift
import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let brand = Color(red: 233 / 255, green: 130 / 255, blue: 70 / 255)
private let danger = Color(red: 199 / 255, green: 58 / 255, blue: 58 / 255)
private let callURL = URL(string: "memento://voice-call")

private func statusText(_ state: MementoCallAttributes.ContentState) -> String {
  if state.isMuted { return "Muted" }
  return state.status == "speaking" ? "Memento is speaking" : "Listening"
}

private func statusSymbol(_ state: MementoCallAttributes.ContentState) -> String {
  state.isMuted ? "mic.slash.fill" : "waveform"
}

/// Counts up from the call start without the app sending updates.
private struct CallTimer: View {
  let startedAt: Date

  var body: some View {
    Text(timerInterval: startedAt...Date.distantFuture, countsDown: false)
      .monospacedDigit()
  }
}

private struct MuteButton: View {
  let isMuted: Bool

  var body: some View {
    Button(intent: ToggleCallMuteIntent()) {
      Image(systemName: isMuted ? "mic.slash.fill" : "mic.fill")
        .font(.system(size: 17, weight: .semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(isMuted ? danger : .white)
        .background(Circle().fill(.white.opacity(0.16)))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(isMuted ? "Unmute" : "Mute")
  }
}

private struct EndButton: View {
  var body: some View {
    Button(intent: EndCallIntent()) {
      Image(systemName: "phone.down.fill")
        .font(.system(size: 17, weight: .semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(.white)
        .background(Circle().fill(danger))
    }
    .buttonStyle(.plain)
    .accessibilityLabel("End call")
  }
}

private struct LockScreenCallView: View {
  let context: ActivityViewContext<MementoCallAttributes>

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: statusSymbol(context.state))
        .font(.system(size: 20, weight: .semibold))
        .foregroundStyle(context.state.isMuted ? danger : brand)
        .frame(width: 40, height: 40)
        .background(Circle().fill(brand.opacity(0.18)))
      VStack(alignment: .leading, spacing: 2) {
        Text("Memento call")
          .font(.headline)
          .foregroundStyle(.white)
        HStack(spacing: 6) {
          CallTimer(startedAt: context.attributes.startedAt)
          Text("·")
          Text(statusText(context.state))
        }
        .font(.subheadline)
        .foregroundStyle(.white.opacity(0.7))
      }
      Spacer(minLength: 8)
      MuteButton(isMuted: context.state.isMuted)
      EndButton()
    }
    .padding(16)
  }
}

struct CallLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: MementoCallAttributes.self) { context in
      LockScreenCallView(context: context)
        .activityBackgroundTint(Color.black.opacity(0.82))
        .activitySystemActionForegroundColor(.white)
        .widgetURL(callURL)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text("Memento")
          } icon: {
            Image(systemName: statusSymbol(context.state))
          }
          .font(.headline)
          .foregroundStyle(context.state.isMuted ? danger : brand)
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CallTimer(startedAt: context.attributes.startedAt)
            .font(.headline)
            .foregroundStyle(.white)
            .multilineTextAlignment(.trailing)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack(spacing: 12) {
            Text(statusText(context.state))
              .font(.subheadline)
              .foregroundStyle(.white.opacity(0.75))
            Spacer(minLength: 8)
            MuteButton(isMuted: context.state.isMuted)
            EndButton()
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        Image(systemName: statusSymbol(context.state))
          .foregroundStyle(context.state.isMuted ? danger : brand)
      } compactTrailing: {
        CallTimer(startedAt: context.attributes.startedAt)
          .foregroundStyle(brand)
          .frame(maxWidth: 48)
          .multilineTextAlignment(.trailing)
      } minimal: {
        Image(systemName: statusSymbol(context.state))
          .foregroundStyle(context.state.isMuted ? danger : brand)
      }
      .widgetURL(callURL)
      .keylineTint(brand)
    }
  }
}
```

Create `targets/CallActivity/_shared/CallActivityIntents.swift`:

```swift
import AppIntents
import Foundation

// Linked into both the app and the widget. A LiveActivityIntent runs in the
// app's process, where the MementoCallActivity module forwards it to JS.

@available(iOS 17.0, *)
struct ToggleCallMuteIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Mute or unmute the Memento call"
  static let isDiscoverable = false

  func perform() async throws -> some IntentResult {
    await postCallAction("toggleMute")
    return .result()
  }
}

@available(iOS 17.0, *)
struct EndCallIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "End the Memento call"
  static let isDiscoverable = false

  func perform() async throws -> some IntentResult {
    await postCallAction("end")
    return .result()
  }
}

@MainActor
private func postCallAction(_ action: String) {
  NotificationCenter.default.post(
    name: Notification.Name("MementoCallActivityAction"),
    object: nil,
    userInfo: ["action": action]
  )
}
```

- [ ] **Step 5: Check that the two attribute copies match**

Run: `diff <(grep -v '^// Keep in sync' modules/memento-call-activity/ios/MementoCallAttributes.swift) <(grep -v '^// Keep in sync' targets/CallActivity/MementoCallAttributes.swift) && echo SAME`

Expected: `SAME`.

- [ ] **Step 6: Run typecheck, lint and the full tests**

Run: `bun run typecheck && bun run lint && bun run test`

Expected: no typecheck or lint errors, and all tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock app.json modules/memento-call-activity targets/CallActivity
git commit -m "feat(voice): show the call in the Dynamic Island and on the lock screen"
```

---

### Task 5: Native build verification

No code changes. These steps prove that the native pieces compile. `ios/` and `android/` are regenerated, and both are gitignored.

- [ ] **Step 1: Regenerate the iOS project**

Run: `npx expo prebuild --platform ios --clean`

Expected:
- It ends with `✔ Finished prebuild` and installs the CocoaPods.
- It does not print the warning `Expo config is missing required ios.appleTeamId`.

Run: `grep -c "CallActivity.appex" ios/Memento.xcodeproj/project.pbxproj && grep -c "MementoCallActivity" ios/Podfile.lock`

Expected: two numbers, each greater than 0.

- [ ] **Step 2: Build the app and the widget for the simulator**

Run, from the repo root:

```bash
cd ios && xcodebuild -workspace Memento.xcworkspace -scheme Memento -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build/verify CODE_SIGNING_ALLOWED=NO build | tail -5; cd ..
```

Expected: `** BUILD SUCCEEDED **`. A clean build takes a long time, around 20 minutes.

- [ ] **Step 3: Check the built app**

```bash
APP=ios/build/verify/Build/Products/Debug-iphonesimulator/Memento.app
ls "$APP/PlugIns"
plutil -p "$APP/Info.plist" | grep NSSupportsLiveActivities
plutil -p "$APP/PlugIns/CallActivity.appex/Info.plist" | grep -E "CFBundleIdentifier|MinimumOSVersion"
grep -c "ToggleCallMuteIntent" "$APP/Metadata.appintents/extract.actionsdata"
```

Expected:
- `PlugIns` lists `CallActivity.appex` and `ShareExtension.appex`.
- The app's `Info.plist` contains `"NSSupportsLiveActivities" => true`.
- The widget's bundle ID is `io.mymemento.app.callactivity`, and its minimum OS version is `17.0`.
- The intent count is greater than 0.

Then free the disk space: `rm -rf ios/build/verify`.

- [ ] **Step 4: Compile the patched Android notification**

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew :react-native-audio-api:compileDebugKotlin --console=plain | tail -3; cd ..
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Report**

Report the results of Steps 1 to 4. Do not commit anything in this task.

---

### Task 6: Device checklist

The person who owns the device runs this task. An implementing agent must stop after Task 5 and hand this list over.

**iOS: an iPhone 15 Pro or newer, or the iPhone 16 Pro simulator, on iOS 17 or later**

Run the app with `bun run ios`.

1. Start a voice call, then tap Minimize. A dark strip shows at the top. Screen headers sit below it, and none of them is covered. The status bar text is white.
2. Open a screen with a header, such as Settings. Its back button and title are fully visible and can be tapped. Tapping the strip returns to the call.
3. Open the new story editor during the call. The strip is hidden there, because the editor covers the whole screen. Close the editor and the strip comes back.
4. Go to the home screen. The Dynamic Island shows a waveform icon on the left and the running call time on the right.
5. Long-press the Dynamic Island.
   - It shows "Memento", the time, and "Listening" or "Memento is speaking".
   - Tap Mute. The icon turns red, the call stops hearing you, and the app shows muted when you return.
   - Tap Mute again to unmute.
6. Lock the phone. The lock screen shows the call card with the time and the Mute and End buttons. Tap End. The call ends, and the card disappears.
7. Start a call, go to the home screen, and force-quit Memento from the app switcher. The Dynamic Island and the lock screen card disappear.
8. In Settings, turn off Live Activities for Memento, then start a call. The call works normally and nothing appears in the Dynamic Island.

**Android: Android 12 or later**

Run the app with `bun run android`.

1. Start a call, then go to the home screen.
   - The notification shows as an ongoing call from "Memento", with a running timer and a hang-up button.
   - Android 12 and later may also show a call chip in the status bar.
2. Tap the notification. It opens the call screen.
3. Tap hang-up. The call ends, and the notification disappears.
4. In the app during a call, the strip shows above the screens. Full-screen screens, such as the editor, also show the strip on Android.

**If something fails:** note the step number, what you saw, and any Xcode or Logcat output. Look for log lines that contain `MementoCallActivity` or `RecordingNotification`.
