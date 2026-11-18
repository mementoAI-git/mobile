import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { RecordingActivityController, type RecordingActivityAdapter } from './recording-activity';

function fakeAdapter() {
  const calls: string[] = [];
  const adapter: RecordingActivityAdapter = {
    start: async (elapsed, paused) => { calls.push(`start ${elapsed} ${paused}`); },
    update: async (elapsed, paused) => { calls.push(`update ${elapsed} ${paused}`); },
    end: async () => { calls.push('end'); },
    onAction: () => ({ remove() {} }),
    beginBackgroundTask: () => 1,
    endBackgroundTask: () => {},
  };
  return { adapter, calls };
}

test('shows the card while recording, updates on pause and resume, ends when the take ends', async () => {
  const { adapter, calls } = fakeAdapter();
  const controller = new RecordingActivityController(adapter);
  controller.sync(false, false, 0);
  controller.sync(true, false, 0);
  controller.sync(true, false, 3); // The card's timer runs itself: no update.
  controller.sync(true, true, 7);
  controller.sync(true, false, 7);
  controller.sync(false, false, 0);
  controller.sync(false, false, 0);
  await controller.idle();
  expect(calls).toEqual(['start 0 false', 'update 7 true', 'update 7 false', 'end']);
});

test('a failed native call never blocks the next one', async () => {
  const { adapter, calls } = fakeAdapter();
  adapter.start = async () => { throw new Error('Live Activities are off'); };
  const controller = new RecordingActivityController(adapter);
  controller.sync(true, false, 0);
  controller.sync(false, false, 0);
  await controller.idle();
  expect(calls).toEqual(['end']);
});

test('does nothing without a native module', async () => {
  const controller = new RecordingActivityController(null);
  controller.sync(true, false, 0);
  await controller.idle();
});

test('the recording lives at app level: background, lock-screen card, floating when minimized', () => {
  const session = readFileSync('src/features/overview/recording-session.tsx', 'utf8');
  expect(session).toContain('background: true');
  expect(session).toContain('onStop: done');
  expect(session).toContain('beginBackgroundTask()');
  const layout = readFileSync('app/_layout.tsx', 'utf8');
  // Sheets render in BottomSheetModalProvider's portal, so the session must wrap it.
  expect(layout.indexOf('<RecordingSessionProvider>')).toBeLessThan(layout.indexOf('<BottomSheetModalProvider>'));
  // Swiping the sheet down only minimizes: the take floats over every screen until Done or X.
  expect(readFileSync('src/components/chat/CallIndicator.tsx', 'utf8')).toContain('<FloatingRecorder />');
  const floating = readFileSync('src/components/overview/FloatingRecorder.tsx', 'utf8');
  expect(floating).toContain('if (!busy || expanded) return null;');
  expect(floating).toContain('<FullWindowOverlay>');
  expect(readFileSync('src/components/sheets/RecorderSheet.tsx', 'utf8')).toContain('Minimize recorder, keep recording');
  const app = JSON.parse(readFileSync('app.json', 'utf8'));
  const audio = app.expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-audio');
  expect(audio[1].enableBackgroundRecording).toBe(true);
});

test('the Live Activity extension carries the recording card with Pause and Stop', () => {
  expect(readFileSync('targets/CallActivity/CallActivityBundle.swift', 'utf8')).toContain('RecordingLiveActivity()');
  const intents = readFileSync('targets/CallActivity/_shared/RecordingActivityIntents.swift', 'utf8');
  expect(intents).toContain('postRecordingAction("togglePause")');
  expect(intents).toContain('postRecordingAction("stop")');
  // ActivityKit matches app and widget by the attributes' name and shape.
  const strip = (path: string) => readFileSync(path, 'utf8').replace(/^\/\/ Keep in sync.*$/m, '');
  expect(strip('targets/CallActivity/MementoRecordingAttributes.swift'))
    .toBe(strip('modules/memento-call-activity/ios/MementoRecordingAttributes.swift'));
});

test('the floating recorder tucks smoothly to the side and has a white icon', () => {
  const floating = readFileSync('src/components/overview/FloatingRecorder.tsx', 'utf8');
  // Pushed past an edge, it tucks behind a tab; tapping or pulling the tab brings it back.
  expect(floating).toContain("tuck('right', y, gesture.vx);");
  expect(floating).toContain("tuck('left', y, gesture.vx);");
  expect(floating).toContain('onAccessibilityAction={untuck}');
  // No border beam; tucking glides and fades instead of springing.
  expect(floating).not.toContain('CardBorderBeam');
  expect(floating).toContain('Easing.out(Easing.cubic)');
  // textStrong is white in Dark and ink in Light.
  expect(floating).toContain('<AudioLines size={22} color={colors.textStrong} />');
});

