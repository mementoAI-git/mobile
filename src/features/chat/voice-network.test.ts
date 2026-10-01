import { describe, expect, test } from 'bun:test';

import { shouldReconnectOnNetworkChange } from './voice-network';

const wifi = { type: 'wifi', isConnected: true };
const cellular = { type: 'cellular', isConnected: true };
const offline = { type: 'none', isConnected: false };

describe('shouldReconnectOnNetworkChange', () => {
  test('ignores the first snapshot and repeats of the same network', () => {
    expect(shouldReconnectOnNetworkChange(undefined, wifi)).toBe(false);
    expect(shouldReconnectOnNetworkChange(wifi, { ...wifi })).toBe(false);
  });

  test('reconnects when the transport changes', () => {
    expect(shouldReconnectOnNetworkChange(wifi, cellular)).toBe(true);
    expect(shouldReconnectOnNetworkChange(cellular, wifi)).toBe(true);
  });

  test('waits while offline and reconnects when connectivity returns', () => {
    expect(shouldReconnectOnNetworkChange(wifi, offline)).toBe(false);
    expect(shouldReconnectOnNetworkChange(offline, cellular)).toBe(true);
    expect(shouldReconnectOnNetworkChange(wifi, { type: 'wifi', isConnected: null })).toBe(false);
  });
});
