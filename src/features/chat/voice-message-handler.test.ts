import { describe, expect, test } from 'bun:test';

import { VoiceMessageHandler } from './voice-message-handler';

describe('VoiceMessageHandler', () => {
  test('preserves every valid output audio part in order', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({
        serverContent: {
          modelTurn: {
            parts: [
              { inlineData: { data: 'first', mimeType: 'audio/pcm' } },
              { text: 'ignored' },
              { inlineData: { data: 'second', mimeType: 'audio/pcm' } },
            ],
          },
        },
      }),
    ).toEqual([
      { type: 'output-audio', data: 'first', epoch: 1 },
      { type: 'output-audio', data: 'second', epoch: 1 },
    ]);
  });

  test('increments the epoch on interruption before later audio is accepted', () => {
    const handler = new VoiceMessageHandler();

    expect(handler.handle({ serverContent: { interrupted: true } })).toEqual([
      { type: 'interrupted', epoch: 2 },
    ]);
    expect(
      handler.handle({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: 'new', mimeType: 'audio/pcm' } }] },
        },
      }),
    ).toEqual([{ type: 'output-audio', data: 'new', epoch: 2 }]);
  });

  test('dispatches setup, transcripts, and completed turns', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({
        setupComplete: {},
        serverContent: {
          inputTranscription: { text: 'hello' },
          outputTranscription: { text: 'hi' },
          turnComplete: true,
        },
      }),
    ).toEqual([
      { type: 'setup-complete' },
      { type: 'input-transcript', text: 'hello' },
      { type: 'output-transcript', text: 'hi' },
      { type: 'turn-complete' },
    ]);
  });
});
