import type { BackgroundTrack } from './background-music';

type BackgroundMusicCache = {
  cacheDirectory: string | null;
  getInfo: (uri: string) => Promise<{ exists: boolean }>;
  download: (remoteUrl: string, destination: string) => Promise<{ uri: string }>;
};

const UNAVAILABLE_MESSAGE = 'This background track is unavailable right now.';

export async function resolveBackgroundTrackUri(
  track: BackgroundTrack,
  cache: BackgroundMusicCache,
): Promise<string> {
  if (!track.remoteUrl || !cache.cacheDirectory || track.key === 'none') {
    throw new Error(UNAVAILABLE_MESSAGE);
  }

  const version = track.cacheVersion ?? 'unversioned';
  const destination = `${cache.cacheDirectory}memento-background-${track.key}-${version}.mp3`;
  const cached = await cache.getInfo(destination);
  if (cached.exists) return destination;

  const downloaded = await cache.download(track.remoteUrl, destination);
  if (!downloaded.uri) throw new Error(UNAVAILABLE_MESSAGE);
  return downloaded.uri;
}
