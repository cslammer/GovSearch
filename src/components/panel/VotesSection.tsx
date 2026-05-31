import type { Chamber, Member, VoteIndex } from '../../types';
import { config } from '../../lib/config';
import { computeStats } from '../../lib/stats';
import { votesForMember } from '../../lib/voteIndex';
import { formatDate } from '../../lib/format';
import { VoteStats } from './VoteStats';
import { VoteList } from './VoteList';
import { MessageState } from '../states/MessageState';
import { KeyIcon, LockIcon } from '../icons';

interface VotesSectionProps {
  member: Member;
  chamber: Chamber;
  index?: VoteIndex;
  isLoading: boolean;
  isError: boolean;
}

function windowLabel(index: VoteIndex): string {
  const range =
    index.windowStart && index.windowEnd
      ? ` (${formatDate(index.windowStart)} – ${formatDate(index.windowEnd)})`
      : '';
  const denom = index.failed > 0 ? `${index.loaded} of ${index.requested}` : `${index.loaded}`;
  return `${denom} recent votes${range}`;
}

// Decides what the votes area shows: the real stats+list, a loading skeleton, or
// a friendly notice when votes aren't configured for this chamber.
export function VotesSection({ member, chamber, index, isLoading, isError }: VotesSectionProps) {
  const configured = chamber === 'house' ? config.votesConfigured : config.senateConfigured;

  if (!configured) {
    return chamber === 'senate' ? <SenateNotice /> : <NoKeyNotice />;
  }

  if (isLoading) return <VotesSkeleton />;

  if (isError || !index) {
    return (
      <MessageState
        tone="error"
        title="Couldn’t load votes"
        body="The vote service didn’t respond. It may be a temporary network or rate-limit issue — try again shortly."
      />
    );
  }

  const votes = votesForMember(index, member.bioguide);
  if (votes.length === 0) {
    return (
      <MessageState
        title="No recent votes on record"
        body={`No roll-call votes for ${member.lastName} appear in the recent ${chamber} window. New members or those who recently joined may not yet have a record here.`}
      />
    );
  }

  const stats = computeStats(member, votes, index.rollCalls, windowLabel(index));

  return (
    <div className="space-y-4">
      <VoteStats stats={stats} />
      <VoteList votes={votes} />
    </div>
  );
}

function VotesSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="hc-skeleton h-28 w-full rounded-[var(--radius-card)]" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="hc-skeleton h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function NoKeyNotice() {
  return (
    <MessageState
      icon={<KeyIcon />}
      title="Unlock voting records"
      body={
        <>
          The seating chart and bios work without any setup. To show roll-call votes and
          plain-language bill summaries, add a free Congress.gov API key. Get one at{' '}
          <a className="font-medium text-[var(--color-accent)] hover:underline" href="https://api.data.gov/signup/" target="_blank" rel="noreferrer">
            api.data.gov/signup
          </a>{' '}
          and paste it into{' '}
          <code className="rounded bg-[var(--color-hairline-soft)] px-1 py-0.5 text-[11px]">src/lib/apiKey.ts</code>{' '}
          (see the README).
        </>
      }
    />
  );
}

function SenateNotice() {
  return (
    <MessageState
      icon={<LockIcon />}
      title="Senate votes need the proxy"
      body={
        <>
          The Congress.gov API doesn’t publish Senate roll calls, so Hemicycle reads them from
          Senate.gov — which browsers can’t call directly. Deploy the included proxy (or run{' '}
          <code className="rounded bg-[var(--color-hairline-soft)] px-1 py-0.5 text-[11px]">npm run dev</code>) to
          enable Senate votes. House votes work without it. See the README.
        </>
      }
    />
  );
}
