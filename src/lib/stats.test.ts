import { describe, it, expect } from 'vitest';
import { computeStats, formatPct } from './stats';
import { buildVoteIndex, votesForMember } from './voteIndex';
import type { RollCall, VoteCast, VotePosition } from '../types';
import { makeMember } from '../__fixtures__/members';

function rc(rollNumber: number, positions: [string, VoteCast, 'D' | 'R' | 'I'][]): RollCall {
  return {
    rollId: `H-119-1-${rollNumber}`,
    chamber: 'house',
    congress: 119,
    session: 1,
    rollNumber,
    date: `2025-02-${String(rollNumber).padStart(2, '0')}`,
    question: 'On Passage',
    result: 'Passed',
    legislationType: 'hr',
    legislationNumber: String(100 + rollNumber),
    positions: positions.map(([bioguide, voteCast, party]) => ({ bioguide, voteCast, party }) as VotePosition),
  };
}

describe('buildVoteIndex', () => {
  it('indexes positions by bioguide, newest first', () => {
    const rolls = [
      rc(1, [['A', 'Yea', 'D'], ['B', 'Nay', 'R']]),
      rc(2, [['A', 'Nay', 'D'], ['B', 'Yea', 'R']]),
    ];
    const idx = buildVoteIndex(rolls, { chamber: 'house', congress: 119, session: 1, requested: 2, failed: 0 });
    const a = votesForMember(idx, 'A');
    expect(a.length).toBe(2);
    expect(a[0].rollNumber).toBe(2); // newest first
    expect(idx.windowEnd).toBe('2025-02-02');
    expect(idx.windowStart).toBe('2025-02-01');
  });
});

describe('computeStats', () => {
  const dem = makeMember({ bioguide: 'A', party: 'D', bloc: 'D' });

  // Bioguides: A = our member (D). D1/D2 other Democrats; R1/R2 Republicans.
  const rolls = [
    // Roll 1 — party split (D-maj Yea vs R-maj Nay); A votes with its bloc.
    rc(1, [['A', 'Yea', 'D'], ['D1', 'Yea', 'D'], ['R1', 'Nay', 'R'], ['R2', 'Nay', 'R']]),
    // Roll 2 — party split (D-maj Yea: D1,D2 outvote A); A votes against its bloc.
    rc(2, [['A', 'Nay', 'D'], ['D1', 'Yea', 'D'], ['D2', 'Yea', 'D'], ['R1', 'Nay', 'R'], ['R2', 'Nay', 'R']]),
    // Roll 3 — bipartisan (both majorities Yea, not a split); A missed (Not Voting).
    rc(3, [['A', 'Not Voting', 'D'], ['D1', 'Yea', 'D'], ['R1', 'Yea', 'R'], ['R2', 'Yea', 'R']]),
    // Roll 4 — not a party split; A is Present (counts as cast, not as Yea/Nay).
    rc(4, [['A', 'Present', 'D'], ['D1', 'Yea', 'D'], ['R1', 'Yea', 'R'], ['R2', 'Yea', 'R']]),
  ];

  it('computes participation counting Present as cast and Not Voting as missed', () => {
    const idx = buildVoteIndex(rolls, { chamber: 'house', congress: 119, session: 1, requested: 4, failed: 0 });
    const stats = computeStats(dem, votesForMember(idx, 'A'), idx.rollCalls, 'last 4 votes');
    expect(stats.eligibleVotes).toBe(4);
    expect(stats.castVotes).toBe(3); // Yea, Nay, Present
    expect(stats.missedVotes).toBe(1); // Not Voting
    expect(stats.participationPct).toBeCloseTo(0.75);
  });

  it('computes party unity only over party-split votes the member cast', () => {
    const idx = buildVoteIndex(rolls, { chamber: 'house', congress: 119, session: 1, requested: 4, failed: 0 });
    const stats = computeStats(dem, votesForMember(idx, 'A'), idx.rollCalls, 'last 4 votes');
    // Roll 1: D-maj Yea, A Yea → with party. Roll 2: D-maj Yea, A Nay → against.
    // Roll 3: bipartisan (not party split). Roll 4: A Present (not Yea/Nay).
    expect(stats.partyVotesConsidered).toBe(2);
    expect(stats.castVotes).toBe(3);
    expect(stats.partyUnityPct).toBeCloseTo(0.5);
  });

  it('returns nulls when the member has no votes', () => {
    const stats = computeStats(dem, [], [], 'no data');
    expect(stats.participationPct).toBeNull();
    expect(stats.partyUnityPct).toBeNull();
  });
});

describe('formatPct', () => {
  it('formats and handles null', () => {
    expect(formatPct(0.873)).toBe('87%');
    expect(formatPct(null)).toBe('—');
  });
});
