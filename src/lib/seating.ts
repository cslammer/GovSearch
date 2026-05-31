// ─────────────────────────────────────────────────────────────────────────────
// seating.ts — map Congress members onto hemicycle seats with:
//   • Democrats on one side of the aisle, Republicans on the other.
//   • Independents seated within the party they caucus with (neutral ring).
//   • Within each party, members clustered by state (a delegation = one wedge).
//
// HOW THE LAYOUT GUARANTEES TIDY, RADIAL STATE WEDGES
// ----------------------------------------------------
// We build an ordered member list M (far-right → far-left across the arc), then
// sort the geometric seats by angle and assign seat[i] ← M[i].
//
// Why this is clean (not the zig-zag a naive flat sort might suggest):
//   Because seats are sorted purely by angle, every "group boundary" is a single
//   threshold angle θ. A state delegation therefore occupies the set
//   { seats : θ_a ≤ angle < θ_b } — a pizza-slice WEDGE whose left/right edges
//   are radial lines (constant angle) across *all* rows. Contiguity and exact
//   per-state counts are guaranteed by construction (1 seat ↔ 1 member).
//
// ORDER OF M (so the result is mirrored and intuitive):
//   Republicans occupy the small-angle (right) half; within them states run
//   reverse-alphabetically so the *aisle-side* state is Alabama and the far
//   right is Wyoming. Democrats occupy the large-angle (left) half; states run
//   alphabetically from the aisle outward. Net: both parties show Alabama by the
//   aisle and Wyoming at the far edge — a mirror image.
//
// A small angular AISLE GAP is opened after assignment by gently compressing
// each party's seats away from the centre (see openAisleGap).
// ─────────────────────────────────────────────────────────────────────────────

import type { Bloc, Member } from '../types';
import { buildRows, flattenRows, rowArcRadius, seatRadius, type SeatPoint } from './hemicycle';

export interface PlacedSeat extends SeatPoint {
  member: Member;
  bloc: Bloc;
}

export interface StateWedge {
  bloc: Bloc;
  state: string;
  stateName: string;
  count: number;
  centroidX: number;
  centroidY: number;
  centroidAngle: number;
  minAngle: number;
  maxAngle: number;
  /** Angular width of the wedge (radians) — used to de-clutter labels. */
  angularSpan: number;
}

export interface SeatingLayout {
  seats: PlacedSeat[];
  wedges: StateWedge[];
  nrows: number;
  seatR: number;
  /** Angle (radians) of the centre aisle, for drawing the divider. */
  aisleAngle: number;
  /** Members actually seated. */
  count: number;
}

/** Earlier first-term start = more senior → sorts first. */
function bySeniority(a: Member, b: Member): number {
  if (a.firstTermStart !== b.firstTermStart) {
    return a.firstTermStart < b.firstTermStart ? -1 : 1;
  }
  return a.lastName.localeCompare(b.lastName);
}

/**
 * Order one party's members for arc placement.
 * @param dir 'asc'  → states A→Z (Democrats: aisle→left edge)
 *            'desc' → states Z→A (Republicans: right edge→aisle)
 */
function orderBloc(members: Member[], dir: 'asc' | 'desc'): Member[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...members].sort((a, b) => {
    const s = a.stateName.localeCompare(b.stateName);
    if (s !== 0) return sign * s;
    return bySeniority(a, b);
  });
}

/**
 * Open a small aisle gap by compressing each party's seats toward its outer
 * edge, away from the centre. Mutates angle/x/y of the given seats in place.
 */
