import { createPortal } from 'react-dom';
import type { Member } from '../../types';
import { PARTY_LABEL, districtLabel, memberPrefix } from '../../lib/format';
import { PARTY_COLOR } from '../../lib/party';

export interface TooltipState {
  member: Member;
  x: number;
  y: number;
}

// A single shared tooltip node that follows the hovered/focused seat — never one
// tooltip per seat. Positioned fixed near the pointer, nudged to stay on-screen.
export function SeatTooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;
  const { member, x, y } = state;
  const dist = districtLabel(member);
  const caucusNote =
    member.isIndependent && member.bloc ? ` · caucuses with ${member.bloc === 'D' ? 'Democrats' : 'Republicans'}` : '';

  const left = Math.min(Math.max(x, 140), window.innerWidth - 140);
  const top = Math.max(y - 16, 12);

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left,
        top,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        zIndex: 60,
      }}
      className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: PARTY_COLOR[member.party] }}
          aria-hidden
        />
        <span className="text-[13px] font-semibold text-[var(--color-ink)]">
          {memberPrefix(member)} {member.fullName}
        </span>
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--color-ink-soft)]">
        {PARTY_LABEL[member.party]}
        {caucusNote} — {member.stateName}
        {dist ? `, ${dist}` : ''}
      </div>
    </div>,
    document.body,
  );
}
