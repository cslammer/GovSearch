import { describe, it, expect } from 'vitest';
import { runWithConcurrency } from './concurrency';

describe('runWithConcurrency', () => {
  it('preserves input order in the result', async () => {
    const items = [10, 20, 30, 40, 50];
    const out = await runWithConcurrency(items, 2, async (n) => {
      await new Promise((r) => setTimeout(r, (50 - n) % 7));
      return n * 2;
    });
    expect(out).toEqual([20, 40, 60, 80, 100]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await runWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async (n) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return n;
    });
    expect(maxInFlight).toBeLessThanOrEqual(4);
  });

  it('handles an empty list', async () => {
    expect(await runWithConcurrency([], 3, async (x) => x)).toEqual([]);
  });
});
