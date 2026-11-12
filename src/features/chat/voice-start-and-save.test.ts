import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

test('a saved voice starts the call without flashing the voice page', () => {
  const chat = readFileSync('src/screens/ChatScreen.tsx', 'utf8');
  const start = chat.indexOf('const handleVoiceCall');
  const handler = chat.slice(start, chat.indexOf('router.push', start));
  expect(handler).toContain('startVoiceCall({ memoryId, voiceName: voice.providerVoiceName })');
  expect(handler).toContain('return;');
});

test('ending a call confirms the recording was saved', () => {
  const mode = readFileSync('src/hooks/use-voice-mode.ts', 'utf8');
  const store = readFileSync('src/features/chat/call-recording-store.ts', 'utf8');
  expect(store).toContain("Promise<'sent' | 'queued'>");
  expect(mode).toContain("'Your conversation recording is saved to Stories'");
  expect(mode).toContain("toast('We couldn’t save this conversation’s recording', 'error')");
});
