import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { useProfile } from '@/hooks/queries/use-profile';
import { getMusicPlayerTrack, runMusicPlayerAction, type MusicPlayerAction } from '@/features/audio/music-player';
import { toast } from '@/components/ui/Toast';

export function useAccountMusic() {
  const music = useBackgroundMusic();
  const { data: profile } = useProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const act = useCallback(async (action: MusicPlayerAction) => {
    if (inFlight.current || music.isLoading) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await runMusicPlayerAction(action, {
        ...music,
        savedTrack: profile?.bg_music,
        saveTrack: key => updateProfile({ bg_music: key }),
      });
    } catch {
      toast('We couldn’t update your music. Please try again.', 'error');
    } finally {
      inFlight.current = false;
      if (isMounted.current) setBusy(false);
    }
  }, [music, profile?.bg_music, updateProfile]);

  const previous = useCallback(() => { void act('previous'); }, [act]);
  const toggle = useCallback(() => { void act('toggle'); }, [act]);
  const next = useCallback(() => { void act('next'); }, [act]);

  return {
    selectedTrack: getMusicPlayerTrack(music.currentTrack, profile?.bg_music),
    isPlaying: music.isPlaying,
    isBusy: busy || isPending || music.isLoading,
    volume: music.volume,
    setVolume: music.setVolume,
    previous,
    toggle,
    next,
  };
}
