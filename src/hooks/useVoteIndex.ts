import { useQuery } from '@tanstack/react-query';
import type { Chamber, Member, RollCall, VoteIndex } from '../types';
import { config, CURRENT_CONGRESS, CURRENT_SESSION } from '../lib/config';
import { fetchHouseRollCalls } from '../lib/congressApi';
import { fetchSenateRollCalls, fetchSenateVoteMenu } from '../lib/senateApi';
import { buildVoteIndex } from '../lib/voteIndex';

const WINDOW = 60; // recent roll calls to sample

/**
 * One aggregating, concurrency-capped query per chamber. Builds the shared
 * bioguide→votes index read by every member panel. Tolerates partial failures.
 * Gated by `enabled` so it only runs once a panel needs it (keeps first paint fast).
 */
export function useVoteIndex(chamber: Chamber, members: Member[], enabled: boolean) {
  const available = chamber === 'house' ? config.votesConfigured : config.senateConfigured;

  return useQuery({
    queryKey: ['vote-index', chamber, CURRENT_CONGRESS, WINDOW],
    enabled: enabled && available,
    staleTime: Infinity,
    retry: 1,
    queryFn: async ({ signal }): Promise<VoteIndex> => {
      if (chamber === 'house') {
        return buildHouseIndex(signal);
      }
      const lisToBioguide = new Map<string, string>();
      for (const m of members) if (m.lisId) lisToBioguide.set(m.lisId, m.bioguide);
      return buildSenateIndex(lisToBioguide, signal);
    },
  });
}

/** Pull recent House roll calls, drawing from the current session then prior. */
async function buildHouseIndex(signal?: AbortSignal): Promise<VoteIndex> {
  // Try the current session first; if it has fewer than WINDOW votes, top up
  // from the previous session so the window is full early in a session.
  const sessions = CURRENT_SESSION > 1 ? [CURRENT_SESSION, CURRENT_SESSION - 1] : [1];
  const rollCalls: RollCall[] = [];
  let requested = 0;
  let failed = 0;

  for (const session of sessions) {
    if (rollCalls.length >= WINDOW) break;
    const need = WINDOW - rollCalls.length;
    const res = await fetchHouseRollCalls(CURRENT_CONGRESS, session, need, signal);
    rollCalls.push(...res.rollCalls);
    requested += res.requested;
    failed += res.failed;
  }

  return buildVoteIndex(rollCalls, {
    chamber: 'house',
    congress: CURRENT_CONGRESS,
    session: CURRENT_SESSION,
    requested,
    failed,
  });
}

async function buildSenateIndex(
  lisToBioguide: Map<string, string>,
  signal?: AbortSignal,
): Promise<VoteIndex> {
  const sessions = CURRENT_SESSION > 1 ? [CURRENT_SESSION, CURRENT_SESSION - 1] : [1];
  const menu: Awaited<ReturnType<typeof fetchSenateVoteMenu>> = [];
  for (const session of sessions) {
    if (menu.length >= WINDOW) break;
    try {
      const part = await fetchSenateVoteMenu(CURRENT_CONGRESS, session, signal);
      // Menu is newest-first already; take what we still need.
      menu.push(...part.slice(0, WINDOW - menu.length));
    } catch {
      // ignore a missing session menu
    }
  }

  const res = await fetchSenateRollCalls(menu, lisToBioguide, signal);
  return buildVoteIndex(res.rollCalls, {
    chamber: 'senate',
    congress: CURRENT_CONGRESS,
    session: CURRENT_SESSION,
    requested: res.requested,
    failed: res.failed,
  });
}
