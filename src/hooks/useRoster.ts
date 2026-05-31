import { useQuery } from '@tanstack/react-query';
import type { Chamber, Member } from '../types';
import { fetchRoster } from '../lib/congressApi';
import { membersByChamber, normalizeRoster } from '../lib/roster';
import { config } from '../lib/config';
import { sampleRoster } from '../__fixtures__/sampleRoster';

/** Loads + normalizes the full roster once; the chart reads from this. */
export function useRoster() {
  return useQuery({
    queryKey: ['roster', config.useFixtures ? 'fixtures' : 'live'],
    staleTime: 1000 * 60 * 60 * 12,
    queryFn: async ({ signal }): Promise<Member[]> => {
      const raw = config.useFixtures ? sampleRoster() : await fetchRoster(signal);
      return normalizeRoster(raw);
    },
  });
}

/** Split a normalized roster by chamber, memo-friendly. */
export function selectChamber(members: Member[] | undefined, chamber: Chamber): Member[] {
  return members ? membersByChamber(members, chamber) : [];
}
