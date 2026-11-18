import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('the Overview record button opens the recorder', () => {
  const card = read('src/components/overview/OverviewCaptureCard.tsx');
  expect(card).toContain('openRecorder();');
  expect(card).not.toContain('autoRecord');
  expect(read('src/components/sheets/SheetManager.tsx')).toContain("'recorder': { component: RecorderSheet");
});

test('the Overview + button records in the sheet; Stories keeps recording in the editor', () => {
  const overview = read('app/(tabs)/overview/index.tsx');
  expect(overview).toContain('openRecorder();');
  expect(read('src/features/overview/recording-session.tsx')).toContain("openSheet('recorder')");
  expect(overview).not.toContain("autoRecord: 'true'");
  expect(read('app/(tabs)/stories/index.tsx')).toContain("autoRecord: 'true'");
});

test('Done saves the recording as a private quick capture the AI names', () => {
  const sheet = read('src/features/overview/recording-session.tsx');
  expect(sheet).toContain("quickCapture({ body: '', attachments: [fileId], visibility: 'private', auto_title: true })");
  // A failed upload or save throws, so the hook keeps the file for another try.
  expect(sheet).toContain('throw new Error(');
});

test('the story editor keeps its own record button', () => {
  expect(read('app/editor.tsx')).toContain("autoRecord !== 'true'");
});

test('a microphone that fails to start is retried once and then offers Try again', () => {
  const hook = read('src/hooks/use-story-recording.ts');
  // iOS can refuse to activate the audio session for a moment; one retry after a pause.
  expect(hook).toContain('setTimeout(resolve, 400)');
  expect(hook.match(/prepareToRecordAsync\(\)/g)?.length).toBe(2);
  // The native error is logged, never shown.
  expect(hook).toContain('setError(START_FAILED_MESSAGE)');
  expect(read('src/components/sheets/RecorderSheet.tsx')).toContain("startFailed ? 'Try again'");
  expect(read('src/features/overview/recording-session.tsx')).toContain('else if (startFailed) void start();');
});
