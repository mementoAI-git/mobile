// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('voice call sheet registration', () => {
  test('registers shared settings and end-session sheets', async () => {
    const store = await Bun.file(new URL('../../store/ui.store.ts', import.meta.url)).text();
    const manager = await Bun.file(new URL('../../components/sheets/SheetManager.tsx', import.meta.url)).text();
    expect(store).toContain("'voice-call-settings'");
    expect(store).toContain("'end-voice-session'");
    expect(manager).toContain('VoiceCallSettingsSheet');
    expect(manager).toContain('EndVoiceSessionSheet');
  });
});
