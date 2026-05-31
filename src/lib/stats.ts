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

// ── Per-roll-call tallies (for the expanded vote row) ────────────────────────

export interface PartySplit {
  yea: number;
  nay: number;
}

export interface RollCallTally {
  /** Members with a recorded position. */
  total: number;
  yea: number;
  nay: number;
  present: number;
  notVoting: number;
  /** Yea/Nay counts broken down by party. */
  party: { D: PartySplit; R: PartySplit; I: PartySplit };
  /** Which party cast the most "Yea" votes: 'D' | 'R' | 'tie' | null (no Yea). */
  yeaMajorityParty: 'D' | 'R' | 'tie' | null;
}

/** Tally a roll call's positions: overall counts + per-party Yea/Nay split. */
export function tallyRollCall(rc: RollCall): RollCallTally {
  const t: RollCallTally = {
    total: 0,
    yea: 0,
    nay: 0,
    present: 0,
    notVoting: 0,
    party: { D: { yea: 0, nay: 0 }, R: { yea: 0, nay: 0 }, I: { yea: 0, nay: 0 } },
    yeaMajorityParty: null,
  };
  for (const p of rc.positions) {
    t.total += 1;
    if (p.voteCast === 'Yea') {
      t.yea += 1;
      t.party[p.party].yea += 1;
    } else if (p.voteCast === 'Nay') {
      t.nay += 1;
      t.party[p.party].nay += 1;
    } else if (p.voteCast === 'Present') {
      t.present += 1;
    } else {
      t.notVoting += 1;
    }
  }
  const dy = t.party.D.yea;
  const ry = t.party.R.yea;
  t.yeaMajorityParty = t.yea === 0 ? null : dy > ry ? 'D' : ry > dy ? 'R' : 'tie';
  return t;
}
