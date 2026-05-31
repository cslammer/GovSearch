import type { MemberStats } from '../../types';
import { formatPct } from '../../lib/stats';

interface VoteStatsProps {
  stats: MemberStats;
}

// Participation is shown prominently; party unity secondary. Both are explicitly
// labeled as a recent-window sample with the denominator visible — never implied
// to be a lifetime record.
export function VoteStats({ stats }: VoteStatsProps) {
  if (stats.participationPct === null) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">Voting participation</h3>
        <span className="text-[11px] text-[var(--color-ink-faint)]">{stats.windowLabel}</span>
      </div>

      <StatBar
        label="Cast a vote"
        pct={stats.participationPct}
        detail={`${stats.castVotes} of ${stats.eligibleVotes} votes · ${stats.missedVotes} missed`}
        color="var(--color-yea)"
      />

      {stats.partyUnityPct !== null && (
        <StatBar
          label="Voted with party"
          pct={stats.partyUnityPct}
          detail={`Across ${stats.partyVotesConsidered} party-split vote${stats.partyVotesConsidered === 1 ? '' : 's'}`}
          color="var(--color-party-d)"
          muted
        />
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
        A recent sample of roll-call votes — not a lifetime record. “Present” counts as
        participating; “Not Voting” counts as missed.
      </p>
    </div>
  );
}

function StatBar({
  label,
  pct,
  detail,
  color,
  muted,
}: {
  label: string;
  pct: number;
  detail: string;
  color: string;
  muted?: boolean;
}) {
  return (
    <div className={muted ? 'mt-3' : 'mt-3'}>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--color-ink-soft)]">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
          {formatPct(pct)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-hairline-soft)]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color, opacity: muted ? 0.6 : 1 }}
        />
      </div>
      <div className="mt-1 text-[11px] text-[var(--color-ink-faint)]">{detail}</div>
    </div>
  );
}
