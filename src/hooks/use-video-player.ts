import { useEffect } from 'react';
import { useVideoPlayer as useExpoVideoPlayer, VideoPlayer } from 'expo-video';

interface UseVideoPlayerOptions {
  loop?: boolean;
  autoPlay?: boolean;
}

interface UseVideoPlayerResult {
  /** The expo-video player instance — pass directly to <VideoView player={player} /> */
  player: VideoPlayer;
  play: () => void;
  pause: () => void;
  replay: () => void;
}

/**
 * useVideoPlayer — thin wrapper around expo-video's useVideoPlayer.
 *
 * Mirrors the pattern of use-audio-recorder.ts: all expo-video internals
 * stay here, callers only deal with a simple { player, play, pause, replay }.
 *
 * Usage:
 *   const { player } = useVideoPlayer('https://example.com/video.mp4');
 *   return <VideoView player={player} nativeControls />;
 *
 * Note: this hook must be called at the top level of a component — it cannot
 * be called inside renderItem or .map(). Wrap each video in its own component
 * that calls this hook (see VideoItem in stories/[id].tsx).
 */
export function useVideoPlayer(uri: string, options: UseVideoPlayerOptions = {}): UseVideoPlayerResult {
  const { loop = true, autoPlay = true } = options;

  // Do NOT call p.play() here — the initializer runs before <VideoView> mounts.
  // On Android, SurfaceView can't display frames until it's attached to the view
  // hierarchy. Callers that want autoPlay must call play() in a useEffect after mount.
  const player = useExpoVideoPlayer(uri, (p) => {
    p.loop = loop;
  });

  useEffect(() => {
    if (!autoPlay) return;
    player.play();
  }, [autoPlay, player]);

  const play = () => player.play();
  const pause = () => player.pause();
  const replay = () => {
    player.seekBy(-player.currentTime);
    player.play();
  };

  return { player, play, pause, replay };
}
