// ─────────────────────────────────────────────────────────────────────────────
// stats.ts — voting statistics computed over a RECENT WINDOW of roll-call votes
// (not a lifetime record). All figures are honest about their denominator and
// the window they cover; the UI labels them accordingly.
// ─────────────────────────────────────────────────────────────────────────────

import type { Member, MemberStats, MemberVote, RollCall, VoteCast, VotePosition } from '../types';

/** Majority Yea/Nay among a set of positions; null on a tie or no votes. */
function majority(positions: VotePosition[]): 'Yea' | 'Nay' | null {
  let yea = 0;
  let nay = 0;
  for (const p of positions) {
    if (p.voteCast === 'Yea') yea += 1;
    else if (p.voteCast === 'Nay') nay += 1;
  }
  if (yea === 0 && nay === 0) return null;
  if (yea === nay) return null;
  return yea > nay ? 'Yea' : 'Nay';
}

const COUNTS_AS_CAST: Record<VoteCast, boolean> = {
  Yea: true,
  Nay: true,
  Present: true, // a recorded Present IS participation
  'Not Voting': false,
};

/**
 * Participation = cast / eligible, where:
 *   • eligible = roll calls in which the member appears (i.e. could vote)
 *   • cast     = Yea + Nay + Present  ("Not Voting" counts against)
 *
 * Party unity = of the *party-split* votes (D majority opposed R majority) the
 * member cast a Yea/Nay on, the share where they sided with their own bloc.
 * Computed against the caucus bloc for independents.
 */
export function computeStats(
  member: Member,
  memberVotes: MemberVote[],
  rollCalls: RollCall[],
  windowLabel: string,
): MemberStats {
  const eligible = memberVotes.length;
  if (eligible === 0) {
    return {
      participationPct: null,
      eligibleVotes: 0,
      castVotes: 0,
      missedVotes: 0,
      partyUnityPct: null,
      partyVotesConsidered: 0,
      windowLabel,
    };
  }

  let cast = 0;
  for (const v of memberVotes) if (COUNTS_AS_CAST[v.voteCast]) cast += 1;
  const missed = eligible - cast;

  const rcById = new Map(rollCalls.map((rc) => [rc.rollId, rc]));
  let partyVotes = 0;
  let withParty = 0;
  for (const v of memberVotes) {
    if (v.voteCast !== 'Yea' && v.voteCast !== 'Nay') continue;
    const rc = rcById.get(v.rollId);
    if (!rc) continue;
    const dMaj = majority(rc.positions.filter((p) => p.party === 'D'));
    const rMaj = majority(rc.positions.filter((p) => p.party === 'R'));
    if (!dMaj || !rMaj || dMaj === rMaj) continue; // not a party-split vote
    partyVotes += 1;
    const blocMaj = member.bloc === 'D' ? dMaj : rMaj;
    if (v.voteCast === blocMaj) withParty += 1;
  }

  return {
    participationPct: cast / eligible,
    eligibleVotes: eligible,
    castVotes: cast,
    missedVotes: missed,
    partyUnityPct: partyVotes > 0 ? withParty / partyVotes : null,
    partyVotesConsidered: partyVotes,
    windowLabel,
  };
}

export function formatPct(pct: number | null): string {
  if (pct === null) return '—';
  return `${Math.round(pct * 100)}%`;
}
