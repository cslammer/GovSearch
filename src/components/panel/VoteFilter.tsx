import type { VoteCast } from '../../types';

export type VoteFilterValue = VoteCast | 'all';

interface VoteFilterProps {
  query: string;
  onQuery: (q: string) => void;
  filter: VoteFilterValue;
  onFilter: (f: VoteFilterValue) => void;
  counts: Record<VoteFilterValue, number>;
}

const FILTERS: { key: VoteFilterValue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Yea', label: 'Yea' },
  { key: 'Nay', label: 'Nay' },
  { key: 'Present', label: 'Present' },
  { key: 'Not Voting', label: 'Missed' },
];

export function VoteFilter({ query, onQuery, filter, onFilter, counts }: VoteFilterProps) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Filter votes by keyword…"
        className="w-full rounded-[9px] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)]"
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilter(f.key)}
              className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{
                borderColor: active ? 'transparent' : 'var(--color-hairline)',
                backgroundColor: active ? 'var(--color-ink)' : 'transparent',
                color: active ? '#fff' : 'var(--color-ink-soft)',
              }}
            >
              {f.label}
              <span className={active ? 'ml-1 opacity-70' : 'ml-1 text-[var(--color-ink-faint)]'}>
                {counts[f.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
