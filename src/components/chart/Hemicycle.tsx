import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Member } from '../../types';
import { computeSeating, type PlacedSeat } from '../../lib/seating';
import { usePhotoLoader } from '../../hooks/usePhotoLoader';
import { usePanZoom } from '../../hooks/usePanZoom';
import { Seat } from './Seat';
import { ZoomControls } from './ZoomControls';

// ── SVG layout constants ──────────────────────────────────────────────────────
// Geometry is normalized (x∈[0,2], y∈[0,1], y up). We scale by VS and flip Y so
// the hemicycle's flat edge sits at the bottom (classic dome orientation).
const VS = 100;
const PAD = 6;
const Y_MAX = 1.04;
const VIEW = { w: 2 * VS + 2 * PAD, h: Y_MAX * VS + 2 * PAD };

const toCx = (x: number) => PAD + x * VS;
const toCy = (y: number) => PAD + (Y_MAX - y) * VS;

interface HemicycleProps {
  members: Member[];
  selectedBioguide?: string;
  focusBioguide?: string;
  onSelect: (member: Member) => void;
  onHover: (seat: PlacedSeat | null, clientX: number, clientY: number) => void;
}

// Memoized so tooltip updates in the parent (fired on every mousemove) don't
// re-render the whole 435-seat chart — all props from App are stable.
function HemicycleInner({
  members,
  selectedBioguide,
  focusBioguide,
  onSelect,
  onHover,
}: HemicycleProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const layout = useMemo(() => computeSeating(members), [members]);
  const { seats, wedges, seatR } = layout;

  // Photo thumbnails to preload (rings-first; these fade in).
  const photoUrls = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of seats) m.set(s.member.bioguide, s.member.photoThumb);
    return m;
  }, [seats]);
  const photos = usePhotoLoader(photoUrls);

  const pan = usePanZoom(svgRef, VIEW, { minScale: 1, maxScale: 9 });

  // Index seats by bioguide for selection/focus lookups.
  const indexByBioguide = useMemo(() => {
    const m = new Map<string, number>();
    seats.forEach((s, i) => m.set(s.member.bioguide, i));
    return m;
  }, [seats]);

  // Pan/zoom to a member when search requests focus.
  useEffect(() => {
    if (!focusBioguide) return;
    const i = indexByBioguide.get(focusBioguide);
    if (i == null) return;
    const s = seats[i];
    setActiveIndex(i);
    pan.focusOn(toCx(s.x), toCy(s.y), 3.2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusBioguide]);

  // ── Keyboard navigation (roving tabindex) ───────────────────────────────────
  // left/right = neighbor by angle within a row; up/down = nearest seat in the
  // adjacent row. Built once per layout.
  const nav = useMemo(() => buildNavigation(seats), [seats]);

  const moveActive = (dir: 'left' | 'right' | 'up' | 'down') => {
    setActiveIndex((cur) => {
      const next = nav[cur]?.[dir];
      return next == null ? cur : next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveActive('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveActive('right');
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveActive('down');
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const s = seats[activeIndex];
        if (s) onSelect(s.member);
        break;
      }
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(seats.length - 1);
        break;
    }
  };

  // Move keyboard focus to the active seat's DOM node when it changes.
  useEffect(() => {
    const node = svgRef.current?.querySelector<SVGGElement>(`[data-seat-index="${activeIndex}"]`);
    node?.focus({ preventScroll: true });
  }, [activeIndex]);

  // Stable per-seat select handler so Seat's memo holds (an inline arrow here
  // would be a new function every render, defeating memoization and causing all
  // 435 seats to re-render whenever photos load in).
  const handleSeatSelect = useCallback(
    (seat: PlacedSeat) => {
      const i = indexByBioguide.get(seat.member.bioguide);
      if (i != null) setActiveIndex(i);
      onSelect(seat.member);
    },
    [indexByBioguide, onSelect],
  );

  // Labels: only the widest wedges get a faint state code (greedy de-overlap).
  const labels = useMemo(() => pickLabels(wedges), [wedges]);

  const { scale, tx, ty } = pan.transform;
  const labelFont = Math.max(2.6, seatR * 1.6);

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        width="100%"
        height="100%"
        role="application"
        aria-label="Seating chart. Use arrow keys to move between seats and Enter to open a member."
        aria-roledescription="hemicycle seating chart"
        className="touch-none select-none"
        style={{ cursor: pan.dragging ? 'grabbing' : 'grab', display: 'block' }}
        onKeyDown={onKeyDown}
        {...pan.handlers}
      >
        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          {/* Aisle divider */}
          <line
            x1={toCx(1)}
            y1={toCy(0)}
            x2={toCx(1)}
            y2={toCy(Y_MAX - 0.02)}
            stroke="var(--color-hairline)"
            strokeWidth={0.4}
            strokeDasharray="1.4 1.4"
            opacity={0.7}
          />

          {/* Faint state-cluster labels */}
          {labels.map((w) => (
            <text
              key={`${w.bloc}:${w.state}`}
              x={toCx(w.centroidX)}
              y={toCy(w.centroidY) - seatR * 2.4}
              textAnchor="middle"
              fontSize={labelFont}
              fontWeight={600}
              fill="var(--color-ink-faint)"
              opacity={0.75}
              style={{ pointerEvents: 'none' }}
            >
              {w.state}
            </text>
          ))}

          {/* Seats */}
          {seats.map((seat, i) => (
            <g key={seat.member.bioguide} data-seat-index={i}>
              <Seat
                seat={seat}
                cx={toCx(seat.x)}
                cy={toCy(seat.y)}
                r={seatR * VS}
                photoReady={photos.ready.has(seat.member.bioguide)}
                isActive={i === activeIndex}
                isSelected={seat.member.bioguide === selectedBioguide}
                isDimmed={!!focusBioguide && seat.member.bioguide !== focusBioguide}
                tabIndex={i === activeIndex ? 0 : -1}
                onHover={onHover}
                onSelect={handleSeatSelect}
              />
            </g>
          ))}
        </g>
      </svg>

      <ZoomControls
        onZoomIn={() => pan.zoomBy(1.3)}
        onZoomOut={() => pan.zoomBy(1 / 1.3)}
        onReset={pan.reset}
      />
    </div>
  );
}

