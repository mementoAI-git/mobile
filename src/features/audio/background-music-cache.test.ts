import { describe, expect, test } from 'bun:test';

import { resolveBackgroundTrackUri } from './background-music-cache';
import { getBackgroundTrack } from './background-music';

describe('resolveBackgroundTrackUri', () => {
  test('reuses a previously cached track without downloading it again', async () => {
    let downloads = 0;
    const uri = await resolveBackgroundTrackUri(getBackgroundTrack('moonlight'), {
      cacheDirectory: 'file:///cache/',
      getInfo: async () => ({ exists: true }),
      download: async () => {
        downloads += 1;
        return { uri: 'file:///cache/unexpected.mp3' };
      },
    });

    expect(uri).toBe('file:///cache/memento-background-moonlight-v1.mp3');
    expect(downloads).toBe(0);
  });

  test('downloads a missing track into the cache and returns the local URI', async () => {
    const requests: Array<[string, string]> = [];
    const track = getBackgroundTrack('seawaves');
    const uri = await resolveBackgroundTrackUri(track, {
      cacheDirectory: 'file:///cache/',
      getInfo: async () => ({ exists: false }),
      download: async (remoteUrl, destination) => {
        requests.push([remoteUrl, destination]);
        return { uri: destination };
      },
    });

    expect(uri).toBe('file:///cache/memento-background-seawaves-v1.mp3');
    expect(requests).toEqual([
      [track.remoteUrl!, 'file:///cache/memento-background-seawaves-v1.mp3'],
    ]);
  });

  test('rejects tracks without a downloadable source', async () => {
    await expect(
      resolveBackgroundTrackUri(getBackgroundTrack('none'), {
        cacheDirectory: 'file:///cache/',
        getInfo: async () => ({ exists: false }),
        download: async () => ({ uri: 'file:///cache/none.mp3' }),
      }),
    ).rejects.toThrow('This background track is unavailable right now.');
  });
});
