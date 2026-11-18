import { describe, expect, test } from 'bun:test';
import eas from '../../../eas.json';

type Profile = { extends?: string; env?: Record<string, string> };
const profiles = eas.build as Record<string, Profile>;
const envOf = (name: string): Record<string, string> => {
  const profile = profiles[name];
  return { ...(profile.extends ? envOf(profile.extends) : {}), ...profile.env };
};

// The App Store build used to ship half duplex without iOS voice processing,
// so production calls waited their turn while TestFlight answered quickly.
// Production must run the voice setup that was tested on TestFlight.
describe('voice settings in store builds', () => {
  const VOICE_FLAGS = [
    'EXPO_PUBLIC_VOICE_FULL_DUPLEX',
    'EXPO_PUBLIC_VOICE_IOS_VOICE_PROCESSING',
    'EXPO_PUBLIC_NATIVE_VOICE_PLAYBACK',
  ];

  test('production matches TestFlight', () => {
    const testflight = envOf('testflight');
    const production = envOf('production');
    for (const flag of VOICE_FLAGS) {
      expect({ flag, value: production[flag] }).toEqual({ flag, value: testflight[flag] });
    }
  });

  test('production runs full duplex with iOS voice processing', () => {
    const production = envOf('production');
    expect(production.EXPO_PUBLIC_VOICE_FULL_DUPLEX).toBe('true');
    expect(production.EXPO_PUBLIC_VOICE_IOS_VOICE_PROCESSING).toBe('true');
  });
});