export const Hemicycle = memo(HemicycleInner);

// ── helpers ───────────────────────────────────────────────────────────────────

interface NavEntry {
  left?: number;
  right?: number;
  up?: number;
  down?: number;
}

/** Precompute arrow-key neighbors for every seat. */
function buildNavigation(seats: PlacedSeat[]): NavEntry[] {
  const byRow = new Map<number, number[]>();
  seats.forEach((s, i) => {
    const arr = byRow.get(s.row) ?? [];
    arr.push(i);
    byRow.set(s.row, arr);
  });
  for (const arr of byRow.values()) arr.sort((a, b) => seats[a].angle - seats[b].angle);

  const nearestInRow = (row: number, angle: number): number | undefined => {
    const arr = byRow.get(row);
    if (!arr) return undefined;
    let best: number | undefined;
    let bestD = Infinity;
    for (const i of arr) {
      const d = Math.abs(seats[i].angle - angle);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  return seats.map((s, gi) => {
    const rowArr = byRow.get(s.row)!;
    const pos = rowArr.indexOf(gi);
    // Within a row, angle increases right→left, so "right" = lower angle.
    return {
      right: pos > 0 ? rowArr[pos - 1] : undefined,
      left: pos < rowArr.length - 1 ? rowArr[pos + 1] : undefined,
      up: nearestInRow(s.row + 1, s.angle),
      down: nearestInRow(s.row - 1, s.angle),
    };
  });
}

interface LabeledWedge {
  bloc: string;
  state: string;
  centroidX: number;
  centroidY: number;
  centroidAngle: number;
  angularSpan: number;
}

/** Greedily place labels for the widest wedges, skipping crowded ones. */
function pickLabels(wedges: LabeledWedge[]): LabeledWedge[] {
  const minSpan = 0.14; // radians — below this a wedge is too thin to label
  const minGap = 0.12; // keep labels from colliding along the arc
  const candidates = [...wedges]
    .filter((w) => w.angularSpan >= minSpan)
    .sort((a, b) => b.angularSpan - a.angularSpan);

  const placed: LabeledWedge[] = [];
  for (const w of candidates) {
    if (placed.every((p) => Math.abs(p.centroidAngle - w.centroidAngle) >= minGap)) {
      placed.push(w);
    }
  }
  return placed;
}
