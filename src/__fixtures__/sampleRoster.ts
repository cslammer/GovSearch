import type { RawLegislator } from '../types';

// A small synthetic roster for offline development (VITE_USE_FIXTURES=1). It is
// NOT real data — bioguides are fake, so photos fall back to initials avatars.
// It exists only so the chart/build can be exercised without network access.

const STATES: [string, number][] = [
  ['CA', 18],
  ['TX', 14],
  ['FL', 10],
  ['NY', 12],
  ['IL', 8],
  ['PA', 9],
  ['OH', 7],
  ['GA', 6],
  ['NC', 6],
  ['MI', 5],
  ['WA', 5],
  ['MA', 4],
  ['AZ', 4],
  ['VT', 1],
  ['WY', 1],
  ['AK', 1],
];

let n = 0;
function fakeBioguide(): string {
  n += 1;
  return `Z${String(n).padStart(6, '0')}`;
}

function houseMember(state: string, district: number, party: string): RawLegislator {
  const id = fakeBioguide();
  return {
    id: { bioguide: id },
    name: { first: 'Member', last: `${state}${district}`, official_full: `Member ${state}-${district}` },
    bio: { birthday: '1970-01-01', gender: district % 2 ? 'F' : 'M' },
    terms: [
      {
        type: 'rep',
        start: `${2013 + (district % 6)}-01-03`,
        end: '2027-01-03',
        state,
        district,
        party,
      },
    ],
  };
}

function senator(state: string, rank: 'junior' | 'senior', party: string, caucus?: string): RawLegislator {
  const id = fakeBioguide();
  return {
    id: { bioguide: id, lis: `S${String(n).padStart(3, '0')}` },
    name: { first: 'Senator', last: `${state}${rank[0].toUpperCase()}`, official_full: `Senator ${state} (${rank})` },
    bio: { birthday: '1960-01-01', gender: 'M' },
    terms: [
      {
        type: 'sen',
        start: rank === 'senior' ? '2013-01-03' : '2021-01-03',
        end: '2027-01-03',
        state,
        party,
        class: rank === 'senior' ? 1 : 2,
        state_rank: rank,
        caucus,
      },
    ],
  };
}

export function sampleRoster(): RawLegislator[] {
  const out: RawLegislator[] = [];
  let pendingFlip = false;

  for (const [state, seats] of STATES) {
    // Alternate the delegation's lean so the chart shows both parties + a mix.
    for (let d = 1; d <= seats; d++) {
      const leanR = (state.charCodeAt(0) + d) % 2 === 0;
      out.push(houseMember(state, seats === 1 ? 0 : d, leanR ? 'Republican' : 'Democrat'));
    }
    // Two senators per state, varied parties; VT senior caucuses as independent.
    if (state === 'VT') {
      out.push(senator(state, 'senior', 'Independent', 'Democrat'));
      out.push(senator(state, 'junior', 'Democrat'));
    } else {
      out.push(senator(state, 'senior', pendingFlip ? 'Democrat' : 'Republican'));
      out.push(senator(state, 'junior', pendingFlip ? 'Republican' : 'Democrat'));
      pendingFlip = !pendingFlip;
    }
  }
  return out;
}
