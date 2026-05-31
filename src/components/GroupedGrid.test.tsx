import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupedGrid } from './GroupedGrid';
import { makeMember } from '../__fixtures__/members';

describe('<GroupedGrid>', () => {
  it('groups members by caucus and state', () => {
    const members = [
      makeMember({ lastName: 'Adams', state: 'CA', stateName: 'California', party: 'D', bloc: 'D' }),
      makeMember({ lastName: 'Brown', state: 'CA', stateName: 'California', party: 'R', bloc: 'R' }),
      makeMember({ lastName: 'Cruz', state: 'TX', stateName: 'Texas', party: 'R', bloc: 'R' }),
    ];
    render(<GroupedGrid members={members} onSelect={vi.fn()} onHover={vi.fn()} />);

    expect(screen.getByRole('region', { name: /Democratic caucus/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Republican caucus/i })).toBeInTheDocument();
    expect(screen.getAllByText('California').length).toBeGreaterThan(0);
    expect(screen.getByText('Texas')).toBeInTheDocument();
  });

  it('fires onSelect for a chip click', () => {
    const onSelect = vi.fn();
    // The chip's accessible name is the aria-label (fullName + party), so set
    // fullName explicitly to match the query.
    const m = makeMember({
      firstName: 'Jane',
      lastName: 'Adams',
      fullName: 'Jane Adams',
      state: 'CA',
      stateName: 'California',
      party: 'D',
      bloc: 'D',
    });
    render(<GroupedGrid members={[m]} onSelect={onSelect} onHover={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Jane Adams/ }));
    expect(onSelect).toHaveBeenCalledWith(m);
  });
});
