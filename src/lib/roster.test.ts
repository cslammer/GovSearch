import { describe, it, expect } from 'vitest';
import { currentTerm, normalizeMember } from './roster';
import type { RawLegislator } from '../types';

const TODAY = new Date('2026-05-31');

function leg(over: Partial<RawLegislator> & { terms: RawLegislator['terms'] }): RawLegislator {
  return {
    id: { bioguide: 'X000001', ...(over.id ?? {}) },
    name: { first: 'Jane', last: 'Doe', ...(over.name ?? {}) },
    bio: over.bio,
    terms: over.terms,
    leadership_roles: over.leadership_roles,
  };
}

describe('currentTerm', () => {
  it('selects the term whose window contains today, not just the last array entry', () => {
    const terms = [
      { type: 'rep' as const, start: '2015-01-03', end: '2017-01-03', state: 'CA', district: 5 },
      { type: 'rep' as const, start: '2025-01-03', end: '2027-01-03', state: 'CA', district: 5 },
      // A stale future-looking placeholder that should NOT win over the active one.
      { type: 'rep' as const, start: '2017-01-03', end: '2019-01-03', state: 'CA', district: 5 },
    ];
    expect(currentTerm(terms, TODAY)?.start).toBe('2025-01-03');
  });

  it('falls back to latest start when none contains today', () => {
    const terms = [
      { type: 'sen' as const, start: '2005-01-03', end: '2011-01-03', state: 'NY' },
      { type: 'sen' as const, start: '2011-01-03', end: '2017-01-03', state: 'NY' },
    ];
    expect(currentTerm(terms, TODAY)?.start).toBe('2011-01-03');
  });
});

describe('normalizeMember', () => {
  it('normalizes a House Democrat with district', () => {
    const m = normalizeMember(
      leg({
        name: { first: 'Nancy', last: 'Pelosi', official_full: 'Nancy Pelosi' },
        terms: [
          { type: 'rep', start: '1987-06-02', end: '1989-01-03', state: 'CA', district: 5, party: 'Democrat' },
          { type: 'rep', start: '2025-01-03', end: '2027-01-03', state: 'CA', district: 11, party: 'Democrat' },
        ],
      }),
      TODAY,
    )!;
    expect(m.chamber).toBe('house');
    expect(m.party).toBe('D');
    expect(m.bloc).toBe('D');
    expect(m.state).toBe('CA');
    expect(m.stateName).toBe('California');
    expect(m.district).toBe(11);
    expect(m.fullName).toBe('Nancy Pelosi');
    expect(m.yearsInOffice).toBeGreaterThan(30);
    expect(m.photoThumb).toContain('225x275');
  });

  it('normalizes a Senator (no district, with rank)', () => {
    const m = normalizeMember(
      leg({
        terms: [
          { type: 'sen', start: '2021-01-03', end: '2027-01-03', state: 'TX', party: 'Republican', class: 2, state_rank: 'junior' },
        ],
      }),
      TODAY,
    )!;
    expect(m.chamber).toBe('senate');
    expect(m.party).toBe('R');
    expect(m.district).toBeNull();
    expect(m.senatorRank).toBe('junior');
  });

  it('folds an independent into its caucus bloc but keeps party=I', () => {
    const m = normalizeMember(
      leg({
        name: { first: 'Bernard', last: 'Sanders', official_full: 'Bernard Sanders' },
        terms: [
          { type: 'sen', start: '2025-01-03', end: '2031-01-03', state: 'VT', party: 'Independent', caucus: 'Democrat', class: 1 },
        ],
      }),
      TODAY,
    )!;
    expect(m.party).toBe('I');
    expect(m.isIndependent).toBe(true);
    expect(m.bloc).toBe('D');
  });

  it('handles an at-large district (0) and missing official_full', () => {
    const m = normalizeMember(
      leg({
        name: { first: 'Mary', last: 'Peltola' },
        terms: [{ type: 'rep', start: '2025-01-03', end: '2027-01-03', state: 'AK', district: 0, party: 'Democrat' }],
      }),
      TODAY,
    )!;
    expect(m.district).toBe(0);
    expect(m.fullName).toBe('Mary Peltola');
  });

  it('returns null for a legislator with no terms', () => {
    expect(normalizeMember(leg({ terms: [] }), TODAY)).toBeNull();
  });

  it('maps an unknown party string to Independent rather than crashing', () => {
    const m = normalizeMember(
      leg({ terms: [{ type: 'rep', start: '2025-01-03', end: '2027-01-03', state: 'NY', district: 1, party: 'Libertarian' }] }),
      TODAY,
    )!;
    expect(m.party).toBe('I');
    expect(m.bloc).toBe('D'); // caucus-less independent default
  });
});
