import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/store';
import {
  BACKGROUND_TRACKS,
  getBackgroundTrack,
  type BackgroundTrack,
  type BackgroundTrackKey,
} from '@/features/audio/background-music';

const VOLUME_STORAGE_KEY = 'memento.bg_music_volume';

interface BackgroundMusicContextType {
  currentTrack: BackgroundTrackKey;
  isPlaying: boolean;
  volume: number;
  setVolume: (vol: number) => void;
  playTrack: (key: BackgroundTrackKey) => Promise<void>;
  stopTrack: () => Promise<void>;
  togglePlay: () => Promise<void>;
  tracks: readonly BackgroundTrack[];
}

const BackgroundMusicContext = createContext<BackgroundMusicContextType | null>(null);

export function BackgroundMusicProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const [currentTrack, setCurrentTrack] = useState<BackgroundTrackKey>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(50);
  const playerRef = useRef<AudioPlayer | null>(null);

  // Restore saved volume
  useEffect(() => {
    AsyncStorage.getItem(VOLUME_STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          const parsed = Number(saved);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            setVolumeState(parsed);
          }
        }
      })
      .catch(() => {});
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    setVolumeState(clamped);
    if (playerRef.current) {
      playerRef.current.volume = clamped / 100;
    }
    AsyncStorage.setItem(VOLUME_STORAGE_KEY, String(clamped)).catch(() => {});
  }, []);

  const stopTrack = useCallback(async () => {
    try {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
      }
    } catch {
      // Ignored
    } finally {
      setCurrentTrack('none');
      setIsPlaying(false);
    }
  }, []);

  const playTrack = useCallback(
    async (key: BackgroundTrackKey) => {
      if (key === 'none') {
        await stopTrack();
        return;
      }

      const track = getBackgroundTrack(key);
      if (!track || track.key === 'none') {
        await stopTrack();
        return;
      }

      try {
        // Clean up previous player
        if (playerRef.current) {
          try {
            playerRef.current.pause();
            playerRef.current.remove();
          } catch {
            // Ignored
          }
          playerRef.current = null;
        }

        const source = track.localSource ?? (track.remoteUrl ? { uri: track.remoteUrl } : null);
        if (!source) {
          await stopTrack();
          return;
        }

        const player = createAudioPlayer(source);
        player.loop = true;
        player.volume = volume / 100;
        player.play();

        playerRef.current = player;
        setCurrentTrack(key);
        setIsPlaying(true);
      } catch (err) {
        logger.warn('Could not start background music track', err);
        setIsPlaying(false);
      }
    },
    [stopTrack, volume]
  );

  const togglePlay = useCallback(async () => {
    if (!playerRef.current || currentTrack === 'none') {
      if (currentTrack !== 'none') {
        await playTrack(currentTrack);
      }
      return;
    }

    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  }, [currentTrack, isPlaying, playTrack]);

  // Sync with user.bg_music from profile
  useEffect(() => {
    const desired = (user?.bg_music as BackgroundTrackKey) || 'none';
    if (desired !== currentTrack) {
      if (desired === 'none' || !desired) {
        if (currentTrack !== 'none') {
          void stopTrack();
        }
      } else {
        void playTrack(desired);
      }
    }
  }, [user?.bg_music]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch {
          // Ignored
        }
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <BackgroundMusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        setVolume,
        playTrack,
        stopTrack,
        togglePlay,
        tracks: BACKGROUND_TRACKS,
      }}
    >
      {children}
    </BackgroundMusicContext.Provider>
  );
}

export function useBackgroundMusic() {
  const context = useContext(BackgroundMusicContext);
  if (!context) {
    // Return a safe fallback so components can render safely even if outside provider
    return {
      currentTrack: 'none' as BackgroundTrackKey,
      isPlaying: false,
      volume: 50,
      setVolume: () => {},
      playTrack: async () => {},
      stopTrack: async () => {},
      togglePlay: async () => {},
      tracks: BACKGROUND_TRACKS,
    };
  }
  return context;
}
