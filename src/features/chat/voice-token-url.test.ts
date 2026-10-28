import { describe, expect, test } from 'bun:test';

import { buildEphemeralTokenUrl, VOICE_CLIENT_CAPABILITIES } from './voice-token-url';

describe('buildEphemeralTokenUrl', () => {
  test('returns the bare endpoint without parameters', () => {
    expect(buildEphemeralTokenUrl('/ai/ephemeral-token', { timeZone: null })).toBe(
      '/ai/ephemeral-token',
    );
  });

  test("sends the device's time zone so dates are the host's own", () => {
    const url = buildEphemeralTokenUrl('/ai/ephemeral-token', {});
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(new URL(`https://x${url}`).searchParams.get('timezone')).toBe(zone);
    const lagos = buildEphemeralTokenUrl('/ai/ephemeral-token', { timeZone: 'Africa/Lagos' });
    expect(new URL(`https://x${lagos}`).searchParams.get('timezone')).toBe('Africa/Lagos');
  });

  test('encodes every parameter', () => {
    const url = buildEphemeralTokenUrl('/ai/ephemeral-token', {
      memoryId: '64b000000000000000000001',
      resumeHandle: 'a/b+c=',
      deviceModel: 'Pixel 8 Pro',
      capabilities: ['memory_search'],
    });
    const params = new URL(`https://x${url}`).searchParams;

    expect(url.startsWith('/ai/ephemeral-token?')).toBe(true);
    expect(params.get('memory_id')).toBe('64b000000000000000000001');
    expect(params.get('resume_handle')).toBe('a/b+c=');
    expect(params.get('device_model')).toBe('Pixel 8 Pro');
    expect(params.get('capabilities')).toBe('memory_search');
  });

  // The API enables memory search and call actions from these exact names.
  // api: test/ai/live-session-config.test.ts parses this same string.
  test('sends the capabilities this build handles, in the form the API parses', () => {
    const url = buildEphemeralTokenUrl('/ai/ephemeral-token', {
      capabilities: VOICE_CLIENT_CAPABILITIES,
    });

    expect(new URL(`https://x${url}`).searchParams.get('capabilities')).toBe(
      'search_memories,call_actions,server_tools,screen_control,screen_fields',
    );
  });
});
