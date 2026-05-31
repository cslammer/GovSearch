import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MemberVote } from '../../types';
import { useBillSummary } from '../../hooks/useBillSummary';
import { summarize } from '../../lib/summarize';
import { billWebUrl } from '../../lib/congressApi';
import { formatDate, voteTone } from '../../lib/format';

const TONE_COLOR: Record<string, string> = {
  yea: 'var(--color-yea)',
  nay: 'var(--color-nay)',
  present: 'var(--color-present)',
  absent: 'var(--color-absent)',
};

function measureLabel(v: MemberVote): string {
  if (v.legislationType && v.legislationNumber) {
    return `${v.legislationType.toUpperCase()} ${v.legislationNumber}`;
  }
  return v.question || 'Procedural vote';
}

export function VoteRow({ vote }: { vote: MemberVote }) {
  const [open, setOpen] = useState(false);
  const hasBill = !!vote.legislationType && !!vote.legislationNumber;
  const summaryQ = useBillSummary(vote.congress, vote.legislationType, vote.legislationNumber, open && hasBill);
  const tone = voteTone(vote.voteCast);

  return (
    <li className="border-b border-[var(--color-hairline-soft)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-[var(--color-hairline-soft)]"
      >
        <span
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${TONE_COLOR[tone]}1f`, color: TONE_COLOR[tone] }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE_COLOR[tone] }} />
          {vote.voteCast}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-medium text-[var(--color-ink)]">{measureLabel(vote)}</span>
            <span className="shrink-0 text-[11px] text-[var(--color-ink-faint)]">{formatDate(vote.date)}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-[var(--color-ink-soft)]">{vote.question}</span>
        </span>
        <Chevron open={open} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-3 pl-[3.25rem] pr-1 text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
              {vote.result && (
                <p className="mb-1.5">
                  <span className="text-[var(--color-ink-faint)]">Outcome:</span> {vote.result}
                </p>
              )}
              {hasBill ? (
                <BillSummary
                  loading={summaryQ.isLoading}
                  text={summaryQ.data?.text}
                  actionDesc={summaryQ.data?.actionDesc}
                />
              ) : (
                <p className="text-[var(--color-ink-faint)]">No associated bill summary for this vote.</p>
              )}
              {hasBill && (
                <a
                  href={billWebUrl(vote.congress, vote.legislationType!, vote.legislationNumber!)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-accent)] hover:underline"
                >
                  View {measureLabel(vote)} on congress.gov
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M4.5 2.5H9.5V7.5M9.5 2.5L4 8M8 9.5H3a.5.5 0 0 1-.5-.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function BillSummary({ loading, text, actionDesc }: { loading: boolean; text?: string; actionDesc?: string }) {
  if (loading) {
    return (
      <div className="space-y-1.5" aria-hidden>
        <div className="hc-skeleton h-3 w-full rounded" />
        <div className="hc-skeleton h-3 w-4/5 rounded" />
      </div>
    );
  }
  if (!text) return <p className="text-[var(--color-ink-faint)]">No plain-language summary is available yet.</p>;
  return (
    <div>
      {actionDesc && <span className="mb-0.5 block text-[11px] text-[var(--color-ink-faint)]">{actionDesc}</span>}
      <p>{summarize(text)}</p>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="mt-1 shrink-0 text-[var(--color-ink-faint)] transition-transform"
      style={{ transform: open ? 'rotate(180deg)' : 'none' }}
    >
      <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
