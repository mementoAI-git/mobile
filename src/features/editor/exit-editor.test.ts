import { expect, test } from 'bun:test';
import { saveDraftAndExit, snapshotEditorBody } from './exit-editor';
test('saves locally before returning and quietly confirming', async () => {
  const steps: string[] = [];
  await saveDraftAndExit({ saveLocal: async () => { steps.push('saved'); }, leave: () => { steps.push('back'); }, notify: () => { steps.push('Draft saved'); }, onFailure: () => {} });
  expect(steps).toEqual(['saved', 'back', 'Draft saved']);
});
test('empty editor returns without creating a draft or showing a save message', async () => {
  const steps: string[] = [];
  await saveDraftAndExit({ leave: () => { steps.push('back'); }, notify: () => { steps.push('message'); }, onFailure: () => {} });
  expect(steps).toEqual(['back']);
});
test('device storage failure does not discard the current story', async () => {
  let left = false, failed = false;
  expect(await saveDraftAndExit({ saveLocal: async () => { throw new Error('disk full'); }, leave: () => { left = true; }, notify: () => {}, onFailure: () => { failed = true; } })).toBe(false);
  expect(left).toBe(false); expect(failed).toBe(true);
});

test('flushes the last editor change and falls back if the WebView stalls', async () => {
  expect(await snapshotEditorBody(async () => '<p>Newest character</p>', () => 'old')).toBe('<p>Newest character</p>');
  expect(await snapshotEditorBody(() => new Promise(() => {}), () => 'last autosaved words', 5)).toBe('last autosaved words');
});
