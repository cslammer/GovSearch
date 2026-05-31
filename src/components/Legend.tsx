import { PARTY_COLOR } from '../lib/party';

const ITEMS: { label: string; color: string }[] = [
  { label: 'Democrat', color: PARTY_COLOR.D },
  { label: 'Republican', color: PARTY_COLOR.R },
  { label: 'Independent', color: PARTY_COLOR.I },
];

export function Legend() {
  return (
    <div className="flex items-center gap-4">
      {ITEMS.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full ring-2"
            style={{ backgroundColor: '#fff', boxShadow: `inset 0 0 0 3px ${it.color}` }}
            aria-hidden
          />
          <span className="text-[12px] text-[var(--color-ink-soft)]">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
