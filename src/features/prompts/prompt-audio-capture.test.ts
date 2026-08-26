// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  formatRecordingDuration,
  buildPromptAudioReflectionTarget,
} from './prompt-audio-capture';

describe('prompt audio capture helpers', () => {
  test('formats seconds into clean mm:ss duration', () => {
    expect(formatRecordingDuration(0)).toBe('0:00');
    expect(formatRecordingDuration(9)).toBe('0:09');
    expect(formatRecordingDuration(45)).toBe('0:45');
    expect(formatRecordingDuration(75)).toBe('1:15');
    expect(formatRecordingDuration(600)).toBe('10:00');
  });

  test('builds reflection navigation target with audio uri', () => {
    const target = buildPromptAudioReflectionTarget(
      'prompt-123',
      'Childhood best friend',
      'file:///path/to/voice.m4a'
    );

    expect(target.pathname).toBe('/chat/[id]');
    expect(target.params.id).toBe('prompt-123');
    expect(target.params.type).toBe('prompt');
    expect(target.params.promptTitle).toBe('Childhood best friend');
    expect(target.params.initialAudioUri).toBe('file:///path/to/voice.m4a');
  });

  test('falls back to new when promptId is empty', () => {
    const target = buildPromptAudioReflectionTarget('', 'Daily reflection');
    expect(target.params.id).toBe('new');
    expect(target.params.initialAudioUri).toBeUndefined();
  });
});
