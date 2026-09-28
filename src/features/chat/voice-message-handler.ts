import type { LiveServerMessage } from '@google/genai/web';

export type VoiceMessageEffect =
  | { type: 'setup-complete' }
  | { type: 'output-audio'; data: string; epoch: number }
  | { type: 'input-transcript'; text: string }
  | { type: 'output-transcript'; text: string }
  | { type: 'interrupted'; epoch: number }
  | { type: 'turn-complete' };

type VoiceServerMessage = Pick<LiveServerMessage, 'serverContent' | 'setupComplete'>;

export class VoiceMessageHandler {
  private epoch = 1;

  handle(message: VoiceServerMessage): VoiceMessageEffect[] {
    const effects: VoiceMessageEffect[] = [];

    if (message.setupComplete) effects.push({ type: 'setup-complete' });

    const content = message.serverContent;
    if (!content) return effects;

    if (content.interrupted) {
      this.epoch += 1;
      effects.push({ type: 'interrupted', epoch: this.epoch });
    }

    for (const part of content.modelTurn?.parts ?? []) {
      const data = part.inlineData?.data;
      if (typeof data === 'string' && data.length > 0) {
        effects.push({ type: 'output-audio', data, epoch: this.epoch });
      }
    }

    const inputText = content.inputTranscription?.text;
    if (typeof inputText === 'string' && inputText.length > 0) {
      effects.push({ type: 'input-transcript', text: inputText });
    }

    const outputText = content.outputTranscription?.text;
    if (typeof outputText === 'string' && outputText.length > 0) {
      effects.push({ type: 'output-transcript', text: outputText });
    }

    if (content.turnComplete) effects.push({ type: 'turn-complete' });
    return effects;
  }
}
