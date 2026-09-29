import { describe, expect, test } from 'bun:test';
import {
  isVoiceCallMessage,
  parseVoiceCallMessage,
  serializeVoiceCallTranscript,
} from './voice-transcript-parser';

describe('voice-transcript-parser', () => {
  describe('isVoiceCallMessage', () => {
    test('identifies standard voice call completion message', () => {
      expect(isVoiceCallMessage('Voice call completed (01:16)', true)).toBe(true);
      expect(isVoiceCallMessage('Voice call completed (00:05)')).toBe(true);
    });

    test('identifies voice call message with embedded transcript', () => {
      const msg = 'Voice call completed (01:16)\n\n--- Transcript ---\nYou: Hello\nMemento: Hi';
      expect(isVoiceCallMessage(msg)).toBe(true);
    });

    test('rejects non-call messages', () => {
      expect(isVoiceCallMessage('Hello there', true)).toBe(false);
      expect(isVoiceCallMessage('Voice call is cool')).toBe(false);
      expect(isVoiceCallMessage('')).toBe(false);
    });
  });

  describe('serializeVoiceCallTranscript', () => {
    test('serializes call with turns into backward-compatible markdown', () => {
      const turns = [
        { role: 'user' as const, text: 'Hello Memento' },
        { role: 'ai' as const, text: 'Hello! How are you?' },
        { role: 'user' as const, text: 'I am reflecting on childhood.' },
      ];
      const serialized = serializeVoiceCallTranscript('01:16', turns);

      expect(serialized).toContain('Voice call completed (01:16)');
      expect(serialized).toContain('--- Transcript ---');
      expect(serialized).toContain('You: Hello Memento');
      expect(serialized).toContain('Memento: Hello! How are you?');
      expect(serialized).toContain('You: I am reflecting on childhood.');
    });

    test('serializes empty turns cleanly', () => {
      const serialized = serializeVoiceCallTranscript('00:45', []);
      expect(serialized).toBe('Voice call completed (00:45)');
    });
  });

  describe('parseVoiceCallMessage', () => {
    test('parses basic call completion without transcript', () => {
      const parsed = parseVoiceCallMessage('Voice call completed (01:16)');
      expect(parsed.duration).toBe('01:16');
      expect(parsed.hasTranscript).toBe(false);
      expect(parsed.turns).toHaveLength(0);
    });

    test('parses call completion with full multi-turn transcript', () => {
      const text = [
        'Voice call completed (02:30)',
        '',
        '--- Transcript ---',
        'You: What is your favorite season?',
        'Memento: Autumn is wonderful with the crisp air.',
        'You: I agree, the leaves changing colors are beautiful.',
      ].join('\n');

      const parsed = parseVoiceCallMessage(text);
      expect(parsed.duration).toBe('02:30');
      expect(parsed.hasTranscript).toBe(true);
      expect(parsed.turns).toHaveLength(3);
      expect(parsed.turns[0]).toEqual({
        speaker: 'user',
        speakerName: 'You',
        text: 'What is your favorite season?',
      });
      expect(parsed.turns[1]).toEqual({
        speaker: 'assistant',
        speakerName: 'Memento',
        text: 'Autumn is wonderful with the crisp air.',
      });
      expect(parsed.turns[2]).toEqual({
        speaker: 'user',
        speakerName: 'You',
        text: 'I agree, the leaves changing colors are beautiful.',
      });
    });

    test('parses multi-line turn responses correctly', () => {
      const text = [
        'Voice call completed (01:10)',
        '',
        '--- Transcript ---',
        'You: Tell me a story.',
        'Memento: Once upon a time, in a quiet village.',
        'The river flowed softly past the old mill.',
      ].join('\n');

      const parsed = parseVoiceCallMessage(text);
      expect(parsed.turns).toHaveLength(2);
      expect(parsed.turns[1].speaker).toBe('assistant');
      expect(parsed.turns[1].text).toContain('Once upon a time');
      expect(parsed.turns[1].text).toContain('The river flowed softly');
    });

    test('handles fallback when duration cannot be regex matched', () => {
      const parsed = parseVoiceCallMessage('Spoken session with Memento');
      expect(parsed.duration).toBe('00:00');
      expect(parsed.hasTranscript).toBe(false);
      expect(parsed.turns).toHaveLength(0);
    });
  });
});
