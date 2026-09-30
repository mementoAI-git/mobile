import { WEB_BASE_URL } from '@/lib/env';

export type BackgroundTrackKey = 'none' | 'moonlight' | 'seawaves' | 'arkansas' | 'love';

export interface BackgroundTrack {
  id: BackgroundTrackKey;
  key: BackgroundTrackKey;
  name: string;
  subtitle: string;
  cacheVersion?: string;
  remoteUrl?: string;
}

export const BACKGROUND_MUSIC_CACHE_VERSION = 'v1';

const backgroundTrackUrl = (filename: string) =>
  `${WEB_BASE_URL}/audio/${filename}?v=${BACKGROUND_MUSIC_CACHE_VERSION}`;

export const BACKGROUND_TRACKS: readonly BackgroundTrack[] = [
  {
    id: 'none',
    key: 'none',
    name: 'None',
    subtitle: 'Turn off',
  },
  {
    id: 'moonlight',
    key: 'moonlight',
    name: 'Moonlight',
    subtitle: 'Tune 1',
    cacheVersion: BACKGROUND_MUSIC_CACHE_VERSION,
    remoteUrl: backgroundTrackUrl('moonlight.mp3'),
  },
  {
    id: 'seawaves',
    key: 'seawaves',
    name: 'Sea Waves',
    subtitle: 'Tune 2',
    cacheVersion: BACKGROUND_MUSIC_CACHE_VERSION,
    remoteUrl: backgroundTrackUrl('seawaves.mp3'),
  },
  {
    id: 'arkansas',
    key: 'arkansas',
    name: 'Arkansas',
    subtitle: 'Tune 3',
    cacheVersion: BACKGROUND_MUSIC_CACHE_VERSION,
    remoteUrl: backgroundTrackUrl('arkansas.mp3'),
  },
  {
    id: 'love',
    key: 'love',
    name: 'A love for life',
    subtitle: 'Tune 4',
    cacheVersion: BACKGROUND_MUSIC_CACHE_VERSION,
    remoteUrl: backgroundTrackUrl('love.mp3'),
  },
] as const;

export function getBackgroundTrack(key?: string | null): BackgroundTrack {
  if (!key || key === 'none') return BACKGROUND_TRACKS[0];
  const found = BACKGROUND_TRACKS.find((t) => t.key === key || t.id === key);
  return found || BACKGROUND_TRACKS[0];
}

export function isBackgroundTrackActive(key?: string | null): boolean {
  return Boolean(key && key !== 'none');
}
