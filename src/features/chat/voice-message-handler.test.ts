import { describe, expect, test } from 'bun:test';

import {
  summarizeVoiceServerMessage,
  VoiceMessageHandler,
} from './voice-message-handler';
import { VoiceSelfInterruptGuard } from './voice-self-interrupt-guard';

describe('VoiceMessageHandler', () => {
  for (const transcriptField of ['inputTranscription', 'interimInputTranscription']) {
    test(`uses bundled ${transcriptField} before judging an interruption on new audio`, () => {
      const handler = new VoiceMessageHandler();
      const fallbacks: number[] = [];
      const guard = new VoiceSelfInterruptGuard({
        now: () => 10_000,
        onFallback: (duration) => fallbacks.push(duration),
        limit: 1,
      });
      guard.observeOutputText('Tell me about your childhood home');
      guard.observeInterrupted(true, 2_000);

      const effects = handler.handle({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: 'audio', mimeType: 'audio/pcm' } }] },
          [transcriptField]: { text: 'actually it was my aunt' },
          outputTranscription: { text: 'actually it was my aunt' },
        },
      }, 1);
      for (const effect of effects) {
        if (effect.type === 'input-transcript') guard.observeInputText(effect.text, effect.isInterim);
        if (effect.type === 'output-audio') guard.observeModelAudio();
        if (effect.type === 'output-transcript') guard.observeOutputText(effect.text);
      }

      expect(guard.suspected).toBe(0);
      expect(fallbacks).toEqual([]);
    });
  }

  test('summarizes raw event delivery without exposing transcript or audio content', () => {
    const summary = summarizeVoiceServerMessage({
      setupComplete: {},
      serverContent: {
        modelTurn: {
          parts: [{ inlineData: { data: 'private-audio-bytes' } }],
        },
        inputTranscription: { text: 'private user words' },
        interimInputTranscription: { text: 'private partial words' },
        outputTranscription: { text: 'private model words', finished: true },
        turnComplete: true,
      },
    });

    expect(summary).toEqual({
      setupComplete: true,
      serverContentKeys: [
        'inputTranscription',
        'interimInputTranscription',
        'modelTurn',
        'outputTranscription',
        'turnComplete',
      ],
      interrupted: false,
      turnComplete: true,
      outputAudioFrames: 1,
      inputTranscriptLength: 18,
      interimInputTranscriptLength: 21,
      outputTranscriptLength: 19,
      outputTranscriptFinished: true,
    });
    expect(JSON.stringify(summary)).not.toContain('private');
  });

  test('ignores modelTurn.parts[].text (thinking text) — only outputTranscription is the spoken transcript', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({
        serverContent: {
          modelTurn: {
            parts: [
              { inlineData: { data: 'first', mimeType: 'audio/pcm' } },
              // This text is the model's chain-of-thought reasoning in thinking models.
              // It must NOT appear as a transcript fragment.
              { text: '**Greeting Saviour Today** I\'ve crafted a warm greeting...' },
              { inlineData: { data: 'second', mimeType: 'audio/pcm' } },
            ],
          },
        },
      }, 1),
    ).toEqual([
      { type: 'output-audio', data: 'first', epoch: 1 },
      // No output-transcript here — part.text is thinking text, not spoken words.
      { type: 'output-audio', data: 'second', epoch: 1 },
    ]);
  });

  test('returns interrupted effect without epoch (engine owns epoch)', () => {
    const handler = new VoiceMessageHandler();

    expect(handler.handle({ serverContent: { interrupted: true } }, 1)).toEqual([
      { type: 'interrupted' },
    ]);
  });

  test('uses caller-supplied epoch for output audio', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: 'new', mimeType: 'audio/pcm' } }] },
        },
      }, 7),
    ).toEqual([{ type: 'output-audio', data: 'new', epoch: 7 }]);
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
      }, 1),
    ).toEqual([
      { type: 'setup-complete' },
      { type: 'input-transcript', text: 'hello', isInterim: false },
      { type: 'output-transcript', text: 'hi', finished: false },
      { type: 'turn-complete' },
    ]);
  });

  test('handles snake_case payload variations from raw WebSocket server messages', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({
        setup_complete: {},
        server_content: {
          model_turn: {
            parts: [
              { inline_data: { data: 'audio-data', mimeType: 'audio/pcm' } },
              // part.text is thinking text — intentionally ignored
              { text: 'thinking reasoning text' },
            ],
          },
          input_transcription: { text: 'user words' },
          output_transcription: { text: 'assistant words', finished: false },
          turn_complete: true,
        },
      }, 3),
    ).toEqual([
      { type: 'setup-complete' },
      { type: 'input-transcript', text: 'user words', isInterim: false },
      { type: 'output-audio', data: 'audio-data', epoch: 3 },
      // No output-transcript from part.text — thinking text is ignored.
      { type: 'output-transcript', text: 'assistant words', finished: false },
      { type: 'turn-complete' },
    ]);
  });

  test('distinguishes interim input transcription from final input transcription', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({
        serverContent: {
          interimInputTranscription: { text: 'partial user speech' },
        },
      }, 1),
    ).toEqual([
      { type: 'input-transcript', text: 'partial user speech', isInterim: true },
    ]);
  });

  test('keeps a finished signal whose final frame has no text', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({
        serverContent: {
          outputTranscription: { text: '', finished: true },
          turnComplete: true,
        },
      }, 1),
    ).toEqual([
      { type: 'output-transcript', text: '', finished: true },
      { type: 'turn-complete' },
    ]);
  });

  test('emits resumable handles and go-away warnings', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle({ sessionResumptionUpdate: { newHandle: 'h1', resumable: true } } as any, 1),
    ).toEqual([{ type: 'resumption-handle', handle: 'h1' }]);
    expect(
      handler.handle({ sessionResumptionUpdate: { newHandle: '', resumable: false } } as any, 1),
    ).toEqual([]);
    expect(handler.handle({ goAway: { timeLeft: '5s' } } as any, 1)).toEqual([
      { type: 'go-away', timeLeftMs: 5000 },
    ]);
    expect(handler.handle({ goAway: {} } as any, 1)).toEqual([
      { type: 'go-away', timeLeftMs: 0 },
    ]);
  });

  test('emits tool calls and cancellations', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle(
        {
          toolCall: {
            functionCalls: [
              { id: 'c1', name: 'search_memories', args: { query: 'farm' } },
              { id: 'c2', name: 'search_memories' },
            ],
          },
        } as any,
        1,
      ),
    ).toEqual([
      {
        type: 'tool-call',
        calls: [
          { id: 'c1', name: 'search_memories', args: { query: 'farm' } },
          { id: 'c2', name: 'search_memories', args: {} },
        ],
      },
    ]);
    expect(handler.handle({ toolCallCancellation: { ids: ['c1'] } } as any, 1)).toEqual([
      { type: 'tool-call-cancellation', ids: ['c1'] },
    ]);
  });

  test('reports Gemini token usage when a message carries it', () => {
    const handler = new VoiceMessageHandler();

    expect(
      handler.handle(
        { usageMetadata: { promptTokenCount: 1200, responseTokenCount: 80, totalTokenCount: 1280 } } as any,
        1,
      ),
    ).toEqual([{ type: 'usage', promptTokens: 1200, responseTokens: 80, totalTokens: 1280 }]);
    expect(handler.handle({ usage_metadata: { total_token_count: 9 } } as any, 1)).toEqual([
      { type: 'usage', promptTokens: undefined, responseTokens: undefined, totalTokens: 9 },
    ]);
    expect(handler.handle({ serverContent: {} } as any, 1)).toEqual([]);
  });
});
