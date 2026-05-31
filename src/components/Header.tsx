import type { Member } from '../types';
import { MemberSearch } from './MemberSearch';

interface HeaderProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  congressLabel: string;
}

export function Header({ members, onSelectMember, congressLabel }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-[color-mix(in_srgb,var(--color-canvas)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
              Hemicycle
            </div>
            <div className="hidden text-[11px] text-[var(--color-ink-faint)] sm:block">
              {congressLabel} · U.S. Congress
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <MemberSearch members={members} onSelect={onSelectMember} />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  // A tiny hemicycle mark.
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <rect width="28" height="28" rx="7" fill="var(--color-ink)" />
      <g transform="translate(14 19)">
        {[0, 1, 2].map((ring) => {
          const r = 4 + ring * 3.2;
          return (
            <path
              key={ring}
              d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
              fill="none"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={0.55 + ring * 0.15}
            />
          );
        })}
      </g>
    </svg>
  );
}
