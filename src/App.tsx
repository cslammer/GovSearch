import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Chamber, Member } from './types';
import { useRoster, selectChamber } from './hooks/useRoster';
import { useVoteIndex } from './hooks/useVoteIndex';
import { useMediaQuery } from './hooks/useMediaQuery';
import { readUrlState, useSyncUrl } from './hooks/useUrlState';
import { CURRENT_CONGRESS } from './lib/config';
import { ordinal } from './lib/ordinal';
import type { PlacedSeat } from './lib/seating';

import { Header } from './components/Header';
import { ChamberToggle } from './components/ChamberToggle';
import { LayoutToggle, type LayoutMode } from './components/LayoutToggle';
import { Legend } from './components/Legend';
import { Hemicycle } from './components/chart/Hemicycle';
import { GroupedGrid } from './components/GroupedGrid';
import { SeatTooltip, type TooltipState } from './components/chart/SeatTooltip';
import { DetailPanel } from './components/panel/DetailPanel';
import { HemicycleSkeleton } from './components/skeletons/HemicycleSkeleton';
import { MessageState } from './components/states/MessageState';
import { Footer } from './components/Footer';
import { AlertIcon } from './components/icons';

export default function App() {
  const initial = useMemo(readUrlState, []);
  const isNarrow = useMediaQuery('(max-width: 768px)');

  const [chamber, setChamber] = useState<Chamber>(initial.chamber);
  const [selected, setSelected] = useState<Member | null>(null);
  const [focusBioguide, setFocusBioguide] = useState<string | undefined>();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('chart');

  const rosterQ = useRoster();
  const allMembers = rosterQ.data;

  const houseMembers = useMemo(() => selectChamber(allMembers, 'house'), [allMembers]);
  const senateMembers = useMemo(() => selectChamber(allMembers, 'senate'), [allMembers]);
  const members = chamber === 'house' ? houseMembers : senateMembers;

  // Vote index is lazy: only fetch once a panel has been opened for this chamber.
  const [votesRequested, setVotesRequested] = useState(false);
  const voteIndexQ = useVoteIndex(chamber, members, votesRequested);

  useSyncUrl({ chamber, member: selected?.bioguide });

  // Effective layout: narrow screens default to grid but respect an explicit pick.
  const [layoutTouched, setLayoutTouched] = useState(false);
  useEffect(() => {
    if (!layoutTouched) setLayout(isNarrow ? 'grid' : 'chart');
  }, [isNarrow, layoutTouched]);

  const openMember = useCallback((m: Member) => {
    setSelected(m);
    setVotesRequested(true);
    setTooltip(null);
  }, []);

  const onSeatHover = useCallback((seat: PlacedSeat | null, x: number, y: number) => {
    setTooltip(seat ? { member: seat.member, x, y } : null);
  }, []);
  const onChipHover = useCallback((m: Member | null, x: number, y: number) => {
    setTooltip(m ? { member: m, x, y } : null);
  }, []);

  // Restore a selected member from the URL once the roster loads.
  useEffect(() => {
    if (!selected && initial.member && allMembers?.length) {
      const found = allMembers.find((m) => m.bioguide === initial.member);
      if (found) {
        setChamber(found.chamber);
        openMember(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMembers]);

  const handleSearchSelect = useCallback(
    (m: Member) => {
      if (m.chamber !== chamber) setChamber(m.chamber);
      if (layout === 'chart') {
        setFocusBioguide(m.bioguide);
        window.setTimeout(() => setFocusBioguide(undefined), 2400);
      }
      openMember(m);
    },
    [chamber, layout, openMember],
  );

  const congressLabel = `${ordinal(CURRENT_CONGRESS)} Congress`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header members={allMembers ?? []} onSelectMember={handleSearchSelect} congressLabel={congressLabel} />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6">
        {/* Title + controls */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[var(--color-ink)]">
              {chamber === 'house' ? 'The House' : 'The Senate'}, seat by seat
            </h1>
            <p className="mt-1 max-w-xl text-[14px] text-[var(--color-ink-soft)]">
              Every member of the {congressLabel}, seated by party and home-state delegation. Select a
              seat to explore their record.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <ChamberToggle
              value={chamber}
              onChange={(c) => {
                setChamber(c);
                setSelected(null);
              }}
              counts={{ house: houseMembers.length, senate: senateMembers.length }}
            />
            <LayoutToggle
              value={layout}
              onChange={(m) => {
                setLayout(m);
                setLayoutTouched(true);
              }}
            />
          </div>
        </div>

        {/* Chart / grid surface */}
        <div className="rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <Legend />
            {members.length > 0 && (
              <span className="text-[12px] text-[var(--color-ink-faint)]">{members.length} members</span>
            )}
          </div>

          <Surface
            isLoading={rosterQ.isLoading}
            isError={rosterQ.isError}
            isEmpty={!rosterQ.isLoading && members.length === 0}
            onRetry={() => rosterQ.refetch()}
            layout={layout}
          >
            {layout === 'chart' ? (
              <div className="h-[clamp(320px,52vh,620px)] w-full">
                <Hemicycle
                  members={members}
                  selectedBioguide={selected?.bioguide}
                  focusBioguide={focusBioguide}
                  onSelect={openMember}
                  onHover={onSeatHover}
                />
              </div>
            ) : (
              <GroupedGrid
                members={members}
                selectedBioguide={selected?.bioguide}
                onSelect={openMember}
                onHover={onChipHover}
              />
            )}
          </Surface>
        </div>
      </main>

      <Footer />

      <SeatTooltip state={tooltip} />

      <DetailPanel
        member={selected}
        chamber={chamber}
        voteIndex={voteIndexQ.data}
        voteLoading={voteIndexQ.isLoading && voteIndexQ.fetchStatus !== 'idle'}
        voteError={voteIndexQ.isError}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function Surface({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  layout,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  layout: LayoutMode;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="h-[clamp(320px,52vh,620px)] w-full">
        <HemicycleSkeleton />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="h-[clamp(320px,52vh,620px)]">
        <MessageState
          tone="error"
          icon={<AlertIcon />}
          title="Couldn’t load the roster"
          body="We couldn’t reach the congressional roster data source. Check your connection and try again."
          action={
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-[var(--color-ink)] px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="h-[clamp(320px,52vh,620px)]">
        <MessageState title="No members to show" body="The roster returned no members for this chamber." />
      </div>
    );
  }
  return <div className={layout === 'chart' ? '' : 'py-2'}>{children}</div>;
}
