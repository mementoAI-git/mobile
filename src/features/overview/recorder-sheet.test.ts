import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('the Overview record button opens the recorder sheet', () => {
  const card = read('src/components/overview/OverviewCaptureCard.tsx');
  expect(card).toContain("useUiStore.getState().openSheet('recorder')");
  expect(card).not.toContain('autoRecord');
  expect(read('src/components/sheets/SheetManager.tsx')).toContain("'recorder': { component: RecorderSheet");
});

test('the Overview + button records in the sheet; Stories keeps recording in the editor', () => {
  const overview = read('app/(tabs)/overview/index.tsx');
  expect(overview).toContain("openSheet('recorder');");
  expect(overview).not.toContain("autoRecord: 'true'");
  expect(read('app/(tabs)/stories/index.tsx')).toContain("autoRecord: 'true'");
});

test('Done saves the recording as a private quick capture the AI names', () => {
  const sheet = read('src/components/sheets/RecorderSheet.tsx');
  expect(sheet).toContain("quickCapture({ body: '', attachments: [fileId], visibility: 'private', auto_title: true })");
  // A failed upload or save throws, so the hook keeps the file for another try.
  expect(sheet).toContain('throw new Error(');
});

test('the story editor keeps its own record button', () => {
  expect(read('app/editor.tsx')).toContain("autoRecord !== 'true'");
});
