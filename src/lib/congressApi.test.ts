import { describe, it, expect } from 'vitest';
import { billWebUrl, normalizeVoteCast, pickSummary } from './congressApi';

describe('normalizeVoteCast', () => {
  it('maps Congress.gov vote strings to our VoteCast', () => {
    expect(normalizeVoteCast('Aye')).toBe('Yea');
    expect(normalizeVoteCast('yea')).toBe('Yea');
    expect(normalizeVoteCast('No')).toBe('Nay');
    expect(normalizeVoteCast('Nay')).toBe('Nay');
    expect(normalizeVoteCast('Present')).toBe('Present');
    expect(normalizeVoteCast(undefined)).toBe('Not Voting');
    expect(normalizeVoteCast('')).toBe('Not Voting');
  });
});

describe('billWebUrl', () => {
  it('builds congress.gov links by bill type', () => {
    expect(billWebUrl(119, 'hr', '100')).toBe('https://www.congress.gov/bill/119th-congress/house-bill/100');
    expect(billWebUrl(119, 'S', '42')).toBe('https://www.congress.gov/bill/119th-congress/senate-bill/42');
    expect(billWebUrl(119, 'hjres', '5')).toBe(
      'https://www.congress.gov/bill/119th-congress/house-joint-resolution/5',
    );
  });
});

describe('pickSummary', () => {
  it('selects the most recent summary that has text', () => {
    const s = pickSummary(
      [
        { text: '<p>Old.</p>', actionDate: '2025-01-01' },
        { text: '<p>New.</p>', actionDate: '2025-03-01' },
        { text: '', actionDate: '2025-04-01' },
      ],
      'http://x',
    );
    expect(s?.text).toBe('<p>New.</p>');
    expect(s?.url).toBe('http://x');
  });

  it('returns null when there are no summaries', () => {
    expect(pickSummary([], 'http://x')).toBeNull();
  });
});
