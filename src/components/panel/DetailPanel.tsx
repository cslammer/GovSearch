import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Chamber, Member, VoteIndex } from '../../types';
import { useMemberDetail } from '../../hooks/useMemberDetail';
import { MemberBio } from './MemberBio';
import { VotesSection } from './VotesSection';
import { CloseIcon } from '../icons';

interface DetailPanelProps {
  member: Member | null;
  chamber: Chamber;
  voteIndex?: VoteIndex;
  voteLoading: boolean;
  voteError: boolean;
  onClose: () => void;
}

// Right-side slide-over drawer. Composes the bio, voting stats, and vote list
// (or a graceful notice). Esc + backdrop close; focus moves in and is restored.
export function DetailPanel({
  member,
  chamber,
  voteIndex,
  voteLoading,
  voteError,
  onClose,
}: DetailPanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (member) {
      restoreRef.current = document.activeElement;
      // Defer so the element exists post-animation start.
      const id = window.setTimeout(() => closeRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
  }, [member]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (member) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [member, onClose]);

  return (
    <AnimatePresence>
      {member && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-[rgba(26,31,54,0.28)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key={member.bioguide}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-[var(--color-surface)] shadow-[var(--shadow-panel)]"
            role="dialog"
            aria-modal="true"
            aria-label={`${member.fullName} details`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-3">
              <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
                Member profile
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hairline-soft)] hover:text-[var(--color-ink)]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="hc-scroll flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <PanelBody
                member={member}
                chamber={chamber}
                voteIndex={voteIndex}
                voteLoading={voteLoading}
                voteError={voteError}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function PanelBody({
  member,
  chamber,
  voteIndex,
  voteLoading,
  voteError,
}: {
  member: Member;
  chamber: Chamber;
  voteIndex?: VoteIndex;
  voteLoading: boolean;
  voteError: boolean;
}) {
  const detailQ = useMemberDetail(member.bioguide, true);
  return (
    <>
      <MemberBio member={member} detail={detailQ.data} />
      <VotesSection
        member={member}
        chamber={chamber}
        index={voteIndex}
        isLoading={voteLoading}
        isError={voteError}
      />
    </>
  );
}
