import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { VOICE_CATALOG, type VoiceId } from './voice-catalog';
import { pickVoicePreviewClip, VOICE_PREVIEW_CLIPS, VOICE_PREVIEW_LINES } from './voice-preview-assets';
import { getVoicePageIndex, VoicePreviewPlayback, VOICE_PICKER_DOT_GAP, VOICE_PICKER_ORB_SIZE, type VoicePreviewPlayer, type VoicePreviewStatus } from './voice-preview-playback';

function harness(prepare: () => Promise<void> = async () => {}) {
  const calls: string[] = [];
  const statuses: VoicePreviewStatus[] = [];
  const listeners = new Map<VoiceId, (status: { playing: boolean; didJustFinish: boolean; error?: string }) => void>();
  const playback = new VoicePreviewPlayback({
    prepare,
    onStatus: (status) => statuses.push(status),
    createPlayer: (voice): VoicePreviewPlayer => {
      calls.push(`create:${voice}`);
      return {
        play: () => { calls.push(`play:${voice}`); },
        pause: () => { calls.push(`pause:${voice}`); },
        remove: () => { calls.push(`remove:${voice}`); },
        addListener: (_, listener) => {
          listeners.set(voice, listener);
          return { remove: () => { calls.push(`unsubscribe:${voice}`); } };
        },
      };
    },
  });
  return { calls, statuses, playback, listeners };
}

describe('voice picker previews', () => {
  test('selects the nearest page and clamps overscroll at both ends', () => {
    expect(getVoicePageIndex(350, 350, 6)).toBe(1);
    expect(getVoicePageIndex(4.8 * 350, 350, 6)).toBe(5);
    expect(getVoicePageIndex(-100, 350, 6)).toBe(0);
    expect(getVoicePageIndex(10000, 350, 6)).toBe(5);
    expect(getVoicePageIndex(200, 0, 6)).toBe(0);
    expect(VOICE_PICKER_ORB_SIZE).toBe(230);
    expect(VOICE_PICKER_DOT_GAP).toBe(8);
  });

  test('stops and releases the previous voice before starting another', async () => {
    const { calls, playback } = harness();
    await playback.play('denver');
    await playback.play('sue');
    expect(calls).toEqual(['create:denver', 'play:denver', 'unsubscribe:denver', 'pause:denver', 'remove:denver', 'create:sue', 'play:sue']);
    playback.stop();
    expect(calls.slice(-3)).toEqual(['unsubscribe:sue', 'pause:sue', 'remove:sue']);
  });

  test('rapid swipes cannot start an old preview when setup resolves late', async () => {
    const pending: (() => void)[] = [];
    const { calls, playback } = harness(() => new Promise<void>((resolve) => pending.push(resolve)));
    const old = playback.play('denver');
    const latest = playback.play('hannah');
    pending[1]();
    await latest;
    pending[0]();
    await old;
    expect(calls).toEqual(['create:hannah', 'play:hannah']);
    playback.stop();
  });

  test('leaving the picker cancels pending playback', async () => {
    let finish!: () => void;
    const { calls, playback } = harness(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = playback.play('leo');
    playback.stop();
    finish();
    await pending;
    expect(calls).toEqual([]);
  });

  test('releases a finished clip and ignores late events from an old player', async () => {
    const { playback, listeners, statuses, calls } = harness();
    await playback.play('maya');
    listeners.get('maya')!({ playing: true, didJustFinish: false });
    expect(statuses.at(-1)).toBe('playing');
    listeners.get('maya')!({ playing: false, didJustFinish: true });
    expect(statuses.at(-1)).toBe('idle');
    expect(calls.slice(-2)).toEqual(['pause:maya', 'remove:maya']);
    listeners.get('maya')!({ playing: true, didJustFinish: false });
    expect(statuses.at(-1)).toBe('idle');
  });

  test('audio failures remain retryable without leaking a player', async () => {
    const { playback, listeners, statuses, calls } = harness();
    await playback.play('josef');
    listeners.get('josef')!({ playing: false, didJustFinish: false, error: 'unavailable' });
    expect(statuses.at(-1)).toBe('error');
    expect(calls.slice(-2)).toEqual(['pause:josef', 'remove:josef']);
    await playback.play('josef');
    expect(calls.at(-1)).toBe('play:josef');
    playback.stop();
  });

  test('reports failed audio setup without allocating a player', async () => {
    const { playback, statuses, calls } = harness(async () => { throw new Error('Audio unavailable'); });
    await playback.play('sue');
    expect(statuses.at(-1)).toBe('error');
    expect(calls).toEqual([]);
    playback.stop();
  });

  test('every voice has bundled MP3 samples copied from web, one per recorded line', () => {
    const hashes = new Set<string>();
    for (const voice of VOICE_CATALOG) {
      const clips = VOICE_PREVIEW_CLIPS[voice.id];
      expect(clips.length).toBeGreaterThan(0);
      for (const { line } of clips) {
        expect(VOICE_PREVIEW_LINES[line]).toBeTruthy();
        const bytes = readFileSync(`assets/audio/voice-previews/${voice.id}-${line}.mp3`);
        // ID3 tag or an MPEG frame sync.
        expect(bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)).toBe(true);
        hashes.add(createHash('sha256').update(bytes).digest('hex'));
      }
    }
    expect(hashes.size).toBe(Object.values(VOICE_PREVIEW_CLIPS).flat().length);
  });

  test('picks a different sentence than the one just played, like web', () => {
    const first = pickVoicePreviewClip('denver', null, () => 0);
    expect(first?.line).toBe(0);
    for (let i = 0; i < 20; i += 1) {
      expect(pickVoicePreviewClip('denver', 0)?.line).not.toBe(0);
    }
    // Only one line recorded: it still plays.
    expect(pickVoicePreviewClip('leo', 0)?.line).toBe(0);
  });
});
