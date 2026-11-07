import { create } from 'zustand';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { toast } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';

interface FeedAudioPlaybackState {
  activeMemoryId: string | null;
  activeAudioUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  togglePlay: (memoryId: string, audioUrl: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
}

let currentPlayer: AudioPlayer | null = null;
let currentSubscription: { remove: () => void } | null = null;

function cleanupCurrentPlayer() {
  if (currentSubscription) {
    try {
      currentSubscription.remove();
    } catch {
      // Ignored
    }
    currentSubscription = null;
  }
  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.remove();
    } catch {
      // Ignored
    }
    currentPlayer = null;
  }
}

export const useFeedAudioPlaybackStore = create<FeedAudioPlaybackState>((set, get) => ({
  activeMemoryId: null,
  activeAudioUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  progress: 0,

  togglePlay: async (memoryId: string, audioUrl: string) => {
    const { activeMemoryId, isPlaying } = get();

    // Case 1: Same memory already active — toggle pause/play
    if (activeMemoryId === memoryId && currentPlayer) {
      try {
        if (isPlaying) {
          currentPlayer.pause();
          set({ isPlaying: false });
        } else {
          currentPlayer.play();
          set({ isPlaying: true });
        }
      } catch (err) {
        logger.handledError('Failed to toggle playback on active player', { err });
        toast('We couldn’t play this recording. Please try again.', 'error');
      }
      return;
    }

    // Case 2: New memory card tapped
    cleanupCurrentPlayer();

    if (!audioUrl) {
      set({
        activeMemoryId: null,
        activeAudioUrl: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        progress: 0,
      });
      return;
    }

    try {
      const player = createAudioPlayer({ uri: audioUrl }, { updateInterval: 150 });
      currentPlayer = player;

      set({
        activeMemoryId: memoryId,
        activeAudioUrl: audioUrl,
        isPlaying: true,
        currentTime: 0,
        duration: player.duration || 0,
        progress: 0,
      });

      currentSubscription = player.addListener('playbackStatusUpdate', (status) => {
        if (get().activeMemoryId !== memoryId) return;

        const dur = status.duration > 0 ? status.duration : (player.duration || 0);
        const cur = status.currentTime || 0;
        const prog = dur > 0 ? Math.min(1, Math.max(0, cur / dur)) : 0;

        if (status.didJustFinish) {
          set({
            isPlaying: false,
            currentTime: dur,
            progress: 1,
          });
        } else {
          set({
            isPlaying: status.playing,
            currentTime: cur,
            duration: dur,
            progress: prog,
          });
        }
      });

      player.play();
    } catch (err) {
      logger.handledError('Failed to initialize inline feed audio player', { memoryId, audioUrl, err });
      toast('We couldn’t play this recording. Please try again.', 'error');
      cleanupCurrentPlayer();
      set({
        activeMemoryId: null,
        activeAudioUrl: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        progress: 0,
      });
    }
  },

  pause: () => {
    if (currentPlayer) {
      try {
        currentPlayer.pause();
      } catch {
        // Ignored
      }
    }
    set({ isPlaying: false });
  },

  stop: () => {
    cleanupCurrentPlayer();
    set({
      activeMemoryId: null,
      activeAudioUrl: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      progress: 0,
    });
  },
}));
