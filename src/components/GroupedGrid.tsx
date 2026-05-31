import { useMemo } from 'react';
import type { Bloc, Member } from '../types';
import { MemberAvatar } from './MemberAvatar';
import { PARTY_LETTER } from '../lib/format';
import { PARTY_COLOR } from '../lib/party';

interface GroupedGridProps {
  members: Member[];
  selectedBioguide?: string;
  onSelect: (member: Member) => void;
  onHover: (member: Member | null, clientX: number, clientY: number) => void;
}

interface StateGroup {
  state: string;
  stateName: string;
  members: Member[];
}

function groupByState(members: Member[]): StateGroup[] {
  const map = new Map<string, StateGroup>();
  for (const m of members) {
    const g = map.get(m.state) ?? { state: m.state, stateName: m.stateName, members: [] };
    g.members.push(m);
    map.set(m.state, g);
  }
  return [...map.values()]
    .sort((a, b) => a.stateName.localeCompare(b.stateName))
    .map((g) => ({ ...g, members: g.members.sort((a, b) => a.lastName.localeCompare(b.lastName)) }));
}

// Compact, state-grouped grid — the small-screen alternative to the hemicycle,
// and an option on any screen via the layout toggle.
export function GroupedGrid({ members, selectedBioguide, onSelect, onHover }: GroupedGridProps) {
  const blocs = useMemo(() => {
    const make = (bloc: Bloc) => groupByState(members.filter((m) => m.bloc === bloc));
    return [
      { bloc: 'D' as Bloc, label: 'Democratic caucus', groups: make('D') },
      { bloc: 'R' as Bloc, label: 'Republican caucus', groups: make('R') },
    ].filter((b) => b.groups.length > 0);
  }, [members]);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-1 lg:grid-cols-2">
      {blocs.map((b) => (
        <section key={b.bloc} aria-label={b.label}>
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PARTY_COLOR[b.bloc] }} />
            {b.label}
            <span className="text-[var(--color-ink-faint)]">
              {b.groups.reduce((n, g) => n + g.members.length, 0)}
            </span>
          </h2>
          <div className="flex flex-col gap-4">
            {b.groups.map((g) => (
              <div key={g.state}>
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
                  {g.stateName}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.members.map((m) => (
                    <button
                      key={m.bioguide}
                      type="button"
                      onClick={() => onSelect(m)}
                      onMouseEnter={(e) => onHover(m, e.clientX, e.clientY)}
                      onMouseMove={(e) => onHover(m, e.clientX, e.clientY)}
                      onMouseLeave={() => onHover(null, 0, 0)}
                      aria-label={`${m.fullName} (${PARTY_LETTER[m.party]})`}
                      className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-left transition-colors hover:bg-[var(--color-hairline-soft)]"
                      style={{
                        borderColor:
                          m.bioguide === selectedBioguide ? PARTY_COLOR[m.party] : 'var(--color-hairline)',
                      }}
                    >
                      <MemberAvatar member={m} size={26} />
                      <span className="max-w-[140px] truncate text-[12px] text-[var(--color-ink)]">
                        {m.lastName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
