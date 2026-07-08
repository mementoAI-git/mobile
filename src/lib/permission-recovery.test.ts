// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  getPermissionRecoveryAction,
  isPermissionGranted,
} from './permission-recovery';

describe('permission recovery', () => {
  test('treats granted and limited permissions as usable', () => {
    expect(isPermissionGranted({ granted: true })).toBe(true);
    expect(isPermissionGranted({ status: 'granted' })).toBe(true);
    expect(isPermissionGranted({ status: 'limited' })).toBe(true);
    expect(isPermissionGranted({ accessPrivileges: 'limited' })).toBe(true);
  });

  test('uses settings when the system will not show another permission prompt', () => {
    expect(getPermissionRecoveryAction({ granted: false, canAskAgain: false })).toBe('settings');
  });

  test('uses retry while the app can still ask for permission', () => {
    expect(getPermissionRecoveryAction({ granted: false, canAskAgain: true })).toBe('retry');
    expect(getPermissionRecoveryAction({ status: 'denied' })).toBe('retry');
  });
});
