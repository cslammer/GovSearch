// Builds the shared bioguide→votes index from a set of fetched roll calls.
// One index is built per chamber and read O(1) by every member panel.

import type { Chamber, MemberVote, RollCall, VoteIndex } from '../types';

export interface VoteIndexMeta {
  chamber: Chamber;
  congress: number;
  session: number;
  requested: number;
  failed: number;
}

export function buildVoteIndex(rollCalls: RollCall[], meta: VoteIndexMeta): VoteIndex {
  // Plain object (not a Map) so it survives JSON persistence to localStorage.
  const byBioguide: Record<string, MemberVote[]> = {};

  // Most-recent first so each member's list reads newest → oldest.
  const sorted = [...rollCalls].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  for (const rc of sorted) {
    for (const pos of rc.positions) {
      const vote: MemberVote = {
        rollId: rc.rollId,
        chamber: rc.chamber,
        congress: rc.congress,
        session: rc.session,
        rollNumber: rc.rollNumber,
        voteCast: pos.voteCast,
        date: rc.date,
        question: rc.question,
        result: rc.result,
        legislationType: rc.legislationType,
        legislationNumber: rc.legislationNumber,
        title: rc.title,
      };
      const list = byBioguide[pos.bioguide];
      if (list) list.push(vote);
      else byBioguide[pos.bioguide] = [vote];
    }
  }

  const dates = sorted.map((rc) => rc.date).filter(Boolean);

  return {
    chamber: meta.chamber,
    congress: meta.congress,
    session: meta.session,
    byBioguide,
    rollCalls: sorted,
    loaded: rollCalls.length,
    requested: meta.requested,
    failed: meta.failed,
    windowEnd: dates[0],
    windowStart: dates[dates.length - 1],
  };
}

export function votesForMember(index: VoteIndex | undefined, bioguide: string): MemberVote[] {
  // Defensive: tolerate a malformed/absent index so a bad cache entry can never
  // crash the panel (it just shows "no votes" instead).
  const map = index?.byBioguide;
  if (!map || typeof map !== 'object') return [];
  return map[bioguide] ?? [];
}
