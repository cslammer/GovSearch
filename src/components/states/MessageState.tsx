import type { ReactNode } from 'react';

interface MessageStateProps {
  title: string;
  body?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}

// Shared empty / error / info state, used across the chart and panel.
export function MessageState({ title, body, icon, action, tone = 'neutral' }: MessageStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 py-10 text-center">
      {icon && (
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: tone === 'error' ? 'var(--color-party-r)' : 'var(--color-hairline-soft)',
            color: tone === 'error' ? '#fff' : 'var(--color-ink-soft)',
            opacity: tone === 'error' ? 0.92 : 1,
          }}
        >
          {icon}
        </div>
      )}
      <div className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</div>
      {body && <div className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
