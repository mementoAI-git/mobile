// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('Gemini voice provider contract', () => {
  test('passes the selected catalog provider name directly into Gemini Live', async () => {
    const source = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();

    expect(source).toContain("voiceName?: string");
    expect(source).toContain('voiceName: voiceName ??');
    expect(source).not.toContain("activeVoice.id === 'deep-masculine'");
    expect(source).not.toContain('VOICE_OPTIONS');
  });
});
