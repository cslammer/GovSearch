import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hemicycle } from './Hemicycle';
import { makeRoster } from '../../__fixtures__/members';

describe('<Hemicycle>', () => {
  it('renders one focusable, labeled seat per member', () => {
    const members = makeRoster({ CA: [6, 2], TX: [1, 7], NY: [5, 1] });
    render(
      <Hemicycle members={members} onSelect={vi.fn()} onHover={vi.fn()} />,
    );
    const seats = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-label')?.includes('—'));
    expect(seats.length).toBe(members.length);
  });

  it('calls onSelect when a seat is clicked', async () => {
    const members = makeRoster({ CA: [2, 1] });
    const onSelect = vi.fn();
    render(<Hemicycle members={members} onSelect={onSelect} onHover={vi.fn()} />);
    const seats = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-label')?.includes('—'));
    seats[0].click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('exposes an application role with seating instructions', () => {
    const members = makeRoster({ CA: [1, 1] });
    render(<Hemicycle members={members} onSelect={vi.fn()} onHover={vi.fn()} />);
    expect(screen.getByRole('application')).toBeInTheDocument();
  });
});
