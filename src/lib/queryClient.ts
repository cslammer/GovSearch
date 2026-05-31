import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Votes and bill summaries are effectively immutable once recorded, so we cache
// hard and persist to localStorage — a revisit is instant and saves API budget.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const persister =
  typeof window !== 'undefined'
    ? createSyncStoragePersister({ storage: window.localStorage, key: 'hemicycle-cache' })
    : undefined;
