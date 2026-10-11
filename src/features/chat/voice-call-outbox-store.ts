import AsyncStorage from '@react-native-async-storage/async-storage';

import endpoint from '@/api/endpoint';
import { voiceCallEndPath } from './voice-call-records';
import { VoiceCallOutbox } from './voice-call-outbox';

const outboxes = new Map<string, VoiceCallOutbox>();

/** One outbox per account, so its storage writes are serialized. */
export function getVoiceCallOutbox(userId: string): VoiceCallOutbox {
  let outbox = outboxes.get(userId);
  if (!outbox) {
    outbox = new VoiceCallOutbox(AsyncStorage, userId, {
      turnsUrl: endpoint.voiceTurns,
      endUrl: voiceCallEndPath,
    });
    outboxes.set(userId, outbox);
  }
  return outbox;
}
