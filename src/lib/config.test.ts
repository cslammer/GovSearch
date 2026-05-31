import { describe, it, expect } from 'vitest';
import { congressForDate, sessionForDate } from './config';

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