function openAisleGap(seats: PlacedSeat[], nrows: number, aisle: number, gap = 0.05): void {
  const half = gap / 2;
  const rs = seats.filter((s) => s.bloc === 'R');
  const ds = seats.filter((s) => s.bloc === 'D');

  const remap = (group: PlacedSeat[], lo: number, hi: number, newLo: number, newHi: number) => {
    const span = hi - lo;
    if (group.length === 0 || span <= 1e-9) return;
    const scale = (newHi - newLo) / span;
    for (const s of group) {
      const a = newLo + (s.angle - lo) * scale;
      const radius = rowArcRadius(s.row, nrows);
      s.angle = a;
      s.x = 1 + radius * Math.cos(a);
      s.y = radius * Math.sin(a);
    }
  };

  if (rs.length) {
    const lo = Math.min(...rs.map((s) => s.angle));
    const hi = Math.max(...rs.map((s) => s.angle));
    // Keep the far-right edge; pull the aisle edge left by `half`.
    remap(rs, lo, hi, lo, Math.min(hi, aisle - half));
  }
  if (ds.length) {
    const lo = Math.min(...ds.map((s) => s.angle));
    const hi = Math.max(...ds.map((s) => s.angle));
    // Keep the far-left edge; push the aisle edge right by `half`.
    remap(ds, lo, hi, Math.max(lo, aisle + half), hi);
  }
}

/** Build per-(bloc,state) wedge metadata from placed seats. */
function buildWedges(seats: PlacedSeat[]): StateWedge[] {
  const groups = new Map<string, PlacedSeat[]>();
  for (const s of seats) {
    const key = `${s.bloc}:${s.member.state}`;
    const arr = groups.get(key);
    if (arr) arr.push(s);
    else groups.set(key, [s]);
  }

  const wedges: StateWedge[] = [];
  for (const arr of groups.values()) {
    const angles = arr.map((s) => s.angle);
    const minAngle = Math.min(...angles);
    const maxAngle = Math.max(...angles);
    wedges.push({
      bloc: arr[0].bloc,
      state: arr[0].member.state,
      stateName: arr[0].member.stateName,
      count: arr.length,
      centroidX: arr.reduce((s, p) => s + p.x, 0) / arr.length,
      centroidY: arr.reduce((s, p) => s + p.y, 0) / arr.length,
      centroidAngle: angles.reduce((a, b) => a + b, 0) / angles.length,
      minAngle,
      maxAngle,
      angularSpan: maxAngle - minAngle,
    });
  }
  // Sort by angle so labels can be placed left→right deterministically.
  wedges.sort((a, b) => a.centroidAngle - b.centroidAngle);
  return wedges;
}

/**
 * Compute the full seating layout for a set of members.
 * One seat per member (vacant chamber slots are simply not drawn).
 */
export function computeSeating(members: Member[]): SeatingLayout {
  const republicans = orderBloc(
    members.filter((m) => m.bloc === 'R'),
    'desc',
  );
  const democrats = orderBloc(
    members.filter((m) => m.bloc === 'D'),
    'asc',
  );

  // M sweeps the arc from angle 0 (far right) to π (far left).
  const ordered = [...republicans, ...democrats];
  const n = ordered.length;

  if (n === 0) {
    return { seats: [], wedges: [], nrows: 0, seatR: 0, aisleAngle: Math.PI / 2, count: 0 };
  }

  const { rows, nrows } = buildRows(n);
  const geomSeats = flattenRows(rows).sort((a, b) => a.angle - b.angle);

  const seats: PlacedSeat[] = geomSeats.map((seat, i) => ({
    ...seat,
    member: ordered[i],
    bloc: ordered[i].bloc,
  }));

  // The aisle sits between the last Republican seat and the first Democrat seat.
  const rAngles = seats.filter((s) => s.bloc === 'R').map((s) => s.angle);
  const dAngles = seats.filter((s) => s.bloc === 'D').map((s) => s.angle);
  let aisleAngle: number;
  if (rAngles.length && dAngles.length) {
    aisleAngle = (Math.max(...rAngles) + Math.min(...dAngles)) / 2;
  } else if (rAngles.length) {
    aisleAngle = Math.max(...rAngles) + 0.02;
  } else {
    aisleAngle = Math.min(...dAngles) - 0.02;
  }

  openAisleGap(seats, nrows, aisleAngle);

  return {
    seats,
    wedges: buildWedges(seats),
    nrows,
    seatR: seatRadius(nrows),
    aisleAngle,
    count: n,
  };
}
