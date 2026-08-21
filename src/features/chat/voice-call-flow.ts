import type { VoiceId } from './voice-catalog';

export type VoiceCallStage =
  | 'choosing'
  | 'ready'
  | 'connecting'
  | 'live'
  | 'muted'
  | 'ending'
  | 'closed';

export type VoiceCallEvent =
  | 'choose'
  | 'start'
  | 'connected'
  | 'connection-failed'
  | 'toggle-mute'
  | 'change-voice'
  | 'request-end'
  | 'cancel-end'
  | 'confirm-end';

export function getInitialVoiceCallStage(selectedVoiceId: VoiceId | null): VoiceCallStage {
  return selectedVoiceId ? 'ready' : 'choosing';
}

export function getVoiceCallTransition(
  stage: VoiceCallStage,
  event: VoiceCallEvent,
): VoiceCallStage {
  if (event === 'change-voice') return 'ready';
  if (event === 'confirm-end') return 'closed';
  if (event === 'cancel-end' && stage === 'ending') return 'live';
  if (event === 'request-end') {
    return stage === 'live' || stage === 'muted' ? 'ending' : 'closed';
  }
  if (stage === 'choosing' && event === 'choose') return 'ready';
  if (stage === 'ready' && event === 'start') return 'connecting';
  if (stage === 'connecting' && event === 'connected') return 'live';
  if (stage === 'connecting' && event === 'connection-failed') return 'ready';
  if (stage === 'live' && event === 'toggle-mute') return 'muted';
  if (stage === 'muted' && event === 'toggle-mute') return 'live';
  return stage;
}

export function formatVoiceCallDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}
