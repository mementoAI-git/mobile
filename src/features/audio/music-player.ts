import { BACKGROUND_TRACKS, type BackgroundTrackKey } from './background-music';

const playableTracks = BACKGROUND_TRACKS.filter(track => track.key !== 'none');

export type MusicPlayerAction = 'previous' | 'toggle' | 'next';

export function getMusicPlayerTrack(currentTrack?: string | null, savedTrack?: string | null) {
  return playableTracks.find(track => track.key === currentTrack)
    ?? playableTracks.find(track => track.key === savedTrack)
    ?? playableTracks[0];
}

interface MusicPlayerControls {
  currentTrack: string;
  savedTrack?: string | null;
  isPlaying: boolean;
  saveTrack: (key: BackgroundTrackKey) => Promise<unknown>;
  playTrack: (key: BackgroundTrackKey) => Promise<unknown>;
  stopTrack: () => Promise<unknown>;
  togglePlay: () => Promise<unknown>;
}

export async function runMusicPlayerAction(action: MusicPlayerAction, player: MusicPlayerControls) {
  if (action === 'toggle' && player.isPlaying) {
    await player.stopTrack();
    return;
  }
  const selected = getMusicPlayerTrack(player.currentTrack, player.savedTrack);
  if (action === 'toggle' && player.currentTrack === selected.key) {
    await player.togglePlay();
    return;
  }
  const index = playableTracks.indexOf(selected);
  const next = action === 'toggle' ? selected : playableTracks[
    (index + (action === 'next' ? 1 : -1) + playableTracks.length) % playableTracks.length
  ];
  if (next.key !== player.savedTrack) {
    await player.saveTrack(next.key);
  }
  // Restoring a saved preference never starts playback; user actions do.
  await player.playTrack(next.key);
}
