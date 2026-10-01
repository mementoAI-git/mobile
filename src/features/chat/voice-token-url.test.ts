import { describe, expect, test } from 'bun:test';

import { buildEphemeralTokenUrl } from './voice-token-url';

describe('buildEphemeralTokenUrl', () => {
  test('returns the bare endpoint without parameters', () => {
    expect(buildEphemeralTokenUrl('/ai/ephemeral-token', {})).toBe('/ai/ephemeral-token');
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
});
