export function shouldInitializeNotifications(hydrated: boolean, hasToken: boolean) {
  return hydrated && hasToken;
}

export function shouldSyncPushToken(
  currentToken: string | null,
  lastSyncedToken: string | null,
) {
  return Boolean(currentToken && currentToken !== lastSyncedToken);
}
