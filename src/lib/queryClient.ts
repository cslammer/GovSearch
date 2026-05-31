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

// Bump this when the cached data SHAPE changes so old, incompatible entries are
// discarded instead of crashing the app. (v2: VoteIndex.byBioguide is now a
// plain object; a v1 entry persisted a Map that JSON turned into {}.)
const CACHE_KEY = 'hemicycle-cache-v2';

// Passed to PersistQueryClientProvider as `buster`: a version mismatch makes it
// drop the persisted cache instead of rehydrating an incompatible shape.
export const CACHE_BUSTER = 'v2';

// Proactively clear the old v1 cache so no stale Map-shaped entry lingers.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('hemicycle-cache');
  } catch {
    /* ignore storage access errors */
  }
}

export const persister =
  typeof window !== 'undefined'
    ? createSyncStoragePersister({ storage: window.localStorage, key: CACHE_KEY })
    : undefined;
