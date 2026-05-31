import { describe, it, expect } from 'vitest';
import { stripHtml, summarize } from './summarize';
import { ordinal } from './ordinal';

describe('stripHtml', () => {
  it('removes tags and decodes entities', () => {
    expect(stripHtml('<p>Tom &amp; Jerry&#8217;s <b>bill</b></p>')).toBe("Tom & Jerry’s bill");
  });
  it('collapses whitespace', () => {
    expect(stripHtml('<p>a</p>\n   <p>b</p>')).toBe('a b');
  });
});

describe('summarize', () => {
  it('keeps to roughly one or two sentences', () => {
    const html =
      '<p>This bill establishes a new grant program. It authorizes funding through 2030. A third sentence adds detail that should be dropped.</p>';
    const out = summarize(html, 2);
    expect(out).toContain('grant program');
    expect(out).toContain('2030');
    expect(out).not.toContain('third sentence');
  });

  it('truncates very long single sentences on a word boundary with an ellipsis', () => {
    const long = '<p>' + 'word '.repeat(200) + '</p>';
    const out = summarize(long, 2, 80);
    expect(out.length).toBeLessThanOrEqual(82);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/wor…$/); // not cut mid-word
  });

  it('returns empty string for empty input', () => {
    expect(summarize('')).toBe('');
  });
});

describe('ordinal', () => {
  it('handles common and edge cases', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(112)).toBe('112th');
  });
});
