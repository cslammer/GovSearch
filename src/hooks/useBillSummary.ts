import { useQuery } from '@tanstack/react-query';
import { config } from '../lib/config';
import { fetchBillSummary } from '../lib/congressApi';

/**
 * Lazily fetch a bill's plain-language summary (only when a vote row expands).
 * Cached per bill; summaries are effectively immutable.
 */
export function useBillSummary(
  congress: number | undefined,
  type: string | undefined,
  number: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['bill-summary', congress, type, number],
    enabled: enabled && config.votesConfigured && !!congress && !!type && !!number,
    staleTime: Infinity,
    retry: 1,
    queryFn: ({ signal }) => fetchBillSummary(congress!, type!, number!, signal),
  });
}
