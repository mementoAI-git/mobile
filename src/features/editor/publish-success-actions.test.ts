import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { createPublishSuccessActions } from './publish-success-actions';

import { logger } from '@/lib/logger';

let diagnostic: ReturnType<typeof spyOn>;
beforeEach(() => { diagnostic = spyOn(logger, 'handledError').mockImplementation(() => {}); });
afterEach(() => { diagnostic.mockRestore(); });

const url = 'https://example.com/story/story-1?a=1&b=2';

test('copy failure reports the standard error and does not mark the link copied', async () => {
  const notifyError = mock((_message: string) => {});
  const actions = createPublishSuccessActions({ copyText: async () => { throw new Error('Clipboard unavailable'); }, openURL: async () => {}, notifyError });
  expect(await actions.copy(url)).toBe(false);
  expect(notifyError).toHaveBeenCalledWith('We couldn’t copy the link. Please try again.');
});
test('copy success writes the real story link without an error notification', async () => {
  const copyText = mock(async (_text: string) => {});
  const notifyError = mock((_message: string) => {});
  expect(await createPublishSuccessActions({ copyText, openURL: async () => {}, notifyError }).copy(url)).toBe(true);
  expect(copyText).toHaveBeenCalledWith(url);
  expect(notifyError).not.toHaveBeenCalled();
});
test('social sharing encodes the story URL and reports opening failures', async () => {
  const openURL = mock(async (_url: string) => { throw new Error('Cannot open URL'); });
  const notifyError = mock((_message: string) => {});
  const actions = createPublishSuccessActions({ copyText: async () => {}, openURL, notifyError });
  for (const platform of ['linkedin', 'facebook', 'instagram', 'x'] as const) {
    expect(await actions.share(platform, url)).toBe(false);
  }
  expect(openURL.mock.calls[0][0]).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
  expect(openURL.mock.calls[1][0]).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  expect(openURL.mock.calls[2][0]).toBe('https://www.instagram.com/');
  expect(openURL.mock.calls[3][0]).toBe(`https://x.com/intent/tweet?url=${encodeURIComponent(url)}`);
  expect(notifyError).toHaveBeenCalledTimes(4);
  expect(notifyError).toHaveBeenLastCalledWith('We couldn’t open the sharing app. Please try again.');
});
test('opening a sharing app succeeds without an error notification', async () => {
  const notifyError = mock((_message: string) => {});
  const actions = createPublishSuccessActions({ copyText: async () => {}, openURL: async () => {}, notifyError });
  expect(await actions.share('x', url)).toBe(true);
  expect(notifyError).not.toHaveBeenCalled();
});
