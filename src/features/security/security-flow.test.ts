// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  classifyPasskeyError,
  selectSecurityLoginMethod,
} from './security-flow';

describe('security credential flow', () => {
  test('prefers native passkeys and falls back only when legacy biometrics are enrolled', () => {
    expect(selectSecurityLoginMethod({
      hasNativePasskey: true,
      hasBiometricFallback: true,
    })).toBe('passkey');
    expect(selectSecurityLoginMethod({
      hasNativePasskey: false,
      hasBiometricFallback: true,
    })).toBe('biometric-fallback');
    expect(selectSecurityLoginMethod({
      hasNativePasskey: false,
      hasBiometricFallback: false,
    })).toBe('unenrolled');
  });

  test('keeps cancellation separate from unsupported-device fallback', () => {
    expect(classifyPasskeyError({ error: 'UserCancelled' })).toBe('cancelled');
    expect(classifyPasskeyError({ error: 'NotSupported' })).toBe('unsupported');
    expect(classifyPasskeyError({ error: 'NoCredentials' })).toBe('unavailable');
    expect(classifyPasskeyError(new Error('network failed'))).toBe('failed');
  });
});
