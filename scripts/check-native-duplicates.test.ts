import { describe, expect, test } from 'bun:test';

import { findNativeDuplicates } from './check-native-duplicates.js';

// The shape of bun.lock, trailing commas included.
const LOCK = `{
  "lockfileVersion": 1,
  "packages": {
    "expo-constants": ["expo-constants@57.0.22", "", {}, "sha512-a"],
    "expo-share-intent": ["expo-share-intent@8.0.1", "", {}, "sha512-b"],
    "expo-share-intent/expo-constants": ["expo-constants@57.0.21", "", {}, "sha512-c"],
    "@expo/config-plugins": ["@expo/config-plugins@57.0.9", "", {}, "sha512-d"],
    "expo-share-intent/@expo/config-plugins": ["@expo/config-plugins@57.0.8", "", {}, "sha512-e"],
    "glob": ["glob@10.4.5", "", {}, "sha512-f"],
    "some/glob": ["glob@13.0.6", "", {}, "sha512-g"],
  },
}`;

const NATIVE = new Set(['expo-constants', 'expo-share-intent']);

describe('check-native-duplicates', () => {
  test('flags a native module locked at two versions, naming both', () => {
    const duplicates = findNativeDuplicates(LOCK, (name: string) => NATIVE.has(name));
    expect(duplicates).toEqual([
      {
        name: 'expo-constants',
        versions: [
          { version: '57.0.22', keys: ['expo-constants'] },
          { version: '57.0.21', keys: ['expo-share-intent/expo-constants'] },
        ],
      },
    ]);
  });

  test('ignores duplicates of JavaScript-only packages, scoped or not', () => {
    const duplicates = findNativeDuplicates(LOCK, () => false);
    expect(duplicates).toEqual([]);
  });

  test('passes a lockfile with one version of each native module', () => {
    const clean = LOCK.replace(/\n\s*"expo-share-intent\/expo-constants".*\n/, '\n');
    expect(findNativeDuplicates(clean, (name: string) => NATIVE.has(name))).toEqual([]);
  });
});
