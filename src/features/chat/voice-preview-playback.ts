import type { VoiceId } from './voice-catalog';

export const VOICE_PREVIEW_TEXT = 'My good opinion once lost, is lost for ever.';
export const VOICE_PICKER_ORB_SIZE = 230;
export const VOICE_PICKER_DOT_SIZE = 10;
export const VOICE_PICKER_DOT_GAP = 8;

export function getVoicePageIndex(offset: number, pageWidth: number, count: number) {
  if (pageWidth <= 0 || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offset / pageWidth)));
}

export type VoicePreviewStatus = 'idle' | 'loading' | 'playing' | 'error';
export interface VoicePreviewPlayer {
  play(): void;
  pause(): void;
  remove(): void;
  addListener(event: 'playbackStatusUpdate', listener: (status: { playing: boolean; didJustFinish: boolean; error?: string | null }) => void): { remove(): void };
}

/** Only the most recent settled page may play, even when audio setup resolves out of order. */
export class VoicePreviewPlayback {
  private revision = 0;
  private player?: VoicePreviewPlayer;
  private subscription?: { remove(): void };

  constructor(private readonly runtime: {
    prepare(): Promise<void>;
    createPlayer(voice: VoiceId): VoicePreviewPlayer;
    onStatus(status: VoicePreviewStatus): void;
  }) {}

  async play(voice: VoiceId) {
    this.stop();
    const revision = this.revision;
    this.runtime.onStatus('loading');
    try {
      await this.runtime.prepare();
      if (revision !== this.revision) return;
      const player = this.runtime.createPlayer(voice);
      this.player = player;
      this.subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (revision !== this.revision) return;
        if (status.error) {
          this.stop();
          this.runtime.onStatus('error');
        } else if (status.didJustFinish) {
          this.stop();
        } else if (status.playing) this.runtime.onStatus('playing');
      });
      player.play();
    } catch {
      if (revision !== this.revision) return;
      this.stop();
      this.runtime.onStatus('error');
    }
  }

  stop() {
    this.revision += 1;
    try { this.subscription?.remove(); } catch { /* The OS may already have released it. */ }
    this.subscription = undefined;
    const player = this.player;
    this.player = undefined;
    try { player?.pause(); } catch { /* Already interrupted by the OS. */ }
    try { player?.remove(); } catch { /* Already released by the audio session. */ }
    this.runtime.onStatus('idle');
  }
}
