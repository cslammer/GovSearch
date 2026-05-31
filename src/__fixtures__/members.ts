import type { Member } from '../types';

let seq = 0;

/** Build a minimal Member for tests. */
export function makeMember(over: Partial<Member> = {}): Member {
  seq += 1;
  const party = over.party ?? 'D';
  const bloc = over.bloc ?? (party === 'R' ? 'R' : 'D');
  const state = over.state ?? 'CA';
  return {
    bioguide: over.bioguide ?? `B${String(seq).padStart(6, '0')}`,
    lisId: over.lisId,
    firstName: over.firstName ?? 'Test',
    lastName: over.lastName ?? `Member${seq}`,
    fullName: over.fullName ?? `Test Member${seq}`,
    chamber: over.chamber ?? 'house',
    party,
    bloc,
    isIndependent: over.isIndependent ?? party === 'I',
    state,
    stateName: over.stateName ?? state,
    district: over.district ?? 1,
    senatorRank: over.senatorRank,
    birthday: over.birthday,
    gender: over.gender,
    terms: over.terms ?? [],
    firstTermStart: over.firstTermStart ?? '2015-01-03',
    yearsInOffice: over.yearsInOffice ?? 10,
    leadershipTitle: over.leadershipTitle,
    photoUrl: over.photoUrl ?? '',
    photoThumb: over.photoThumb ?? '',
    initials: over.initials ?? 'TM',
  };
}

/**
 * Build a roster spread across states. `spec` maps state → [demCount, repCount].
 */
export function makeRoster(spec: Record<string, [number, number]>, chamber: 'house' | 'senate' = 'house'): Member[] {
  const out: Member[] = [];
  for (const [state, [d, r]] of Object.entries(spec)) {
    for (let i = 0; i < d; i++) {
      out.push(makeMember({ state, stateName: state, party: 'D', bloc: 'D', chamber }));
    }
    for (let i = 0; i < r; i++) {
      out.push(makeMember({ state, stateName: state, party: 'R', bloc: 'R', chamber }));
    }
  }
  return out;
}
