export type PermissionRecoveryAction = 'retry' | 'settings';

export type PermissionLike = {
  granted?: boolean | null;
  status?: string | null;
  canAskAgain?: boolean | null;
  accessPrivileges?: string | null;
};

export function isPermissionGranted(permission: PermissionLike | null | undefined): boolean {
  return Boolean(
    permission?.granted === true ||
    permission?.status === 'granted' ||
    permission?.status === 'limited' ||
    permission?.accessPrivileges === 'limited',
  );
}

export function getPermissionRecoveryAction(
  permission: PermissionLike | null | undefined,
): PermissionRecoveryAction {
  return permission?.canAskAgain === false ? 'settings' : 'retry';
}
