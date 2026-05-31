import { describe, it, expect } from 'vitest';
import { computeSeating } from './seating';
import { makeMember, makeRoster } from '../__fixtures__/members';

describe('computeSeating', () => {
  it('places exactly one seat per member, each member once', () => {
    const members = makeRoster({ CA: [10, 4], TX: [3, 12], NY: [8, 2], WY: [0, 1] });
    const { seats, count } = computeSeating(members);
    expect(seats.length).toBe(members.length);
    expect(count).toBe(members.length);
    const ids = new Set(seats.map((s) => s.member.bioguide));
    expect(ids.size).toBe(members.length);
  });

  it('separates the parties: every Republican seat is right of every Democrat seat', () => {
    const members = makeRoster({ CA: [10, 4], TX: [3, 12], NY: [8, 2] });
    const { seats } = computeSeating(members);
    const maxR = Math.max(...seats.filter((s) => s.bloc === 'R').map((s) => s.angle));
    const minD = Math.min(...seats.filter((s) => s.bloc === 'D').map((s) => s.angle));
    // Republicans occupy smaller angles (right); a gap separates them.
    expect(maxR).toBeLessThan(minD);
  });

  it('keeps every state delegation contiguous (one run per bloc+state along the arc)', () => {
    const members = makeRoster({
      CA: [12, 5],
      TX: [4, 14],
      NY: [10, 3],
      FL: [6, 9],
      MA: [4, 0],
      WY: [0, 1],
      VT: [1, 0],
    });
    const { seats } = computeSeating(members);
    const ordered = [...seats].sort((a, b) => a.angle - b.angle);
    const labels = ordered.map((s) => `${s.bloc}:${s.member.state}`);

    // Each label must appear in exactly one contiguous run.
    const seen = new Set<string>();
    let prev = '';
    for (const label of labels) {
      if (label !== prev) {
        expect(seen.has(label)).toBe(false); // never revisit → contiguous
        seen.add(label);
        prev = label;
      }
    }
  });

  it('handles a mega-delegation as a single contiguous wedge', () => {
    const members = makeRoster({ CA: [40, 0], TX: [0, 25], NY: [15, 0] });
    const { seats, wedges } = computeSeating(members);
    const ca = wedges.find((w) => w.state === 'CA' && w.bloc === 'D');
    expect(ca?.count).toBe(40);
    // All CA seats fall within the wedge's [minAngle, maxAngle] and no other
    // state's seats intrude into that band.
    const caBand = seats.filter((s) => s.member.state === 'CA');
    const lo = Math.min(...caBand.map((s) => s.angle));
    const hi = Math.max(...caBand.map((s) => s.angle));
    const intruders = seats.filter(
      (s) => s.member.state !== 'CA' && s.angle > lo && s.angle < hi,
    );
    expect(intruders.length).toBe(0);
  });

  it('seats an independent within its caucus bloc but preserves party=I', () => {
    const members = [
      ...makeRoster({ CA: [4, 0], TX: [0, 4] }),
      makeMember({ state: 'VT', stateName: 'VT', party: 'I', bloc: 'D', isIndependent: true }),
    ];
    const { seats } = computeSeating(members);
    const ind = seats.find((s) => s.member.party === 'I');
    expect(ind).toBeDefined();
    expect(ind!.bloc).toBe('D');
    // It sits on the Democratic side.
    const minD = Math.min(...seats.filter((s) => s.bloc === 'D').map((s) => s.angle));
    const maxR = Math.max(...seats.filter((s) => s.bloc === 'R').map((s) => s.angle));
    expect(ind!.angle).toBeGreaterThan(maxR);
    expect(ind!.angle).toBeGreaterThanOrEqual(minD - 1e-9);
  });

  it('does not crash on an all-one-party chamber', () => {
    const members = makeRoster({ CA: [5, 0], NY: [3, 0] });
    const { seats, wedges } = computeSeating(members);
    expect(seats.length).toBe(8);
    expect(seats.every((s) => s.bloc === 'D')).toBe(true);
    expect(wedges.length).toBe(2);
  });

  it('returns empty layout for no members', () => {
    const { seats, count } = computeSeating([]);
    expect(seats.length).toBe(0);
    expect(count).toBe(0);
  });

  it('produces full-size chambers without overlap collapse (House 435, Senate 100)', () => {
    for (const size of [435, 100]) {
      const half = Math.floor(size / 2);
      const members = makeRoster({ CA: [half, 0], TX: [0, size - half] });
      const { seats } = computeSeating(members);
      expect(seats.length).toBe(size);
    }
  });
});
