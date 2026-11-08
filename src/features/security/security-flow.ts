export type SecurityLoginMethod = 'passkey' | 'biometric-fallback' | 'unenrolled';
export type PasskeyErrorKind = 'cancelled' | 'unsupported' | 'unavailable' | 'configuration' | 'duplicate' | 'failed';

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
  if (code === 'CredentialAlreadyExists') return 'duplicate';
  // iOS refuses passkeys when the app isn't associated with the RP ID domain
  // (missing webcredentials entry or apple-app-site-association file).
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message)
    : '';
  if (code === 'BadConfiguration' || /not associated with domain|RP ID|relying party/i.test(message)) {
    return 'configuration';
  }
  return 'failed';
}
