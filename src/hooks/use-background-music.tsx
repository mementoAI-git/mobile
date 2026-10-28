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
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store';
import { resolveBackgroundTrackUri } from '@/features/audio/background-music-cache';
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
  isLoading: boolean;
  volume: number;
  setVolume: (vol: number) => void;
  playTrack: (key: BackgroundTrackKey) => Promise<void>;
  stopTrack: () => Promise<void>;
  togglePlay: () => Promise<void>;
  pauseForVoice: () => void;
  resumeAfterVoice: () => void;
  tracks: readonly BackgroundTrack[];
}

const BackgroundMusicContext = createContext<BackgroundMusicContextType | null>(null);

export function BackgroundMusicProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const [currentTrack, setCurrentTrack] = useState<BackgroundTrackKey>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(50);
  const volumeRef = useRef(50);
  const playerRef = useRef<AudioPlayer | null>(null);
  const pausedForVoiceRef = useRef(false);
  const loadRequestRef = useRef(0);

  // Restore saved volume
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(VOLUME_STORAGE_KEY)
      .then((saved) => {
        if (active && saved) {
          const parsed = Number(saved);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            setVolumeState(parsed);
            volumeRef.current = parsed;
            if (playerRef.current) playerRef.current.volume = parsed / 100;
          }
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    if (playerRef.current) {
      playerRef.current.volume = clamped / 100;
    }
    AsyncStorage.setItem(VOLUME_STORAGE_KEY, String(clamped)).catch(() => {});
  }, []);

  const stopTrack = useCallback(async () => {
    loadRequestRef.current += 1;
    pausedForVoiceRef.current = false;
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
      setIsLoading(false);
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

      const request = ++loadRequestRef.current;
      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTrack(key);
      pausedForVoiceRef.current = false;
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

        const uri = await resolveBackgroundTrackUri(track, {
          cacheDirectory: FileSystem.cacheDirectory,
          getInfo: FileSystem.getInfoAsync,
          download: FileSystem.downloadAsync,
        });
        if (request !== loadRequestRef.current) return;

        const player = createAudioPlayer({ uri });
        player.loop = true;
        player.volume = volumeRef.current / 100;
        player.play();

        playerRef.current = player;
        setCurrentTrack(key);
        setIsPlaying(true);
      } catch (err) {
        if (request !== loadRequestRef.current) return;
        logger.handledError('Could not start background music track', err);
        toast('This background track needs a connection the first time you play it.', 'info');
        setIsPlaying(false);
      } finally {
        if (request === loadRequestRef.current) setIsLoading(false);
      }
    },
    [stopTrack]
  );

  const pauseForVoice = useCallback(() => {
    if (!playerRef.current || !isPlaying) return;
    try {
      playerRef.current.pause();
      pausedForVoiceRef.current = true;
      setIsPlaying(false);
    } catch {
      // Ignored
    }
  }, [isPlaying]);

  const resumeAfterVoice = useCallback(() => {
    if (!playerRef.current || !pausedForVoiceRef.current) return;
    try {
      playerRef.current.play();
      pausedForVoiceRef.current = false;
      setIsPlaying(true);
    } catch {
      pausedForVoiceRef.current = false;
    }
  }, []);

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

  // A new signed-in session always starts silent, even with a saved track.
  // stopTrack also cancels any download still pending from the previous user.
  useEffect(() => {
    void stopTrack();
  }, [user?._id, stopTrack]);

  // Profile hydration/refetch restores a preference, never permission to play.
  // Explicitly turning music off still stops an already playing track.
  useEffect(() => {
    const desired = getBackgroundTrack(user?.bg_music).key;
    if (desired === 'none') void stopTrack();
  }, [user?.bg_music, stopTrack]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      loadRequestRef.current += 1;
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
        isLoading,
        volume,
        setVolume,
        playTrack,
        stopTrack,
        togglePlay,
        pauseForVoice,
        resumeAfterVoice,
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
      isLoading: false,
      volume: 50,
      setVolume: () => {},
      playTrack: async () => {},
      stopTrack: async () => {},
      togglePlay: async () => {},
      pauseForVoice: () => {},
      resumeAfterVoice: () => {},
      tracks: BACKGROUND_TRACKS,
    };
  }
  return context;
}
