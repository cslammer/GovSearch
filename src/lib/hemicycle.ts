// ─────────────────────────────────────────────────────────────────────────────
// hemicycle.ts — geometry for a classic semicircular parliament seating chart.
//
// The approach follows the "parliamentarch" model (the math behind Wikipedia's
// parliament diagrams). We lay seats out in an *annulus* (a ring between two
// concentric semicircles) cut in half along its diameter, with the flat edge at
// the bottom.
//
// COORDINATE SYSTEM (all normalized; the SVG scales this up via a viewBox):
//   • The annulus is centered at (1, 0).
//   • x ∈ [0, 2], y ∈ [0, 1]  → the whole thing fits a 2:1 box, flat edge on y=0.
//   • Angles are measured from the +x axis, CCW:
//         angle = 0   → rightmost seat   (viewer's right)
//         angle = π/2 → top-center seat
//         angle = π   → leftmost seat    (viewer's left)
//
// KEY INVARIANT (parliamentarch):
//   rowThickness = 1 / (4*nrows - 2)
//   The inner radius is 0.5 and the outer radius is 1.0 (outer = 2 × inner).
//   With this thickness, seat circles of radius (rowThickness/2) packed on each
//   row's mid-arc never overflow the inner or outer boundary of the annulus, and
//   adjacent rows don't collide. Row r's seats sit on the arc of radius
//       rowArcRadius(r) = 0.5 + 2*r*rowThickness
//   so consecutive rows are 2*rowThickness apart (one seat diameter).
// ─────────────────────────────────────────────────────────────────────────────

export interface SeatPoint {
  /** Normalized x in [0, 2]. */
  x: number;
  /** Normalized y in [0, 1]. */
  y: number;
  /** Angle in radians: 0 = right, π = left. */
  angle: number;
  /** Row index, 0 = innermost. */
  row: number;
  /** Position within the row, 0 = rightmost (smallest angle). */
  col: number;
}

/** Per-row thickness that keeps seats inside the annulus (see header). */
export function rowThickness(nrows: number): number {
  return 1 / (4 * nrows - 2);
}

/** Radius of the arc that row r's seat centers sit on. */
export function rowArcRadius(row: number, nrows: number): number {
  return 0.5 + 2 * row * rowThickness(nrows);
}

/**
 * Maximum seats that fit on row r's arc without overlapping.
 * Arc length = π · radius (a semicircle). Each seat occupies one diameter
 * (2 · seatRadius = 2 · rowThickness/2 = rowThickness) along the arc, so:
 *     capacity = floor(π · radius / rowThickness)
 */
export function rowCapacity(row: number, nrows: number): number {
  const t = rowThickness(nrows);
  const radius = rowArcRadius(row, nrows);
  return Math.max(1, Math.floor((Math.PI * radius) / t));
}

/** Total capacity across all rows for a given row count. */
function totalCapacity(nrows: number): number {
  let sum = 0;
  for (let r = 0; r < nrows; r++) sum += rowCapacity(r, nrows);
  return sum;
}

/** Smallest number of rows whose combined capacity can hold n seats. */
export function minRows(n: number): number {
  let nrows = 1;
  // Guard against pathological inputs; Congress never exceeds a few hundred.
  while (nrows < 1000 && totalCapacity(nrows) < n) nrows++;
  return nrows;
}

/**
 * Distribute `n` seats across `nrows` rows proportionally to each row's
 * capacity (the "DEFAULT" parliamentarch strategy → even lateral spacing).
 * Uses largest-remainder rounding so the per-row counts sum to EXACTLY n and no
 * row is assigned more than its capacity.
 */
export function seatsPerRow(n: number, nrows: number): number[] {
  const caps: number[] = [];
  let capSum = 0;
  for (let r = 0; r < nrows; r++) {
    const c = rowCapacity(r, nrows);
    caps.push(c);
    capSum += c;
  }

  // Ideal (fractional) allocation proportional to capacity.
  const ideal = caps.map((c) => (n * c) / capSum);
  const floors = ideal.map((v) => Math.floor(v));
  let assigned = floors.reduce((a, b) => a + b, 0);

  // Hand out the leftover seats to the rows with the largest fractional parts,
  // skipping any row already at capacity.
  const remainder = ideal
    .map((v, r) => ({ r, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const counts = [...floors];
  let i = 0;
  while (assigned < n && i < remainder.length * 4) {
    const { r } = remainder[i % remainder.length];
    if (counts[r] < caps[r]) {
      counts[r] += 1;
      assigned += 1;
    }
    i++;
  }
  return counts;
}

/**
 * Compute seat positions for `n` seats. Returns seats grouped BY ROW (each
 * row's seats sorted by angle, rightmost first at angle≈0). Grouping by row is
 * deliberate: the seating allocator applies the same angular cut points to every
 * row so state wedges line up radially.
 */
export function buildRows(n: number): { rows: SeatPoint[][]; nrows: number } {
  const nrows = minRows(n);
  const perRow = seatsPerRow(n, nrows);
  const t = rowThickness(nrows);
  const rows: SeatPoint[][] = [];

  for (let r = 0; r < nrows; r++) {
    const k = perRow[r];
    const radius = rowArcRadius(r, nrows);
    const seats: SeatPoint[] = [];

    if (k <= 0) {
      rows.push(seats);
      continue;
    }
    if (k === 1) {
      // Single seat → place at top-center.
      rows.push([{ x: 1, y: radius, angle: Math.PI / 2, row: r, col: 0 }]);
      continue;
    }

    // Inset from the flat edges by the angle one seat radius subtends, so the
    // end seats don't poke past the diameter: asin((t/2)/radius).
    const margin = Math.asin(t / 2 / radius);
    const lo = margin;
    const hi = Math.PI - margin;
    const step = (hi - lo) / (k - 1);

    for (let c = 0; c < k; c++) {
      // col 0 = rightmost (angle≈0); sweep CCW toward the left (angle≈π).
      const angle = lo + c * step;
      seats.push({
        x: 1 + radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        angle,
        row: r,
        col: c,
      });
    }
    rows.push(seats);
  }

  return { rows, nrows };
}

/** Seat circle radius in normalized units. `factor` < 1 adds breathing room. */
export function seatRadius(nrows: number, factor = 0.82): number {
  return (factor * rowThickness(nrows)) / 2;
}

/** Flatten rows into a single array (useful for tests / rendering). */
export function flattenRows(rows: SeatPoint[][]): SeatPoint[] {
  return rows.flat();
}
