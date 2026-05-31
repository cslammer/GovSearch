import { motion } from 'framer-motion';
import type { Chamber } from '../types';

interface ChamberToggleProps {
  value: Chamber;
  onChange: (chamber: Chamber) => void;
  counts?: Partial<Record<Chamber, number>>;
}

const OPTIONS: { key: Chamber; label: string }[] = [
  { key: 'house', label: 'House' },
  { key: 'senate', label: 'Senate' },
];

// Segmented control with a sliding active-pill (Framer layout animation).
export function ChamberToggle({ value, onChange, counts }: ChamberToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Chamber"
      className="inline-flex items-center gap-1 rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)]"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.key)}
            className="relative rounded-[7px] px-4 py-1.5 text-[13px] font-medium transition-colors"
            style={{ color: active ? 'var(--color-ink)' : 'var(--color-ink-soft)' }}
          >
            {active && (
              <motion.span
                layoutId="chamber-pill"
                className="absolute inset-0 rounded-[7px] bg-[var(--color-canvas)] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">
              {opt.label}
              {counts?.[opt.key] != null && (
                <span className="ml-1.5 text-[var(--color-ink-faint)]">{counts[opt.key]}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
