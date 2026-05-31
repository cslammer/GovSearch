import { describe, it, expect } from 'vitest';
import {
  buildRows,
  flattenRows,
  minRows,
  rowArcRadius,
  rowCapacity,
  seatRadius,
  seatsPerRow,
} from './hemicycle';

describe('hemicycle geometry', () => {
  it('produces exactly N seats for the House (435) and Senate (100)', () => {
    for (const n of [435, 100, 1, 7, 50, 538]) {
      const { rows } = buildRows(n);
      expect(flattenRows(rows).length).toBe(n);
    }
  });

  it('seatsPerRow sums to exactly N and respects per-row capacity', () => {
    const n = 435;
    const nrows = minRows(n);
    const counts = seatsPerRow(n, nrows);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(n);
    counts.forEach((c, r) => expect(c).toBeLessThanOrEqual(rowCapacity(r, nrows)));
  });

  it('row radii increase monotonically outward', () => {
    const nrows = minRows(435);
    for (let r = 1; r < nrows; r++) {
      expect(rowArcRadius(r, nrows)).toBeGreaterThan(rowArcRadius(r - 1, nrows));
    }
  });

  it('all seats fall within the normalized annulus and upper half-plane', () => {
    const { rows, nrows } = buildRows(435);
    const seats = flattenRows(rows);
    const sr = seatRadius(nrows);
    for (const s of seats) {
      expect(s.angle).toBeGreaterThanOrEqual(0);
      expect(s.angle).toBeLessThanOrEqual(Math.PI);
      expect(s.y).toBeGreaterThanOrEqual(-1e-9); // upper half only
      // distance from annulus center (1,0) stays within [inner, outer]
      const dist = Math.hypot(s.x - 1, s.y);
      expect(dist).toBeGreaterThanOrEqual(0.5 - sr - 1e-6);
      expect(dist).toBeLessThanOrEqual(1.0 + sr + 1e-6);
    }
  });

  it('no two seats overlap (pairwise distance ≥ 2·seatRadius within a tolerance)', () => {
    const { rows, nrows } = buildRows(435);
    const seats = flattenRows(rows);
    const sr = seatRadius(nrows);
    // Compare within the same row and to the adjacent row — the only places
    // collisions can occur. (Full O(n^2) is fine at this size too.)
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        if (Math.abs(seats[i].row - seats[j].row) > 1) continue;
        const d = Math.hypot(seats[i].x - seats[j].x, seats[i].y - seats[j].y);
        expect(d).toBeGreaterThan(2 * sr - 1e-6);
      }
    }
  });

  it('within each row, seats are ordered rightmost→leftmost by angle', () => {
    const { rows } = buildRows(100);
    for (const row of rows) {
      for (let c = 1; c < row.length; c++) {
        expect(row[c].angle).toBeGreaterThan(row[c - 1].angle);
      }
    }
  });
});
