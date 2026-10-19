import { describe, expect, test, mock } from 'bun:test';
import { getMusicPlayerTrack, runMusicPlayerAction } from './music-player';

function controls(savedTrack: string | null = null, currentTrack = 'none', isPlaying = false) {
  return {
    savedTrack, currentTrack, isPlaying,
    saveTrack: mock(async (_key: string) => {}),
    playTrack: mock(async (_key: string) => {}),
    togglePlay: mock(async () => {}),
    stopTrack: mock(async () => {}),
  };
}

describe('account music controls', () => {
  test('shows the active track, saved track, or first playable track in that order', () => {
    expect(getMusicPlayerTrack('love', 'seawaves').key).toBe('love');
    expect(getMusicPlayerTrack('none', 'seawaves').key).toBe('seawaves');
    expect(getMusicPlayerTrack('none', null).key).toBe('moonlight');
    expect(getMusicPlayerTrack('unknown', 'unknown').key).toBe('moonlight');
  });

  test('first play saves the selected track and explicitly starts it once', async () => {
    const player = controls();
    await runMusicPlayerAction('toggle', player);
    expect(player.saveTrack).toHaveBeenCalledWith('moonlight');
    expect(player.playTrack).toHaveBeenCalledWith('moonlight');
    expect(player.playTrack).toHaveBeenCalledTimes(1);
  });

  test('resumes an existing paused player and restarts a stopped saved track', async () => {
    const paused = controls('love', 'love');
    await runMusicPlayerAction('toggle', paused);
    expect(paused.togglePlay).toHaveBeenCalledTimes(1);
    expect(paused.saveTrack).not.toHaveBeenCalled();
    const stopped = controls('love');
    await runMusicPlayerAction('toggle', stopped);
    expect(stopped.playTrack).toHaveBeenCalledWith('love');
  });

  test('stops playback without erasing the saved track', async () => {
    const player = controls('moonlight', 'moonlight', true);
    await runMusicPlayerAction('toggle', player);
    expect(player.stopTrack).toHaveBeenCalledTimes(1);
    expect(player.saveTrack).not.toHaveBeenCalled();
  });

  test('skips in both directions and wraps past the first and last track', async () => {
    const first = controls('moonlight', 'moonlight');
    await runMusicPlayerAction('previous', first);
    expect(first.saveTrack).toHaveBeenCalledWith('love');
    expect(first.playTrack).toHaveBeenCalledWith('love');
    const last = controls('love', 'love');
    await runMusicPlayerAction('next', last);
    expect(last.saveTrack).toHaveBeenCalledWith('moonlight');
    expect(last.playTrack).toHaveBeenCalledWith('moonlight');
    const middle = controls('seawaves', 'seawaves');
    await runMusicPlayerAction('next', middle);
    expect(middle.saveTrack).toHaveBeenCalledWith('arkansas');
  });

  test('does not start playback when saving the preference fails', async () => {
    const player = controls();
    player.saveTrack.mockRejectedValue(new Error('Connection lost'));
    await expect(runMusicPlayerAction('next', player)).rejects.toThrow('Connection lost');
    expect(player.playTrack).not.toHaveBeenCalled();
  });
});
