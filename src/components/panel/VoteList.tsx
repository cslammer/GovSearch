import { useMemo, useState } from 'react';
import type { MemberVote, VoteCast } from '../../types';
import { VoteFilter, type VoteFilterValue } from './VoteFilter';
import { VoteRow } from './VoteRow';
import { MessageState } from '../states/MessageState';

interface VoteListProps {
  votes: MemberVote[];
}

const CASTS: VoteCast[] = ['Yea', 'Nay', 'Present', 'Not Voting'];

export function VoteList({ votes }: VoteListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<VoteFilterValue>('all');

  const counts = useMemo(() => {
    const c: Record<VoteFilterValue, number> = {
      all: votes.length,
      Yea: 0,
      Nay: 0,
      Present: 0,
      'Not Voting': 0,
    };
    for (const v of votes) c[v.voteCast] = (c[v.voteCast] ?? 0) + 1;
    return c;
  }, [votes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return votes.filter((v) => {
      if (filter !== 'all' && v.voteCast !== filter) return false;
      if (!q) return true;
      const hay = `${v.question} ${v.legislationType ?? ''} ${v.legislationNumber ?? ''} ${v.title ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [votes, query, filter]);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">Recent votes</h3>
        <span className="text-[11px] text-[var(--color-ink-faint)]">{CASTS.map((c) => `${counts[c]} ${c}`).join(' · ')}</span>
      </div>

      <VoteFilter query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} counts={counts} />

      {filtered.length === 0 ? (
        <div className="py-8">
          <MessageState title="No matching votes" body="Try a different keyword or filter." />
        </div>
      ) : (
        <ul className="mt-2">
          {filtered.map((v) => (
            <VoteRow key={v.rollId} vote={v} />
          ))}
        </ul>
      )}
    </div>
  );
}
