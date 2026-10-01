import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  PERSIST_MAX_AGE_MS,
  QUERY_GC_TIME_MS,
  persistedQueryPrefixes,
  shouldPersistQuery,
} from './query-persistence';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (staleTime is how long queries stay fresh)
      // Release unused data after 10 minutes so the cache doesn't grow all session.
      gcTime: QUERY_GC_TIME_MS,
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.response?.status;
        if (status === 401 || status === 403) {
          return false;
        }
        return failureCount < 1;
      },
      networkMode: 'offlineFirst',
    },
  },
});

// Saved queries keep their data as long as the saved cache does, so data
// restored at launch isn't released before a screen uses it.
for (const prefix of persistedQueryPrefixes()) {
  queryClient.setQueryDefaults(prefix, { gcTime: PERSIST_MAX_AGE_MS });
}

export const QUERY_PERSIST_KEY = 'MEMENTO_OFFLINE_CACHE';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_PERSIST_KEY,
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && shouldPersistQuery(query.queryKey),
  },
});

export async function clearPersistedQueryCache() {
  await AsyncStorage.removeItem(QUERY_PERSIST_KEY);
}
