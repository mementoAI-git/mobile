// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('prompt voice reflection route contract', () => {
  test('uploads initial prompt audio and sends it as a media-only chat message', async () => {
    const screen = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();

    expect(screen).toContain('initialAudioUri');
    expect(screen).toContain('useFileUpload');
    expect(screen).toContain("type: 'audio/m4a'");
    expect(screen).toContain("await send('', null, [file._id]");
  });
});