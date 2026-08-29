// @ts-nocheck
import { expect, mock, test } from 'bun:test';
import {
  createSignedMediaRefreshGate,
  refreshSignedMediaAccess,
  shouldRefreshSignedMedia,
} from './signed-media-access';

const signed = {
  _id: 'file-1',
  url: 'https://api.test/files/file-1/content?token=old',
  name: 'photo.jpg',
  size: 42,
  access: {
    expires_at: '2026-08-29T10:00:20.000Z',
    refresh_endpoint: '/files/file-1/access',
  },
};

test('refreshes shortly before expiry but leaves legacy attachments alone', () => {
  expect(
    shouldRefreshSignedMedia(signed, new Date('2026-08-29T10:00:00.000Z').valueOf()),
  ).toBe(true);
  expect(
    shouldRefreshSignedMedia({ ...signed, access: undefined }, Date.now()),
  ).toBe(false);
});

test('refreshes through the declared safe endpoint and returns durable metadata', async () => {
  const request = mock(async () => ({
    data: { ...signed, url: 'https://api.test/files/file-1/content?token=new' },
  }));

  const refreshed = await refreshSignedMediaAccess(signed, {}, request);
  expect(request).toHaveBeenCalledWith('/files/file-1/access', {});
  expect(refreshed.url).toEndWith('token=new');
});

test('never follows an absolute or unrelated refresh endpoint from attachment data', async () => {
  const request = mock(async () => ({ data: signed }));

  const absolute = await refreshSignedMediaAccess({
    ...signed,
    access: { ...signed.access, refresh_endpoint: 'https://evil.test/collect' },
  }, {}, request);
  const unrelated = await refreshSignedMediaAccess({
    ...signed,
    access: { ...signed.access, refresh_endpoint: '/users/me' },
  }, {}, request);

  expect(absolute.url).toBe(signed.url);
  expect(unrelated.url).toBe(signed.url);
  expect(request).not.toHaveBeenCalled();
});

test('allows at most one load-error retry while joining concurrent refreshes', async () => {
  let resolve;
  const refresh = mock(() => new Promise((done) => { resolve = done; }));
  const gate = createSignedMediaRefreshGate(refresh);

  const first = gate.afterLoadError();
  const concurrent = gate.afterLoadError();
  expect(refresh).toHaveBeenCalledTimes(1);
  resolve(signed);
  await Promise.all([first, concurrent]);
  await expect(gate.afterLoadError()).resolves.toBeNull();
  expect(refresh).toHaveBeenCalledTimes(1);
});
