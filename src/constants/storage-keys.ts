export const storageKeys = {
  attachments: 'memento.attachments',
  auth: 'memento:auth',
  listmode: 'memento.listmode',
  recentMemories: 'memento.recent-memories',
  welcomeOnce: 'memento.welcome-once',
  onboardingState: 'memento.onboarding_state',
  syncedPushToken: 'memento.synced_push_token',

  // ── Biometric login (interim — stores refresh_token, NOT password) ─────────
  // v2 upgrade path: replace with native WebAuthn passkeys once the app-link
  // association files are live on app.mymemento.io.
  biometricsEnabled: 'memento.biometrics_enabled',
  biometricsEmail: 'memento.biometrics_email',
  biometricsRefreshToken: 'memento.biometrics_refresh_token',
} as const;
