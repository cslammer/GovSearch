import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { VotesSection } from './VotesSection';
import { renderWithClient } from '../../test/renderWithClient';
import { buildVoteIndex } from '../../lib/voteIndex';
import { makeMember } from '../../__fixtures__/members';
import type { RollCall } from '../../types';

// Force the "nothing configured" path so we can assert the friendly notices,
// regardless of how Vitest sets import.meta.env (DEV is true under Vitest).
// Preserve all other config exports so the transitive module graph stays intact.
vi.mock('../../lib/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/config')>();
  return {
    ...actual,
    config: { ...actual.config, votesConfigured: false, senateConfigured: false },
  };
});

describe('<VotesSection> graceful states', () => {
  const member = makeMember({ bioguide: 'A', lastName: 'Doe' });

  it('shows the add-key notice for the House when votes are unconfigured', () => {
    renderWithClient(
      <VotesSection member={member} chamber="house" isLoading={false} isError={false} />,
    );
    expect(screen.getByText(/Unlock voting records/i)).toBeInTheDocument();
    expect(screen.getByText(/api\.data\.gov/i)).toBeInTheDocument();
  });

  it('shows the proxy notice for the Senate', () => {
    renderWithClient(
      <VotesSection member={member} chamber="senate" isLoading={false} isError={false} />,
    );
    expect(screen.getByText(/Senate votes need the proxy/i)).toBeInTheDocument();
  });
});

describe('buildVoteIndex window metadata', () => {
  it('reports loaded vs requested for partial failures', () => {
    const rolls: RollCall[] = [
      {
        rollId: 'r1',
        chamber: 'house',
        congress: 119,
        session: 1,
        rollNumber: 1,
        date: '2025-03-01',
        question: 'On Passage',
        result: 'Passed',
        positions: [{ bioguide: 'A', voteCast: 'Yea', party: 'D' }],
      },
    ];
    const idx = buildVoteIndex(rolls, { chamber: 'house', congress: 119, session: 1, requested: 3, failed: 2 });
    expect(idx.loaded).toBe(1);
    expect(idx.requested).toBe(3);
    expect(idx.failed).toBe(2);
  });
});
