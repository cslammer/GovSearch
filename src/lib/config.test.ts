import { describe, it, expect } from 'vitest';
import { congressForDate, sessionForDate, voteSessionsNewestFirst } from './config';

describe('congress/session derivation', () => {
  it('derives the 119th Congress for 2025–2026', () => {
    expect(congressForDate(new Date('2025-06-01'))).toBe(119);
    expect(congressForDate(new Date('2026-05-31'))).toBe(119);
  });

  it('derives sessions by year parity within a Congress', () => {
    expect(sessionForDate(new Date('2025-06-01'))).toBe(1); // first year
    expect(sessionForDate(new Date('2026-05-31'))).toBe(2); // second year
  });

  it('rolls to the 120th Congress in 2027', () => {
    expect(congressForDate(new Date('2027-01-10'))).toBe(120);
    expect(sessionForDate(new Date('2027-01-10'))).toBe(1);
  });
});

describe('voteSessionsNewestFirst', () => {
  it('walks newest-first from the current session back to the 118th Congress', () => {
    // Mid-119th, 2nd session.
    expect(voteSessionsNewestFirst(119, 2)).toEqual([
      [119, 2],
      [119, 1],
      [118, 2],
      [118, 1],
    ]);
  });

  it('starts at the current session (does not invent a future session)', () => {
    // Early in the 119th, 1st session — must not include [119, 2].
    expect(voteSessionsNewestFirst(119, 1)).toEqual([
      [119, 1],
      [118, 2],
      [118, 1],
    ]);
  });

  it('never walks earlier than the data floor (118th Congress)', () => {
    const pairs = voteSessionsNewestFirst(120, 1);
    expect(pairs[0]).toEqual([120, 1]);
    expect(pairs.every(([c]) => c >= 118)).toBe(true);
    expect(pairs.some(([c]) => c === 117)).toBe(false);
  });
});
