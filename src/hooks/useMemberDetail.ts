import { useQuery } from '@tanstack/react-query';
import { config } from '../lib/config';
import { fetchMemberDetail } from '../lib/congressApi';

/** Optional Congress.gov enrichment (sponsored counts, official URL). */
export function useMemberDetail(bioguide: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['member-detail', bioguide],
    enabled: enabled && config.votesConfigured && !!bioguide,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
    queryFn: ({ signal }) => fetchMemberDetail(bioguide!, signal),
  });
}
