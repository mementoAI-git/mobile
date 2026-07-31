export type SecurityLoginMethod = 'passkey' | 'biometric-fallback' | 'unenrolled';
export type PasskeyErrorKind = 'cancelled' | 'unsupported' | 'unavailable' | 'failed';

interface SecurityEnrollmentState {
  hasNativePasskey: boolean;
  hasBiometricFallback: boolean;
}

export function selectSecurityLoginMethod({
  hasNativePasskey,
  hasBiometricFallback,
}: SecurityEnrollmentState): SecurityLoginMethod {
  if (hasNativePasskey) return 'passkey';
  if (hasBiometricFallback) return 'biometric-fallback';
  return 'unenrolled';
}

export function classifyPasskeyError(error: unknown): PasskeyErrorKind {
  const code = typeof error === 'object' && error !== null && 'error' in error
    ? String((error as { error?: unknown }).error)
    : '';

  if (code === 'UserCancelled' || code === 'Cancelled') return 'cancelled';
  if (code === 'NotSupported') return 'unsupported';
  if (code === 'NoCredentials' || code === 'NoCreateOption') return 'unavailable';
  return 'failed';
}
