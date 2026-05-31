import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export type LayoutMode = 'chart' | 'grid';

interface LayoutToggleProps {
  value: LayoutMode;
  onChange: (mode: LayoutMode) => void;
}

const OPTIONS: { key: LayoutMode; label: string; icon: ReactNode }[] = [
  {
    key: 'chart',
    label: 'Chart',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M1.5 11A5.5 5.5 0 0 1 12.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7" cy="11" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'grid',
    label: 'Grid',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        {[1, 6, 11].map((x) =>
          [1, 6, 11].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="2.2" height="2.2" rx="0.6" fill="currentColor" />),
        )}
      </svg>
    ),
  },
];

export function LayoutToggle({ value, onChange }: LayoutToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)]">
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={active}
            aria-label={`${opt.label} view`}
            onClick={() => onChange(opt.key)}
            className="relative flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium transition-colors"
            style={{ color: active ? 'var(--color-ink)' : 'var(--color-ink-soft)' }}
          >
            {active && (
              <motion.span
                layoutId="layout-pill"
                className="absolute inset-0 rounded-[7px] bg-[var(--color-canvas)] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
