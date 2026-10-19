import { expect, test } from 'bun:test';

test('handled voice failures use the themed app notification instead of a development error overlay', async () => {
  const hook = await Bun.file(new URL('../../hooks/use-voice-mode.ts', import.meta.url)).text();
  const provider = await Bun.file(new URL('../../hooks/use-voice-call.tsx', import.meta.url)).text();
  expect(hook).not.toContain("logger.error('Live voice session failed'");
  expect(hook).not.toContain("logger.error('Failed to connect voice session'");
  expect(provider).toContain("voice.connectionFailure?.kind === 'connection-error'");
  expect(provider).toContain("toast('Your voice connection was interrupted. Please try again.', 'error')");
});
