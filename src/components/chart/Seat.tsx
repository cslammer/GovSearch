import { memo } from 'react';
import type { PlacedSeat } from '../../lib/seating';
import { seatRingColor } from '../../lib/party';
import { avatarColors } from '../../lib/photos';
import { tooltipLine } from '../../lib/format';

interface SeatProps {
  seat: PlacedSeat;
  cx: number;
  cy: number;
  r: number;
  photoReady: boolean;
  isActive: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  tabIndex: number;
  onHover: (seat: PlacedSeat | null, clientX: number, clientY: number) => void;
  onSelect: (seat: PlacedSeat) => void;
}

// One seat: party-colored outer ring + circular photo (or initials avatar).
// Rendered as a focusable SVG group; hover/active lift is a cheap CSS transform.
function SeatComponent({
  seat,
  cx,
  cy,
  r,
  photoReady,
  isActive,
  isSelected,
  isDimmed,
  tabIndex,
  onHover,
  onSelect,
}: SeatProps) {
  const { member } = seat;
  const ring = seatRingColor(member);
  const ringW = r * 0.42;
  const inner = r - ringW / 2;
  const clipId = `clip-${member.bioguide}`;
  const avatar = avatarColors(member.party);

  return (
    <g
      className="hc-seat"
      data-active={isActive}
      transform={`translate(${cx} ${cy})`}
      role="button"
      tabIndex={tabIndex}
      aria-label={tooltipLine(member)}
      opacity={isDimmed ? 0.28 : 1}
      onMouseEnter={(e) => onHover(seat, e.clientX, e.clientY)}
      onMouseMove={(e) => onHover(seat, e.clientX, e.clientY)}
      onMouseLeave={() => onHover(null, 0, 0)}
      onFocus={(e) => {
        const box = (e.target as SVGGElement).getBoundingClientRect();
        onHover(seat, box.left + box.width / 2, box.top);
      }}
      onBlur={() => onHover(null, 0, 0)}
      onClick={() => onSelect(seat)}
    >
      {/* Outer ring = party color */}
      <circle r={r} fill={ring} />
      {/* Inner face */}
      <circle r={inner} fill={avatar.bg} />
      {photoReady ? (
        <>
          <clipPath id={clipId}>
            <circle r={inner} />
          </clipPath>
          <image
            href={member.photoThumb}
            x={-inner}
            y={-inner}
            width={inner * 2}
            height={inner * 2}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={inner * 0.95}
          fontWeight={600}
          fill={avatar.fg}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {member.initials}
        </text>
      )}
      {/* Selection ring */}
      {isSelected && (
        <circle r={r + ringW * 0.7} fill="none" stroke={ring} strokeWidth={ringW * 0.5} opacity={0.9} />
      )}
    </g>
  );
}

export const Seat = memo(SeatComponent);
