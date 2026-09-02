import { WEB_BASE_URL } from '@/lib/env';

export type BackgroundTrackKey = 'none' | 'moonlight' | 'seawaves' | 'arkansas' | 'love';

export interface BackgroundTrack {
  id: BackgroundTrackKey;
  key: BackgroundTrackKey;
  name: string;
  subtitle: string;
  localSource?: any;
  remoteUrl?: string;
}

function getLocalAudio(key: BackgroundTrackKey) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return null;
  }
  try {
    switch (key) {
      case 'moonlight':
        return require('../../../assets/audio/moonlight.mp3');
      case 'seawaves':
        return require('../../../assets/audio/seawaves.mp3');
      case 'arkansas':
        return require('../../../assets/audio/arkansas.mp3');
      case 'love':
        return require('../../../assets/audio/love.mp3');
      default:
        return null;
    }
  } catch {
    return null;
  }
}

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
    get localSource() {
      return getLocalAudio('moonlight');
    },
    remoteUrl: `${WEB_BASE_URL}/audio/moonlight.mp3`,
  },
  {
    id: 'seawaves',
    key: 'seawaves',
    name: 'Sea Waves',
    subtitle: 'Tune 2',
    get localSource() {
      return getLocalAudio('seawaves');
    },
    remoteUrl: `${WEB_BASE_URL}/audio/seawaves.mp3`,
  },
  {
    id: 'arkansas',
    key: 'arkansas',
    name: 'Arkansas',
    subtitle: 'Tune 3',
    get localSource() {
      return getLocalAudio('arkansas');
    },
    remoteUrl: `${WEB_BASE_URL}/audio/arkansas.mp3`,
  },
  {
    id: 'love',
    key: 'love',
    name: 'A love for life',
    subtitle: 'Tune 4',
    get localSource() {
      return getLocalAudio('love');
    },
    remoteUrl: `${WEB_BASE_URL}/audio/love.mp3`,
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
