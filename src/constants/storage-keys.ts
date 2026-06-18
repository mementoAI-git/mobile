export const storageKeys = {
  attachments: 'memento.attachments',
  auth: 'memento:auth',
  listmode: 'memento.listmode',
  recentMemories: 'memento.recent-memories',
  welcomeOnce: 'memento.welcome-once',
  onboardingState: 'memento.onboarding_state',

  // ── Biometric login (interim — stores refresh_token, NOT password) ─────────
  // v2 upgrade path: replace with native WebAuthn passkeys once domain
  // .well-known association files are deployed. See TODO.md.
  biometricsEnabled: 'memento.biometrics_enabled',
  biometricsEmail: 'memento.biometrics_email',
  biometricsRefreshToken: 'memento.biometrics_refresh_token',
} as const;
