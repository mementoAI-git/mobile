import { createUserStoreBridge, type UserStoreProxyState } from '@/features/auth/user-store-bridge';
import { useAuthStore } from './auth.store';

export type { UserStoreProxyState };

/**
 * Compatibility proxy delegating directly to authoritative useAuthStore.user.
 * Prevents dual-store identity drift while preserving existing call-sites.
 */
export const useUserStore = createUserStoreBridge(useAuthStore as any);
