import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (staleTime is how long queries stay fresh)
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (gcTime replaces cacheTime in TanStack Query v5)
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

export const QUERY_PERSIST_KEY = 'MEMENTO_OFFLINE_CACHE';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_PERSIST_KEY,
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === 'success',
  },
});

export async function clearPersistedQueryCache() {
  await AsyncStorage.removeItem(QUERY_PERSIST_KEY);
}
