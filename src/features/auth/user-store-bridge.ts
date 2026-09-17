import type { IUser } from '@/types';

export interface UserStoreBridgeTarget {
  getState: () => { user: IUser | null; updateUser: (user: IUser) => void };
  <T>(selector: (state: any) => T): T;
}

export interface UserStoreProxyState {
  user: IUser | null;
  setUser: (user: IUser) => void;
  clearUser: () => void;
}

/**
 * Creates a compatibility proxy delegating all user reads/writes directly
 * to the authoritative auth store target.
 */
export function createUserStoreBridge(targetStore: UserStoreBridgeTarget) {
  return Object.assign(
    <T>(selector: (state: UserStoreProxyState) => T): T => {
      const user = targetStore((s: any) => s.user);
      const updateUser = targetStore((s: any) => s.updateUser);
      return selector({
        user,
        setUser: updateUser,
        clearUser: () => {},
      });
    },
    {
      getState: (): UserStoreProxyState => ({
        user: targetStore.getState().user,
        setUser: (user: IUser) => targetStore.getState().updateUser(user),
        clearUser: () => {},
      }),
    },
  );
}
