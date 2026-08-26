export function formatRecordingDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export interface PromptAudioReflectionTarget {
  pathname: string;
  params: {
    id: string;
    type: string;
    promptTitle: string;
    initialAudioUri?: string;
  };
}

export function buildPromptAudioReflectionTarget(
  promptId: string,
  promptTitle: string,
  audioUri?: string
): PromptAudioReflectionTarget {
  return {
    pathname: '/chat/[id]',
    params: {
      id: promptId || 'new',
      type: 'prompt',
      promptTitle: promptTitle || '',
      ...(audioUri ? { initialAudioUri: audioUri } : {}),
    },
  };
}
