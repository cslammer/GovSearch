import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { VoteList } from './VoteList';
import { renderWithClient } from '../../test/renderWithClient';
import type { MemberVote, RollCall } from '../../types';
import { tallyRollCall, type RollCallTally } from '../../lib/stats';

const NO_TALLIES = new Map<string, RollCallTally>();

function vote(over: Partial<MemberVote>): MemberVote {
  return {
    rollId: over.rollId ?? `H-${Math.random()}`,
    chamber: 'house',
    congress: 119,
    session: 1,
    rollNumber: over.rollNumber ?? 1,
    voteCast: over.voteCast ?? 'Yea',
    date: over.date ?? '2025-03-01',
    question: over.question ?? 'On Passage',
    result: over.result ?? 'Passed',
    legislationType: over.legislationType,
    legislationNumber: over.legislationNumber,
    title: over.title,
  };
}

describe('<VoteList>', () => {
  const votes = [
    vote({ rollId: 'a', voteCast: 'Yea', legislationType: 'hr', legislationNumber: '1', question: 'Farm subsidies bill' }),
    vote({ rollId: 'b', voteCast: 'Nay', legislationType: 'hr', legislationNumber: '2', question: 'Defense appropriations' }),
    vote({ rollId: 'c', voteCast: 'Not Voting', legislationType: 's', legislationNumber: '3', question: 'Healthcare measure' }),
  ];

  it('renders all votes initially', () => {
    renderWithClient(<VoteList votes={votes} tallies={NO_TALLIES} />);
    expect(screen.getByText('HR 1')).toBeInTheDocument();
    expect(screen.getByText('HR 2')).toBeInTheDocument();
    expect(screen.getByText('S 3')).toBeInTheDocument();
  });

  it('filters by keyword', () => {
    renderWithClient(<VoteList votes={votes} tallies={NO_TALLIES} />);
    fireEvent.change(screen.getByPlaceholderText(/Filter votes/i), { target: { value: 'healthcare' } });
    expect(screen.getByText('S 3')).toBeInTheDocument();
    expect(screen.queryByText('HR 1')).not.toBeInTheDocument();
  });

  it('filters by how they voted', () => {
    renderWithClient(<VoteList votes={votes} tallies={NO_TALLIES} />);
    // The "Nay" filter chip — pick the one inside the filter row (has a count).
    fireEvent.click(screen.getByRole('button', { name: /^Nay 1$/ }));
    expect(screen.getByText('HR 2')).toBeInTheDocument();
    expect(screen.queryByText('HR 1')).not.toBeInTheDocument();
  });

  it('shows the roll-call tally and party breakdown when a row is expanded', () => {
    const rc: RollCall = {
      rollId: 'a',
      chamber: 'house',
      congress: 119,
      session: 1,
      rollNumber: 1,
      date: '2025-03-01',
      question: 'On Passage',
      result: 'Passed',
      legislationType: 'hr',
      legislationNumber: '1',
      positions: [
        { bioguide: 'd1', voteCast: 'Yea', party: 'D' },
        { bioguide: 'd2', voteCast: 'Yea', party: 'D' },
        { bioguide: 'r1', voteCast: 'Nay', party: 'R' },
      ],
    };
    const tallies = new Map([['a', tallyRollCall(rc)]]);
    renderWithClient(<VoteList votes={[votes[0]]} tallies={tallies} />);

    // Expand the row.
    fireEvent.click(screen.getByRole('button', { name: /HR 1/ }));
    expect(screen.getByText(/2 Yea/)).toBeInTheDocument();
    expect(screen.getByText(/1 Nay/)).toBeInTheDocument();
    expect(screen.getByText(/Mostly Democrats voted Yea/)).toBeInTheDocument();
    expect(screen.getByText(/Democrats: 2–0/)).toBeInTheDocument();
    expect(screen.getByText(/Republicans: 0–1/)).toBeInTheDocument();
  });
});
