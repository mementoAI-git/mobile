// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  BACKGROUND_TRACKS,
  getBackgroundTrack,
  isBackgroundTrackActive,
} from './background-music';
import {
  VOICE_CATALOG,
  getVoiceById,
  getVoiceByProviderName,
} from '../chat/voice-catalog';

describe('background music catalog and helpers', () => {
  test('contains the 4 primary ambience tracks plus None', () => {
    const keys = BACKGROUND_TRACKS.map((t) => t.key);
    expect(keys).toEqual(['none', 'moonlight', 'seawaves', 'arkansas', 'love']);
  });

  test('keeps ambience tracks remote so MP3 files are not bundled', async () => {
    const source = await Bun.file(new URL('./background-music.ts', import.meta.url)).text();
    expect(source).not.toContain("require('../../../assets/audio/");
    expect(BACKGROUND_TRACKS.filter((track) => track.key !== 'none').every(
      (track) => track.remoteUrl?.startsWith('https://'),
    )).toBe(true);
  });

  test('versions every playable source so CDN and device caches can be invalidated', () => {
    for (const track of BACKGROUND_TRACKS.filter((item) => item.key !== 'none')) {
      expect(track.cacheVersion).toBe('v1');
      expect(track.remoteUrl).toEndWith('?v=v1');
    }
  });

  test('resolves tracks by key with safe fallback', () => {
    expect(getBackgroundTrack('moonlight').name).toBe('Moonlight');
    expect(getBackgroundTrack('seawaves').name).toBe('Sea Waves');
    expect(getBackgroundTrack('arkansas').name).toBe('Arkansas');
    expect(getBackgroundTrack('love').name).toBe('A love for life');
    expect(getBackgroundTrack('none').name).toBe('None');
    expect(getBackgroundTrack('unknown-key').name).toBe('None');
    expect(getBackgroundTrack(null).name).toBe('None');
  });

  test('correctly determines whether a track is actively playing ambience', () => {
    expect(isBackgroundTrackActive('moonlight')).toBe(true);
    expect(isBackgroundTrackActive('none')).toBe(false);
    expect(isBackgroundTrackActive(null)).toBe(false);
    expect(isBackgroundTrackActive(undefined)).toBe(false);
  });
});

describe('AI voice catalog and provider mapping', () => {
  test('resolves voice by Gemini provider name across case variations', () => {
    expect(getVoiceByProviderName('Fenrir')?.id).toBe('denver');
    expect(getVoiceByProviderName('fenrir')?.id).toBe('denver');
    expect(getVoiceByProviderName('Aoede')?.id).toBe('sue');
    expect(getVoiceByProviderName('Enceladus')?.id).toBe('josef');
    expect(getVoiceByProviderName('Kore')?.id).toBe('hannah');
    expect(getVoiceByProviderName('Leda')?.id).toBe('maya');
    expect(getVoiceByProviderName('Puck')?.id).toBe('leo');
  });

  test('resolves voice by id', () => {
    expect(getVoiceById('denver')?.providerVoiceName).toBe('Fenrir');
    expect(getVoiceById('sue')?.providerVoiceName).toBe('Aoede');
    expect(getVoiceById('unknown')).toBeNull();
  });
});
